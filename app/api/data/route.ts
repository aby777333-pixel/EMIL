import { toTwelveData } from '@/lib/instruments/catalog'
import { scoreHeadlines } from '@/lib/news-impact'
import { marketHeat } from '@/lib/data/heat'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cryptoMarkets, fxRates, marketBoard, newsFeed, timeSeries, correlationPair } from '@/lib/data/hub'
import { withGoLinks } from '@/lib/news-link'
import { cryptoVenueBoard } from '@/lib/data/crypto-venues'
import { optionsChain } from '@/lib/data/deribit-options'
import { centralBankMonitor, economicCalendar } from '@/lib/data/calendar'
import { flagEnabled } from '@/lib/flags'

export const dynamic = 'force-dynamic'

// Research-data proxy over the Data Provider Hub. Session-gated; provider
// secrets never reach the browser. RESEARCH data — never drives execution.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const fn = url.searchParams.get('fn') ?? ''

    if (fn === 'crypto_markets') {
      return NextResponse.json({ ok: true, ...(await cryptoMarkets(25)) })
    }
    if (fn === 'crypto_venues') {
      return NextResponse.json({ ok: true, ...(await cryptoVenueBoard()) })
    }
    if (fn === 'options_chain') {
      if (!(await flagEnabled('options_analytics', true))) return NextResponse.json({ ok: true, disabled: true })
      const currency = url.searchParams.get('currency') === 'ETH' ? 'ETH' : 'BTC'
      const expiry = (url.searchParams.get('expiry') ?? '').toUpperCase().slice(0, 10) || undefined
      return NextResponse.json({ ok: true, ...(await optionsChain(currency, expiry)) })
    }
    if (fn === 'econ_calendar') {
      return NextResponse.json({ ok: true, ...(await economicCalendar()) })
    }
    if (fn === 'central_banks') {
      return NextResponse.json({ ok: true, ...(await centralBankMonitor()) })
    }
    if (fn === 'fx_rates') {
      const base = (url.searchParams.get('base') ?? 'USD').toUpperCase().slice(0, 3)
      return NextResponse.json({ ok: true, ...(await fxRates(base)) })
    }
    if (fn === 'market_board') {
      return NextResponse.json({ ok: true, ...(await marketBoard()) })
    }
    if (fn === 'heat') {
      return NextResponse.json({ ok: true, ...(await marketHeat()) })
    }
    if (fn === 'news') {
      const category = url.searchParams.get('category') ?? 'markets'
      const feed: any = await newsFeed(category, 30)
      // Optional AI impact scoring (spec §16–17): one cached LLM call per batch,
      // shared by every user. A scoring failure never hides the headlines.
      const wantScore = url.searchParams.get('score') === '1'
      if (wantScore && process.env.ABACUSAI_API_KEY && (await flagEnabled('news_impact_scoring', true))) {
        const scored = await scoreHeadlines(feed?.data ?? []).catch(() => null)
        if (scored?.items) {
          const byIdx = new Map(scored.items.map((x: any) => [x.i, x]))
          return NextResponse.json({ ok: true, ...feed, data: withGoLinks((feed?.data ?? []).map((a: any, i: number) => ({ ...a, impact: byIdx.get(i) ?? null }))), scoring: { model: scored.model, fetchedAt: scored.fetchedAt, label: 'model assessment' } })
        }
      }
      return NextResponse.json({ ok: true, ...feed, data: withGoLinks(feed?.data ?? []) })
    }
    if (fn === 'time_series') {
      const rawSymbol = (url.searchParams.get('symbol') ?? '').slice(0, 24)
      if (!rawSymbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 })
      // Any spelling (EURUSD, EUR/USD, gold, SPX…) resolves through the instrument master.
      const symbol = toTwelveData(rawSymbol).symbol
      const interval = url.searchParams.get('interval') ?? '1day'
      const outputsize = parseInt(url.searchParams.get('outputsize') ?? '90', 10)
      return NextResponse.json({ ok: true, ...(await timeSeries(symbol, interval, outputsize, undefined, (session.user as any).id as string)) })
    }
    if (fn === 'correlation') {
      const a = toTwelveData((url.searchParams.get('a') ?? '').slice(0, 24)).symbol
      const b = toTwelveData((url.searchParams.get('b') ?? '').slice(0, 24)).symbol
      if (!a || !b) return NextResponse.json({ error: 'a and b symbol parameters required' }, { status: 400 })
      const bars = parseInt(url.searchParams.get('bars') ?? '180', 10)
      const daysRaw = parseInt(url.searchParams.get('days') ?? '', 10)
      const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : undefined
      return NextResponse.json({ ok: true, ...(await correlationPair(a, b, bars, days, (session.user as any).id as string)) })
    }
    return NextResponse.json({ error: `Unknown function "${fn}". Available: crypto_markets, crypto_venues, options_chain, econ_calendar, central_banks, fx_rates, market_board, news, time_series, correlation.` }, { status: 400 })
  } catch (e: any) {
    if (e?.rateLimited) {
      // Daily cap: pass the honest message and a retry-after that points at the 00:00 UTC reset,
      // so clients back off for hours instead of hammering every minute.
      if (e.daily) {
        const retryAfterSec = Math.max(60, Math.round(e.retryAfterSec ?? 3600))
        return NextResponse.json({ error: 'rate_limited', daily: true, retryAfterSec, message: e.message }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
      }
      const retryAfterSec = Math.max(2, Math.min(65, e.retryAfterSec ?? 30))
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSec, message: `Per-minute market-data budget reached (free plan). EMIL will not fake data — it retries automatically in ~${retryAfterSec}s.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
    console.error('data hub error', e)
    return NextResponse.json({ error: 'data_unavailable', message: `The research feed is unavailable right now (${(e?.message ?? 'network error').slice(0, 120)}). EMIL never fakes data — try again shortly.` }, { status: 502 })
  }
}
