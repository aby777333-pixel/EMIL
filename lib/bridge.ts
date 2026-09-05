// Platform bridges (round B): the trader's own platform pushes into EMIL.
//   • MT5 / MT4 bridge EA → POST /api/bridge/mt (account, positions, deals)
//   • TradingView / any system → POST /api/hooks/tv/<token> (alerts)
//   • Statement import → CSV rows → journal entries
// Bridge tokens are hashed at rest; the plain token is shown once.
// Mirrored numbers are the trader's REAL account state — they feed the
// portfolio, the drawdown watch and the journal, never autonomous execution.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { deliverNotification } from '@/lib/notify'
import { emitEvent } from '@/lib/webhooks'
import { rateLimit } from '@/lib/rate-limit'

export const BRIDGE_TOKEN_PREFIX = 'emil_bridge_'
export const BRIDGE_KINDS = { mt5: 'MetaTrader 5 (bridge EA)', mt4: 'MetaTrader 4 (bridge EA)', tradingview: 'TradingView alerts (webhook)', generic: 'Any system (generic webhook)' } as const
export type BridgeKind = keyof typeof BRIDGE_KINDS
export const BRIDGE_MODES = {
  mirror: 'Mirror — account, positions and fills appear in EMIL (read-only)',
  alerts: 'Alerts — every incoming signal becomes an EMIL notification',
  journal: 'Journal — signals are notified and written to the trade journal',
  paper_copy: 'Paper copy — signals are notified and copied as PAPER orders on a sandbox venue',
} as const
export type BridgeMode = keyof typeof BRIDGE_MODES

export const STALE_AFTER_SEC = 120

export function generateBridgeToken() {
  const token = `${BRIDGE_TOKEN_PREFIX}${randomBytes(24).toString('hex')}`
  return { token, prefix: token.slice(0, BRIDGE_TOKEN_PREFIX.length + 6), hash: hashBridgeToken(token) }
}
export function hashBridgeToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function authenticateBridge(token: string | null | undefined) {
  if (!token || !token.startsWith(BRIDGE_TOKEN_PREFIX)) return null
  const conn = await prisma.bridgeConnection.findUnique({ where: { tokenHash: hashBridgeToken(token) } })
  return conn ?? null
}

const num = (v: any): number | null => (v === undefined || v === null || v === '' || !isFinite(Number(v)) ? null : Number(v))
const str = (v: any, max = 64): string | null => (v === undefined || v === null ? null : String(v).slice(0, max))
const when = (v: any): Date | null => {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000)
  const d = new Date(String(v).replace(/\./g, '-').replace(' ', 'T'))
  return isNaN(d.getTime()) ? null : d
}

export type MtSnapshot = {
  account?: { login?: any; broker?: any; server?: any; currency?: any; balance?: any; equity?: any; margin?: any; freeMargin?: any; profit?: any; leverage?: any; build?: any }
  positions?: any[]
  deals?: any[]
}

// Apply an MT5/MT4 snapshot: account fields, replace the open-position set,
// append new deals (ticket-deduplicated), then run the drawdown watch.
export async function applyMtSnapshot(conn: { id: string; userId: string; equity: number | null; balance: number | null }, snap: MtSnapshot) {
  const a = snap.account ?? {}
  const positions = Array.isArray(snap.positions) ? snap.positions.slice(0, 500) : []
  const deals = Array.isArray(snap.deals) ? snap.deals.slice(0, 500) : []
  const balance = num(a.balance)
  const equity = num(a.equity)

  await prisma.bridgeConnection.update({
    where: { id: conn.id },
    data: {
      status: 'connected', lastError: null, lastHeartbeatAt: new Date(),
      accountNumber: str(a.login, 40), broker: str(a.broker, 80), server: str(a.server, 80), currency: str(a.currency, 8),
      balance, equity, margin: num(a.margin), freeMargin: num(a.freeMargin), floatingPnl: num(a.profit), leverage: num(a.leverage) ? Math.round(num(a.leverage) as number) : null,
      meta: JSON.stringify({ terminalBuild: str(a.build, 20) }),
    },
  })

  // Positions: upsert the snapshot, delete tickets no longer open.
  const tickets = positions.map((p) => String(p?.ticket ?? '')).filter(Boolean)
  for (const p of positions) {
    const ticket = String(p?.ticket ?? '')
    if (!ticket || !p?.symbol) continue
    const data = {
      symbol: String(p.symbol).slice(0, 24), side: /sell|short|1/i.test(String(p.type ?? p.side ?? 'buy')) && !/buy/i.test(String(p.type ?? p.side ?? '')) ? 'sell' : 'buy',
      volume: num(p.volume) ?? 0, entryPrice: num(p.price ?? p.entryPrice), currentPrice: num(p.current ?? p.currentPrice), sl: num(p.sl), tp: num(p.tp), profit: num(p.profit), swap: num(p.swap),
      openedAt: when(p.time ?? p.openedAt), updatedAt: new Date(),
    }
    await prisma.bridgePosition.upsert({ where: { connectionId_ticket: { connectionId: conn.id, ticket } }, update: data, create: { connectionId: conn.id, userId: conn.userId, ticket, ...data } })
  }
  await prisma.bridgePosition.deleteMany({ where: { connectionId: conn.id, ...(tickets.length ? { ticket: { notIn: tickets } } : {}) } })

  // Deals: insert unseen tickets only.
  let newDeals = 0
  for (const d of deals) {
    const ticket = String(d?.ticket ?? '')
    if (!ticket || !d?.symbol) continue
    const created = await prisma.bridgeDeal.createMany({
      data: [{ connectionId: conn.id, userId: conn.userId, ticket, symbol: String(d.symbol).slice(0, 24), side: /sell|short|1/i.test(String(d.type ?? d.side ?? 'buy')) && !/buy/i.test(String(d.type ?? d.side ?? '')) ? 'sell' : 'buy', volume: num(d.volume) ?? 0, price: num(d.price), profit: num(d.profit), commission: num(d.commission), swap: num(d.swap), ts: when(d.time) ?? new Date() }],
      skipDuplicates: true,
    })
    newDeals += created.count
  }

  // Drawdown watch on the REAL account: floating loss vs the active risk profile's daily limit.
  if (balance && equity !== null && balance > 0) {
    const ddPct = ((balance - equity) / balance) * 100
    const profile = await prisma.riskProfile.findFirst({ where: { isActive: true } }).catch(() => null)
    const limit = profile?.dailyLossLimitPct ?? 2
    if (ddPct >= limit) {
      const gate = await rateLimit(`bridge:dd:${conn.id}`, 1, 3600)
      if (gate.allowed) {
        const n = { title: `Live account drawdown ${ddPct.toFixed(2)}% ≥ ${limit}% limit`, body: `Mirrored account equity ${equity.toFixed(2)} vs balance ${balance.toFixed(2)}. EMIL does not close positions on your platform — this is a warning on your real numbers.`, href: '/bridge' }
        await prisma.notification.create({ data: { userId: conn.userId, kind: 'risk', ...n } }).catch(() => {})
        deliverNotification(conn.userId, n).catch(() => {})
      }
    }
  }

  emitEvent(conn.userId, 'account.synced', { connectionId: conn.id, balance, equity, positions: tickets.length, newDeals }).catch(() => {})
  return { positions: tickets.length, newDeals }
}

// Mark connections that stopped sending as stale (called from readers).
export async function refreshStaleness(userId: string) {
  const stale = await prisma.bridgeConnection.findMany({ where: { userId, status: 'connected', kind: { in: ['mt5', 'mt4'] }, lastHeartbeatAt: { lt: new Date(Date.now() - STALE_AFTER_SEC * 1000) } } }).catch(() => [])
  if (stale.length === 0) return
  await prisma.bridgeConnection.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { status: 'stale' } }).catch(() => {})
  // Integration health: one notification per connection per hour while it stays silent.
  for (const s of stale) {
    const gate = await rateLimit(`bridge:stale:${s.id}`, 1, 3600)
    if (!gate.allowed) continue
    const n = { title: `${s.label}: terminal stopped sending`, body: `No snapshot for ${Math.round((Date.now() - new Date(s.lastHeartbeatAt ?? 0).getTime()) / 60000)} minutes. Check that MetaTrader is open, Algo Trading is on and the EA is attached.`, href: '/bridge' }
    await prisma.notification.create({ data: { userId, kind: 'broker', ...n } }).catch(() => {})
    deliverNotification(userId, n).catch(() => {})
  }
}

// ---- Statement import ------------------------------------------------------
// Flexible CSV: header aliases cover MT5 deal reports, IBKR Flex trade
// confirmations and Zerodha tradebooks. Each row becomes a journal entry with
// sourceType 'import' and a row hash as sourceId (idempotent re-imports).
const ALIASES: Record<string, string[]> = {
  time: ['time', 'date', 'trade_date', 'datetime', 'date/time', 'order_execution_time', 'tradedate', 'time (utc)'],
  symbol: ['symbol', 'tradingsymbol', 'instrument', 'ticker', 'contract'],
  side: ['type', 'side', 'trade_type', 'buy/sell', 'direction', 'action'],
  qty: ['volume', 'quantity', 'qty', 'lots', 'size', 'filled'],
  price: ['price', 'tradeprice', 'trade_price', 'avg price', 'fill price', 'average price'],
  profit: ['profit', 'pnl', 'realized p/l', 'realizedpnl', 'net p&l', 'p&l', 'fifopnlrealized'],
  commission: ['commission', 'fees', 'ibcommission', 'charges'],
  comment: ['comment', 'notes', 'order_id', 'trade_id', 'ticket', 'deal'],
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []; let cell = ''; let q = false
  const t = text.replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c; continue }
    if (c === '"') q = true
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

export function parseStatement(text: string): { rows: { time: Date; symbol: string; side: 'buy' | 'sell' | null; qty: number | null; price: number | null; profit: number | null; commission: number | null; comment: string | null; hash: string }[]; skipped: number; columns: string[] } {
  const grid = parseCsv(text)
  if (grid.length < 2) return { rows: [], skipped: 0, columns: [] }
  // Header row = first row where at least symbol + (time or price) aliases match.
  let hIdx = 0
  let map: Record<string, number> = {}
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const cells = grid[i].map((c) => c.trim().toLowerCase())
    const m: Record<string, number> = {}
    for (const [field, names] of Object.entries(ALIASES)) {
      const idx = cells.findIndex((c) => names.includes(c))
      if (idx >= 0) m[field] = idx
    }
    if (m.symbol !== undefined && (m.time !== undefined || m.price !== undefined)) { hIdx = i; map = m; break }
  }
  if (map.symbol === undefined) return { rows: [], skipped: grid.length - 1, columns: grid[0] }
  const out: any[] = []
  let skipped = 0
  for (const r of grid.slice(hIdx + 1)) {
    const g = (f: string) => (map[f] !== undefined ? String(r[map[f]] ?? '').trim() : '')
    const symbol = g('symbol').toUpperCase().slice(0, 24)
    const time = when(g('time'))
    if (!symbol || !time) { skipped += 1; continue }
    const sideRaw = g('side').toLowerCase()
    const side: 'buy' | 'sell' | null = /sell|short|^s$/.test(sideRaw) ? 'sell' : /buy|long|^b$/.test(sideRaw) ? 'buy' : null
    const qty = num(g('qty').replace(/[^0-9.\-]/g, ''))
    const price = num(g('price').replace(/[^0-9.\-]/g, ''))
    const profit = num(g('profit').replace(/[^0-9.\-]/g, ''))
    const commission = num(g('commission').replace(/[^0-9.\-]/g, ''))
    const comment = g('comment') || null
    const hash = createHash('sha1').update([time.toISOString(), symbol, side, qty, price, profit, comment].join('|')).digest('hex').slice(0, 24)
    out.push({ time, symbol, side, qty: qty === null ? null : Math.abs(qty), price, profit, commission, comment, hash })
  }
  return { rows: out, skipped, columns: grid[hIdx] }
}

export async function importStatement(userId: string, text: string, label: string) {
  const parsed = parseStatement(text)
  let created = 0; let duplicates = 0
  for (const r of parsed.rows) {
    const dup = await prisma.journalEntry.findFirst({ where: { userId, sourceType: 'import', sourceId: r.hash }, select: { id: true } })
    if (dup) { duplicates += 1; continue }
    await prisma.journalEntry.create({
      data: { userId, sourceType: 'import', sourceId: r.hash, symbol: r.symbol, side: r.side, qty: r.qty, entryPrice: r.price, pnl: r.profit, notes: `Imported from ${label}${r.comment ? ` · ${r.comment}` : ''}${r.commission ? ` · commission ${r.commission}` : ''}`, tags: 'import', tradedAt: r.time },
    })
    created += 1
  }
  return { created, duplicates, skipped: parsed.skipped, parsed: parsed.rows.length, columns: parsed.columns }
}
