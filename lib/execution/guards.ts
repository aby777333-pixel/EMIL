// Execution protections (spec §61–62) — the pre-trade checks every order
// passes through the guarded router, plus realised-slippage accounting.
// Deterministic, venue-agnostic, and deliberately conservative: when a quote
// is stale, slow, wide or the order looks like a fat finger / duplicate, the
// order is REFUSED with a plain-language reason. Nothing here places orders.

import { prisma } from '@/lib/db'
import { evaluateBreakers } from '@/lib/breakers'
import type { OrderRequest, VenueAdapter, VenueInstrument, VenueTicker } from './types'

export const EXECUTION_GUARDS = {
  maxQuoteAgeMs: Number(process.env.EMIL_MAX_QUOTE_AGE_MS ?? 10_000),
  maxQuoteLatencyMs: Number(process.env.EMIL_MAX_QUOTE_LATENCY_MS ?? 3_000),
  maxSpreadBps: Number(process.env.EMIL_MAX_SPREAD_BPS ?? 60),
  maxLimitDeviationPct: Number(process.env.EMIL_MAX_LIMIT_DEVIATION_PCT ?? 5),
  slippageAlertBps: Number(process.env.EMIL_SLIPPAGE_ALERT_BPS ?? 25),
  duplicateWindowSec: 5,
  maxOrdersPerDay: Number(process.env.EMIL_MAX_ORDERS_PER_DAY ?? 200),
}

export class GuardError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export type GuardOutcome = {
  ref: number | undefined
  ticker: VenueTicker | null
  quoteLatencyMs: number | null
  spreadBps: number | null
  notes: string[]
}

const tsMs = (ts: number | undefined) => (ts === undefined ? undefined : ts < 1e12 ? ts * 1000 : ts)

export async function preTradeGuards(args: { userId: string; venueKey: string; paper: boolean; req: OrderRequest; adapter: VenueAdapter; inst?: VenueInstrument }): Promise<GuardOutcome> {
  const { userId, venueKey, paper, req, adapter } = args
  const G = EXECUTION_GUARDS
  const notes: string[] = []
  const now = Date.now()

  // 1. Duplicate-order guard (same user, venue, symbol, side, qty within a few seconds).
  const dup = await prisma.venueOrder.findFirst({
    where: { userId, providerKey: venueKey, symbol: req.symbol, side: req.side, qty: req.qty, createdAt: { gte: new Date(now - G.duplicateWindowSec * 1000) }, status: { notIn: ['error', 'rejected'] } },
    select: { id: true, createdAt: true },
  })
  if (dup) throw new GuardError(409, `Duplicate order: an identical ${req.side} ${req.qty} ${req.symbol} was sent ${Math.round((now - dup.createdAt.getTime()) / 1000)}s ago. Wait ${G.duplicateWindowSec}s or change the size.`)

  // 2. Per-day order budget.
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
  const today = await prisma.venueOrder.count({ where: { userId, createdAt: { gte: dayStart } } })
  if (today >= G.maxOrdersPerDay) throw new GuardError(429, `Daily order budget reached (${G.maxOrdersPerDay} orders per UTC day).`)

  // 3. Circuit breakers: live orders are refused while a disarm-class breaker is tripped; paper orders proceed with a note.
  const report = await evaluateBreakers({ enforce: false }).catch(() => null)
  const trippedDisarm = report?.breakers.filter((b) => b.state === 'tripped' && b.action === 'disarm') ?? []
  if (trippedDisarm.length) {
    const list = trippedDisarm.map((b) => b.label).join(', ')
    if (!paper) throw new GuardError(423, `Circuit breaker tripped (${list}) — live orders are refused until it clears.`)
    notes.push(`breakers tripped: ${list} (paper venue, allowed)`)
  }

  // 4. Quote freshness, latency and spread.
  const t0 = Date.now()
  const ticker = await adapter.ticker(req.symbol).catch(() => null)
  const quoteLatencyMs = ticker ? Date.now() - t0 : null
  let spreadBps: number | null = null
  if (ticker) {
    if (quoteLatencyMs !== null && quoteLatencyMs > G.maxQuoteLatencyMs) throw new GuardError(503, `Quote latency ${quoteLatencyMs} ms exceeds ${G.maxQuoteLatencyMs} ms — venue is slow; not sending.`)
    const age = tsMs(ticker.ts) !== undefined ? Date.now() - (tsMs(ticker.ts) as number) : null
    if (age !== null && age > G.maxQuoteAgeMs) {
      // Live: refuse. Paper/sandbox venues (Gemini sandbox especially) stamp the LAST TRADE time, which
      // can be minutes old on a quiet test book while the quote itself is fine — note it, don't block.
      if (!paper) throw new GuardError(503, `Quote is ${Math.round(age / 1000)}s old (limit ${G.maxQuoteAgeMs / 1000}s) — stale market data; not sending.`)
      notes.push(`quote timestamp ${Math.round(age / 1000)}s old (paper venue, allowed)`)
    }
    if (ticker.bid && ticker.ask && ticker.ask > 0 && ticker.bid > 0) {
      const mid = (ticker.bid + ticker.ask) / 2
      spreadBps = ((ticker.ask - ticker.bid) / mid) * 1e4
      if (req.type === 'market' && spreadBps > G.maxSpreadBps) throw new GuardError(400, `Spread ${spreadBps.toFixed(1)} bps is wider than ${G.maxSpreadBps} bps — a market order would pay it; use a limit or wait.`)
      if (spreadBps > G.maxSpreadBps) notes.push(`wide spread ${spreadBps.toFixed(1)} bps`)
    }
  } else {
    if (req.type === 'market') throw new GuardError(503, 'No quote available for this instrument right now — market orders need a live reference price.')
    notes.push('no quote at send time')
  }
  const ref = ticker?.mark ?? ticker?.last ?? (req.side === 'buy' ? ticker?.ask : ticker?.bid)

  // 5. Fat-finger guard for limit prices.
  if (req.type === 'limit' && ref && req.price) {
    const dev = (Math.abs(req.price - ref) / ref) * 100
    if (dev > G.maxLimitDeviationPct) throw new GuardError(400, `Limit ${req.price} is ${dev.toFixed(1)}% away from the reference ${ref} (limit ${G.maxLimitDeviationPct}%) — refused as a possible fat finger.`)
  }

  return { ref, ticker, quoteLatencyMs, spreadBps, notes }
}

/** Positive = adverse (paid more on a buy / received less on a sell), in basis points of the reference. */
export function realizedSlippageBps(side: 'buy' | 'sell', ref: number, fill: number): number {
  if (!ref || !fill) return 0
  const raw = ((fill - ref) / ref) * 1e4
  return side === 'buy' ? raw : -raw
}
