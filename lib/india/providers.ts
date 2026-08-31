// India Market API Hub — provider registry (NSE / BSE / MCX)
// This is the canonical list of supported Indian market API providers.
// Seeded into the india_api_providers table; credentials are added by the
// account owner from the API Hub page and stored server-side only.

export type IndiaProviderDef = {
  key: string
  name: string
  vendor: string
  docsUrl: string
  baseUrl: string
  authType: 'api_key' | 'api_key_secret_daily_token' | 'oauth2' | 'totp_login' | 'static_token'
  authNote: string
  exchanges: string
  capabilities: string
  rateLimitNote: string
  pricingNote: string
}

export const INDIA_PROVIDERS: IndiaProviderDef[] = [
  {
    key: 'dalalai',
    name: 'DalalAI Developer API',
    vendor: 'DalalAI',
    docsUrl: 'https://dalalai.com/developer-api',
    baseUrl: 'https://api.dalalai.com/v1',
    authType: 'api_key',
    authNote:
      'Single API key in the X-API-Key header — generate keys from the DalalAI dashboard with per-key endpoint scoping and rate limits. JSON responses by default (gzip); CSV via ?format=csv on paid plans.',
    exchanges: 'NSE,BSE',
    capabilities:
      'ai_predictions,convergence_scores,smart_money,fii_dii_flows,insider_trading,fundamentals,delivery_volume,earnings_calendar,market_regime,breakout_scanner,stock_detail,webhooks',
    rateLimitNote: 'Per-second burst by plan: Free 10/s, Starter 50/s, Pro 200/s. Monthly call caps apply (Free 1,000 → Pro 500,000).',
    pricingNote: 'Free ₹0 (1,000 calls/mo, JSON only) → Starter ₹1,999 → Pro ₹9,999 (webhooks) → Enterprise. AI-signal DATA only — order execution needs a broker provider below.',
  },
  {
    key: 'indianapi',
    name: 'Indian Stock Market API',
    vendor: 'IndianAPI.in',
    docsUrl: 'https://indianapi.in/indian-stock-market',
    baseUrl: 'https://stock.indianapi.in',
    authType: 'api_key',
    authNote:
      'Single API key passed in the X-Api-Key header. No login flow, no daily token. Base URL depends on the plan: stock.indianapi.in (Free/Hobby), dev.indianapi.in (Developer), analyst.indianapi.in (Growth Analyst), pro.indianapi.in (Pro).',
    exchanges: 'NSE,BSE,MCX',
    capabilities:
      'quotes,historical,trending,most_active,price_shockers,52w_high_low,commodities,mutual_funds,forecasts,target_prices,industry_search,fundamentals',
    rateLimitNote: 'Credit/plan based — HTTP 429 when the plan rate limit or credits are exhausted.',
    pricingNote: 'Free tier available; paid tiers (Hobby/Developer/Growth Analyst/Pro) raise limits. Market DATA only — order execution needs a broker provider below.',
  },
  {
    key: 'zerodha_kite',
    name: 'Kite Connect',
    vendor: 'Zerodha',
    docsUrl: 'https://kite.trade/docs/connect/v3/',
    baseUrl: 'https://api.kite.trade',
    authType: 'api_key_secret_daily_token',
    authNote:
      'API key + secret from a Kite Connect app. A request_token from the login flow is exchanged (SHA-256 checksum) for a daily access token that expires every morning.',
    exchanges: 'NSE,BSE,MCX,NFO,BFO',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins,instruments_master',
    rateLimitNote: 'Quote: 1 req/s, Historical: 3 req/s, Orders: 10 req/s (per app).',
    pricingNote: 'Free for individual Zerodha accounts; historical-data add-on may be separate.',
  },
  {
    key: 'upstox',
    name: 'Upstox API v2',
    vendor: 'Upstox',
    docsUrl: 'https://upstox.com/developer/api-documentation',
    baseUrl: 'https://api.upstox.com/v2',
    authType: 'oauth2',
    authNote:
      'OAuth2 authorization-code flow. Access token is issued per day and expires at 03:30 IST the next day. Redirect URI must match the app registration.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins,instruments_master',
    rateLimitNote: '50 req/s overall; websocket market feed included.',
    pricingNote: 'Free.',
  },
  {
    key: 'angel_one',
    name: 'SmartAPI',
    vendor: 'Angel One',
    docsUrl: 'https://smartapi.angelbroking.com/docs',
    baseUrl: 'https://apiconnect.angelone.in',
    authType: 'totp_login',
    authNote:
      'API key + client code + PIN + TOTP login returns JWT + refresh + feed tokens. TOTP secret comes from enabling 2FA on the SmartAPI portal.',
    exchanges: 'NSE,BSE,MCX,NFO,BFO',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins,instruments_master',
    rateLimitNote: 'Varies per endpoint (roughly 10 req/s for orders, 3 req/s history).',
    pricingNote: 'Free.',
  },
  {
    key: 'dhan',
    name: 'DhanHQ API v2',
    vendor: 'Dhan',
    docsUrl: 'https://dhanhq.co/docs/v2/',
    baseUrl: 'https://api.dhan.co/v2',
    authType: 'static_token',
    authNote:
      'Long-lived access token (about 30 days) generated from web.dhan.co profile → DhanHQ Trading APIs. No daily login dance.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins,20_level_depth',
    rateLimitNote: 'Order APIs 25 req/s; data APIs throttled per endpoint.',
    pricingNote: 'Free for trading APIs; market-feed plans vary.',
  },
  {
    key: 'fyers',
    name: 'Fyers API v3',
    vendor: 'Fyers',
    docsUrl: 'https://myapi.fyers.in/docsv3',
    baseUrl: 'https://api-t1.fyers.in/api/v3',
    authType: 'oauth2',
    authNote:
      'App ID + secret; auth-code flow returns a daily access token used as "appId:token" in the Authorization header.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins,instruments_master',
    rateLimitNote: 'Roughly 10 req/s per app; websocket for live data.',
    pricingNote: 'Free.',
  },
  {
    key: 'icici_breeze',
    name: 'Breeze API',
    vendor: 'ICICI Direct',
    docsUrl: 'https://api.icicidirect.com/apidocs',
    baseUrl: 'https://api.icicidirect.com/breezeapi/api/v1',
    authType: 'api_key_secret_daily_token',
    authNote:
      'App key + secret; a daily session token is generated via the Breeze login page and passed with each request.',
    exchanges: 'NSE,BSE,NFO',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: '100 req/min per endpoint (approx).',
    pricingNote: 'Free.',
  },
]

// Starter instrument catalog for NSE / BSE / MCX.
// Lot sizes and price bands are seed defaults — the live instrument master from
// the connected provider is the source of truth and revises these on sync.
export type IndiaInstrumentDef = {
  symbol: string
  name: string
  assetClass: string
  exchange: 'NSE' | 'BSE' | 'MCX'
  segment: string
  isin?: string
  lotSize?: number
  priceBandPct?: number
  currentPrice: number
  spec: {
    contractSize: number
    tickSize: number
    tickValue: number
    pipValuePerLot: number
    minLot: number
    lotStep: number
    maxLot: number
    marginPerLot: number
    typicalSpreadPips: number
    currentSpreadPips: number
  }
}

export const INDIA_INSTRUMENTS: IndiaInstrumentDef[] = [
  // ---- NSE indices (futures lot sizes as of 2026; provider sync revises) ----
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', assetClass: 'indices', exchange: 'NSE', segment: 'index', lotSize: 75, currentPrice: 24850, spec: { contractSize: 75, tickSize: 0.05, tickValue: 3.75, pipValuePerLot: 75, minLot: 1, lotStep: 1, maxLot: 24, marginPerLot: 165000, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', assetClass: 'indices', exchange: 'NSE', segment: 'index', lotSize: 35, currentPrice: 51400, spec: { contractSize: 35, tickSize: 0.05, tickValue: 1.75, pipValuePerLot: 35, minLot: 1, lotStep: 1, maxLot: 28, marginPerLot: 175000, typicalSpreadPips: 0.1, currentSpreadPips: 0.1 } },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services', assetClass: 'indices', exchange: 'NSE', segment: 'index', lotSize: 65, currentPrice: 23100, spec: { contractSize: 65, tickSize: 0.05, tickValue: 3.25, pipValuePerLot: 65, minLot: 1, lotStep: 1, maxLot: 30, marginPerLot: 150000, typicalSpreadPips: 0.1, currentSpreadPips: 0.1 } },
  // ---- BSE index ----
  { symbol: 'SENSEX', name: 'S&P BSE Sensex', assetClass: 'indices', exchange: 'BSE', segment: 'index', lotSize: 20, currentPrice: 81200, spec: { contractSize: 20, tickSize: 0.05, tickValue: 1.0, pipValuePerLot: 20, minLot: 1, lotStep: 1, maxLot: 30, marginPerLot: 160000, typicalSpreadPips: 0.2, currentSpreadPips: 0.2 } },
  // ---- NSE equities (cash segment; quantity in shares) ----
  { symbol: 'RELIANCE', name: 'Reliance Industries', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE002A01018', priceBandPct: 10, currentPrice: 2960, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 2960, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'TCS', name: 'Tata Consultancy Services', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE467B01029', priceBandPct: 10, currentPrice: 4120, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 4120, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE040A01034', priceBandPct: 10, currentPrice: 1680, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 1680, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'INFY', name: 'Infosys', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE009A01021', priceBandPct: 10, currentPrice: 1520, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 1520, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE090A01021', priceBandPct: 10, currentPrice: 1245, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 1245, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'SBIN', name: 'State Bank of India', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE062A01020', priceBandPct: 10, currentPrice: 815, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 815, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE155A01022', priceBandPct: 10, currentPrice: 985, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 985, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  { symbol: 'ITC', name: 'ITC Limited', assetClass: 'stocks', exchange: 'NSE', segment: 'equity', isin: 'INE154A01025', priceBandPct: 10, currentPrice: 465, spec: { contractSize: 1, tickSize: 0.05, tickValue: 0.05, pipValuePerLot: 1, minLot: 1, lotStep: 1, maxLot: 10000, marginPerLot: 465, typicalSpreadPips: 0.05, currentSpreadPips: 0.05 } },
  // ---- MCX commodities ----
  { symbol: 'MCXGOLD', name: 'Gold (1 kg)', assetClass: 'commodities', exchange: 'MCX', segment: 'commodity', lotSize: 100, currentPrice: 71800, spec: { contractSize: 100, tickSize: 1, tickValue: 100, pipValuePerLot: 100, minLot: 1, lotStep: 1, maxLot: 10, marginPerLot: 450000, typicalSpreadPips: 1, currentSpreadPips: 2 } },
  { symbol: 'MCXSILVER', name: 'Silver (30 kg)', assetClass: 'commodities', exchange: 'MCX', segment: 'commodity', lotSize: 30, currentPrice: 89500, spec: { contractSize: 30, tickSize: 1, tickValue: 30, pipValuePerLot: 30, minLot: 1, lotStep: 1, maxLot: 15, marginPerLot: 320000, typicalSpreadPips: 2, currentSpreadPips: 3 } },
  { symbol: 'MCXCRUDEOIL', name: 'Crude Oil (100 bbl)', assetClass: 'commodities', exchange: 'MCX', segment: 'commodity', lotSize: 100, currentPrice: 6540, spec: { contractSize: 100, tickSize: 1, tickValue: 100, pipValuePerLot: 100, minLot: 1, lotStep: 1, maxLot: 20, marginPerLot: 95000, typicalSpreadPips: 1, currentSpreadPips: 1 } },
  { symbol: 'MCXNATURALGAS', name: 'Natural Gas (1250 mmBtu)', assetClass: 'commodities', exchange: 'MCX', segment: 'commodity', lotSize: 1250, currentPrice: 245, spec: { contractSize: 1250, tickSize: 0.1, tickValue: 125, pipValuePerLot: 125, minLot: 1, lotStep: 1, maxLot: 25, marginPerLot: 60000, typicalSpreadPips: 0.1, currentSpreadPips: 0.1 } },
  { symbol: 'MCXCOPPER', name: 'Copper (2500 kg)', assetClass: 'commodities', exchange: 'MCX', segment: 'commodity', lotSize: 2500, currentPrice: 842, spec: { contractSize: 2500, tickSize: 0.05, tickValue: 125, pipValuePerLot: 125, minLot: 1, lotStep: 1, maxLot: 15, marginPerLot: 210000, typicalSpreadPips: 0.05, currentSpreadPips: 0.1 } },
]

export const INDIA_EXCHANGE_SESSIONS = [
  { exchange: 'NSE', segment: 'equity', preOpen: '09:00', open: '09:15', close: '15:30', postClose: '16:00', eveningClose: null as string | null, note: 'Pre-open 09:00–09:15 IST; closing session till 16:00.' },
  { exchange: 'NSE', segment: 'derivatives', preOpen: null as string | null, open: '09:15', close: '15:30', postClose: null as string | null, eveningClose: null as string | null, note: 'Index & stock F&O.' },
  { exchange: 'BSE', segment: 'equity', preOpen: '09:00', open: '09:15', close: '15:30', postClose: '16:00', eveningClose: null as string | null, note: 'Mirrors NSE cash timings.' },
  { exchange: 'BSE', segment: 'derivatives', preOpen: null as string | null, open: '09:15', close: '15:30', postClose: null as string | null, eveningClose: null as string | null, note: 'Sensex / Bankex F&O.' },
  { exchange: 'MCX', segment: 'commodity', preOpen: null as string | null, open: '09:00', close: '17:00', postClose: null as string | null, eveningClose: '23:30', note: 'Non-agri contracts trade the evening session to 23:30 IST (23:55 during US daylight saving).' },
]

// Fixed-date national holidays only. Lunar-calendar holidays (Holi, Diwali,
// Eid, etc.) shift every year — sync the official exchange calendar or add
// them manually; do not guess dates.
export const INDIA_HOLIDAYS_2026 = [
  { exchange: 'ALL', date: '2026-01-26', name: 'Republic Day' },
  { exchange: 'ALL', date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { exchange: 'ALL', date: '2026-08-15', name: 'Independence Day' },
  { exchange: 'ALL', date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { exchange: 'ALL', date: '2026-12-25', name: 'Christmas' },
]
