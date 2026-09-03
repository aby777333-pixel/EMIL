// Deribit options analytics (spec §25) from the PUBLIC book summary — every
// listed BTC/ETH option with mark price, mark IV, bid/ask, open interest and
// volume in one call. EMIL derives the chain, ATM IV, put/call open interest,
// max pain and a strike-based skew per expiry. Research only.

import { cachedFetch } from '@/lib/data/hub'
import { num, timeoutFetch } from '@/lib/execution/types'

export type OptionRow = {
  name: string
  expiry: string      // 26SEP26
  expiryTs: number
  strike: number
  type: 'C' | 'P'
  mark?: number       // in underlying (BTC) terms, as Deribit quotes
  markUsd?: number
  iv?: number         // mark IV %
  bid?: number
  ask?: number
  oi?: number         // contracts (= underlying units)
  volume?: number
  underlying?: number
}

const MONTHS: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 }

export function parseOptionName(name: string): { expiry: string; expiryTs: number; strike: number; type: 'C' | 'P' } | null {
  const m = /^[A-Z]+-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/.exec(name)
  if (!m) return null
  const [, d, mon, yy, strike, type] = m
  const month = MONTHS[mon]
  if (month === undefined) return null
  const expiryTs = Date.UTC(2000 + Number(yy), month, Number(d), 8, 0, 0) // Deribit expiries: 08:00 UTC
  return { expiry: `${d}${mon}${yy}`, expiryTs, strike: Number(strike), type: type as 'C' | 'P' }
}

async function bookSummary(currency: 'BTC' | 'ETH'): Promise<OptionRow[]> {
  const res = await timeoutFetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`, {}, 15000)
  const json = await res.json().catch(() => null)
  if (!res.ok || !Array.isArray(json?.result)) throw new Error(json?.error?.message ?? `Deribit responded ${res.status}`)
  const rows: OptionRow[] = []
  for (const r of json.result) {
    const p = parseOptionName(String(r.instrument_name ?? ''))
    if (!p) continue
    const underlying = num(r.underlying_price) ?? num(r.estimated_delivery_price)
    const mark = num(r.mark_price)
    rows.push({
      name: r.instrument_name, ...p,
      mark, markUsd: mark !== undefined && underlying ? mark * underlying : undefined,
      iv: num(r.mark_iv), bid: num(r.bid_price), ask: num(r.ask_price), oi: num(r.open_interest), volume: num(r.volume), underlying,
    })
  }
  return rows
}

function maxPain(rows: OptionRow[]): number | null {
  const strikes = Array.from(new Set(rows.map((r) => r.strike))).sort((a, b) => a - b)
  if (!strikes.length) return null
  let best: { strike: number; pain: number } | null = null
  for (const s of strikes) {
    let pain = 0
    for (const r of rows) {
      const oi = r.oi ?? 0
      if (!oi) continue
      pain += r.type === 'C' ? Math.max(0, s - r.strike) * oi : Math.max(0, r.strike - s) * oi
    }
    if (!best || pain < best.pain) best = { strike: s, pain }
  }
  return best?.strike ?? null
}

function nearest(rows: OptionRow[], target: number): OptionRow | undefined {
  let out: OptionRow | undefined
  for (const r of rows) if (!out || Math.abs(r.strike - target) < Math.abs(out.strike - target)) out = r
  return out
}

export async function optionsChain(currency: 'BTC' | 'ETH', expiry?: string) {
  const all = await cachedFetch(`deribit_options_${currency}_v1`, 60, async () => ({
    provider: 'deribit', fetchedAt: new Date().toISOString(), rows: await bookSummary(currency),
  }))
  const rows: OptionRow[] = all.rows ?? []
  const now = Date.now()
  const underlying = rows.find((r) => r.underlying)?.underlying ?? null
  const byExpiry = new Map<string, OptionRow[]>()
  for (const r of rows) {
    if (r.expiryTs < now) continue
    if (!byExpiry.has(r.expiry)) byExpiry.set(r.expiry, [])
    byExpiry.get(r.expiry)!.push(r)
  }
  const expiries = Array.from(byExpiry.entries())
    .map(([exp, list]) => {
      const calls = list.filter((r) => r.type === 'C')
      const puts = list.filter((r) => r.type === 'P')
      const spot = list.find((r) => r.underlying)?.underlying ?? underlying ?? 0
      const atmC = spot ? nearest(calls, spot) : undefined
      const atmP = spot ? nearest(puts, spot) : undefined
      const ivs = [atmC?.iv, atmP?.iv].filter((x): x is number => typeof x === 'number')
      const atmIv = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null
      const put90 = spot ? nearest(puts, spot * 0.9) : undefined
      const call110 = spot ? nearest(calls, spot * 1.1) : undefined
      const skew = put90?.iv !== undefined && call110?.iv !== undefined ? put90.iv - call110.iv : null
      const callOi = calls.reduce((a, r) => a + (r.oi ?? 0), 0)
      const putOi = puts.reduce((a, r) => a + (r.oi ?? 0), 0)
      return {
        expiry: exp, expiryTs: list[0].expiryTs, daysToExpiry: Math.max(0, (list[0].expiryTs - now) / 86400e3),
        underlying: spot || null, strikes: new Set(list.map((r) => r.strike)).size,
        atmStrike: atmC?.strike ?? atmP?.strike ?? null, atmIv, skew90_110: skew,
        callOi, putOi, putCallOi: callOi ? putOi / callOi : null, maxPain: maxPain(list),
        volume24h: list.reduce((a, r) => a + (r.volume ?? 0), 0),
      }
    })
    .sort((a, b) => a.expiryTs - b.expiryTs)

  const selected = expiry && byExpiry.has(expiry) ? expiry : expiries[0]?.expiry
  const chainRows = selected ? byExpiry.get(selected)! : []
  const strikes = Array.from(new Set(chainRows.map((r) => r.strike))).sort((a, b) => a - b)
  const chain = strikes.map((strike) => {
    const c = chainRows.find((r) => r.strike === strike && r.type === 'C')
    const p = chainRows.find((r) => r.strike === strike && r.type === 'P')
    const pick = (r?: OptionRow) => (r ? { name: r.name, mark: r.mark, markUsd: r.markUsd, iv: r.iv, bid: r.bid, ask: r.ask, oi: r.oi, volume: r.volume } : null)
    return { strike, call: pick(c), put: pick(p) }
  })

  return {
    provider: 'deribit',
    attribution: 'Deribit public book summary (mark IV, OI, volume; cached ~60 s). Max pain and skew are EMIL calculations. Research only.',
    freshness: 'realtime' as const,
    fetchedAt: all.fetchedAt,
    cached: !!(all as any).cached,
    stale: !!(all as any).stale,
    // Headline underlying = the nearest expiry's reference (closest to spot);
    // far-dated rows reference futures that trade at a basis.
    currency, underlying: expiries[0]?.underlying ?? underlying, expiries, selectedExpiry: selected ?? null, chain,
    totals: { instruments: rows.length, callOi: expiries.reduce((a, e) => a + e.callOi, 0), putOi: expiries.reduce((a, e) => a + e.putOi, 0) },
  }
}
