// Instrument master — code catalog + symbol normalization (spec §150–151).
//
// One canonical KEY per instrument (uppercase, no separators: EURUSD, XAUUSD,
// US500, BTCUSD, AAPL, NIFTY50) and the symbol every provider/venue knows it
// by. Pure module — no DB, safe to import from client and server. The DB table
// `instrument_master` is synced from this list (lib/instruments/master.ts).
//
// Honesty rules: `tdProxy` marks a Twelve Data symbol that is an ETF PROXY, not
// the index itself (free tier gates direct indices). `dataStatus` says whether
// EMIL has a research feed for it TODAY. `tradable` = listed on EMIL Trade.

export const CATALOG_VERSION = 1

export type InstrumentDef = {
  key: string
  name: string
  assetClass: 'forex' | 'metals' | 'indices' | 'energies' | 'crypto' | 'stocks' | 'commodities'
  market: string          // lib/markets.ts key
  exchange: string
  country: string
  currency: string
  base?: string
  quote?: string
  tdSymbol?: string       // Twelve Data
  tdProxy?: boolean
  tvSymbol?: string       // TradingView
  emilTradeSymbol?: string// EMIL Trade terminal
  deribitSymbol?: string
  geminiSymbol?: string
  deltaSymbol?: string
  aliases?: string[]
  lotSize?: number
  tickSize?: number
  dataStatus: 'live' | 'coming_soon'
  tradable: boolean
}

const CCY_NAMES: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', CHF: 'Swiss Franc', AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar', CAD: 'Canadian Dollar', SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone', MXN: 'Mexican Peso', ZAR: 'South African Rand', TRY: 'Turkish Lira', INR: 'Indian Rupee', CNH: 'Offshore Yuan', PLN: 'Polish Zloty',
}

function fx(base: string, quote: string, tradable = true): InstrumentDef {
  const key = `${base}${quote}`
  return {
    key, name: `${CCY_NAMES[base] ?? base} / ${CCY_NAMES[quote] ?? quote}`, assetClass: 'forex', market: 'forex', exchange: 'OTC', country: 'GLOBAL',
    currency: quote, base, quote, tdSymbol: `${base}/${quote}`, tvSymbol: `FX:${key}`, emilTradeSymbol: key,
    aliases: [`${base}/${quote}`, `${base}-${quote}`, `${base}_${quote}`, `${key}=X`], tickSize: quote === 'JPY' ? 0.001 : 0.00001, dataStatus: 'live', tradable,
  }
}
function metal(key: string, name: string, base: string, aliases: string[]): InstrumentDef {
  return { key, name, assetClass: 'metals', market: 'metals', exchange: 'OTC', country: 'GLOBAL', currency: 'USD', base, quote: 'USD', tdSymbol: `${base}/USD`, tvSymbol: `OANDA:${key}`, emilTradeSymbol: key, aliases: [`${base}/USD`, ...aliases], tickSize: 0.01, dataStatus: 'live', tradable: true }
}
function index(key: string, name: string, country: string, currency: string, tv: string, aliases: string[], tdProxy?: string, tradable = true): InstrumentDef {
  return { key, name, assetClass: 'indices', market: 'indices', exchange: 'CFD', country, currency, tvSymbol: tv, emilTradeSymbol: tradable ? key : undefined, tdSymbol: tdProxy, tdProxy: !!tdProxy, aliases, tickSize: 0.1, dataStatus: tdProxy ? 'live' : 'coming_soon', tradable }
}
function energy(key: string, name: string, tv: string, aliases: string[], tdProxy?: string): InstrumentDef {
  return { key, name, assetClass: 'energies', market: 'energies', exchange: 'CFD', country: 'GLOBAL', currency: 'USD', tvSymbol: tv, emilTradeSymbol: key, tdSymbol: tdProxy, tdProxy: !!tdProxy, aliases, tickSize: 0.01, dataStatus: tdProxy ? 'live' : 'coming_soon', tradable: true }
}
function crypto(base: string, name: string, extra: Partial<InstrumentDef> = {}, tradable = false): InstrumentDef {
  const key = `${base}USD`
  return {
    key, name: `${name} / US Dollar`, assetClass: 'crypto', market: 'crypto', exchange: 'CRYPTO', country: 'GLOBAL', currency: 'USD', base, quote: 'USD',
    tdSymbol: `${base}/USD`, tvSymbol: `COINBASE:${key}`, emilTradeSymbol: tradable ? key : undefined, geminiSymbol: `${base.toLowerCase()}usd`, deltaSymbol: key,
    aliases: [base, `${base}/USD`, `${base}USDT`, `${base}-USD`, name.toUpperCase()], tickSize: 0.01, dataStatus: 'live', tradable, ...extra,
  }
}
function stock(exchange: string, ticker: string, name: string, country = 'US', currency = 'USD', market = 'us_stocks', aliases: string[] = []): InstrumentDef {
  const td = country === 'IN' ? `${ticker}:${exchange}` : ticker
  return { key: ticker, name, assetClass: 'stocks', market, exchange, country, currency, tdSymbol: td, tvSymbol: `${exchange}:${ticker}`, aliases: [`${exchange}:${ticker}`, ...aliases], tickSize: 0.01, dataStatus: country === 'IN' ? 'coming_soon' : 'live', tradable: false }
}
function inIndex(key: string, name: string, exchange: 'NSE' | 'BSE', tv: string, lotSize: number, aliases: string[]): InstrumentDef {
  return { key, name, assetClass: 'indices', market: 'india', exchange, country: 'IN', currency: 'INR', tvSymbol: tv, aliases, lotSize, tickSize: 0.05, dataStatus: 'coming_soon', tradable: false }
}
function mcx(key: string, name: string, tv: string, lotSize: number, aliases: string[]): InstrumentDef {
  return { key, name, assetClass: 'commodities', market: 'india', exchange: 'MCX', country: 'IN', currency: 'INR', tvSymbol: tv, aliases, lotSize, tickSize: 1, dataStatus: 'coming_soon', tradable: false }
}

const MAJORS: [string, string][] = [['EUR', 'USD'], ['GBP', 'USD'], ['USD', 'JPY'], ['USD', 'CHF'], ['AUD', 'USD'], ['NZD', 'USD'], ['USD', 'CAD']]
const MINORS: [string, string][] = [
  ['EUR', 'GBP'], ['EUR', 'JPY'], ['EUR', 'CHF'], ['EUR', 'AUD'], ['EUR', 'CAD'], ['EUR', 'NZD'],
  ['GBP', 'JPY'], ['GBP', 'CHF'], ['GBP', 'AUD'], ['GBP', 'CAD'], ['GBP', 'NZD'],
  ['AUD', 'JPY'], ['AUD', 'NZD'], ['AUD', 'CAD'], ['AUD', 'CHF'], ['NZD', 'JPY'], ['NZD', 'CAD'], ['CAD', 'JPY'], ['CAD', 'CHF'], ['CHF', 'JPY'],
]
const EXOTICS: [string, string][] = [['USD', 'SGD'], ['USD', 'HKD'], ['USD', 'SEK'], ['USD', 'NOK'], ['USD', 'MXN'], ['USD', 'ZAR'], ['USD', 'TRY'], ['USD', 'INR'], ['USD', 'CNH'], ['USD', 'PLN'], ['EUR', 'PLN'], ['EUR', 'TRY']]

export const CATALOG: InstrumentDef[] = [
  ...MAJORS.map(([b, q]) => fx(b, q)),
  ...MINORS.map(([b, q]) => fx(b, q)),
  ...EXOTICS.map(([b, q]) => fx(b, q)),

  metal('XAUUSD', 'Gold / US Dollar', 'XAU', ['GOLD', 'XAU', 'GC', 'OANDA:XAUUSD']),
  metal('XAGUSD', 'Silver / US Dollar', 'XAG', ['SILVER', 'XAG', 'SI', 'SLV']),
  metal('XPTUSD', 'Platinum / US Dollar', 'XPT', ['PLATINUM', 'XPT']),
  metal('XPDUSD', 'Palladium / US Dollar', 'XPD', ['PALLADIUM', 'XPD']),

  index('US500', 'S&P 500', 'US', 'USD', 'SP:SPX', ['SPX', 'SP500', 'S&P500', 'SPX500', 'ES', 'SPY', 'US500'], 'SPY'),
  index('US30', 'Dow Jones 30', 'US', 'USD', 'DJ:DJI', ['DJI', 'DOW', 'DJ30', 'YM', 'DIA', 'WS30'], 'DIA'),
  index('NAS100', 'Nasdaq 100', 'US', 'USD', 'NASDAQ:NDX', ['NDX', 'NASDAQ100', 'USTEC', 'NQ', 'QQQ', 'US100'], 'QQQ'),
  index('US2000', 'Russell 2000', 'US', 'USD', 'TVC:RUT', ['RUT', 'RUSSELL', 'IWM'], 'IWM'),
  index('GER40', 'DAX 40', 'DE', 'EUR', 'XETR:DAX', ['DAX', 'DE40', 'GER30', 'DE30', 'FDAX']),
  index('UK100', 'FTSE 100', 'GB', 'GBP', 'TVC:UKX', ['FTSE', 'FTSE100', 'UKX']),
  index('FRA40', 'CAC 40', 'FR', 'EUR', 'EURONEXT:PX1', ['CAC', 'CAC40', 'PX1']),
  index('EU50', 'Euro Stoxx 50', 'EU', 'EUR', 'TVC:SX5E', ['STOXX50', 'SX5E', 'ESTX50', 'EUSTX50']),
  index('ESP35', 'IBEX 35', 'ES', 'EUR', 'BME:IBC', ['IBEX', 'IBEX35']),
  index('JPN225', 'Nikkei 225', 'JP', 'JPY', 'TVC:NI225', ['NIKKEI', 'NI225', 'JP225', 'NKY']),
  index('HK50', 'Hang Seng', 'HK', 'HKD', 'TVC:HSI', ['HSI', 'HANGSENG', 'HK33']),
  index('AUS200', 'ASX 200', 'AU', 'AUD', 'ASX:XJO', ['ASX200', 'XJO', 'AU200']),
  index('CHN50', 'China A50', 'CN', 'CNH', 'SGX:CN1!', ['A50', 'CHINA50', 'CN50']),
  index('VIX', 'CBOE Volatility Index', 'US', 'USD', 'TVC:VIX', ['VOLATILITY', 'CBOE VIX'], undefined, false),
  index('DXY', 'US Dollar Index', 'US', 'USD', 'TVC:DXY', ['DOLLAR INDEX', 'USDX', 'DX'], 'UUP', false),

  energy('USOIL', 'WTI Crude Oil', 'TVC:USOIL', ['WTI', 'CL', 'OIL', 'CRUDE', 'CRUDEOIL', 'USO', 'XTIUSD'], 'USO'),
  energy('UKOIL', 'Brent Crude Oil', 'TVC:UKOIL', ['BRENT', 'BRN', 'XBRUSD', 'BNO'], 'BNO'),
  energy('NATGAS', 'Natural Gas', 'NYMEX:NG1!', ['NG', 'NATURALGAS', 'GAS', 'UNG', 'XNGUSD'], 'UNG'),

  crypto('BTC', 'Bitcoin', { deribitSymbol: 'BTC-PERPETUAL', aliases: ['BTC', 'BITCOIN', 'BTC/USD', 'BTCUSDT', 'BTC-USD', 'XBT', 'XBTUSD', 'BTC-PERPETUAL'] }, true),
  crypto('ETH', 'Ethereum', { deribitSymbol: 'ETH-PERPETUAL', aliases: ['ETH', 'ETHEREUM', 'ETH/USD', 'ETHUSDT', 'ETH-USD', 'ETH-PERPETUAL'] }, true),
  crypto('SOL', 'Solana', {}, false), crypto('XRP', 'XRP', {}, false), crypto('BNB', 'BNB', { tvSymbol: 'BINANCE:BNBUSDT' }, false),
  crypto('ADA', 'Cardano', {}, false), crypto('DOGE', 'Dogecoin', {}, false), crypto('LTC', 'Litecoin', {}, false),
  crypto('DOT', 'Polkadot', {}, false), crypto('AVAX', 'Avalanche', {}, false), crypto('LINK', 'Chainlink', {}, false),
  crypto('MATIC', 'Polygon', { tvSymbol: 'BINANCE:MATICUSDT' }, false), crypto('TRX', 'TRON', { tvSymbol: 'BINANCE:TRXUSDT' }, false), crypto('TON', 'Toncoin', { tvSymbol: 'BINANCE:TONUSDT' }, false),

  stock('NASDAQ', 'AAPL', 'Apple Inc.'), stock('NASDAQ', 'MSFT', 'Microsoft Corp.'), stock('NASDAQ', 'NVDA', 'NVIDIA Corp.'),
  stock('NASDAQ', 'TSLA', 'Tesla Inc.'), stock('NASDAQ', 'AMZN', 'Amazon.com Inc.'), stock('NASDAQ', 'GOOGL', 'Alphabet Inc. (Class A)', 'US', 'USD', 'us_stocks', ['GOOGLE', 'ALPHABET']),
  stock('NASDAQ', 'META', 'Meta Platforms Inc.', 'US', 'USD', 'us_stocks', ['FACEBOOK']), stock('NASDAQ', 'AMD', 'Advanced Micro Devices'), stock('NASDAQ', 'NFLX', 'Netflix Inc.'),
  stock('NASDAQ', 'INTC', 'Intel Corp.'), stock('NASDAQ', 'AVGO', 'Broadcom Inc.'), stock('NASDAQ', 'COST', 'Costco Wholesale'),
  stock('NYSE', 'JPM', 'JPMorgan Chase & Co.'), stock('NYSE', 'KO', 'Coca-Cola Co.'), stock('NYSE', 'BRK.B', 'Berkshire Hathaway (Class B)', 'US', 'USD', 'us_stocks', ['BRKB', 'BERKSHIRE']),
  stock('NYSE', 'V', 'Visa Inc.'), stock('NYSE', 'XOM', 'Exxon Mobil'), stock('NYSE', 'JNJ', 'Johnson & Johnson'), stock('NYSE', 'WMT', 'Walmart Inc.'),
  stock('NYSE', 'UNH', 'UnitedHealth Group'), stock('NYSE', 'PG', 'Procter & Gamble'), stock('NYSE', 'BAC', 'Bank of America'), stock('NYSE', 'DIS', 'Walt Disney Co.'),
  stock('NYSE', 'SPY', 'SPDR S&P 500 ETF', 'US', 'USD', 'us_stocks', ['S&P 500 ETF']), stock('NASDAQ', 'QQQ', 'Invesco QQQ (Nasdaq-100 ETF)'), stock('NYSE', 'GLD', 'SPDR Gold Shares ETF'),

  inIndex('NIFTY50', 'Nifty 50', 'NSE', 'NSE:NIFTY', 75, ['NIFTY', 'NIFTY 50', 'NSE:NIFTY', 'NIFTY50']),
  inIndex('BANKNIFTY', 'Nifty Bank', 'NSE', 'NSE:BANKNIFTY', 35, ['NIFTYBANK', 'BANK NIFTY', 'NSE:BANKNIFTY']),
  inIndex('FINNIFTY', 'Nifty Financial Services', 'NSE', 'NSE:CNXFINANCE', 65, ['FIN NIFTY', 'NIFTYFIN']),
  inIndex('MIDCPNIFTY', 'Nifty Midcap Select', 'NSE', 'NSE:NIFTY_MID_SELECT', 120, ['MIDCAP NIFTY', 'MIDCPNIFTY']),
  inIndex('SENSEX', 'S&P BSE Sensex', 'BSE', 'BSE:SENSEX', 20, ['BSE30', 'BSE SENSEX']),
  ...[
    ['RELIANCE', 'Reliance Industries'], ['TCS', 'Tata Consultancy Services'], ['HDFCBANK', 'HDFC Bank'], ['INFY', 'Infosys'], ['ICICIBANK', 'ICICI Bank'],
    ['SBIN', 'State Bank of India'], ['ITC', 'ITC Limited'], ['TATAMOTORS', 'Tata Motors'], ['LT', 'Larsen & Toubro'], ['BHARTIARTL', 'Bharti Airtel'],
    ['HINDUNILVR', 'Hindustan Unilever'], ['KOTAKBANK', 'Kotak Mahindra Bank'], ['AXISBANK', 'Axis Bank'], ['BAJFINANCE', 'Bajaj Finance'], ['MARUTI', 'Maruti Suzuki'],
    ['SUNPHARMA', 'Sun Pharmaceutical'], ['WIPRO', 'Wipro'], ['HCLTECH', 'HCL Technologies'], ['ADANIENT', 'Adani Enterprises'], ['TATASTEEL', 'Tata Steel'],
  ].map(([t, n]) => stock('NSE', t, n, 'IN', 'INR', 'india')),
  mcx('MCXGOLD', 'MCX Gold (1 kg)', 'MCX:GOLD1!', 100, ['GOLD MCX', 'GOLDM', 'MCX GOLD']),
  mcx('MCXSILVER', 'MCX Silver (30 kg)', 'MCX:SILVER1!', 30, ['SILVER MCX', 'MCX SILVER']),
  mcx('MCXCRUDEOIL', 'MCX Crude Oil (100 bbl)', 'MCX:CRUDEOIL1!', 100, ['CRUDE MCX', 'MCX CRUDE']),
  mcx('MCXNATURALGAS', 'MCX Natural Gas (1250 mmBtu)', 'MCX:NATURALGAS1!', 1250, ['NATGAS MCX', 'MCX NATURAL GAS']),
  mcx('MCXCOPPER', 'MCX Copper (2500 kg)', 'MCX:COPPER1!', 2500, ['COPPER', 'MCX COPPER']),
]

// ---- normalization ------------------------------------------------------

const PREFIXES = ['FX:', 'OANDA:', 'FX_IDC:', 'COINBASE:', 'BINANCE:', 'BITSTAMP:', 'KRAKEN:', 'NASDAQ:', 'NYSE:', 'AMEX:', 'TVC:', 'SP:', 'DJ:', 'CBOE:', 'XETR:', 'EURONEXT:', 'BME:', 'ASX:', 'SGX:', 'NYMEX:', 'COMEX:']

function canon(s: string) {
  return s.toUpperCase().replace(/[\s\/\-_.:=]/g, '')
}

const BY_KEY = new Map<string, InstrumentDef>()
const BY_ALIAS = new Map<string, InstrumentDef>()
for (const d of CATALOG) {
  BY_KEY.set(d.key, d)
  BY_ALIAS.set(canon(d.key), d)
  for (const a of d.aliases ?? []) if (!BY_ALIAS.has(canon(a))) BY_ALIAS.set(canon(a), d)
  if (d.tdSymbol && !d.tdProxy && !BY_ALIAS.has(canon(d.tdSymbol))) BY_ALIAS.set(canon(d.tdSymbol), d)
  if (d.tvSymbol && !BY_ALIAS.has(canon(d.tvSymbol))) BY_ALIAS.set(canon(d.tvSymbol), d)
}

/** Resolve any user/provider spelling to the canonical instrument, or null. */
export function resolveInstrument(input: string | null | undefined): InstrumentDef | null {
  if (!input) return null
  let s = input.trim().toUpperCase()
  if (!s) return null
  if (BY_KEY.has(s)) return BY_KEY.get(s)!
  for (const p of PREFIXES) if (s.startsWith(p)) { s = s.slice(p.length); break }
  s = s.replace(/=X$/, '').replace(/-PERP(ETUAL)?$/, '').replace(/\.P$/, '')
  return BY_ALIAS.get(canon(s)) ?? BY_ALIAS.get(canon(input)) ?? null
}

/** Canonical key for any spelling; falls back to a cleaned upper-case copy of the input. */
export function normalizeSymbol(input: string): string {
  return resolveInstrument(input)?.key ?? input.trim().toUpperCase()
}

/** The symbol to send to Twelve Data (research quotes/series). Unknown symbols pass through. */
export function toTwelveData(input: string): { symbol: string; known: boolean; proxy: boolean; def: InstrumentDef | null } {
  const def = resolveInstrument(input)
  if (def?.tdSymbol) return { symbol: def.tdSymbol, known: true, proxy: !!def.tdProxy, def }
  return { symbol: input.trim().toUpperCase(), known: !!def, proxy: false, def }
}

export function toTradingView(input: string): string | null {
  return resolveInstrument(input)?.tvSymbol ?? null
}

export function toEmilTrade(input: string): string | null {
  const d = resolveInstrument(input)
  return d?.tradable ? (d.emilTradeSymbol ?? d.key) : null
}

export function marketLabel(market: string) {
  return ({ forex: 'Forex', metals: 'Metals', indices: 'Global Indices', energies: 'Energies', crypto: 'Crypto', india: 'India', us_stocks: 'US Stocks' } as Record<string, string>)[market] ?? market
}
