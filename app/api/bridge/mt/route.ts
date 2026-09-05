import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { applyMtSnapshot, authenticateBridge } from '@/lib/bridge'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// MT5/MT4 bridge EA endpoint. Token via X-Bridge-Token (or ?token=). The EA
// posts { account, positions[], deals[] } every few seconds. Read-only mirror:
// EMIL never sends instructions back to the terminal.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const token = req.headers.get('x-bridge-token') ?? url.searchParams.get('token')
  const conn = await authenticateBridge(token)
  if (!conn) return NextResponse.json({ error: 'Invalid bridge token' }, { status: 401 })
  if (conn.kind !== 'mt5' && conn.kind !== 'mt4') return NextResponse.json({ error: `This token belongs to a ${conn.kind} connection, not an MT bridge.` }, { status: 400 })
  const gate = await rateLimit(`bridge:mt:${conn.id}`, 30, 60)
  if (!gate.allowed) return NextResponse.json({ error: 'Too many snapshots — raise IntervalSec in the EA.' }, { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } })
  try {
    const snap = await req.json().catch(() => null)
    if (!snap || typeof snap !== 'object') return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
    const result = await applyMtSnapshot(conn, snap)
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('bridge snapshot failed', e)
    await prisma.bridgeConnection.update({ where: { id: conn.id }, data: { status: 'error', lastError: String(e?.message ?? 'snapshot failed').slice(0, 300) } }).catch(() => {})
    return NextResponse.json({ error: 'Snapshot rejected' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const conn = await authenticateBridge(req.headers.get('x-bridge-token') ?? new URL(req.url).searchParams.get('token'))
  if (!conn) return NextResponse.json({ error: 'Invalid bridge token' }, { status: 401 })
  return NextResponse.json({ ok: true, connection: { id: conn.id, kind: conn.kind, label: conn.label, status: conn.status, lastHeartbeatAt: conn.lastHeartbeatAt } })
}
