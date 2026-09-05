import { EXECUTION_GUARDS } from '@/lib/execution/guards'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { flagEnabled } from '@/lib/flags'
import { ExecError, LIVE_MAX_NOTIONAL_USD, PAPER_MAX_NOTIONAL_USD, cancelGuarded, listExecutionVenues, placeGuarded, resolveVenue } from '@/lib/execution/router'
import { OrgGuardError, orderGuard } from '@/lib/org'

export const dynamic = 'force-dynamic'

// Paper Trading Desk + venue execution API.
//   GET  /api/execution?venue=<key>&symbol=<sym>  → venues, state, and (for a venue) instruments/balances/positions/open orders/log/ticker
//   POST { type: 'place', venue, symbol, side, orderType, qty, price? }
//   POST { type: 'cancel', venue, orderId, symbol? }
//   POST { type: 'ticker', venue, symbol }

const settled = <T,>(r: PromiseSettledResult<T>): { data: T | null; error: string | null } =>
  r.status === 'fulfilled' ? { data: r.value, error: null } : { data: null, error: String((r.reason as any)?.message ?? r.reason) }

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    if (!(await flagEnabled('paper_trading_desk', true))) return NextResponse.json({ disabled: true })
    const isAdmin = !!(await requireAdmin(userId))
    const url = new URL(req.url)
    const venueKey = url.searchParams.get('venue') ?? ''
    const symbol = url.searchParams.get('symbol') ?? ''
    const [venues, state, liveFlag] = await Promise.all([
      listExecutionVenues(userId, isAdmin),
      prisma.emilState.findFirst(),
      flagEnabled('live_crypto_execution', false),
    ])
    const base = {
      venues,
      isAdmin,
      armed: !!state?.armed,
      mode: state?.mode ?? 'observation',
      liveExecutionEnabled: liveFlag,
      caps: { paper: PAPER_MAX_NOTIONAL_USD, live: LIVE_MAX_NOTIONAL_USD },
      guards: EXECUTION_GUARDS,
    }
    if (!venueKey) return NextResponse.json(base)

    let resolved
    try {
      resolved = await resolveVenue(userId, isAdmin, venueKey)
    } catch (e: any) {
      return NextResponse.json({ ...base, venue: venueKey, venueError: e?.message ?? 'Venue unavailable.' })
    }
    const { adapter, paper } = resolved
    const [instruments, balances, positions, openOrders, ticker] = await Promise.allSettled([
      adapter.instruments(),
      adapter.balances(),
      adapter.positions(),
      adapter.openOrders(),
      symbol ? adapter.ticker(symbol) : Promise.resolve(null),
    ])
    const log = await prisma.venueOrder.findMany({ where: { userId, providerKey: venueKey }, orderBy: { createdAt: 'desc' }, take: 30 })
    return NextResponse.json({
      ...base,
      venue: venueKey,
      venueLabel: adapter.label,
      paper,
      instruments: settled(instruments),
      balances: settled(balances),
      positions: settled(positions),
      openOrders: settled(openOrders),
      ticker: settled(ticker),
      log: log.map((o) => ({
        id: o.id, symbol: o.symbol, side: o.side, orderType: o.orderType, qty: o.qty, price: o.price, notionalUsd: o.notionalUsd,
        status: o.status, filledQty: o.filledQty, avgFillPrice: o.avgFillPrice, message: o.message, venueOrderId: o.venueOrderId, createdAt: o.createdAt,
        refPrice: o.refPrice, slippageBps: o.slippageBps, quoteLatencyMs: o.quoteLatencyMs, guardNotes: o.guardNotes,
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the execution desk' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    if (!(await flagEnabled('paper_trading_desk', true))) return NextResponse.json({ error: 'The trading desk is switched off.' }, { status: 403 })
    const isAdmin = !!(await requireAdmin(userId))
    const body = await req.json().catch(() => ({}))
    const venueKey = String(body?.venue ?? '')

    if (body?.type === 'place') {
      // Organization desk rules (kill switch, restricted list, limits, maker-checker) run before the venue guards.
      const orgCheck = await orderGuard(userId, (session.user.email ?? '').toLowerCase(), { symbol: String(body?.symbol ?? '').trim(), qty: Number(body?.qty), notionalUsd: body?.price && body?.qty ? Number(body.price) * Number(body.qty) : null, venue: venueKey, side: body?.side, type: body?.orderType, price: body?.price !== undefined && body?.price !== '' ? Number(body.price) : undefined })
      if (orgCheck.requiresApproval) return NextResponse.json({ ok: true, pendingApproval: true, requestId: orgCheck.requestId, message: `${orgCheck.orgName} requires approval — the order was queued for a compliance/admin decision.` })
      const result = await placeGuarded({
        userId, isAdmin, venueKey,
        req: {
          symbol: String(body?.symbol ?? '').trim(),
          side: body?.side,
          type: body?.orderType,
          qty: Number(body?.qty),
          price: body?.price !== undefined && body?.price !== '' ? Number(body.price) : undefined,
          reduceOnly: !!body?.reduceOnly,
        },
      })
      return NextResponse.json({ ok: true, order: result.order, record: result.record })
    }

    if (body?.type === 'cancel') {
      await cancelGuarded({ userId, isAdmin, venueKey, orderId: String(body?.orderId ?? ''), symbol: body?.symbol ? String(body.symbol) : undefined })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'ticker') {
      const { adapter } = await resolveVenue(userId, isAdmin, venueKey)
      const ticker = await adapter.ticker(String(body?.symbol ?? ''))
      return NextResponse.json({ ok: true, ticker })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    if (e instanceof ExecError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof OrgGuardError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Execution request failed' }, { status: 500 })
  }
}
