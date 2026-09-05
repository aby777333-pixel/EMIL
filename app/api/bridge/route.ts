import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BRIDGE_KINDS, BRIDGE_MODES, generateBridgeToken, importStatement, refreshStaleness, type BridgeKind, type BridgeMode } from '@/lib/bridge'
import { EXECUTION_VENUE_KEYS, isPaperVenue } from '@/lib/execution/router'

export const dynamic = 'force-dynamic'

// "Connect Your Platform" backend (session): bridge connections, snapshots,
// signals, statement import.
async function me() {
  const session = await getServerSession(authOptions)
  return session?.user ? { userId: (session.user as any).id as string, email: session.user.email ?? '' } : null
}

export async function GET() {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await refreshStaleness(u.userId)
    const [connections, signals, imports] = await Promise.all([
      prisma.bridgeConnection.findMany({ where: { userId: u.userId }, orderBy: { createdAt: 'desc' }, include: { positions: { orderBy: { updatedAt: 'desc' } }, deals: { orderBy: { ts: 'desc' }, take: 20 } } }),
      prisma.bridgeSignal.findMany({ where: { userId: u.userId }, orderBy: { receivedAt: 'desc' }, take: 50 }),
      prisma.journalEntry.count({ where: { userId: u.userId, sourceType: 'import' } }),
    ])
    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    return NextResponse.json({
      baseUrl: base, kinds: BRIDGE_KINDS, modes: BRIDGE_MODES, paperVenues: EXECUTION_VENUE_KEYS.filter(isPaperVenue), importedEntries: imports,
      connections: connections.map((c) => ({
        id: c.id, kind: c.kind, label: c.label, tokenPrefix: c.tokenPrefix, mode: c.mode, status: c.status, accountNumber: c.accountNumber, broker: c.broker, server: c.server, currency: c.currency,
        balance: c.balance, equity: c.equity, margin: c.margin, freeMargin: c.freeMargin, floatingPnl: c.floatingPnl, leverage: c.leverage, meta: (() => { try { return JSON.parse(c.meta ?? '{}') } catch { return {} } })(),
        lastHeartbeatAt: c.lastHeartbeatAt, lastError: c.lastError, createdAt: c.createdAt, positions: c.positions, deals: c.deals,
      })),
      signals,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load bridges' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')

    if (type === 'create') {
      const kind = String(body?.kind ?? '') as BridgeKind
      if (!(kind in BRIDGE_KINDS)) return NextResponse.json({ error: 'Unknown platform kind' }, { status: 400 })
      const count = await prisma.bridgeConnection.count({ where: { userId: u.userId } })
      if (count >= 10) return NextResponse.json({ error: 'You have 10 bridge connections — remove one first.' }, { status: 403 })
      const mode = (String(body?.mode ?? '') in BRIDGE_MODES ? String(body.mode) : kind === 'mt5' || kind === 'mt4' ? 'mirror' : 'alerts') as BridgeMode
      const label = String(body?.label ?? '').trim().slice(0, 60) || `${BRIDGE_KINDS[kind]} ${count + 1}`
      const gen = generateBridgeToken()
      const meta: any = {}
      if (mode === 'paper_copy') {
        const venue = String(body?.venue ?? '')
        if (!isPaperVenue(venue)) return NextResponse.json({ error: 'Paper copy needs a sandbox venue (deribit_testnet, gemini_sandbox, delta_exchange_testnet).' }, { status: 400 })
        meta.venue = venue
        meta.qty = Number(body?.qty) > 0 ? Number(body.qty) : undefined
        if (body?.symbolMap && typeof body.symbolMap === 'object') meta.symbolMap = body.symbolMap
      }
      const conn = await prisma.bridgeConnection.create({ data: { userId: u.userId, kind, label, tokenHash: gen.hash, tokenPrefix: gen.prefix, mode, meta: Object.keys(meta).length ? JSON.stringify(meta) : null } })
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'PLATFORM BRIDGE CREATED', category: 'bridge', detail: `${u.email} connected ${BRIDGE_KINDS[kind]} "${label}" in ${mode} mode` } }).catch(() => {})
      return NextResponse.json({ ok: true, id: conn.id, token: gen.token })
    }

    const conn = body?.id ? await prisma.bridgeConnection.findFirst({ where: { id: String(body.id), userId: u.userId } }) : null
    if (type === 'delete' || type === 'rotate' || type === 'set_mode' || type === 'clear_signals') {
      if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
      if (type === 'delete') { await prisma.bridgeConnection.delete({ where: { id: conn.id } }); return NextResponse.json({ ok: true }) }
      if (type === 'rotate') {
        const gen = generateBridgeToken()
        await prisma.bridgeConnection.update({ where: { id: conn.id }, data: { tokenHash: gen.hash, tokenPrefix: gen.prefix, status: 'pending' } })
        return NextResponse.json({ ok: true, token: gen.token })
      }
      if (type === 'set_mode') {
        const mode = String(body?.mode ?? '')
        if (!(mode in BRIDGE_MODES)) return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
        const meta = (() => { try { return JSON.parse(conn.meta ?? '{}') } catch { return {} } })()
        if (mode === 'paper_copy') {
          if (!isPaperVenue(String(body?.venue ?? meta.venue ?? ''))) return NextResponse.json({ error: 'Paper copy needs a sandbox venue.' }, { status: 400 })
          meta.venue = String(body?.venue ?? meta.venue)
          if (Number(body?.qty) > 0) meta.qty = Number(body.qty)
        }
        await prisma.bridgeConnection.update({ where: { id: conn.id }, data: { mode, meta: JSON.stringify(meta) } })
        return NextResponse.json({ ok: true })
      }
      await prisma.bridgeSignal.deleteMany({ where: { connectionId: conn.id } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'import') {
      const text = String(body?.csv ?? '')
      if (!text.trim()) return NextResponse.json({ error: 'Paste or upload a CSV first.' }, { status: 400 })
      if (text.length > 4_000_000) return NextResponse.json({ error: 'File too large (4 MB max).' }, { status: 413 })
      const r = await importStatement(u.userId, text, String(body?.label ?? 'statement').slice(0, 60))
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'STATEMENT IMPORTED', category: 'bridge', detail: `${u.email} imported ${r.created} trades (${r.duplicates} duplicates, ${r.skipped} skipped)` } }).catch(() => {})
      return NextResponse.json({ ok: true, ...r })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
