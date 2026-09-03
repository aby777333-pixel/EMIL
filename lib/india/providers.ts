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
  authType: 'api_key' | 'api_key_secret' | 'api_key_secret_daily_token' | 'oauth2' | 'totp_login' | 'static_token' | 'mt_account'
  authNote: string
  exchanges: string
  capabilities: string
  rateLimitNote: string
  pricingNote: string
  markets?: string // comma list of Market.key; defaults to 'india'
  // Extra reference links shown beside "Docs" (testnet portals, guides, test funds…).
  links?: { label: string; url: string }[]
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
      'OAuth2 authorization-code flow. Access token is issued per day and expires at 03:30 IST the next day. Redirect URI must match the app registration. Powers the LIVE Market Data Feed V3 websocket panel above (LTPC / Full / Full-D30 / Option-Greeks modes). Official sandbox available for order-API testing.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket_feed_v3,orders,portfolio,margins,instruments_master,sandbox',
    rateLimitNote: '50 req/s REST. Feed V3: 2 websocket connections, up to 2,000 combined keys (LTPC 5,000 / Full 2,000 / Greeks 3,000).',
    pricingNote: 'Free. Sandbox: upstox.com/developer/api-documentation/sandbox (order APIs; not a live data feed).',
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
      'Long-lived access token (about 30 days) generated from web.dhan.co profile → DhanHQ Trading APIs. No daily login dance. Live Market Feed websocket streams tick-by-tick data (Ticker / Quote / Full modes: LTP, OHLC, volume, depth, OI). Integrated sandbox at sandbox.dhan.co/v2 for pre-production testing (test data, not live).',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket_live_feed,orders,portfolio,margins,20_level_depth,sandbox',
    rateLimitNote: 'Order APIs 25 req/s; data APIs throttled per endpoint.',
    pricingNote: 'Free for trading APIs; market-feed plans vary. Sandbox: sandbox.dhan.co/v2.',
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
    docsUrl: 'https://api.icicidirect.com/breezeapi/documents/index.html',
    baseUrl: 'https://api.icicidirect.com/breezeapi/api/v1',
    authType: 'api_key_secret_daily_token',
    authNote:
      'App key + secret; a daily session token is generated via the Breeze login page and passed with each request.',
    exchanges: 'NSE,BSE,NFO',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: '100 req/min per endpoint (approx).',
    pricingNote: 'Free.',
  },
  {
    key: 'groww',
    name: 'Groww Trade API',
    vendor: 'Groww',
    docsUrl: 'https://groww.in/trade-api/docs',
    baseUrl: 'https://api.groww.in/v1',
    authType: 'static_token',
    authNote:
      'Access token generated from the Groww account (Trade API section); passed as a Bearer token. TOTP-based key flow also available.',
    exchanges: 'NSE,BSE',
    capabilities: 'quotes,historical,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles; order APIs stricter than data.',
    pricingNote: 'Subscription-based Trade API plan.',
  },
  {
    key: 'five_paisa',
    name: '5paisa Open API',
    vendor: '5paisa',
    docsUrl: 'https://www.5paisa.com/developerapi',
    baseUrl: 'https://Openapi.5paisa.com/VendorsAPI/Service1.svc',
    authType: 'totp_login',
    authNote:
      'App key set + client code + PIN + TOTP login returns a session token. Keys come from the 5paisa developer portal. Xstream Market Feed (REST) serves live LTP, OHLC, volume, high/low, previous close, change % and tick timestamps for NSE/BSE/MCX cash, derivatives and currency segments.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,xstream_market_feed,orders,portfolio,margins',
    rateLimitNote: 'Standard per-second throttles per endpoint group.',
    pricingNote: 'Free tier available. Xstream docs: xstream.5paisa.com/dev-docs/market-data-system/market-feed.',
  },
  {
    key: 'kotak_neo',
    name: 'Kotak Neo Trade API',
    vendor: 'Kotak Securities',
    docsUrl: 'https://www.kotaksecurities.com/trade-api/',
    baseUrl: 'https://gw-napi.kotaksecurities.com',
    authType: 'api_key_secret_daily_token',
    authNote:
      'Consumer key + secret from the Kotak developer portal; session established with mobile + OTP/TOTP, yielding a daily token.',
    exchanges: 'NSE,BSE,NFO,BFO,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles; websocket for streaming.',
    pricingNote: 'Free.',
  },
  {
    key: 'hdfc_sky',
    name: 'HDFC Sky / InvestRight API',
    vendor: 'HDFC Securities',
    docsUrl: 'https://developer.hdfcsec.com/',
    baseUrl: 'https://developer.hdfcsec.com/oapi/v1',
    authType: 'api_key_secret_daily_token',
    authNote:
      'API key + secret from the HDFC Securities developer portal; login flow issues a daily access token.',
    exchanges: 'NSE,BSE',
    capabilities: 'quotes,historical,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles.',
    pricingNote: 'Free for HDFC Securities clients.',
  },
  {
    key: 'motilal_oswal',
    name: 'MO Open API',
    vendor: 'Motilal Oswal',
    docsUrl: 'https://invest.motilaloswal.com/moAPI/APIDocumentation/Introduction',
    baseUrl: 'https://openapi.motilaloswal.com/rest',
    authType: 'totp_login',
    authNote:
      'API key + client code + password/TOTP login returns an auth token used on every call.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles.',
    pricingNote: 'Free.',
  },
  {
    key: 'iifl_markets',
    name: 'IIFL Blaze (XTS) API',
    vendor: 'IIFL Securities',
    docsUrl: 'https://ttblaze.iifl.com/doc/interactive/',
    baseUrl: 'https://ttblaze.iifl.com',
    authType: 'api_key_secret_daily_token',
    authNote:
      'XTS-based: app key + secret per API (interactive/market data); session login returns a token per product.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Separate interactive and market-data limits.',
    pricingNote: 'Free for IIFL clients.',
  },
  {
    key: 'alice_blue',
    name: 'ANT API v2',
    vendor: 'Alice Blue',
    docsUrl: 'https://v2api.aliceblueonline.com/introduction',
    baseUrl: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api',
    authType: 'api_key_secret_daily_token',
    authNote:
      'User ID + API key from the ANT web portal; session ID generated daily via the encryption handshake.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles.',
    pricingNote: 'Free.',
  },
  {
    key: 'sharekhan',
    name: 'Sharekhan Trade API',
    vendor: 'Sharekhan (Mirae Asset)',
    docsUrl: 'https://newtrade.sharekhan.com/skweb/login/trading-api',
    baseUrl: 'https://api.sharekhan.com/skapi',
    authType: 'api_key_secret_daily_token',
    authNote:
      'API key + secret + version id from the Sharekhan API portal; login flow issues a daily access token.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles.',
    pricingNote: 'Free.',
  },
  {
    key: 'paytm_money',
    name: 'Paytm Money API',
    vendor: 'Paytm Money',
    docsUrl: 'https://developer.paytmmoney.com/docs/api/logout/',
    baseUrl: 'https://developer.paytmmoney.com',
    authType: 'api_key_secret_daily_token',
    authNote:
      'API key + secret from the Paytm Money developer portal; daily access token via the login redirect flow.',
    exchanges: 'NSE,BSE',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Per-endpoint throttles.',
    pricingNote: 'One-time API activation fee.',
  },
  {
    key: 'shoonya',
    name: 'Shoonya API (Noren)',
    vendor: 'Finvasia',
    docsUrl: 'https://www.shoonya.com/api-documentation',
    baseUrl: 'https://api.shoonya.com/NorenWClientTP',
    authType: 'totp_login',
    authNote:
      'User ID + password + TOTP + api key + vendor code login returns a session token (Noren API). Fully free — no brokerage, no API fee.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Standard Noren throttles (~10 req/s).',
    pricingNote: 'Free.',
  },
  // ---- Dedicated market-data vendors (data only — no order execution) ----
  {
    key: 'truedata',
    name: 'TrueData Market Data',
    vendor: 'TrueData',
    docsUrl: 'https://www.truedata.in/',
    baseUrl: 'https://api.truedata.in',
    authType: 'api_key_secret',
    authNote:
      'Dedicated market-data vendor for NSE/BSE/MCX: real-time and historical data over REST and WebSocket. Credentials come with a TrueData subscription; free/delayed and trial access available, live real-time data requires a paid plan.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'realtime_websocket,rest_api,historical,delayed_free_tier',
    rateLimitNote: 'Plan-based; live real-time data subject to subscription.',
    pricingNote: 'Free/delayed + trial options; production real-time is paid. DATA vendor only — order execution needs a broker provider.',
  },
  {
    key: 'gfdl',
    name: 'Global Financial Datafeeds (GFDL)',
    vendor: 'Global Financial Datafeeds LLP',
    docsUrl: 'https://globaldatafeeds.in/',
    baseUrl: 'https://globaldatafeeds.in/api',
    authType: 'api_key',
    authNote:
      'Authorized data vendor covering NSE, NFO, CDS, BSE, BFO, MCX and NCDEX: real-time, delayed, historical, snapshot, EOD, option chain and option greeks over WebSocket, REST, .NET, COM and FIX. Free trial available; production real-time data is licensed.',
    exchanges: 'NSE,BSE,MCX,NFO,BFO,CDS,NCDEX',
    capabilities: 'realtime_websocket,rest_api,historical,snapshots,eod,option_chain,option_greeks,fix',
    rateLimitNote: 'Per-plan licensing; distribution for desktop, server, web and mobile apps.',
    pricingNote: 'Free trial; production subject to subscription/exchange licensing. DATA vendor only.',
  },
  {
    key: 'spider_iris',
    name: 'Spider Software (IRIS / CTCL)',
    vendor: 'Spider Software Pvt. Ltd.',
    docsUrl: 'https://spidersoftwareindia.com/',
    baseUrl: 'https://spidersoftwareindia.com',
    authType: 'static_token',
    authNote:
      'Market-data and technical-analysis vendor: real-time NSE data including futures and F&O scrips through Spider IRIS+, IRIS, CTCL, ACE and IRIS EOD products. Primarily desktop/terminal products — listed here for data-sourcing reference.',
    exchanges: 'NSE',
    capabilities: 'realtime_terminal,charting,technical_analysis,eod',
    rateLimitNote: 'Product/subscription based.',
    pricingNote: 'Commercial products; contact vendor. DATA/analysis vendor only.',
  },
  {
    key: 'flattrade',
    name: 'Flattrade Pi API',
    vendor: 'Flattrade',
    docsUrl: 'https://pi.flattrade.in/docs',
    baseUrl: 'https://piconnect.flattrade.in/PiConnectTP',
    authType: 'api_key_secret_daily_token',
    authNote:
      'API key + secret from the Pi portal; daily token via the auth redirect. Zero brokerage, free API.',
    exchanges: 'NSE,BSE,MCX',
    capabilities: 'quotes,historical,websocket,orders,portfolio,margins',
    rateLimitNote: 'Standard Noren-style throttles.',
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
