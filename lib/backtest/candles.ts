// Historical candles for the backtest engine. Crypto history comes free from
// the venues' public endpoints (Deribit, Gemini); everything else rides the
// existing Twelve Data time-series path (key + credit budget apply).

import { cachedFetch, timeSeries } from '@/lib/data/hub'
import { timeoutFetch } from '@/lib/execution/types'
import type { Candle } from './engine'

export type CandleSource = 'deribit' | 'gemini' | 'twelve_data'
export type CandleInterval = '15m' | '1h' | '4h' | '1d'

export const INTERVAL_MS: Record<CandleInterval, number> = { '15m': 900e3, '1h': 3600e3, '4h': 14400e3, '1d': 86400e3 }

export const CANDLE_SOURCES: { key: CandleSource; label: string; note: string; examples: string[] }[] = [
  { key: 'deribit', label: 'Deribit (perps & futures)', note: 'Free public history, no key. BTC-PERPETUAL, ETH-PERPETUAL…', examples: ['BTC-PERPETUAL', 'ETH-PERPETUAL'] },
  { key: 'gemini', label: 'Gemini (spot)', note: 'Free public history, no key. 4h maps to Gemini\'s 6h candles.', examples: ['btcusd', 'ethusd', 'solusd'] },
  { key: 'twelve_data', label: 'Twelve Data (stocks, FX, indices)', note: 'Needs the Twelve Data key in Command → Data Providers; uses plan credits.', examples: ['AAPL', 'EUR/USD', 'SPY'] },
]

async function deribitCandles(symbol: string, interval: CandleInterval, bars: number): Promise<Candle[]> {
  const res = { '15m': '15', '1h': '60', '4h': '240', '1d': '1D' }[interval]
  const end = Date.now()
  const start = end - bars * INTERVAL_MS[interval]
  const r = await timeoutFetch(`https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=${encodeURIComponent(symbol)}&start_timestamp=${start}&end_timestamp=${end}&resolution=${res}`, {}, 15000)
  const j = await r.json().catch(() => null)
  const d = j?.result
  if (j?.error) throw new Error(`Deribit: ${j.error.message}`)
  if (!d || d.status !== 'ok' || !Array.isArray(d.ticks)) throw new Error(`Deribit returned no history for ${symbol}.`)
  const out: Candle[] = d.ticks.map((t: number, i: number) => ({ time: t, open: +d.open[i], high: +d.high[i], low: +d.low[i], close: +d.close[i], volume: d.volume?.[i] ?? null }))
  return out.filter((c) => Number.isFinite(c.close))
}

async function geminiCandles(symbol: string, interval: CandleInterval, bars: number): Promise<Candle[]> {
  const tf = { '15m': '15m', '1h': '1hr', '4h': '6hr', '1d': '1day' }[interval]
  const r = await timeoutFetch(`https://api.gemini.com/v2/candles/${encodeURIComponent(symbol.toLowerCase())}/${tf}`, {}, 15000)
  const j = await r.json().catch(() => null)
  if (!r.ok || !Array.isArray(j)) throw new Error(`Gemini: ${j?.message ?? j?.reason ?? `HTTP ${r.status}`}`)
  const out: Candle[] = j.map((c: number[]) => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] ?? null }))
  out.sort((a, b) => a.time - b.time)
  return out.slice(-bars)
}

async function twelveDataCandles(symbol: string, interval: CandleInterval, bars: number): Promise<Candle[]> {
  const iv = { '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day' }[interval]
  const ts: any = await timeSeries(symbol, iv, Math.min(500, bars))
  if (ts?.needsKey) throw new Error(ts.message ?? 'Twelve Data key required.')
  const out: Candle[] = (ts?.data ?? []).map((v: any) => ({ time: Date.parse(v.time.includes('T') || v.time.includes(' ') ? v.time.replace(' ', 'T') + 'Z' : `${v.time}T00:00:00Z`), open: v.open, high: v.high, low: v.low, close: v.close, volume: v.volume }))
  return out.filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
}

export async function loadCandles(source: CandleSource, symbol: string, interval: CandleInterval, bars: number) {
  const clean = symbol.trim()
  const n = Math.max(50, Math.min(source === 'twelve_data' ? 500 : 2000, Math.round(bars) || 500))
  const ttl = interval === '1d' ? 3 * 3600 : 1800
  return cachedFetch(`bt_candles_${source}_${clean.toUpperCase()}_${interval}_${n}`, ttl, async () => {
    const data = source === 'deribit' ? await deribitCandles(clean, interval, n) : source === 'gemini' ? await geminiCandles(clean, interval, n) : await twelveDataCandles(clean, interval, n)
    if (data.length < 30) throw new Error(`Only ${data.length} bars available for ${clean} @ ${interval} on ${source}.`)
    return { provider: source, symbol: clean, interval, fetchedAt: new Date().toISOString(), data }
  })
}
