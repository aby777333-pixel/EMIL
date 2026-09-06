import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExecError, isPaperVenue } from '@/lib/execution/router'
import { OrgGuardError, orderGuard } from '@/lib/org'
import { convene, deskOverview, executeProposal, runDueWatches } from '@/lib/agent-desk'

export const dynamic = 'force-dynamic'

// Agent Paper Desk API (paper venues only).
//   GET  /api/agent-desk                          → venues, proposals, watches, autopilot gates
//   POST { type: 'convene', venue, symbol }
//   POST { type: 'execute', id }                  (user confirmation — the only manual path to an order)
//   POST { type: 'dismiss', id }
//   POST { type: 'watch_add', venue, symbol, intervalMin?, maxPerDay? } | { type: 'watch_toggle', id } | { type: 'watch_delete', id }
//   POST { type: 'run_watches' }                  (drains due watches now; gates still apply)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    // Opportunistic autopilot drain (serverless has no worker): at most one watch per page load.
    runDueWatches(1).catch(() => {})
    return NextResponse.json({ ok: true, isAdmin, ...(await deskOverview(userId, isAdmin)) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Agent desk unavailable' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')
    if (type === 'convene') {
      const venue = String(body?.venue ?? ''); const symbol = String(body?.symbol ?? '').trim()
      if (!isPaperVenue(venue)) return NextResponse.json({ error: 'Paper venues only.' }, { status: 403 })
      const r = await convene(userId, isAdmin, venue, symbol, 'manual')
      return NextResponse.json({ ok: true, proposal: { ...r.proposal, votes: r.council.votes, guardian: r.guardian, risks: r.council.risks }, stats: r.stats, ticker: r.ticker, venueLabel: r.venueLabel })
    }
    if (type === 'execute') {
      const id = String(body?.id ?? '')
      const p = await prisma.agentDeskProposal.findFirst({ where: { id, userId } })
      if (!p) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 })
      // Organization desk rules apply exactly as on the Paper Trading Desk.
      const orgCheck = await orderGuard(userId, (session.user.email ?? '').toLowerCase(), { symbol: p.symbol, qty: Number(p.qty ?? 0), notionalUsd: p.notionalUsd ?? null, venue: p.providerKey, side: p.direction === 'BUY' ? 'buy' : 'sell', type: 'market' })
      if (orgCheck.requiresApproval) return NextResponse.json({ ok: true, pendingApproval: true, requestId: orgCheck.requestId, message: `${orgCheck.orgName} requires approval — the order was queued for a compliance/admin decision.` })
      const r = await executeProposal(userId, isAdmin, id, 'manual')
      return NextResponse.json({ ok: true, proposal: r.proposal, order: r.order })
    }
    if (type === 'dismiss') {
      await prisma.agentDeskProposal.updateMany({ where: { id: String(body?.id ?? ''), userId, status: 'proposed' }, data: { status: 'dismissed' } })
      return NextResponse.json({ ok: true })
    }
    if (type === 'watch_add') {
      const venue = String(body?.venue ?? ''); const symbol = String(body?.symbol ?? '').trim()
      if (!isPaperVenue(venue) || !symbol) return NextResponse.json({ error: 'Paper venue and symbol required.' }, { status: 400 })
      const count = await prisma.agentDeskWatch.count({ where: { userId } })
      if (count >= 6) return NextResponse.json({ error: 'Up to 6 watches per account.' }, { status: 400 })
      const intervalMin = Math.max(15, Math.min(1440, Number(body?.intervalMin) || 60))
      const maxPerDay = Math.max(1, Math.min(10, Number(body?.maxPerDay) || 4))
      const w = await prisma.agentDeskWatch.upsert({ where: { userId_providerKey_symbol: { userId, providerKey: venue, symbol } }, update: { enabled: true, intervalMin, maxPerDay }, create: { userId, providerKey: venue, symbol, intervalMin, maxPerDay } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'AGENT WATCH ADDED', category: 'agent_desk', detail: `${venue} ${symbol} every ${intervalMin} min, max ${maxPerDay}/day (paper).` } }).catch(() => {})
      return NextResponse.json({ ok: true, watch: w })
    }
    if (type === 'watch_toggle') {
      const w = await prisma.agentDeskWatch.findFirst({ where: { id: String(body?.id ?? ''), userId } })
      if (!w) return NextResponse.json({ error: 'Watch not found.' }, { status: 404 })
      const u = await prisma.agentDeskWatch.update({ where: { id: w.id }, data: { enabled: !w.enabled } })
      return NextResponse.json({ ok: true, watch: u })
    }
    if (type === 'watch_delete') {
      await prisma.agentDeskWatch.deleteMany({ where: { id: String(body?.id ?? ''), userId } })
      return NextResponse.json({ ok: true })
    }
    if (type === 'run_watches') {
      const r = await runDueWatches(3)
      return NextResponse.json({ ok: true, ...r })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    if (e instanceof ExecError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof OrgGuardError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Agent desk request failed' }, { status: 500 })
  }
}
