// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — Twelve Data API Client
// Live market data from Twelve Data (free tier: 8 calls/min, 800/day)
// ═══════════════════════════════════════════════════════════════

const API_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || 'demo';
const BASE_URL = 'https://api.twelvedata.com';

/** Map our internal symbols to Twelve Data format */
const SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
  EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY',
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  BTCUSD: 'BTC/USD',
  ETHUSD: 'ETH/USD',
};

/** Reverse map: Twelve Data symbol -> our symbol */
const REVERSE_SYMBOL_MAP: Record<string, string> = {};
for (const [key, value] of Object.entries(SYMBOL_MAP)) {
  REVERSE_SYMBOL_MAP[value] = key;
}

export function getTwelveDataSymbol(symbol: string): string {
  return SYMBOL_MAP[symbol] || symbol;
}

export function getInternalSymbol(tdSymbol: string): string {
  return REVERSE_SYMBOL_MAP[tdSymbol] || tdSymbol.replace('/', '');
}

export function isApiKeyConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';
  return key.length > 10; // Real keys are 32 chars, 'demo' is 4
}

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
}

export interface TwelveDataBar {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency_base: string;
    currency_quote: string;
    type: string;
  };
  values: TwelveDataBar[];
  status: string;
}

export interface TwelveDataIndicatorValue {
  datetime: string;
  [key: string]: string;
}

/**
 * Fetch a single quote for a symbol.
 * GET /quote?symbol=EUR/USD&apikey=KEY
 */
export async function fetchQuote(symbol: string): Promise<TwelveDataQuote | null> {
  try {
    const tdSymbol = getTwelveDataSymbol(symbol);
    const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(tdSymbol)}&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 10 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code || data.status === 'error') return null;
    return data as TwelveDataQuote;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple quotes in a single call (comma-separated symbols).
 * GET /quote?symbol=EUR/USD,GBP/USD&apikey=KEY
 */
export async function fetchMultipleQuotes(
  symbols: string[]
): Promise<Record<string, TwelveDataQuote>> {
  const result: Record<string, TwelveDataQuote> = {};
  if (symbols.length === 0) return result;

  try {
    const tdSymbols = symbols
      .map((s) => getTwelveDataSymbol(s))
      .filter((s) => s.includes('/'));

    if (tdSymbols.length === 0) return result;

    const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(tdSymbols.join(','))}&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return result;
    const data = await res.json();

    // Single symbol returns object; multiple returns object keyed by symbol
    if (tdSymbols.length === 1) {
      if (!data.code && data.symbol) {
        const internalSym = getInternalSymbol(data.symbol);
        result[internalSym] = data;
      }
    } else {
      for (const tdSym of tdSymbols) {
        const quote = data[tdSym];
        if (quote && !quote.code && quote.symbol) {
          const internalSym = getInternalSymbol(quote.symbol);
          result[internalSym] = quote;
        }
      }
    }
  } catch {
    // Silent fail - caller will use simulated data
  }

  return result;
}

/**
 * Fetch time series (OHLCV bars) for a symbol.
 * GET /time_series?symbol=EUR/USD&interval=1h&outputsize=500&apikey=KEY
 */
export async function fetchTimeSeries(
  symbol: string,
  interval: string = '1h',
  outputsize: number = 500
): Promise<TwelveDataBar[]> {
  try {
    const tdSymbol = getTwelveDataSymbol(symbol);
    const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: TwelveDataTimeSeriesResponse = await res.json();
    if (data.status === 'error' || !data.values) return [];
    return data.values;
  } catch {
    return [];
  }
}

/**
 * Fetch a technical indicator value from Twelve Data.
 * GET /{indicator}?symbol=EUR/USD&interval=1h&apikey=KEY&time_period=14
 */
export async function fetchTechnicalIndicator(
  symbol: string,
  indicator: string,
  interval: string = '1h',
  params?: Record<string, number>
): Promise<TwelveDataIndicatorValue[]> {
  try {
    const tdSymbol = getTwelveDataSymbol(symbol);
    let url = `${BASE_URL}/${indicator}?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&apikey=${API_KEY}`;

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        url += `&${key}=${val}`;
      }
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === 'error' || !data.values) return [];
    return data.values;
  } catch {
    return [];
  }
}
