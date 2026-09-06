// Scenario & hedge simulator (spec §30, §96–§115, §138). A deliberately
// simple, transparent FACTOR model: every open position gets a beta to six
// macro factors (USD, equities, crypto, gold, oil, US rates); a scenario is a
// vector of factor shocks; P&L is linear (signed notional × implied move).
// Hedge proposals offset the portfolio's net factor exposures with liquid
// proxy instruments, sized to a chosen hedge ratio. CALCULATED research view:
// no convexity, no correlation matrix, no funding/carry — the betas are
// documented defaults the user can override per symbol. Never an order.

import { consolidatedPortfolio, type PortfolioPosition } from '@/lib/portfolio'
import { cryptoMarkets, fxRates, marketBoard } from '@/lib/data/hub'
import { resolveInstrument, type InstrumentDef } from '@/lib/instruments/catalog'
import { PAPER_MAX_NOTIONAL_USD } from '@/lib/execution/router'

export type FactorKey = 'usd' | 'equities' | 'crypto' | 'gold' | 'oil' | 'rates'
export const FACTORS: { key: FactorKey; label: string; unit: '%' | 'bp'; proxy: string; min: number; max: number }[] = [
  { key: 'usd', label: 'US Dollar (DXY)', unit: '%', proxy: 'DXY', min: -10, max: 10 },
  { key: 'equities', label: 'Global equities (S&P 500)', unit: '%', proxy: 'US500', min: -30, max: 30 },
  { key: 'crypto', label: 'Crypto (BTC)', unit: '%', proxy: 'BTCUSD', min: -60, max: 60 },
  { key: 'gold', label: 'Gold', unit: '%', proxy: 'XAUUSD', min: -20, max: 20 },
  { key: 'oil', label: 'Crude oil (WTI)', unit: '%', proxy: 'USOIL', min: -40, max: 40 },
  { key: 'rates', label: 'US 10-year yield', unit: 'bp', proxy: 'US10Y', min: -150, max: 150 },
]

export type Shocks = Partial<Record<FactorKey, number>>
export const PRESETS: { key: string; label: string; description: string; shocks: Shocks }[] = [
  { key: 'risk_off', label: 'Risk-off', description: 'Equities and crypto sell off, dollar and gold bid, yields fall.', shocks: { equities: -8, crypto: -15, usd: 2, gold: 3, oil: -6, rates: -25 } },
  { key: 'usd_spike', label: 'USD spike', description: 'Dollar squeeze: everything priced in dollars softens.', shocks: { usd: 3, equities: -2, crypto: -5, gold: -3, oil: -2, rates: 10 } },
  { key: 'crypto_crash', label: 'Crypto crash', description: 'A 30% drawdown in BTC with mild spill-over.', shocks: { crypto: -30, equities: -2 } },
  { key: 'equity_rally', label: 'Equity rally', description: 'Risk-on: stocks and crypto up, dollar slightly softer, yields up.', shocks: { equities: 5, crypto: 8, usd: -1, oil: 2, rates: 10 } },
  { key: 'gold_rally', label: 'Gold rally', description: 'Safe-haven bid in gold with a weaker dollar and lower yields.', shocks: { gold: 8, usd: -2, rates: -15 } },
  { key: 'oil_shock', label: 'Oil shock', description: 'Supply shock: crude +15%, equities and yields react.', shocks: { oil: 15, equities: -3, usd: 1, rates: 15 } },
  { key: 'rates_shock', label: 'Rates shock', description: 'Yields +50 bp: long-duration assets (growth, gold, crypto) marked down.', shocks: { rates: 50, equities: -5, gold: -3, crypto: -8, usd: 2 } },
]

type Betas = Partial<Record<FactorKey, number>>

const STOCK_BETAS: Record<string, Betas> = {
  NVDA: { equities: 1.8, rates: -1.2 }, TSLA: { equities: 1.9, rates: -1.2 }, AMD: { equities: 1.7, rates: -1.0 }, META: { equities: 1.3, rates: -0.8 }, AMZN: { equities: 1.2, rates: -0.8 },
  GOOGL: { equities: 1.1, rates: -0.6 }, MSFT: { equities: 1.0, rates: -0.6 }, AAPL: { equities: 1.1, rates: -0.5 }, NFLX: { equities: 1.2, rates: -0.6 }, AVGO: { equities: 1.4, rates: -0.8 }, INTC: { equities: 1.2, rates: -0.4 },
  KO: { equities: 0.5, rates: -0.3 }, JNJ: { equities: 0.5, rates: -0.3 }, PG: { equities: 0.5, rates: -0.3 }, WMT: { equities: 0.5, rates: -0.2 }, UNH: { equities: 0.6 }, COST: { equities: 0.8, rates: -0.3 },
  XOM: { equities: 0.6, oil: 0.5 }, JPM: { equities: 1.1, rates: 1.0 }, BAC: { equities: 1.2, rates: 1.2 }, V: { equities: 1.0 }, DIS: { equities: 1.1 }, 'BRK.B': { equities: 0.8 },
  SPY: { equities: 1.0, rates: -0.4 }, QQQ: { equities: 1.2, rates: -0.8 }, GLD: { gold: 1.0 },
}
const FX_USD_BETA: Record<string, number> = { EUR: 1.2, GBP: 0.9, CHF: 0.9, JPY: 0.8, AUD: 0.8, NZD: 0.8, CAD: 0.7, SGD: 0.5, HKD: 0.05, SEK: 0.9, NOK: 0.9, MXN: 0.6, ZAR: 0.7, TRY: 0.3, INR: 0.3, CNH: 0.3, PLN: 0.8 }
const COMMODITY_CCY: Record<string, Betas> = { AUD: { equities: 0.25 }, NZD: { equities: 0.25 }, CAD: { oil: 0.15, equities: 0.15 }, NOK: { oil: 0.2 }, MXN: { equities: 0.2 }, ZAR: { equities: 0.2, gold: 0.1 } }

// Default betas: % move of the instrument per 1% factor move (rates: per +100 bp).
export function betasFor(symbol: string, assetClass: string, def: InstrumentDef | null = resolveInstrument(symbol)): { betas: Betas; basis: string } {
  const key = def?.key ?? symbol.toUpperCase()
  if (def?.assetClass === 'forex' && def.base && def.quote) {
    const b: Betas = {}
    const add = (k: FactorKey, v: number) => { b[k] = (b[k] ?? 0) + v }
    if (def.quote === 'USD') add('usd', -(FX_USD_BETA[def.base] ?? 0.5))
    else if (def.base === 'USD') add('usd', FX_USD_BETA[def.quote] ?? 0.5)
    for (const [ccy, sign] of [[def.base, 1], [def.quote, -1]] as [string, number][]) for (const [f, v] of Object.entries(COMMODITY_CCY[ccy] ?? {})) add(f as FactorKey, v * sign)
    if (def.quote === 'JPY' || def.base === 'JPY') add('rates', def.base === 'JPY' ? -0.3 : 0.3)
    return { betas: b, basis: 'FX default: DXY weight of the non-USD leg, commodity-currency tilts' }
  }
  if (def?.assetClass === 'metals' || key === 'MCXGOLD' || key === 'MCXSILVER') {
    const m: Record<string, Betas> = { XAUUSD: { gold: 1, usd: -0.3, rates: -1.0 }, XAGUSD: { gold: 1.5, equities: 0.2, usd: -0.3, rates: -0.8 }, XPTUSD: { gold: 0.7, equities: 0.3 }, XPDUSD: { gold: 0.6, equities: 0.3 }, MCXGOLD: { gold: 1 }, MCXSILVER: { gold: 1.5 } }
    return { betas: m[key] ?? { gold: 1 }, basis: 'metals default' }
  }
  if (def?.assetClass === 'energies' || key === 'MCXCRUDEOIL' || key === 'MCXNATURALGAS') {
    const m: Record<string, Betas> = { USOIL: { oil: 1 }, UKOIL: { oil: 1 }, NATGAS: { oil: 0.3 }, MCXCRUDEOIL: { oil: 1 }, MCXNATURALGAS: { oil: 0.3 } }
    return { betas: m[key] ?? { oil: 1 }, basis: 'energy default' }
  }
  if (def?.assetClass === 'indices') {
    if (key === 'DXY') return { betas: { usd: 1 }, basis: 'dollar index' }
    if (key === 'VIX') return { betas: { equities: -4 }, basis: 'volatility index (inverse, convex — linear approximation)' }
    const growth = key === 'NAS100' ? 1.2 : key === 'US2000' ? 1.15 : key.startsWith('US') ? 1.0 : 0.9
    return { betas: { equities: growth, rates: key === 'NAS100' ? -0.8 : -0.4, ...(key === 'HK50' || key === 'CHN50' ? { usd: -0.3 } : {}) }, basis: 'index default' }
  }
  if (def?.assetClass === 'crypto') {
    const b = def.base ?? key.replace(/USD$/, '')
    const beta = b === 'BTC' ? 1.0 : b === 'ETH' ? 1.2 : 1.4
    return { betas: { crypto: beta, equities: 0.3, rates: -1.5 }, basis: 'crypto default (BTC 1.0, ETH 1.2, alts 1.4)' }
  }
  if (def?.assetClass === 'stocks') {
    if (STOCK_BETAS[key]) return { betas: STOCK_BETAS[key], basis: 'stock default (sector tilt)' }
    return { betas: { equities: def.country === 'IN' ? 0.8 : 1.0, rates: -0.4 }, basis: 'stock default' }
  }
  const byClass: Record<string, Betas> = { forex: { usd: -0.5 }, stocks: { equities: 1 }, indices: { equities: 1 }, crypto: { crypto: 1, equities: 0.3 }, metals: { gold: 1 }, energies: { oil: 1 }, commodities: { oil: 0.5 } }
  return { betas: byClass[assetClass] ?? { equities: 0.5 }, basis: `asset-class fallback (${assetClass})` }
}

export function impliedMove(betas: Betas, shocks: Shocks): number {
  let m = 0
  for (const f of FACTORS) {
    const s = shocks[f.key] ?? 0
    if (!s) continue
    const b = betas[f.key] ?? 0
    m += b * (f.unit === 'bp' ? s / 100 : s)
  }
  return m
}

export type ScenarioInput = {
  preset?: string
  shocks?: Shocks
  overrides?: Record<string, number> // canonical symbol → implied move % (replaces the factor model for that symbol)
  hedgeRatio?: number // 0..1
  includePaper?: boolean
}

export type ScenarioPositionResult = { venue: string; paper: boolean; symbol: string; canonical: string; assetClass: string; side: string; signedNotional: number; move: number; pnl: number; betas: Betas; basis: string; overridden: boolean }
export type FactorExposure = { factor: FactorKey; label: string; exposure: number; shock: number; pnl: number }
export type HedgeProposal = {
  factor: FactorKey; label: string; instrument: string; venueHint: string; side: 'buy' | 'sell'; notionalUsd: number; refPrice: number | null; priceBasis: string | null; qty: number | null; qtyUnit: string | null
  paperVenue: string | null; paperSymbol: string | null; capped: boolean; pnlInScenario: number; note: string
}
export type ScenarioResult = {
  fetchedAt: string
  preset: string | null
  shocks: Shocks
  hedgeRatio: number
  equity: number
  positions: ScenarioPositionResult[]
  byAssetClass: { assetClass: string; net: number; pnl: number }[]
  factorExposures: FactorExposure[]
  total: { pnl: number; pctOfEquity: number | null; worst: ScenarioPositionResult | null; best: ScenarioPositionResult | null; unpriced: number }
  hedges: HedgeProposal[]
  afterHedge: { pnl: number; pctOfEquity: number | null; factorExposures: FactorExposure[]; hedgeNotional: number }
  notes: string[]
}

const HEDGE_INSTRUMENT: Record<FactorKey, { instrument: string; venueHint: string; paperVenue: string | null; paperSymbol: string | null; qtyUnit: string } | null> = {
  usd: { instrument: 'EURUSD', venueHint: 'EMIL Trade / any FX broker (EURUSD moves ≈ −1.2× DXY)', paperVenue: null, paperSymbol: null, qtyUnit: 'EUR' },
  equities: { instrument: 'US500', venueHint: 'EMIL Trade (US500 CFD) or SPY (ETF proxy) at a broker', paperVenue: null, paperSymbol: null, qtyUnit: 'index units (SPY-proxy price)' },
  crypto: { instrument: 'BTCUSD', venueHint: 'Deribit Testnet BTC-PERPETUAL (paper) — inverse contract, quantity in USD', paperVenue: 'deribit_testnet', paperSymbol: 'BTC-PERPETUAL', qtyUnit: 'USD (inverse contract)' },
  gold: { instrument: 'XAUUSD', venueHint: 'EMIL Trade (XAUUSD) or GLD at a broker', paperVenue: null, paperSymbol: null, qtyUnit: 'oz' },
  oil: { instrument: 'USOIL', venueHint: 'EMIL Trade (USOIL CFD) or USO (ETF proxy) at a broker', paperVenue: null, paperSymbol: null, qtyUnit: 'bbl (USO-proxy price)' },
  rates: null,
}

async function refPrices(): Promise<Record<string, { price: number; basis: string }>> {
  const out: Record<string, { price: number; basis: string }> = {}
  const [board, crypto, fx] = await Promise.all([marketBoard().catch(() => null), cryptoMarkets(10).catch(() => null), fxRates('USD').catch(() => null)])
  for (const r of (board as any)?.data ?? []) {
    if (!r.available) continue
    if (r.symbol === 'SPY') out.US500 = { price: r.price, basis: 'SPY ETF proxy price (delayed)' }
    if (r.symbol === 'XAU/USD') out.XAUUSD = { price: r.price, basis: 'XAU/USD spot (delayed)' }
    if (r.symbol === 'USO') out.USOIL = { price: r.price, basis: 'USO ETF proxy price (delayed)' }
  }
  const btc = ((crypto as any)?.data ?? []).find((c: any) => c.symbol === 'BTC')
  if (btc?.price) out.BTCUSD = { price: btc.price, basis: 'CoinGecko reference price' }
  const eur = (fx as any)?.data?.EUR
  if (eur) out.EURUSD = { price: 1 / eur, basis: 'ECB reference rate via Frankfurter (daily)' }
  return out
}

export async function runScenario(userId: string, isAdmin: boolean, input: ScenarioInput): Promise<ScenarioResult> {
  const preset = input.preset ? PRESETS.find((p) => p.key === input.preset) ?? null : null
  const shocks: Shocks = {}
  for (const f of FACTORS) {
    const raw = input.shocks?.[f.key] ?? preset?.shocks[f.key] ?? 0
    const v = Number(raw)
    shocks[f.key] = Number.isFinite(v) ? Math.max(f.min, Math.min(f.max, v)) : 0
  }
  const overrides: Record<string, number> = {}
  for (const [k, v] of Object.entries(input.overrides ?? {})) { const n = Number(v); if (k && Number.isFinite(n)) overrides[k.toUpperCase()] = Math.max(-90, Math.min(300, n)) }
  const hedgeRatio = Math.max(0, Math.min(1, Number(input.hedgeRatio ?? 0.5) || 0))
  const includePaper = input.includePaper !== false

  const pf = await consolidatedPortfolio(userId, isAdmin)
  const notes: string[] = [...pf.notes]
  const equity = pf.exposure.equityTotal
  const positions: ScenarioPositionResult[] = []
  let unpriced = 0
  for (const p of pf.positions as PortfolioPosition[]) {
    if (!includePaper && p.paper) continue
    if (p.notionalUsd === null) { unpriced++; continue }
    const signed = p.notionalUsd * (p.side === 'short' ? -1 : 1)
    const { betas, basis } = betasFor(p.canonical, p.assetClass)
    const ov = overrides[p.canonical]
    const move = ov !== undefined ? ov : impliedMove(betas, shocks)
    positions.push({ venue: p.venue, paper: p.paper, symbol: p.symbol, canonical: p.canonical, assetClass: p.assetClass, side: p.side, signedNotional: signed, move, pnl: (signed * move) / 100, betas, basis, overridden: ov !== undefined })
  }
  positions.sort((a, b) => a.pnl - b.pnl)

  const byClassMap = new Map<string, { net: number; pnl: number }>()
  for (const p of positions) { const c = byClassMap.get(p.assetClass) ?? { net: 0, pnl: 0 }; c.net += p.signedNotional; c.pnl += p.pnl; byClassMap.set(p.assetClass, c) }
  const byAssetClass = Array.from(byClassMap.entries()).map(([assetClass, v]) => ({ assetClass, ...v })).sort((a, b) => a.pnl - b.pnl)

  const factorExposure = (list: { signedNotional: number; betas: Betas }[]): FactorExposure[] => FACTORS.map((f) => {
    const exposure = list.reduce((s, p) => s + p.signedNotional * (p.betas[f.key] ?? 0), 0)
    const s = shocks[f.key] ?? 0
    return { factor: f.key, label: f.label, exposure, shock: s, pnl: (exposure * (f.unit === 'bp' ? s / 100 : s)) / 100 }
  })
  const factorExposures = factorExposure(positions.filter((p) => !p.overridden))
  const total = positions.reduce((s, p) => s + p.pnl, 0)

  // ---- hedge proposals: offset each material factor exposure with its proxy ----
  const prices = await refPrices()
  const hedges: HedgeProposal[] = []
  const hedgeLegs: { signedNotional: number; betas: Betas }[] = []
  const gross = positions.reduce((s, p) => s + Math.abs(p.signedNotional), 0)
  for (const fe of factorExposures) {
    const spec = HEDGE_INSTRUMENT[fe.factor]
    if (!spec) { if (Math.abs(fe.exposure) > 0.05 * gross && gross > 0) notes.push(`Rates exposure ≈ ${Math.round(fe.exposure).toLocaleString('en-US')} USD-equivalent has no hedge instrument in the master (a Treasury ETF such as TLT would be the usual proxy).`); continue }
    if (gross === 0 || Math.abs(fe.exposure) < Math.max(100, 0.05 * gross)) continue
    const hedgeDef = betasFor(spec.instrument, 'n/a')
    const hb = hedgeDef.betas[fe.factor] ?? 1
    // Signed notional in the hedge instrument that cancels `hedgeRatio` of the exposure: N × hb = −ratio × E.
    const wanted = -(hedgeRatio * fe.exposure) / hb
    let notional = Math.abs(wanted)
    const capped = !!spec.paperVenue && notional > PAPER_MAX_NOTIONAL_USD
    if (capped) notional = PAPER_MAX_NOTIONAL_USD
    const signed = Math.sign(wanted) * notional
    const px = prices[spec.instrument] ?? null
    const qty = px ? (spec.paperVenue === 'deribit_testnet' ? Math.round(notional / 10) * 10 : notional / px.price) : null
    hedgeLegs.push({ signedNotional: signed, betas: hedgeDef.betas })
    const pnlInScenario = (signed * impliedMove(hedgeDef.betas, shocks)) / 100
    hedges.push({
      factor: fe.factor, label: fe.label, instrument: spec.instrument, venueHint: spec.venueHint, side: signed >= 0 ? 'buy' : 'sell', notionalUsd: notional,
      refPrice: px?.price ?? null, priceBasis: px?.basis ?? null, qty, qtyUnit: spec.qtyUnit, paperVenue: spec.paperVenue, paperSymbol: spec.paperSymbol, capped, pnlInScenario,
      note: `${signed >= 0 ? 'Buy' : 'Sell'} ≈ ${Math.round(notional).toLocaleString('en-US')} USD of ${spec.instrument} offsets ${Math.round(hedgeRatio * 100)}% of the ${fe.label} exposure (${Math.round(fe.exposure).toLocaleString('en-US')} USD-equivalent)${capped ? `; capped at the paper per-order limit ${PAPER_MAX_NOTIONAL_USD.toLocaleString('en-US')} USD` : ''}.`,
    })
  }
  const afterExposures = factorExposure([...positions.filter((p) => !p.overridden), ...hedgeLegs])
  const afterPnl = total + hedges.reduce((s, h) => s + h.pnlInScenario, 0)

  notes.push('Factor model: default betas per instrument (documented in lib/scenario.ts), linear P&L = signed notional × implied move. No convexity, no correlation matrix, no funding or carry. Overrides replace the model for that symbol.')
  notes.push('Hedge sizes are proposals for research: they assume the proxy tracks the factor with its default beta and ignore basis risk, margin, fees and slippage. Nothing here is sent anywhere.')
  if (unpriced) notes.push(`${unpriced} position(s) without a mark price are excluded.`)

  return {
    fetchedAt: new Date().toISOString(), preset: preset?.key ?? null, shocks, hedgeRatio, equity,
    positions, byAssetClass, factorExposures,
    total: { pnl: total, pctOfEquity: equity > 0 ? (total / equity) * 100 : null, worst: positions[0] ?? null, best: positions[positions.length - 1] ?? null, unpriced },
    hedges, afterHedge: { pnl: afterPnl, pctOfEquity: equity > 0 ? (afterPnl / equity) * 100 : null, factorExposures: afterExposures, hedgeNotional: hedges.reduce((s, h) => s + h.notionalUsd, 0) },
    notes,
  }
}
