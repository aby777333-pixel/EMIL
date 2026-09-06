// Company intelligence (spec §21–23): one page per equity built from
//   1. SEC EDGAR (keyless): XBRL fundamentals, balance sheet, filings, SIC;
//   2. the hub's cached daily series (Twelve Data): price statistics — one
//      credit per uncached symbol, budgeted like every other research call;
//   3. Finnhub, when the owner has added a key: profile + next earnings date.
// Valuation ratios are CALCULATED from (1) and (2). Research view, never
// advice, never an execution trigger.

import { cachedFetch, providerApiKey, timeSeries, timeoutFetch } from '@/lib/data/hub'
import { resolveInstrument, toTwelveData, type InstrumentDef } from '@/lib/instruments/catalog'
import { computeStats, type ReportStats } from '@/lib/report'
import { edgarCompanyFacts, edgarFilings, edgarLookup, type EdgarSummary, type EdgarFiling } from './edgar'

export type CompanyProfile = { source: 'finnhub'; industry: string | null; ipo: string | null; website: string | null; country: string | null; logo: string | null; marketCapReported: number | null }
export type CompanyEarnings =
  | { source: 'finnhub'; next: { date: string; epsEstimate: number | null; revenueEstimate: number | null; hour: string | null } | null; recent: { date: string; epsActual: number | null; epsEstimate: number | null; surprisePct: number | null }[] }
  | { source: 'edgar'; note: string; lastReport: { form: string; end: string } | null }

export type CompanyCore = {
  fetchedAt: string
  symbol: string
  name: string
  edgar: { cik: number; sic: string | null; sicDescription: string | null; stateOfIncorporation: string | null; fiscalYearEnd: string | null; exchanges: string[] } | null
  fundamentals: EdgarSummary | null
  fundamentalsError: string | null
  filings: EdgarFiling[]
  profile: CompanyProfile | null
  earnings: CompanyEarnings
  finnhubKeyed: boolean
}

export type CompanyIntel = CompanyCore & {
  instrument: { key: string; exchange: string; currency: string; market: string } | null
  price: { stats: ReportStats | null; error: string | null; needsKey: boolean; rateLimited: boolean; retryAfterSec: number | null; proxy: boolean }
  valuation: { marketCap: number | null; pe: number | null; ps: number | null; pb: number | null; evToSalesApprox: number | null; fcfYieldApprox: number | null; debtToEquity: number | null; basis: string }
  notes: string[]
  cached?: boolean
  stale?: boolean
}

async function finnhubProfile(symbol: string, key: string) {
  return cachedFetch(`fh_profile_${symbol}`, 24 * 3600, async () => {
    const r = await timeoutFetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`, {}, 10000)
    if (!r.ok) throw new Error(`Finnhub profile responded ${r.status}`)
    const j = await r.json()
    return { fetchedAt: new Date().toISOString(), data: { industry: j?.finnhubIndustry ?? null, ipo: j?.ipo ?? null, website: j?.weburl ?? null, country: j?.country ?? null, logo: j?.logo ?? null, marketCapReported: Number.isFinite(Number(j?.marketCapitalization)) && j?.marketCapitalization ? Number(j.marketCapitalization) * 1e6 : null, name: j?.name ?? null } }
  })
}

async function finnhubEarnings(symbol: string, key: string) {
  return cachedFetch(`fh_earnings_${symbol}`, 6 * 3600, async () => {
    const today = new Date().toISOString().slice(0, 10)
    const to = new Date(Date.now() + 120 * 86400e3).toISOString().slice(0, 10)
    const from = new Date(Date.now() - 400 * 86400e3).toISOString().slice(0, 10)
    const [cal, past] = await Promise.all([
      timeoutFetch(`https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${to}&symbol=${encodeURIComponent(symbol)}&token=${key}`, {}, 10000).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      timeoutFetch(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${today}&symbol=${encodeURIComponent(symbol)}&token=${key}`, {}, 10000).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
    const upcoming = (cal?.earningsCalendar ?? []).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))[0]
    const recent = (past?.earningsCalendar ?? []).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 4)
    return {
      fetchedAt: new Date().toISOString(),
      next: upcoming ? { date: String(upcoming.date), epsEstimate: upcoming.epsEstimate ?? null, revenueEstimate: upcoming.revenueEstimate ?? null, hour: upcoming.hour ?? null } : null,
      recent: recent.map((e: any) => ({ date: String(e.date), epsActual: e.epsActual ?? null, epsEstimate: e.epsEstimate ?? null, surprisePct: e.surprisePercent ?? null })),
    }
  })
}

const isCompany = (def: InstrumentDef | null) => !def || def.assetClass === 'stocks'

export function companyTicker(input: string): { ticker: string; def: InstrumentDef | null } {
  const def = resolveInstrument(input)
  if (!isCompany(def)) throw new Error(`${def!.key} is ${def!.assetClass} — company intelligence covers listed companies (use the instrument report for other asset classes).`)
  const ticker = (def?.key ?? input.trim().toUpperCase()).replace(/[^A-Z0-9.\-]/g, '')
  if (!ticker) throw new Error('Ticker required.')
  return { ticker, def }
}

// EDGAR + Finnhub parts, cached 1h per ticker (facts/filings carry their own longer TTLs underneath).
export async function companyCore(ticker: string, def: InstrumentDef | null, force = false): Promise<CompanyCore & { cached?: boolean; stale?: boolean }> {
  const key = `company_core_v3_${ticker}${force ? `_r${Math.floor(Date.now() / 60000)}` : ''}`
  return cachedFetch(key, 3600, async () => {
    const edgar = await edgarLookup(ticker).catch(() => null)
    const fhKey = await providerApiKey('finnhub')
    const [facts, subs, profile, earnings] = await Promise.all([
      edgar ? edgarCompanyFacts(edgar.cik).catch((e: any) => ({ error: String(e?.message ?? 'EDGAR facts unavailable') })) : Promise.resolve(null),
      edgar ? edgarFilings(edgar.cik).catch(() => null) : Promise.resolve(null),
      fhKey ? finnhubProfile(ticker, fhKey).catch(() => null) : Promise.resolve(null),
      fhKey ? finnhubEarnings(ticker, fhKey).catch(() => null) : Promise.resolve(null),
    ])
    const fundamentals = facts && !(facts as any).error ? (facts as EdgarSummary) : null
    const fundamentalsError = !edgar ? 'Not in the SEC ticker registry — EDGAR fundamentals cover SEC registrants (US-listed companies and foreign filers).' : (facts as any)?.error ?? null
    return {
      fetchedAt: new Date().toISOString(), symbol: ticker,
      name: fundamentals?.name || subs?.name || edgar?.name || profile?.data?.name || def?.name || ticker,
      edgar: edgar ? { cik: edgar.cik, sic: subs?.sic ?? null, sicDescription: subs?.sicDescription ?? null, stateOfIncorporation: subs?.stateOfIncorporation ?? null, fiscalYearEnd: subs?.fiscalYearEnd ?? null, exchanges: subs?.exchanges ?? [] } : null,
      fundamentals, fundamentalsError,
      filings: subs?.filings ?? [],
      profile: profile?.data ? { source: 'finnhub', industry: profile.data.industry, ipo: profile.data.ipo, website: profile.data.website, country: profile.data.country, logo: profile.data.logo, marketCapReported: profile.data.marketCapReported } : null,
      earnings: earnings ? { source: 'finnhub', next: earnings.next, recent: earnings.recent } : { source: 'edgar', note: 'Upcoming earnings dates need a Finnhub key; the latest reported quarter comes from EDGAR.', lastReport: fundamentals?.lastReport ?? null },
      finnhubKeyed: !!fhKey,
    }
  })
}

// Price statistics from the hub series — computed on every call so a budget
// refusal is never frozen into the company cache (the series itself is cached).
export async function companyPrice(ticker: string, def: InstrumentDef | null, userId?: string) {
  let stats: ReportStats | null = null
  let error: string | null = null
  let needsKey = false, rateLimited = false, retryAfterSec: number | null = null
  let meta: { exchange?: string | null; currency?: string | null } = {}
  try {
    const s: any = await timeSeries(toTwelveData(ticker).symbol, '1day', 300, undefined, userId)
    if (s?.needsKey) { needsKey = true; error = s.message }
    else {
      const bars = (s?.data ?? []).filter((b: any) => Number.isFinite(b.close))
      meta = { exchange: s.exchange, currency: s.currency }
      if (bars.length >= 30) stats = computeStats(ticker, def, bars, meta)
      else error = `Only ${bars.length} daily bars available.`
    }
  } catch (e: any) {
    if (e?.rateLimited) { rateLimited = true; retryAfterSec = e.retryAfterSec ?? null }
    error = String(e?.message ?? 'price series unavailable')
  }
  return { stats, error, needsKey, rateLimited, retryAfterSec, proxy: toTwelveData(ticker).proxy }
}

export function valuation(core: CompanyCore, stats: ReportStats | null) {
  const notes: string[] = []
  const f = core.fundamentals
  const shares = f?.balance.sharesOutstanding ?? null
  const last = stats?.last ?? null
  const marketCap = shares && last ? shares * last : core.profile?.marketCapReported ?? null
  const ttm = f?.ttm
  const pe = last && ttm?.epsDiluted && ttm.epsDiluted > 0 ? last / ttm.epsDiluted : null
  const ps = marketCap && ttm?.revenue ? marketCap / ttm.revenue : null
  const pb = marketCap && f?.balance.equity && f.balance.equity > 0 ? marketCap / f.balance.equity : null
  const ev = marketCap !== null ? marketCap + (f?.balance.longTermDebt ?? 0) - (f?.balance.cash ?? 0) : null
  const evToSalesApprox = ev && ttm?.revenue ? ev / ttm.revenue : null
  const fcfYieldApprox = marketCap && ttm?.operatingCashFlow ? (ttm.operatingCashFlow / marketCap) * 100 : null
  const debtToEquity = f && f.balance.longTermDebt !== null && f.balance.equity ? f.balance.longTermDebt / f.balance.equity : null
  if (shares && last) notes.push(`Market cap = ${shares.toLocaleString('en-US')} shares (EDGAR cover page as of ${f?.balance.sharesAsOf}) × last delayed price ${last}.`)
  else if (core.profile?.marketCapReported) notes.push('Market cap as reported by Finnhub (EDGAR share count or price unavailable).')
  if (ttm?.asOf) notes.push(`TTM = the four latest calendar quarters reported to the SEC (through ${ttm.asOf}). "FCF yield" uses operating cash flow (capex not netted).`)
  if (!core.finnhubKeyed) notes.push('Next earnings date and industry profile need a free Finnhub key (Command Center → Data Providers).')
  return { valuation: { marketCap, pe, ps, pb, evToSalesApprox, fcfYieldApprox, debtToEquity, basis: 'Calculated by EMIL from SEC XBRL facts and delayed research prices — not a data-vendor figure.' }, notes }
}

export async function companyIntel(input: string, userId?: string, force = false): Promise<CompanyIntel> {
  const { ticker, def } = companyTicker(input)
  const [core, price] = await Promise.all([companyCore(ticker, def, force), companyPrice(ticker, def, userId)])
  const v = valuation(core, price.stats)
  return {
    ...core,
    instrument: def ? { key: def.key, exchange: def.exchange, currency: def.currency, market: def.market } : null,
    price, valuation: v.valuation, notes: v.notes,
  }
}
