// Live crypto board straight from the exchanges' PUBLIC endpoints — no API
// key, no credits. Deribit (options/perp venue), Delta Exchange India and
// Gemini each publish tickers openly; EMIL merges them into one board.
// RESEARCH DATA: this board never drives execution.

import { cachedFetch } from '@/lib/data/hub'
import { num, timeoutFetch } from '@/lib/execution/types'

export type VenueQuote = {
  venue: 'deribit' | 'delta_exchange' | 'gemini'
  venueLabel: string
  symbol: string
  kind: 'perpetual' | 'spot'
  last?: number
  mark?: number
  index?: number
  bid?: number
  ask?: number
  change24hPct?: number
  fundingRate8hPct?: number
  openInterestUsd?: number
  volume24hUsd?: number
  error?: string
}

const DERIBIT = ['BTC-PERPETUAL', 'ETH-PERPETUAL']
const DELTA = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD']
const GEMINI = ['btcusd', 'ethusd', 'solusd']

async function deribitQuotes(): Promise<VenueQuote[]> {
  return Promise.all(DERIBIT.map(async (symbol) => {
    try {
      const res = await timeoutFetch(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${symbol}`, {}, 8000)
      const t = (await res.json())?.result
      if (!t) throw new Error(`Deribit responded ${res.status}`)
      return {
        venue: 'deribit', venueLabel: 'Deribit', symbol, kind: 'perpetual',
        last: num(t.last_price), mark: num(t.mark_price), index: num(t.index_price), bid: num(t.best_bid_price), ask: num(t.best_ask_price),
        change24hPct: num(t.stats?.price_change), fundingRate8hPct: num(t.funding_8h) !== undefined ? (num(t.funding_8h) as number) * 100 : undefined,
        openInterestUsd: num(t.open_interest) !== undefined && num(t.mark_price) ? (num(t.open_interest) as number) : undefined,
        volume24hUsd: num(t.stats?.volume_usd),
      } as VenueQuote
    } catch (e: any) {
      return { venue: 'deribit', venueLabel: 'Deribit', symbol, kind: 'perpetual', error: e?.message ?? 'unavailable' }
    }
  }))
}

async function deltaQuotes(): Promise<VenueQuote[]> {
  try {
    const res = await timeoutFetch('https://api.india.delta.exchange/v2/tickers?contract_types=perpetual_futures', {}, 8000)
    const json = await res.json()
    if (!json?.success) throw new Error(`Delta responded ${res.status}`)
    const rows: any[] = Array.isArray(json.result) ? json.result : []
    return DELTA.map((symbol) => {
      const t = rows.find((r) => r.symbol === symbol)
      if (!t) return { venue: 'delta_exchange', venueLabel: 'Delta India', symbol, kind: 'perpetual', error: 'not listed' } as VenueQuote
      return {
        venue: 'delta_exchange', venueLabel: 'Delta India', symbol, kind: 'perpetual',
        last: num(t.close), mark: num(t.mark_price), index: num(t.spot_price), bid: num(t.quotes?.best_bid), ask: num(t.quotes?.best_ask),
        // Delta publishes funding_rate already in percent (e.g. "0.0100" = 0.01%/8h).
        change24hPct: num(t.mark_change_24h), fundingRate8hPct: num(t.funding_rate),
        openInterestUsd: num(t.oi_value_usd), volume24hUsd: num(t.turnover_usd),
      } as VenueQuote
    })
  } catch (e: any) {
    return DELTA.map((symbol) => ({ venue: 'delta_exchange', venueLabel: 'Delta India', symbol, kind: 'perpetual', error: e?.message ?? 'unavailable' } as VenueQuote))
  }
}

async function geminiQuotes(): Promise<VenueQuote[]> {
  return Promise.all(GEMINI.map(async (symbol) => {
    try {
      const [v2, v1] = await Promise.all([
        timeoutFetch(`https://api.gemini.com/v2/ticker/${symbol}`, {}, 8000).then((r) => r.json()),
        timeoutFetch(`https://api.gemini.com/v1/pubticker/${symbol}`, {}, 8000).then((r) => r.json()),
      ])
      const open = num(v2?.open), close = num(v2?.close)
      const vol = num(v1?.volume?.USD)
      return {
        venue: 'gemini', venueLabel: 'Gemini', symbol: symbol.toUpperCase(), kind: 'spot',
        last: close ?? num(v1?.last), bid: num(v2?.bid) ?? num(v1?.bid), ask: num(v2?.ask) ?? num(v1?.ask),
        change24hPct: open && close ? ((close - open) / open) * 100 : undefined, volume24hUsd: vol,
      } as VenueQuote
    } catch (e: any) {
      return { venue: 'gemini', venueLabel: 'Gemini', symbol: symbol.toUpperCase(), kind: 'spot', error: e?.message ?? 'unavailable' }
    }
  }))
}

export async function cryptoVenueBoard() {
  return cachedFetch('crypto_venues_v1', 30, async () => {
    const [d, dl, g] = await Promise.all([deribitQuotes(), deltaQuotes(), geminiQuotes()])
    return {
      provider: 'deribit,delta_exchange,gemini',
      attribution: 'Public tickers from Deribit, Delta Exchange India and Gemini (no key, cached ~30 s). Funding = 8h rate. Research board — never an execution feed.',
      freshness: 'realtime' as const,
      fetchedAt: new Date().toISOString(),
      data: [...d, ...dl, ...g],
    }
  })
}
