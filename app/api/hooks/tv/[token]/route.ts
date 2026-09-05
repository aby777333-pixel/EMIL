import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateBridge } from '@/lib/bridge'
import { deliverNotification } from '@/lib/notify'
import { emitEvent } from '@/lib/webhooks'
import { rateLimit } from '@/lib/rate-limit'
import { isPaperVenue, placeGuarded } from '@/lib/execution/router'
import { toTwelveData } from '@/lib/instruments/catalog'

export const dynamic = 'force-dynamic'

// TradingView / generic inbound alert webhook: POST /api/hooks/tv/<token>
// Body: JSON { symbol, action, price, message, qty? } or TradingView's plain
// text message. What EMIL does depends on the connection mode:
//   alerts     → in-app notification (+ Telegram/email/webhooks fan-out)
//   journal    → notification + journal entry
//   paper_copy → notification + PAPER order on the connection's sandbox venue
// Never a live order. Rate-limited per token.

const ACTION_RE = /\b(buy|long|sell|short|close|exit|flat|alert|journal)\b/i
const SYMBOL_RE = /\b([A-Z]{2,12}(?:[\/:.-][A-Z0-9]{2,12})?)\b/

function parseBody(raw: string): { symbol: string | null; action: string | null; price: number | null; qty: number | null; message: string } {
  let j: any = null
  try { j = JSON.parse(raw) } catch { /* plain text */ }
  if (j && typeof j === 'object') {
    const sym = j.symbol ?? j.ticker ?? j.instrument ?? null
    const act = String(j.action ?? j.side ?? j.signal ?? j.order ?? '').toLowerCase() || null
    return { symbol: sym ? String(sym).toUpperCase().slice(0, 24) : null, action: act, price: isFinite(Number(j.price ?? j.close)) ? Number(j.price ?? j.close) : null, qty: isFinite(Number(j.qty ?? j.quantity ?? j.contracts)) ? Number(j.qty ?? j.quantity ?? j.contracts) : null, message: String(j.message ?? j.comment ?? raw).slice(0, 2000) }
  }
  const text = raw.slice(0, 2000)
  const a = text.match(ACTION_RE)
  const s = text.replace(/\b(BUY|SELL|LONG|SHORT|CLOSE|EXIT|FLAT|ALERT|JOURNAL)\b/g, '').match(SYMBOL_RE)
  const p = text.match(/(?:price|@|at)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  return { symbol: s ? s[1].toUpperCase() : null, action: a ? a[1].toLowerCase() : null, price: p ? Number(p[1]) : null, qty: null, message: text }
}

const normAction = (a: string | null) => (!a ? 'alert' : /buy|long/.test(a) ? 'buy' : /sell|short/.test(a) ? 'sell' : /close|exit|flat/.test(a) ? 'close' : a === 'journal' ? 'journal' : 'alert')

export async function POST(req: Request, ctx: { params: { token: string } }) {
  const conn = await authenticateBridge(ctx.params.token)
  if (!conn) return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
  if (conn.kind !== 'tradingview' && conn.kind !== 'generic') return NextResponse.json({ error: `This token belongs to a ${conn.kind} connection.` }, { status: 400 })
  const gate = await rateLimit(`bridge:tv:${conn.id}`, 60, 60)
  if (!gate.allowed) return NextResponse.json({ error: 'Too many signals' }, { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } })

  const raw = (await req.text().catch(() => '')).slice(0, 5000)
  const parsed = parseBody(raw)
  const action = normAction(parsed.action)
  const handled: string[] = []
  let result = ''
  const meta = (() => { try { return JSON.parse(conn.meta ?? '{}') } catch { return {} } })()

  const signal = await prisma.bridgeSignal.create({ data: { connectionId: conn.id, userId: conn.userId, source: conn.kind, symbol: parsed.symbol, action, price: parsed.price, message: parsed.message } })
  await prisma.bridgeConnection.update({ where: { id: conn.id }, data: { status: 'connected', lastHeartbeatAt: new Date(), lastError: null } }).catch(() => {})

  // 1. Notify (all modes)
  const title = `${conn.label}: ${action.toUpperCase()}${parsed.symbol ? ` ${parsed.symbol}` : ''}${parsed.price ? ` @ ${parsed.price}` : ''}`
  const n = { title, body: parsed.message.slice(0, 400), href: '/bridge' }
  await prisma.notification.create({ data: { userId: conn.userId, kind: 'broker', ...n } }).catch(() => {})
  deliverNotification(conn.userId, n).catch(() => {})
  handled.push('notified')

  // 2. Journal (journal + paper_copy modes, or explicit journal action)
  if ((conn.mode === 'journal' || conn.mode === 'paper_copy' || action === 'journal') && parsed.symbol) {
    await prisma.journalEntry.create({
      data: { userId: conn.userId, sourceType: 'signal', sourceId: signal.id, symbol: parsed.symbol, side: action === 'buy' ? 'buy' : action === 'sell' ? 'sell' : null, qty: parsed.qty, entryPrice: parsed.price, notes: `Signal from ${conn.label} (${conn.kind}): ${parsed.message.slice(0, 1000)}`, tags: `signal,${conn.kind}` },
    }).catch(() => {})
    handled.push('journaled')
  }

  // 3. Paper copy (sandbox venue only, guarded)
  if (conn.mode === 'paper_copy' && (action === 'buy' || action === 'sell') && parsed.symbol) {
    const venue = String(meta.venue ?? '')
    const symbolMap: Record<string, string> = meta.symbolMap && typeof meta.symbolMap === 'object' ? meta.symbolMap : {}
    const venueSymbol = symbolMap[parsed.symbol] ?? symbolMap[toTwelveData(parsed.symbol).symbol] ?? parsed.symbol
    const qty = Number(parsed.qty ?? meta.qty ?? 0)
    if (!isPaperVenue(venue)) result = 'paper copy skipped: no sandbox venue configured on this connection'
    else if (!(qty > 0)) result = 'paper copy skipped: no qty in the signal and no default qty on the connection'
    else {
      try {
        const r = await placeGuarded({ userId: conn.userId, isAdmin: false, venueKey: venue, req: { symbol: venueSymbol, side: action, type: parsed.price ? 'limit' : 'market', qty, price: parsed.price ?? undefined } })
        handled.push(`paper_order:${r.record?.id ?? r.order?.id ?? 'ok'}`)
        result = `paper ${action} ${qty} ${venueSymbol} on ${venue}: ${r.order?.status ?? 'submitted'}`
      } catch (e: any) {
        result = `paper copy rejected: ${String(e?.message ?? 'guard').slice(0, 200)}`
      }
    }
  }

  emitEvent(conn.userId, 'signal.received', { connectionId: conn.id, label: conn.label, symbol: parsed.symbol, action, price: parsed.price, handled, result }).catch(() => {})
  handled.push('webhook')
  await prisma.bridgeSignal.update({ where: { id: signal.id }, data: { handled: handled.join(','), result: result || null } }).catch(() => {})
  return NextResponse.json({ ok: true, signalId: signal.id, action, symbol: parsed.symbol, handled, result: result || null })
}

// TradingView sends POST only; GET is a friendly probe for humans.
export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const conn = await authenticateBridge(ctx.params.token)
  if (!conn) return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
  return NextResponse.json({ ok: true, connection: conn.label, kind: conn.kind, mode: conn.mode, usage: 'POST a JSON body { "symbol": "{{ticker}}", "action": "buy", "price": {{close}}, "message": "…" } or plain text.' })
}
