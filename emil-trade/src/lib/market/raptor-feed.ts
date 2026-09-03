// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Unified Market Data Feed
//
// One normalised market-data service that fuses several providers behind a
// single interface, so the rest of Raptor (terminal, AI Strategy Lab) can ask
// for a quote/candles by symbol without caring where the data comes from.
//
// Providers (used in priority order per asset class; all optional except the
// free public backbones, so the feed degrades gracefully):
//   • Finnhub      — US equities & crypto real-time      (env FINNHUB_API_KEY)
//   • Twelve Data  — forex / equities / indices          (env TWELVEDATA_API_KEY)
//   • Yahoo Finance— universal backbone, no key           (public)
//   • Binance      — crypto spot & klines, no key         (public)
//   • Marketstack  — EOD equities                          (env MARKETSTACK_API_KEY)
//   • Indian Stock API — NSE/BSE via self-hosted service   (env INDIAN_STOCK_API_URL)
//
// Keys are read from the server environment only — never shipped to the client.
// FXCM ForexConnect / FIX are native/socket gateways that cannot run inside a
// stateless serverless function; they are represented in health() as "gateway
// required" rather than called here.
// ═══════════════════════════════════════════════════════════════

export type AssetClass = 'forex' | 'stock' | 'crypto' | 'index' | 'commodity' | 'india';

export interface RaptorQuote {
  symbol: string;       // canonical Raptor symbol (e.g. EURUSD, RELIANCE, BTCUSDT)
  price: number;
  prev_close: number;
  change: number;
  change_pct: number;
  currency: string;
  asset_class: AssetClass;
  source: string;       // which provider answered
  time: string;         // ISO
}

export interface RaptorCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const TWELVEDATA_KEY = process.env.TWELVEDATA_API_KEY || process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';
const EODHD_KEY = process.env.EODHD_API_KEY || '';
const MARKETSTACK_KEY = process.env.MARKETSTACK_API_KEY || '';
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || '';
const INDIAN_API = process.env.INDIAN_STOCK_API_URL || '';
const POLYGON_KEY = process.env.POLYGON_API_KEY || '';        // direct api.polygon.io
const APIMARKET_KEY = process.env.APIMARKET_KEY || '';         // api.market gateway (Polygon/Yahoo stores)
const STOCKER_KEY = process.env.STOCKER_API_KEY || '';         // StockerAPI forex
const STOCKER_URL = process.env.STOCKER_API_URL || 'https://api.stockerapi.com';
// Stored for completeness / health; bulk & enterprise gateways are not called
// from the serverless feed (see feedHealth notes).
const MASSIVE_KEY_ID = process.env.MASSIVE_ACCESS_KEY_ID || '';

// ── Symbol resolution ────────────────────────────────────────────
// Map a canonical Raptor symbol to each provider's ticker + asset class.
interface Resolved {
  asset: AssetClass;
  currency: string;
  yahoo: string;
  finnhub?: string;   // Finnhub ticker (US stocks / BINANCE:xxx crypto)
  twelve?: string;    // Twelve Data ticker (e.g. EUR/USD)
  binance?: string;   // Binance spot pair
  eodhd?: string;     // EODHD code (e.g. AAPL.US / EURUSD.FOREX / BTC-USD.CC / NSEI.INDX)
  marketstack?: string; // marketstack symbol (US equities)
  polygon?: string;   // Polygon ticker (AAPL / C:EURUSD / X:BTCUSD)
  polygonMarket?: 'stocks' | 'forex' | 'crypto';
}

const FOREX: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', AUDUSD: 'AUDUSD=X',
  USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X', USDCHF: 'USDCHF=X',
  EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X',
};
const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD'];
const CRYPTO: Record<string, string> = {
  BTCUSDT: 'BTC-USD', ETHUSDT: 'ETH-USD', BNBUSDT: 'BNB-USD', SOLUSDT: 'SOL-USD',
  XRPUSDT: 'XRP-USD', ADAUSDT: 'ADA-USD', DOGEUSDT: 'DOGE-USD',
};
const INDIA: Record<string, { yahoo: string }> = {
  NIFTY50: { yahoo: '^NSEI' }, SENSEX: { yahoo: '^BSESN' }, BANKNIFTY: { yahoo: '^NSEBANK' },
  FINNIFTY: { yahoo: '^CNXFIN' }, NIFTYIT: { yahoo: '^CNXIT' },
  RELIANCE: { yahoo: 'RELIANCE.NS' }, TCS: { yahoo: 'TCS.NS' }, INFY: { yahoo: 'INFY.NS' },
  HDFC: { yahoo: 'HDFCBANK.NS' },
};
// MCX contracts are INR-denominated; we proxy price discovery to the global
// futures curve (USD) and tag the source so it is never presented as an exact
// MCX print.
const INDIA_MCX: Record<string, string> = {
  GOLDMCX: 'GC=F', SILVERMCX: 'SI=F', CRUDEMCX: 'CL=F', NATGASMCX: 'NG=F',
};
const COMMODITIES: Record<string, string> = {
  GOLD: 'GC=F', XAUUSD: 'GC=F', SILVER: 'SI=F', XAGUSD: 'SI=F', PLATINUM: 'PL=F',
  CRUDEOIL: 'CL=F', USOIL: 'CL=F', NATURALGAS: 'NG=F', NATGAS: 'NG=F',
};
const INDICES: Record<string, string> = {
  SPX500: '^GSPC', DJI30: '^DJI', NASDAQ: '^IXIC', FTSE100: '^FTSE', DAX40: '^GDAXI',
  NIKKEI225: '^N225', UK100: '^FTSE', GER40: '^GDAXI', FRA40: '^FCHI', US30: '^DJI', NAS100: '^IXIC',
};

// EODHD index codes for Indian indices (equities need a paid India add-on, so
// only the indices that resolve on the current plan are mapped).
const INDIA_EODHD: Record<string, string> = {
  NIFTY50: 'NSEI.INDX', SENSEX: 'BSESN.INDX', BANKNIFTY: 'NSEBANK.INDX',
};

export function resolveSymbol(raw: string): Resolved {
  const s = raw.toUpperCase().replace('/', '').replace('_', '');
  if (FOREX[s]) return { asset: 'forex', currency: s.slice(3, 6), yahoo: FOREX[s], twelve: `${s.slice(0, 3)}/${s.slice(3, 6)}`, eodhd: `${s}.FOREX`, polygon: `C:${s}`, polygonMarket: 'forex' };
  if (CRYPTO[s]) return { asset: 'crypto', currency: 'USD', yahoo: CRYPTO[s], finnhub: `BINANCE:${s}`, binance: s, eodhd: `${s.replace(/USDT$/, '')}-USD.CC`, polygon: `X:${s.replace(/USDT$/, 'USD')}`, polygonMarket: 'crypto' };
  if (US_STOCKS.includes(s)) return { asset: 'stock', currency: 'USD', yahoo: s, finnhub: s, twelve: s, eodhd: `${s}.US`, marketstack: s, polygon: s, polygonMarket: 'stocks' };
  if (INDIA[s]) return { asset: 'india', currency: 'INR', yahoo: INDIA[s].yahoo, eodhd: INDIA_EODHD[s] };
  if (INDIA_MCX[s]) return { asset: 'commodity', currency: 'USD', yahoo: INDIA_MCX[s] };
  if (COMMODITIES[s]) return { asset: 'commodity', currency: 'USD', yahoo: COMMODITIES[s] };
  if (INDICES[s]) return { asset: 'index', currency: 'USD', yahoo: INDICES[s] };

  // EODHD-style code coming straight from the symbol search (TICKER.EXCHANGE),
  // e.g. AAPL.US, RELIANCE.NSE, EURUSD.FOREX, BTC-USD.CC, NSEI.INDX. Resolve it
  // to the right provider so any searched instrument can be quoted/charted.
  if (raw.includes('.')) {
    const dot = raw.toUpperCase();
    const idx = dot.lastIndexOf('.');
    const tk = dot.slice(0, idx);
    const exch = dot.slice(idx + 1);
    if (exch === 'FOREX') return { asset: 'forex', currency: tk.slice(3, 6) || 'USD', yahoo: `${tk}=X`, eodhd: dot, twelve: `${tk.slice(0, 3)}/${tk.slice(3, 6)}` };
    if (exch === 'CC') { const base = tk.replace(/-?USD$/, ''); return { asset: 'crypto', currency: 'USD', yahoo: `${base}-USD`, binance: `${base}USDT`, eodhd: dot }; }
    if (exch === 'INDX') return { asset: 'index', currency: 'USD', yahoo: '', eodhd: dot };
    if (exch === 'NSE') return { asset: 'india', currency: 'INR', yahoo: `${tk}.NS`, eodhd: dot };
    if (exch === 'BSE') return { asset: 'india', currency: 'INR', yahoo: `${tk}.BO`, eodhd: dot };
    if (exch === 'US') return { asset: 'stock', currency: 'USD', yahoo: tk, finnhub: tk, eodhd: dot };
    if (exch === 'COMM') return { asset: 'commodity', currency: 'USD', yahoo: '', eodhd: dot };
    // Foreign-listed equity — let EODHD resolve; Yahoo best-effort by exchange code.
    return { asset: 'stock', currency: 'USD', yahoo: '', eodhd: dot };
  }

  // Unknown bare ticker → try as a US equity on Finnhub/Yahoo/EODHD.
  return { asset: 'stock', currency: 'USD', yahoo: s, finnhub: s, eodhd: `${s}.US` };
}

// ── Provider adapters (each returns a partial quote or null) ──────
type PartialQuote = { price: number; prev_close: number; source: string } | null;

async function jget(url: string, opts: RequestInit = {}, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GIO4X-Raptor/1.0', ...(opts.headers || {}) },
      // Cache at the CDN layer to stay well within provider rate limits.
      next: { revalidate: 12 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function finnhubQuote(r: Resolved): Promise<PartialQuote> {
  if (!FINNHUB_KEY || !r.finnhub) return null;
  const d = await jget(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(r.finnhub)}&token=${FINNHUB_KEY}`);
  if (!d || typeof d.c !== 'number' || d.c === 0) return null;
  return { price: d.c, prev_close: d.pc || d.c, source: 'finnhub' };
}

async function binanceQuote(r: Resolved): Promise<PartialQuote> {
  if (!r.binance) return null;
  const d = await jget(`https://api.binance.com/api/v3/ticker/24hr?symbol=${r.binance}`);
  if (!d || !d.lastPrice) return null;
  const price = parseFloat(d.lastPrice);
  const prev = parseFloat(d.openPrice) || price;
  return { price, prev_close: prev, source: 'binance' };
}

async function twelveQuote(r: Resolved): Promise<PartialQuote> {
  if (!TWELVEDATA_KEY || !r.twelve) return null;
  const d = await jget(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(r.twelve)}&apikey=${TWELVEDATA_KEY}`);
  if (!d || !d.close) return null;
  const price = parseFloat(d.close);
  const prev = parseFloat(d.previous_close) || price;
  return { price, prev_close: prev, source: 'twelvedata' };
}

async function yahooQuote(r: Resolved): Promise<PartialQuote> {
  const d = await jget(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(r.yahoo)}?interval=1d&range=5d`);
  const meta = d?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  return { price, prev_close: prev, source: 'yahoo' };
}

async function eodhdQuote(r: Resolved): Promise<PartialQuote> {
  if (!EODHD_KEY || !r.eodhd) return null;
  const d = await jget(`https://eodhd.com/api/real-time/${encodeURIComponent(r.eodhd)}?api_token=${EODHD_KEY}&fmt=json`);
  if (!d || typeof d.close !== 'number' || d.close === 0) return null;
  const prev = typeof d.previousClose === 'number' ? d.previousClose : d.close;
  return { price: d.close, prev_close: prev, source: 'eodhd' };
}

async function marketstackQuote(r: Resolved): Promise<PartialQuote> {
  if (!MARKETSTACK_KEY || !r.marketstack) return null;
  const d = await jget(`https://api.marketstack.com/v1/eod/latest?access_key=${MARKETSTACK_KEY}&symbols=${r.marketstack}`);
  const row = d?.data?.[0];
  if (!row || typeof row.close !== 'number') return null;
  return { price: row.close, prev_close: row.open ?? row.close, source: 'marketstack' };
}

// Polygon.io — used either directly (POLYGON_API_KEY) or through the api.market
// gateway (APIMARKET_KEY on prod.api.market). Previous-day aggregate bar gives a
// clean {close, open}; snapshot could add live last-trade when on a paid tier.
async function polygonQuote(r: Resolved): Promise<PartialQuote> {
  if (!r.polygon) return null;
  const path = `/v2/aggs/ticker/${encodeURIComponent(r.polygon)}/prev?adjusted=true`;
  let d: any = null;
  if (POLYGON_KEY) {
    d = await jget(`https://api.polygon.io${path}&apiKey=${POLYGON_KEY}`);
  } else if (APIMARKET_KEY) {
    d = await jget(`https://prod.api.market/api/v1/polygon.io/polygon${path}`, {
      headers: { 'x-magicapi-key': APIMARKET_KEY },
    });
  } else {
    return null;
  }
  const row = d?.results?.[0];
  if (!row || typeof row.c !== 'number') return null;
  return { price: row.c, prev_close: row.o ?? row.c, source: 'polygon' };
}

// StockerAPI — forex market data (env-gated; inert without STOCKER_API_KEY).
async function stockerQuote(r: Resolved): Promise<PartialQuote> {
  if (!STOCKER_KEY || r.asset !== 'forex') return null;
  const pair = r.yahoo.replace('=X', '');
  const d = await jget(`${STOCKER_URL}/v1/forex/quote?symbol=${pair}&apikey=${STOCKER_KEY}`);
  const price = d?.price ?? d?.rate ?? d?.close;
  if (typeof price !== 'number') return null;
  return { price, prev_close: d?.previous_close ?? d?.open ?? price, source: 'stockerapi' };
}

// ── Public API ───────────────────────────────────────────────────
export async function getQuote(rawSymbol: string): Promise<RaptorQuote | null> {
  const r = resolveSymbol(rawSymbol);
  // Provider preference by asset class, then universal fallbacks.
  const chain: (() => Promise<PartialQuote>)[] =
    r.asset === 'crypto' ? [() => binanceQuote(r), () => eodhdQuote(r), () => finnhubQuote(r), () => polygonQuote(r), () => yahooQuote(r)]
    : r.asset === 'stock' ? [() => finnhubQuote(r), () => polygonQuote(r), () => eodhdQuote(r), () => yahooQuote(r), () => twelveQuote(r), () => marketstackQuote(r)]
    : r.asset === 'forex' ? [() => eodhdQuote(r), () => polygonQuote(r), () => stockerQuote(r), () => yahooQuote(r), () => twelveQuote(r)]
    : r.asset === 'india' ? [() => eodhdQuote(r), () => yahooQuote(r)]
    : [() => yahooQuote(r), () => eodhdQuote(r), () => twelveQuote(r)];

  let q: PartialQuote = null;
  for (const step of chain) {
    q = await step();
    if (q) break;
  }
  if (!q) return null;

  const price = round(q.price, digitsFor(rawSymbol, q.price));
  const prev = round(q.prev_close, digitsFor(rawSymbol, q.prev_close));
  const change = round(price - prev, 6);
  return {
    symbol: rawSymbol.toUpperCase(),
    price,
    prev_close: prev,
    change,
    change_pct: prev ? round((change / prev) * 100, 2) : 0,
    currency: r.currency,
    asset_class: r.asset,
    source: q.source,
    time: nowIso(),
  };
}

export async function getQuotes(symbols: string[]): Promise<RaptorQuote[]> {
  const settled = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  return settled
    .map((x) => (x.status === 'fulfilled' ? x.value : null))
    .filter((q): q is RaptorQuote => q != null);
}

export async function getCandles(rawSymbol: string, tf = '1h', bars = 200): Promise<RaptorCandle[]> {
  const r = resolveSymbol(rawSymbol);
  // Prefer Binance klines for crypto (full OHLCV), else Yahoo chart.
  if (r.binance) {
    const iv = tfToBinance(tf);
    const d = await jget(`https://api.binance.com/api/v3/klines?symbol=${r.binance}&interval=${iv}&limit=${Math.min(bars, 1000)}`);
    if (Array.isArray(d) && d.length) {
      return d.map((k: any[]) => ({
        time: new Date(k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
      }));
    }
  }
  if (r.yahoo) {
    const { interval, range } = tfToYahoo(tf, bars);
    const d = await jget(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(r.yahoo)}?interval=${interval}&range=${range}`);
    const res = d?.chart?.result?.[0];
    const ts: number[] = res?.timestamp || [];
    const q = res?.indicators?.quote?.[0];
    if (ts.length && q) {
      const out: RaptorCandle[] = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.close?.[i] == null) continue;
        out.push({
          time: new Date(ts[i] * 1000).toISOString(),
          open: q.open?.[i] ?? q.close[i],
          high: q.high?.[i] ?? q.close[i],
          low: q.low?.[i] ?? q.close[i],
          close: q.close[i],
          volume: q.volume?.[i] ?? 0,
        });
      }
      if (out.length) return out.slice(-bars);
    }
  }
  // EODHD fallback — works for any resolvable code (incl. indices with no Yahoo map).
  if (EODHD_KEY && r.eodhd) {
    const d = await jget(`https://eodhd.com/api/eod/${encodeURIComponent(r.eodhd)}?api_token=${EODHD_KEY}&fmt=json&order=a&period=d`);
    if (Array.isArray(d) && d.length) {
      return d.slice(-bars).map((row: any) => ({
        time: new Date(row.date).toISOString(),
        open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume ?? 0,
      }));
    }
  }
  return [];
}

export interface SearchResult {
  symbol: string;    // canonical/EODHD code the feed can resolve (quote/candles)
  name: string;
  exchange: string;
  type: string;
  currency: string;
  country: string;
}

// Instrument search across stocks, forex, indices, crypto — powered by EODHD's
// search (rich metadata) with a Yahoo fallback. Returns symbols the feed can
// then quote and chart directly.
export async function getSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  if (EODHD_KEY) {
    const d = await jget(`https://eodhd.com/api/search/${encodeURIComponent(q)}?api_token=${EODHD_KEY}&limit=15`);
    if (Array.isArray(d) && d.length) {
      return d.map((r: any) => ({
        symbol: `${r.Code}.${r.Exchange}`,
        name: r.Name || r.Code,
        exchange: r.Exchange || '',
        type: r.Type || '',
        currency: r.Currency || '',
        country: r.Country || '',
      }));
    }
  }
  const y = await jget(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`);
  const quotes: any[] = y?.quotes || [];
  return quotes.filter((x) => x.symbol).map((x) => ({
    symbol: x.symbol,
    name: x.shortname || x.longname || x.symbol,
    exchange: x.exchDisp || x.exchange || '',
    type: x.typeDisp || x.quoteType || '',
    currency: '',
    country: '',
  }));
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published: string;
  summary?: string;
}

// Real financial news via newsdata.io (used by the News & Sentiment agent).
export async function getNews(query = '', limit = 10): Promise<NewsItem[]> {
  if (!NEWSDATA_KEY) return [];
  const q = query ? `&q=${encodeURIComponent(query)}` : '&category=business';
  const d = await jget(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&language=en${q}`);
  const rows: any[] = d?.results || [];
  return rows.slice(0, limit).map((a) => ({
    title: a.title,
    source: a.source_id || a.source_name || 'news',
    url: a.link,
    published: a.pubDate || '',
    summary: a.description || undefined,
  }));
}

export function feedHealth() {
  return {
    providers: [
      { name: 'finnhub', configured: !!FINNHUB_KEY, scope: 'US equities + crypto (real-time)' },
      { name: 'eodhd', configured: !!EODHD_KEY, scope: 'US equities + forex + crypto + world indices' },
      { name: 'polygon', configured: !!(POLYGON_KEY || APIMARKET_KEY), scope: 'stocks + forex + crypto (direct or api.market gateway)' },
      { name: 'twelvedata', configured: !!TWELVEDATA_KEY, scope: 'forex + equities + indices' },
      { name: 'yahoo', configured: true, scope: 'universal backbone (no key)' },
      { name: 'binance', configured: true, scope: 'crypto spot + klines (no key)' },
      { name: 'marketstack', configured: !!MARKETSTACK_KEY, scope: 'EOD equities' },
      { name: 'stockerapi', configured: !!STOCKER_KEY, scope: 'forex market data' },
      { name: 'newsdata', configured: !!NEWSDATA_KEY, scope: 'financial news + sentiment' },
      { name: 'indian_stock_api', configured: !!INDIAN_API, scope: 'NSE/BSE (self-hosted)' },
      { name: 'massive_flatfiles', configured: !!MASSIVE_KEY_ID, scope: 'bulk historical flat files (S3, offline backfill)' },
      { name: 'bloomberg', configured: false, scope: 'gateway required (BLPAPI / enterprise)' },
      { name: 'fxcm_forexconnect', configured: false, scope: 'gateway required (native SDK)' },
      { name: 'fxcm_fix', configured: false, scope: 'gateway required (FIX 4.4 socket)' },
    ],
    ts: nowIso(),
  };
}

// ── helpers ──────────────────────────────────────────────────────
function round(n: number, d: number) { const f = 10 ** d; return Math.round(n * f) / f; }
function digitsFor(sym: string, price: number) {
  const s = sym.toUpperCase();
  if (s.includes('JPY')) return 3;
  if (FOREX[s.replace('/', '')]) return 5;
  return price < 5 ? 4 : 2;
}
function nowIso() { return new Date().toISOString(); }
function tfToBinance(tf: string) {
  const m: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '4h': '4h', '1d': '1d', '1H': '1h', '1D': '1d' };
  return m[tf] || '1h';
}
function tfToYahoo(tf: string, bars: number) {
  const t = tf.toLowerCase();
  if (t === '1m') return { interval: '1m', range: '1d' };
  if (t === '5m') return { interval: '5m', range: '5d' };
  if (t === '15m') return { interval: '15m', range: '5d' };
  if (t === '30m') return { interval: '30m', range: '1mo' };
  if (t === '1h') return { interval: '60m', range: bars > 200 ? '3mo' : '1mo' };
  if (t === '4h') return { interval: '60m', range: '6mo' };
  if (t === '1d') return { interval: '1d', range: '1y' };
  return { interval: '60m', range: '1mo' };
}
