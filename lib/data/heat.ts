// Market heat & breadth (spec §12–13) — CALCULATED from feeds the hub already
// caches for free: ECB reference rates via Frankfurter (FX strength vs USD,
// 1-day and 5-day), CoinGecko top-25 (24h / 7d), and the Twelve Data research
// board (ETF proxies, labelled). Breadth = share of instruments up per group.
// Daily/delayed research data, never execution prices.

import { cachedFetch, timeoutFetch, cryptoMarkets, marketBoard } from './hub'

export type HeatTile = { key: string; label: string; group: string; change1: number | null; change2: number | null; weight: number; price: number | null; note?: string }
export type Breadth = { group: string; count: number; up: number; down: number; flat: number; avgChange: number | null; best: HeatTile | null; worst: HeatTile | null }

const FX_NAMES: Record<string, string> = {
  EUR: 'Euro', GBP: 'Pound', JPY: 'Yen', CHF: 'Franc', AUD: 'Aussie', NZD: 'Kiwi', CAD: 'Loonie', SEK: 'Krona', NOK: 'Krone', DKK: 'Danish krone',
  CNY: 'Yuan', INR: 'Rupee', KRW: 'Won', SGD: 'Sing dollar', HKD: 'HK dollar', MXN: 'Peso', BRL: 'Real', ZAR: 'Rand', TRY: 'Lira', PLN: 'Zloty',
  CZK: 'Koruna', HUF: 'Forint', ILS: 'Shekel', THB: 'Baht', IDR: 'Rupiah', MYR: 'Ringgit', PHP: 'Philippine peso', RON: 'Leu', ISK: 'Krona (IS)', BGN: 'Lev',
}
const G10 = new Set(['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SEK', 'NOK'])

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** FX strength vs USD from ECB daily reference rates: positive = the currency strengthened against the dollar. */
export async function fxHeat() {
  return cachedFetch('fx_heat_v1', 3600, async () => {
    const to = new Date(); const from = new Date(to.getTime() - 14 * 86400e3)
    const res = await timeoutFetch(`https://api.frankfurter.dev/v1/${iso(from)}..${iso(to)}?base=USD`, {}, 12000)
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`)
    const d = await res.json()
    const dates = Object.keys(d?.rates ?? {}).sort()
    if (dates.length < 2) throw new Error('Not enough FX history')
    const last = d.rates[dates[dates.length - 1]], prev = d.rates[dates[dates.length - 2]], wk = d.rates[dates[Math.max(0, dates.length - 6)]]
    const tiles: HeatTile[] = Object.keys(last).filter((c) => c !== 'USD').map((c) => {
      // USD/CCY rate up = CCY weaker; invert so the tile reads as the currency's own move.
      const ch = (now: number, then: number) => (then && now ? ((then / now) - 1) * 100 : null)
      return { key: c, label: `${c} · ${FX_NAMES[c] ?? c}`, group: G10.has(c) ? 'G10 FX' : 'EM & other FX', change1: ch(last[c], prev[c]), change2: ch(last[c], wk[c]), weight: G10.has(c) ? 2 : 1, price: last[c] ? 1 / last[c] : null, note: `USD/${c} ${last[c]}` }
    })
    return { provider: 'frankfurter', attribution: 'ECB reference rates via Frankfurter — one fixing per business day', freshness: 'daily' as const, fetchedAt: new Date().toISOString(), referenceDate: dates[dates.length - 1], previousDate: dates[dates.length - 2], weekDate: dates[Math.max(0, dates.length - 6)], tiles }
  })
}

export async function marketHeat() {
  const [fx, crypto, board] = await Promise.all([fxHeat().catch(() => null), cryptoMarkets(25).catch(() => null), marketBoard().catch(() => null)])
  const tiles: HeatTile[] = []
  if (fx) tiles.push(...(fx as any).tiles)
  for (const c of ((crypto as any)?.data ?? []) as any[]) {
    tiles.push({ key: c.symbol, label: `${c.symbol} · ${c.name}`, group: 'Crypto (24h / 7d)', change1: c.change24hPct ?? null, change2: c.change7dPct ?? null, weight: Math.max(1, Math.log10(Math.max(1, c.marketCap ?? 1)) - 8), price: c.price ?? null, note: c.marketCap ? `mcap $${Math.round(c.marketCap / 1e9)}B` : undefined })
  }
  for (const b of ((board as any)?.data ?? []) as any[]) {
    if (!b.available) continue
    tiles.push({ key: b.symbol, label: b.label, group: 'Indices · Metals · Energy (research board)', change1: b.changePct ?? null, change2: null, weight: 2, price: b.price ?? null, note: /proxy/i.test(b.label) ? 'ETF proxy' : undefined })
  }
  const groups = Array.from(new Set(tiles.map((t) => t.group)))
  const breadth: Breadth[] = groups.map((g) => {
    const rows = tiles.filter((t) => t.group === g && t.change1 !== null)
    const up = rows.filter((t) => (t.change1 as number) > 0.0001).length
    const down = rows.filter((t) => (t.change1 as number) < -0.0001).length
    const sorted = [...rows].sort((a, b) => (b.change1 as number) - (a.change1 as number))
    return { group: g, count: rows.length, up, down, flat: rows.length - up - down, avgChange: rows.length ? rows.reduce((s, t) => s + (t.change1 as number), 0) / rows.length : null, best: sorted[0] ?? null, worst: sorted[sorted.length - 1] ?? null }
  })
  return {
    fetchedAt: new Date().toISOString(),
    tiles, breadth,
    sources: {
      fx: fx ? { attribution: (fx as any).attribution, referenceDate: (fx as any).referenceDate, previousDate: (fx as any).previousDate, weekDate: (fx as any).weekDate, stale: !!(fx as any).stale } : null,
      crypto: crypto ? { attribution: (crypto as any).attribution, fetchedAt: (crypto as any).fetchedAt, stale: !!(crypto as any).stale } : null,
      board: board ? { attribution: (board as any).attribution, fetchedAt: (board as any).fetchedAt, needsKey: !!(board as any).needsKey, stale: !!(board as any).stale } : null,
    },
  }
}
