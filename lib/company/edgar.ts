// SEC EDGAR — free, keyless company fundamentals and filings (spec §21–23,
// free/open-first rule §230). Fair-access rules: a declared User-Agent and
// ≤10 requests/second; EMIL caches every answer server-side so a whole day of
// users costs a handful of calls. RESEARCH DATA — never an execution trigger.

import { cachedFetch, timeoutFetch } from '@/lib/data/hub'

const SEC_HEADERS = { Accept: 'application/json', 'User-Agent': 'EMIL Research Cockpit admin@emil.app' }

export type EdgarCompany = { cik: number; ticker: string; name: string }

// ---- ticker → CIK map (one 700 KB file, reduced and cached a week) ----
export async function edgarTickerMap(): Promise<{ fetchedAt: string; data: Record<string, [number, string]>; cached?: boolean; stale?: boolean }> {
  return cachedFetch('edgar_tickers_v1', 7 * 86400, async () => {
    const r = await timeoutFetch('https://www.sec.gov/files/company_tickers.json', { headers: SEC_HEADERS }, 15000)
    if (!r.ok) throw new Error(`SEC tickers file responded ${r.status}`)
    const j = await r.json()
    const data: Record<string, [number, string]> = {}
    for (const row of Object.values(j ?? {}) as any[]) {
      const t = String(row?.ticker ?? '').toUpperCase()
      if (t && row?.cik_str) data[t] = [Number(row.cik_str), String(row.title ?? '')]
    }
    if (Object.keys(data).length < 1000) throw new Error('SEC tickers file looked incomplete')
    return { fetchedAt: new Date().toISOString(), data }
  })
}

export async function edgarLookup(ticker: string): Promise<EdgarCompany | null> {
  const t = ticker.trim().toUpperCase().replace(/\./g, '-')
  const map = await edgarTickerMap()
  const hit = map.data[t] ?? map.data[t.replace(/-/g, '')]
  return hit ? { cik: hit[0], ticker: t, name: hit[1] } : null
}

const padCik = (cik: number) => String(cik).padStart(10, '0')

// ---- company facts (XBRL) → compact summary ----
export type PeriodValue = { period: string; end: string; value: number; form: string }
export type EdgarSummary = {
  fetchedAt: string
  cik: number
  name: string
  fiscalYearEnd: string | null
  revenueConcept: string | null
  quarterly: { revenue: PeriodValue[]; netIncome: PeriodValue[]; epsDiluted: PeriodValue[]; operatingCashFlow: PeriodValue[] }
  annual: { revenue: PeriodValue[]; netIncome: PeriodValue[]; epsDiluted: PeriodValue[]; operatingCashFlow: PeriodValue[] }
  ttm: { revenue: number | null; netIncome: number | null; epsDiluted: number | null; operatingCashFlow: number | null; asOf: string | null }
  growth: { revenueYoY: number | null; netIncomeYoY: number | null; revenueQoQ: number | null }
  margins: { net: number | null; operatingCashFlow: number | null }
  balance: { asOf: string | null; assets: number | null; liabilities: number | null; equity: number | null; cash: number | null; longTermDebt: number | null; sharesOutstanding: number | null; sharesAsOf: string | null }
  lastReport: { form: string; end: string } | null
}

type Fact = { start?: string; end: string; val: number; fy?: number; fp?: string; form?: string; frame?: string; filed?: string }

const REVENUE_CONCEPTS = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'TotalRevenuesAndOtherIncome']
const CONCEPTS = {
  netIncome: ['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'],
  epsDiluted: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted', 'EarningsPerShareBasic'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
  assets: ['Assets'],
  liabilities: ['Liabilities', 'LiabilitiesAndStockholdersEquity'],
  equity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebt', 'LongTermDebtAndCapitalLeaseObligations'],
}

function unitFacts(facts: any, ns: string, concept: string, units: string[]): Fact[] {
  const c = facts?.[ns]?.[concept]?.units
  if (!c) return []
  for (const u of units) if (Array.isArray(c[u])) return c[u] as Fact[]
  return []
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3)
const label = (end: string) => { const d = new Date(end); const q = Math.floor(d.getUTCMonth() / 3) + 1; return `${d.getUTCFullYear()}Q${q}` }

// Duration series straight from (start, end): quarters are ~3-month facts,
// years ~12-month facts; the latest filing for a period wins (restatements).
// Fiscal Q4 is rarely reported as its own quarter (the 10-K carries the year),
// so it is DERIVED as year − (Q1+Q2+Q3) and labelled with a trailing "*".
// Working from durations instead of the SEC "frame" tags keeps non-calendar
// fiscal years (Apple, Microsoft, Walmart…) complete.
function framed(list: Fact[], kind: 'quarter' | 'year'): PeriodValue[] {
  const byEnd = new Map<string, PeriodValue>()
  const lo = kind === 'quarter' ? 80 : 350, hi = kind === 'quarter' ? 100 : 380
  for (const f of list) {
    if (!f.start || !f.end || !Number.isFinite(f.val)) continue
    const d = days(f.start, f.end)
    if (d < lo || d > hi) continue
    byEnd.set(f.end, { period: kind === 'quarter' ? label(f.end) : `FY${new Date(f.end).getUTCFullYear()}`, end: f.end, value: f.val, form: f.form ?? '' })
  }
  if (kind === 'year') return Array.from(byEnd.values()).sort((a, b) => a.end.localeCompare(b.end))
  // Derive missing fourth quarters from the annual duration facts.
  for (const f of list) {
    if (!f.start || !f.end || !Number.isFinite(f.val)) continue
    const d = days(f.start, f.end)
    if (d < 350 || d > 380 || byEnd.has(f.end)) continue
    const inYear = Array.from(byEnd.values()).filter((q) => q.end > f.start! && q.end < f.end && days(f.start!, q.end) <= 290)
    if (inYear.length !== 3) continue
    byEnd.set(f.end, { period: `${label(f.end)}*`, end: f.end, value: f.val - inYear.reduce((s, q) => s + q.value, 0), form: `${f.form ?? '10-K'} derived` })
  }
  return Array.from(byEnd.values()).sort((a, b) => a.end.localeCompare(b.end))
}

// Instant series (balance sheet): frames end with "I".
function latestInstant(list: Fact[]): { value: number; end: string } | null {
  let best: Fact | null = null
  for (const f of list) {
    if (!Number.isFinite(f.val)) continue
    if (f.frame && !/I$/.test(f.frame)) continue
    if (!best || f.end > best.end) best = f
  }
  return best ? { value: best.val, end: best.end } : null
}

// Filers switch concepts over time (Apple: "Revenues" until 2018, then
// "RevenueFromContractWithCustomer…"), so the FIRST concept with data can be
// years stale. Prefer the concept whose latest fact is most recent; on a tie
// keep the list order (most standard concept first).
function firstWithData(facts: any, concepts: string[], units: string[], ns = 'us-gaap'): { concept: string; list: Fact[] } {
  let best: { concept: string; list: Fact[]; latest: string } | null = null
  for (const c of concepts) {
    const list = unitFacts(facts, ns, c, units)
    if (!list.length) continue
    const latest = list.reduce((m, f) => (f.end > m ? f.end : m), '')
    if (!best || latest > best.latest) best = { concept: c, list, latest }
  }
  return best ? { concept: best.concept, list: best.list } : { concept: '', list: [] }
}

const sumLast = (rows: PeriodValue[], n: number) => (rows.length >= n ? rows.slice(-n).reduce((s, r) => s + r.value, 0) : null)
const yoy = (rows: PeriodValue[]) => {
  if (rows.length < 5) return null
  const a = rows[rows.length - 5].value, b = rows[rows.length - 1].value
  return a ? ((b - a) / Math.abs(a)) * 100 : null
}
const qoq = (rows: PeriodValue[]) => {
  if (rows.length < 2) return null
  const a = rows[rows.length - 2].value, b = rows[rows.length - 1].value
  return a ? ((b - a) / Math.abs(a)) * 100 : null
}

export function summarizeFacts(cik: number, j: any): EdgarSummary {
  const facts = j?.facts ?? {}
  const rev = firstWithData(facts, REVENUE_CONCEPTS, ['USD'])
  const ni = firstWithData(facts, CONCEPTS.netIncome, ['USD'])
  const eps = firstWithData(facts, CONCEPTS.epsDiluted, ['USD/shares'])
  const ocf = firstWithData(facts, CONCEPTS.operatingCashFlow, ['USD'])
  const q = { revenue: framed(rev.list, 'quarter').slice(-12), netIncome: framed(ni.list, 'quarter').slice(-12), epsDiluted: framed(eps.list, 'quarter').slice(-12), operatingCashFlow: framed(ocf.list, 'quarter').slice(-12) }
  const a = { revenue: framed(rev.list, 'year').slice(-6), netIncome: framed(ni.list, 'year').slice(-6), epsDiluted: framed(eps.list, 'year').slice(-6), operatingCashFlow: framed(ocf.list, 'year').slice(-6) }
  const ttmRev = sumLast(q.revenue, 4), ttmNi = sumLast(q.netIncome, 4), ttmEps = sumLast(q.epsDiluted, 4), ttmOcf = sumLast(q.operatingCashFlow, 4)
  const assets = latestInstant(firstWithData(facts, CONCEPTS.assets, ['USD']).list)
  const liabilities = latestInstant(firstWithData(facts, CONCEPTS.liabilities, ['USD']).list)
  const equity = latestInstant(firstWithData(facts, CONCEPTS.equity, ['USD']).list)
  const cash = latestInstant(firstWithData(facts, CONCEPTS.cash, ['USD']).list)
  const ltd = latestInstant(firstWithData(facts, CONCEPTS.longTermDebt, ['USD']).list)
  const shares = latestInstant(unitFacts(facts, 'dei', 'EntityCommonStockSharesOutstanding', ['shares']))
  const lastQ = q.revenue[q.revenue.length - 1] ?? q.netIncome[q.netIncome.length - 1] ?? null
  return {
    fetchedAt: new Date().toISOString(), cik, name: String(j?.entityName ?? ''), fiscalYearEnd: null, revenueConcept: rev.concept || null,
    quarterly: q, annual: a,
    ttm: { revenue: ttmRev, netIncome: ttmNi, epsDiluted: ttmEps, operatingCashFlow: ttmOcf, asOf: lastQ?.end ?? null },
    growth: { revenueYoY: yoy(q.revenue), netIncomeYoY: yoy(q.netIncome), revenueQoQ: qoq(q.revenue) },
    margins: { net: ttmRev && ttmNi !== null ? (ttmNi / ttmRev) * 100 : null, operatingCashFlow: ttmRev && ttmOcf !== null ? (ttmOcf / ttmRev) * 100 : null },
    balance: { asOf: assets?.end ?? equity?.end ?? null, assets: assets?.value ?? null, liabilities: liabilities?.value ?? null, equity: equity?.value ?? null, cash: cash?.value ?? null, longTermDebt: ltd?.value ?? null, sharesOutstanding: shares?.value ?? null, sharesAsOf: shares?.end ?? null },
    lastReport: lastQ ? { form: lastQ.form, end: lastQ.end } : null,
  }
}

export const edgarSummaryKey = (cik: number) => `edgar_facts_v3_${cik}`

export async function edgarCompanyFacts(cik: number) {
  return cachedFetch<EdgarSummary>(edgarSummaryKey(cik), 12 * 3600, async () => {
    const r = await timeoutFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`, { headers: SEC_HEADERS }, 20000)
    if (!r.ok) throw new Error(`EDGAR company facts responded ${r.status}`)
    const j = await r.json()
    return summarizeFacts(cik, j)
  })
}

// ---- filings (submissions API) ----
export type EdgarFiling = { form: string; filed: string; reportDate: string | null; description: string | null; url: string; accession: string }
const INTERESTING = new Set(['10-K', '10-Q', '8-K', '10-K/A', '10-Q/A', 'DEF 14A', '20-F', '6-K', '40-F', 'S-1', '424B4', 'SC 13D', 'SC 13G', '13F-HR'])

export async function edgarFilings(cik: number) {
  return cachedFetch<{ fetchedAt: string; cik: number; name: string; sic: string | null; sicDescription: string | null; stateOfIncorporation: string | null; fiscalYearEnd: string | null; exchanges: string[]; filings: EdgarFiling[] }>(`edgar_filings_${cik}`, 3600, async () => {
    const r = await timeoutFetch(`https://data.sec.gov/submissions/CIK${padCik(cik)}.json`, { headers: SEC_HEADERS }, 15000)
    if (!r.ok) throw new Error(`EDGAR submissions responded ${r.status}`)
    const j = await r.json()
    const rec = j?.filings?.recent ?? {}
    const n = Array.isArray(rec.form) ? rec.form.length : 0
    const filings: EdgarFiling[] = []
    for (let i = 0; i < n && filings.length < 25; i++) {
      const form = String(rec.form[i] ?? '')
      if (!INTERESTING.has(form) && !/^10-|^8-K/.test(form)) continue
      const acc = String(rec.accessionNumber[i] ?? '')
      const doc = String(rec.primaryDocument?.[i] ?? '')
      filings.push({
        form, filed: String(rec.filingDate?.[i] ?? ''), reportDate: rec.reportDate?.[i] || null, description: rec.primaryDocDescription?.[i] || null, accession: acc,
        url: doc ? `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, '')}/${doc}` : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padCik(cik)}&type=&dateb=&owner=include&count=40`,
      })
    }
    return {
      fetchedAt: new Date().toISOString(), cik, name: String(j?.name ?? ''), sic: j?.sic ? String(j.sic) : null, sicDescription: j?.sicDescription ?? null,
      stateOfIncorporation: j?.stateOfIncorporation ?? null, fiscalYearEnd: j?.fiscalYearEnd ?? null, exchanges: Array.isArray(j?.exchanges) ? j.exchanges.filter(Boolean) : [], filings,
    }
  })
}
