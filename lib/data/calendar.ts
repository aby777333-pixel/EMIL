// Economic calendar (spec §18) + central bank monitor (spec §19).
//
// Calendar source: the free Forex Factory weekly JSON feed (this week + next
// week), cached 15 minutes server-side. Central-bank state is DERIVED from
// that feed — the scheduled rate decisions carry "previous" (= the current
// rate), "forecast" and, once released, "actual". When a FRED key is present
// the monitor also pulls the latest official series for the Fed, ECB, BoE
// and BoJ. Nothing here is guessed: a bank with no decision inside the
// two-week window and no FRED series says so.

import { cachedFetch, timeoutFetch } from '@/lib/data/hub'
import { prisma } from '@/lib/db'
import { decryptSecret } from '@/lib/secrets'

export type CalendarEvent = {
  id: string
  title: string
  country: string
  date: string // ISO
  impact: 'High' | 'Medium' | 'Low' | 'Holiday' | string
  forecast: string | null
  previous: string | null
  actual: string | null
  week: 'this' | 'next'
}

const FEEDS: { week: 'this' | 'next'; url: string }[] = [
  { week: 'this', url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json' },
  { week: 'next', url: 'https://nfs.faireconomy.media/ff_calendar_nextweek.json' },
]

async function loadFeed(week: 'this' | 'next', url: string): Promise<CalendarEvent[]> {
  const res = await timeoutFetch(url, {}, 12000)
  if (!res.ok) throw new Error(`Forex Factory feed responded ${res.status}`)
  const rows = await res.json()
  return (Array.isArray(rows) ? rows : []).map((r: any, i: number) => ({
    id: `${week}-${i}-${String(r.title ?? '').slice(0, 24)}`,
    title: String(r.title ?? ''),
    country: String(r.country ?? ''),
    date: String(r.date ?? ''),
    impact: String(r.impact ?? 'Low'),
    forecast: r.forecast ? String(r.forecast) : null,
    previous: r.previous ? String(r.previous) : null,
    actual: r.actual ? String(r.actual) : null,
    week,
  }))
}

export async function economicCalendar() {
  return cachedFetch('econ_calendar_ff_v1', 900, async () => {
    const results = await Promise.allSettled(FEEDS.map((f) => loadFeed(f.week, f.url)))
    const events: CalendarEvent[] = []
    const errors: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') events.push(...r.value)
      else errors.push(`${FEEDS[i].week} week: ${String((r.reason as any)?.message ?? r.reason)}`)
    })
    if (!events.length) throw new Error(errors.join('; ') || 'calendar feed empty')
    events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    const hasNext = events.some((e) => e.week === 'next')
    return {
      provider: 'forexfactory',
      attribution: `Economic calendar via the free Forex Factory JSON feed (this week${hasNext ? ' + next week' : '; next week appears once the feed publishes it'}; cached ~15 min). Times shown in your local zone. Research only.`,
      freshness: 'delayed' as const,
      fetchedAt: new Date().toISOString(),
      errors,
      data: events,
    }
  })
}

// ---- Central banks ----
export const CENTRAL_BANKS: { key: string; name: string; short: string; currency: string; titles: RegExp; site: string; fredSeries?: string; fredLabel?: string }[] = [
  { key: 'fed', name: 'US Federal Reserve', short: 'Fed', currency: 'USD', titles: /federal funds rate|fomc/i, site: 'https://www.federalreserve.gov/monetarypolicy.htm', fredSeries: 'DFEDTARU', fredLabel: 'Fed funds target range — upper bound' },
  { key: 'ecb', name: 'European Central Bank', short: 'ECB', currency: 'EUR', titles: /main refinancing rate|ecb/i, site: 'https://www.ecb.europa.eu/mopo/html/index.en.html', fredSeries: 'ECBDFR', fredLabel: 'ECB deposit facility rate' },
  // The OECD "IRSTCB01" policy-rate series on FRED stopped in Dec 2023, so
  // only series verified current are wired; a stale observation is dropped.
  { key: 'boe', name: 'Bank of England', short: 'BoE', currency: 'GBP', titles: /official bank rate|boe|mpc/i, site: 'https://www.bankofengland.co.uk/monetary-policy', fredSeries: 'BOERUKM', fredLabel: 'Bank of England official bank rate (monthly)' },
  { key: 'boj', name: 'Bank of Japan', short: 'BoJ', currency: 'JPY', titles: /boj policy rate|boj/i, site: 'https://www.boj.or.jp/en/mopo/index.htm' },
  { key: 'rba', name: 'Reserve Bank of Australia', short: 'RBA', currency: 'AUD', titles: /cash rate|rba/i, site: 'https://www.rba.gov.au/monetary-policy/' },
  { key: 'boc', name: 'Bank of Canada', short: 'BoC', currency: 'CAD', titles: /overnight rate|boc/i, site: 'https://www.bankofcanada.ca/core-functions/monetary-policy/' },
  { key: 'snb', name: 'Swiss National Bank', short: 'SNB', currency: 'CHF', titles: /snb policy rate|snb/i, site: 'https://www.snb.ch/en/the-snb/mandates-goals/monetary-policy' },
  { key: 'rbnz', name: 'Reserve Bank of New Zealand', short: 'RBNZ', currency: 'NZD', titles: /official cash rate|rbnz/i, site: 'https://www.rbnz.govt.nz/monetary-policy' },
  { key: 'pboc', name: "People's Bank of China", short: 'PBoC', currency: 'CNY', titles: /loan prime rate|pboc/i, site: 'http://www.pbc.gov.cn/en/' },
  { key: 'rbi', name: 'Reserve Bank of India', short: 'RBI', currency: 'INR', titles: /repo rate|rbi/i, site: 'https://www.rbi.org.in/' },
]

async function fredKey(): Promise<string | null> {
  try {
    const p = await prisma.dataProvider.findUnique({ where: { key: 'fred' } })
    return p?.enabled && p?.apiKey ? decryptSecret(p.apiKey) : null
  } catch {
    return null
  }
}

// FRED: keyed JSON API when a key is configured; otherwise the public
// fredgraph.csv endpoint, which needs no key (cached 6 h, best-effort).
async function fredLatest(series: string, apiKey: string | null): Promise<{ value: number; date: string } | null> {
  if (apiKey) {
    const res = await timeoutFetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`, {}, 10000)
    if (res.ok) {
      const j = await res.json().catch(() => null)
      const o = j?.observations?.[0]
      const v = Number(o?.value)
      if (o && Number.isFinite(v)) return { value: v, date: String(o.date) }
    }
  }
  const res = await timeoutFetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`, { headers: { Accept: 'text/csv' } }, 12000)
  if (!res.ok) return null
  const text = await res.text()
  const lines = text.trim().split(/\r?\n/).slice(1)
  for (let i = lines.length - 1; i >= 0; i--) {
    const [date, raw] = lines[i].split(',')
    const v = Number(raw)
    if (Number.isFinite(v)) return { value: v, date }
  }
  return null
}

export async function centralBankMonitor() {
  const cal = await economicCalendar().catch(() => null)
  const events: CalendarEvent[] = cal?.data ?? []
  const now = Date.now()
  const key = await fredKey()
  const fred = await cachedFetch(`central_banks_fred_${key ? 'keyed' : 'public'}_v1`, key ? 3600 : 6 * 3600, async () => {
    const out: Record<string, { value: number; date: string } | null> = {}
    await Promise.all(CENTRAL_BANKS.filter((b) => b.fredSeries).map(async (b) => {
      const v = await fredLatest(b.fredSeries!, key).catch(() => null)
      // A policy-rate observation older than ~13 months is a dead series, not a rate.
      out[b.key] = v && Date.now() - Date.parse(v.date) < 400 * 86400e3 ? v : null
    }))
    if (!Object.values(out).some(Boolean)) throw new Error('FRED unavailable')
    return { fetchedAt: new Date().toISOString(), data: out }
  }).catch(() => null)

  const banks = CENTRAL_BANKS.map((b) => {
    const mine = events.filter((e) => e.country === b.currency && b.titles.test(e.title) && /rate/i.test(e.title))
    const upcoming = mine.filter((e) => Date.parse(e.date) >= now).sort((x, y) => Date.parse(x.date) - Date.parse(y.date))[0] ?? null
    const released = mine.filter((e) => e.actual && Date.parse(e.date) < now).sort((x, y) => Date.parse(y.date) - Date.parse(x.date))[0] ?? null
    const related = events.filter((e) => e.country === b.currency && (b.titles.test(e.title) || /press conference|minutes|statement|speaks|testif/i.test(e.title)) && /fomc|ecb|boe|boj|rba|boc|snb|rbnz|pboc|rbi|monetary|rate|policy/i.test(e.title))
    const f = fred?.data?.[b.key] ?? null
    return {
      ...b, titles: undefined,
      currentRate: released?.actual ?? upcoming?.previous ?? (f ? `${f.value}%` : null),
      currentRateSource: released?.actual ? `released ${released.date.slice(0, 10)} (calendar)` : upcoming?.previous ? 'previous value on the next scheduled decision (calendar)' : f ? `FRED ${b.fredSeries} as of ${f.date}` : null,
      nextDecision: upcoming ? { title: upcoming.title, date: upcoming.date, forecast: upcoming.forecast, previous: upcoming.previous } : null,
      lastDecision: released ? { title: released.title, date: released.date, actual: released.actual, forecast: released.forecast, previous: released.previous } : null,
      fred: f ? { ...f, label: b.fredLabel, series: b.fredSeries } : null,
      relatedEvents: related.slice(0, 6).map((e) => ({ title: e.title, date: e.date, impact: e.impact })),
    }
  })
  return {
    provider: fred ? 'forexfactory,fred' : 'forexfactory',
    attribution: `Central-bank state derived from scheduled rate decisions in the calendar feed${fred ? ' + latest FRED observations' : ''}. Banks without a decision in the two-week window show no rate rather than a guess.`,
    freshness: 'delayed' as const,
    fetchedAt: new Date().toISOString(),
    fredConfigured: !!key,
    fredSource: key ? 'keyed' : fred ? 'public' : null,
    banks,
  }
}
