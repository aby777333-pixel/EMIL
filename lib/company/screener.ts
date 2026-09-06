// Equity screener over the instrument master (spec §22–23). Reads ONLY what
// the hub already holds — EDGAR fundamentals summaries and cached daily
// series — and reports honestly which rows are still unscanned. "Scan" pulls
// a few more EDGAR summaries per click (keyless, fair-access paced); "Fetch
// prices" spends at most a handful of Twelve Data credits per click and
// backs off when the budget says so. CALCULATED research view.

import { CATALOG, toTwelveData, type InstrumentDef } from '@/lib/instruments/catalog'
import { peekCache, timeSeries, timeSeriesCacheKey } from '@/lib/data/hub'
import { computeStats, type ReportStats } from '@/lib/report'
import { edgarCompanyFacts, edgarSummaryKey, edgarTickerMap, type EdgarSummary } from './edgar'

export type ScreenerRow = {
  symbol: string
  name: string
  exchange: string
  cik: number | null
  fundamentals: {
    asOf: string | null
    revenueTtm: number | null; netIncomeTtm: number | null; epsTtm: number | null; ocfTtm: number | null
    revenueYoY: number | null; netIncomeYoY: number | null; netMargin: number | null; ocfMargin: number | null
    equity: number | null; cash: number | null; longTermDebt: number | null; debtToEquity: number | null; shares: number | null
    ageSec: number
  } | null
  price: { last: number; asOf: string; ret1m: number | null; ret3m: number | null; ret1y: number | null; vol20: number | null; rangePos: number; rsi14: number | null; aboveSma200: boolean | null; ageSec: number } | null
  valuation: { marketCap: number | null; pe: number | null; ps: number | null; pb: number | null }
  status: 'ready' | 'needs_fundamentals' | 'needs_price' | 'needs_both' | 'not_sec_registrant'
}

export function screenerUniverse(): InstrumentDef[] {
  return CATALOG.filter((d) => d.assetClass === 'stocks' && d.country === 'US' && d.dataStatus === 'live' && !/ETF|Shares/i.test(d.name))
}

function fundamentalsRow(s: EdgarSummary & { ageSec: number }): NonNullable<ScreenerRow['fundamentals']> {
  const de = s.balance.longTermDebt !== null && s.balance.equity ? s.balance.longTermDebt / s.balance.equity : null
  return {
    asOf: s.ttm.asOf, revenueTtm: s.ttm.revenue, netIncomeTtm: s.ttm.netIncome, epsTtm: s.ttm.epsDiluted, ocfTtm: s.ttm.operatingCashFlow,
    revenueYoY: s.growth.revenueYoY, netIncomeYoY: s.growth.netIncomeYoY, netMargin: s.margins.net, ocfMargin: s.margins.operatingCashFlow,
    equity: s.balance.equity, cash: s.balance.cash, longTermDebt: s.balance.longTermDebt, debtToEquity: de, shares: s.balance.sharesOutstanding, ageSec: s.ageSec,
  }
}

function priceRow(def: InstrumentDef, series: any): ScreenerRow['price'] {
  const bars = (series?.data ?? []).filter((b: any) => Number.isFinite(b.close))
  if (bars.length < 30) return null
  const st: ReportStats = computeStats(def.key, def, bars, { exchange: series.exchange, currency: series.currency })
  return { last: st.last, asOf: st.asOf, ret1m: st.ret1m, ret3m: st.ret3m, ret1y: st.ret1y, vol20: st.vol20, rangePos: st.rangePos, rsi14: st.rsi14, aboveSma200: st.aboveSma200, ageSec: series.ageSec ?? 0 }
}

export async function screenerRows(): Promise<{ fetchedAt: string; rows: ScreenerRow[]; counts: { total: number; ready: number; needsFundamentals: number; needsPrice: number }; edgarMapReady: boolean }> {
  const universe = screenerUniverse()
  const map = await edgarTickerMap().catch(() => null)
  const rows = await Promise.all(universe.map(async (def): Promise<ScreenerRow> => {
    const t = def.key.replace(/\./g, '-')
    const hit = map?.data?.[t] ?? map?.data?.[t.replace(/-/g, '')] ?? null
    const cik = hit ? hit[0] : null
    const [facts, series] = await Promise.all([
      cik ? peekCache<EdgarSummary>(edgarSummaryKey(cik)) : Promise.resolve(null),
      peekCache<any>(timeSeriesCacheKey(toTwelveData(def.key).symbol, '1day', 300)),
    ])
    const fundamentals = facts ? fundamentalsRow(facts) : null
    const price = series ? priceRow(def, series) : null
    const marketCap = fundamentals?.shares && price ? fundamentals.shares * price.last : null
    const pe = price && fundamentals?.epsTtm && fundamentals.epsTtm > 0 ? price.last / fundamentals.epsTtm : null
    const ps = marketCap && fundamentals?.revenueTtm ? marketCap / fundamentals.revenueTtm : null
    const pb = marketCap && fundamentals?.equity && fundamentals.equity > 0 ? marketCap / fundamentals.equity : null
    const status: ScreenerRow['status'] = !map ? 'needs_both' : !cik ? 'not_sec_registrant' : fundamentals && price ? 'ready' : fundamentals ? 'needs_price' : price ? 'needs_fundamentals' : 'needs_both'
    return { symbol: def.key, name: def.name, exchange: def.exchange, cik, fundamentals, price, valuation: { marketCap, pe, ps, pb }, status }
  }))
  return {
    fetchedAt: new Date().toISOString(), rows, edgarMapReady: !!map,
    counts: { total: rows.length, ready: rows.filter((r) => r.status === 'ready').length, needsFundamentals: rows.filter((r) => r.status === 'needs_fundamentals' || r.status === 'needs_both').length, needsPrice: rows.filter((r) => r.status === 'needs_price' || r.status === 'needs_both').length },
  }
}

// Pull EDGAR summaries for up to `n` unscanned companies (keyless; paced).
export async function screenerScanFundamentals(n = 4): Promise<{ scanned: string[]; failed: { symbol: string; error: string }[]; remaining: number }> {
  const map = await edgarTickerMap()
  const universe = screenerUniverse()
  const todo: { symbol: string; cik: number }[] = []
  for (const def of universe) {
    const t = def.key.replace(/\./g, '-')
    const hit = map.data[t] ?? map.data[t.replace(/-/g, '')]
    if (!hit) continue
    if (!(await peekCache(edgarSummaryKey(hit[0])))) todo.push({ symbol: def.key, cik: hit[0] })
  }
  const batch = todo.slice(0, Math.max(1, Math.min(6, n)))
  const scanned: string[] = []; const failed: { symbol: string; error: string }[] = []
  await Promise.all(batch.map(async (b) => {
    try { await edgarCompanyFacts(b.cik); scanned.push(b.symbol) } catch (e: any) { failed.push({ symbol: b.symbol, error: String(e?.message ?? 'failed').slice(0, 120) }) }
  }))
  return { scanned, failed, remaining: Math.max(0, todo.length - scanned.length) }
}

// Fetch daily series for up to `n` companies without a cached series. Spends
// one Twelve Data credit per symbol; stops at the first budget refusal.
export async function screenerFetchPrices(n = 4, userId?: string): Promise<{ fetched: string[]; failed: { symbol: string; error: string }[]; remaining: number; rateLimited: boolean; retryAfterSec: number | null; daily: boolean }> {
  const universe = screenerUniverse()
  const todo: InstrumentDef[] = []
  for (const def of universe) if (!(await peekCache(timeSeriesCacheKey(toTwelveData(def.key).symbol, '1day', 300)))) todo.push(def)
  const fetched: string[] = []; const failed: { symbol: string; error: string }[] = []
  let rateLimited = false, retryAfterSec: number | null = null, daily = false
  for (const def of todo.slice(0, Math.max(1, Math.min(6, n)))) {
    try {
      const s: any = await timeSeries(toTwelveData(def.key).symbol, '1day', 300, undefined, userId)
      if (s?.needsKey) { failed.push({ symbol: def.key, error: s.message }); break }
      fetched.push(def.key)
    } catch (e: any) {
      if (e?.rateLimited) { rateLimited = true; retryAfterSec = e.retryAfterSec ?? null; daily = !!e.daily; break }
      failed.push({ symbol: def.key, error: String(e?.message ?? 'failed').slice(0, 120) })
    }
  }
  return { fetched, failed, remaining: Math.max(0, todo.length - fetched.length), rateLimited, retryAfterSec, daily }
}
