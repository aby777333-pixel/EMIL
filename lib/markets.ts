// Global market catalog. Users pick one or many; EMIL scans and trades only
// the selected markets. dataStatus 'coming_soon' = structure is ready, live
// data feed to be wired later.

export type MarketDef = {
  key: string
  name: string
  region: string
  exchanges: string
  assetClasses: string
  description: string
  dataStatus: 'live' | 'coming_soon'
  sortOrder: number
}

export const MARKETS: MarketDef[] = [
  { key: 'forex', name: 'Forex', region: 'Global', exchanges: 'OTC via MT5/MT4 brokers', assetClasses: 'forex', description: 'Major, minor and exotic currency pairs. EURUSD, GBPUSD, USDJPY and friends.', dataStatus: 'live', sortOrder: 10 },
  { key: 'metals', name: 'Metals', region: 'Global', exchanges: 'OTC / COMEX-referenced', assetClasses: 'metals', description: 'Gold, silver and precious-metal CFDs (XAUUSD, XAGUSD).', dataStatus: 'live', sortOrder: 20 },
  { key: 'indices', name: 'Global Indices', region: 'Global', exchanges: 'US500, US30, NAS100, DAX…', assetClasses: 'indices', description: 'Index CFDs across US, Europe and Asia sessions.', dataStatus: 'live', sortOrder: 30 },
  { key: 'energies', name: 'Energies', region: 'Global', exchanges: 'WTI / Brent / NatGas', assetClasses: 'energies', description: 'Oil and gas CFDs with session-aware volatility handling.', dataStatus: 'live', sortOrder: 40 },
  { key: 'crypto', name: 'Crypto', region: 'Global · 24/7', exchanges: 'BTC, ETH via broker CFDs', assetClasses: 'crypto', description: 'Crypto CFDs — 24/7 markets with weekend-gap protection.', dataStatus: 'live', sortOrder: 50 },
  { key: 'india', name: 'India', region: 'India · IST', exchanges: 'NSE, BSE, MCX', assetClasses: 'stocks,indices,commodities', description: 'Indian equities, index F&O and MCX commodities. AI signals via DalalAI, data via IndianAPI.in, execution via Indian broker APIs.', dataStatus: 'live', sortOrder: 60 },
  { key: 'us_stocks', name: 'US Stocks', region: 'United States · ET', exchanges: 'NYSE, NASDAQ', assetClasses: 'stocks', description: 'US equities — NYSE and NASDAQ. Instrument structure is ready; live data feed lands next.', dataStatus: 'coming_soon', sortOrder: 70 },
  { key: 'europe_stocks', name: 'Europe Stocks', region: 'Europe · CET', exchanges: 'LSE, Euronext, XETRA', assetClasses: 'stocks', description: 'UK and EU equities. Structure ready; data feed to follow.', dataStatus: 'coming_soon', sortOrder: 80 },
  { key: 'asia_stocks', name: 'Asia-Pacific Stocks', region: 'APAC', exchanges: 'TSE, HKEX, ASX', assetClasses: 'stocks', description: 'Japan, Hong Kong and Australia equities. Structure ready; data feed to follow.', dataStatus: 'coming_soon', sortOrder: 90 },
]

// Starter US instrument catalog (NYSE / NASDAQ). Reference prices only —
// live quotes arrive with the US data feed.
export const US_INSTRUMENTS = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currentPrice: 228.5 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', currentPrice: 447.2 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currentPrice: 172.4 },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currentPrice: 244.1 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', currentPrice: 214.8 },
  { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', currentPrice: 66.3 },
] as const
