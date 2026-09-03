// Market, venue, broker & platform coverage for the GIO Raptor AI Strategy Lab.
// These describe the lab's configurable connector surface. Live access to any
// venue always depends on the relevant broker, data-vendor, clearing and
// exchange permissions — nothing here implies direct exchange membership.

export interface VenueGroup {
  region: string;
  venues: string[];
}

export const WORLD_EXCHANGES: VenueGroup[] = [
  { region: 'India', venues: ['NSE', 'BSE', 'MCX', 'NCDEX', 'India INX', 'NSE IX'] },
  { region: 'North America', venues: ['NYSE', 'Nasdaq', 'NYSE American', 'CME', 'CBOT', 'NYMEX', 'COMEX', 'Cboe', 'TSX', 'TSX Venture', 'Montréal Exchange'] },
  { region: 'Europe', venues: ['LSE', 'Euronext', 'Deutsche Börse', 'SIX Swiss', 'Borsa Italiana', 'Nasdaq Nordic', 'Bolsa de Madrid', 'Vienna', 'Warsaw', 'Athens', 'Eurex', 'ICE Europe'] },
  { region: 'Asia-Pacific', venues: ['Tokyo', 'Osaka', 'Hong Kong', 'Shanghai', 'Shenzhen', 'Beijing', 'SGX', 'ASX', 'KRX', 'Taiwan', 'Indonesia', 'Bursa Malaysia', 'SET Thailand', 'Philippines', 'NZX'] },
  { region: 'Middle East & Africa', venues: ['Tadawul', 'ADX', 'DFM', 'Nasdaq Dubai', 'Qatar', 'Bahrain', 'Boursa Kuwait', 'Muscat', 'Tel Aviv', 'JSE', 'Egyptian Exchange', 'Nigerian Exchange', 'Nairobi'] },
  { region: 'Latin America', venues: ['B3 Brazil', 'Mexican Exchange', 'Santiago', 'Colombia', 'Buenos Aires', 'Lima'] },
];

export const CRYPTO_VENUES = [
  'Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'Bitget', 'Crypto.com', 'Gemini',
  'KuCoin', 'Gate.io', 'Bitfinex', 'Deribit', 'BitMEX', 'HTX', 'CoinDCX', 'WazirX',
  'ZebPay', 'Uniswap', 'PancakeSwap', 'dYdX', 'Hyperliquid',
];

export const BROKERS_PLATFORMS = [
  'GIO Raptor', 'MetaTrader 4', 'MetaTrader 5', 'TradingView', 'cTrader / cAlgo',
  'NinjaTrader', 'MultiCharts', 'TradeStation', 'Interactive Brokers',
  'FIX API', 'REST API', 'WebSocket', 'QuantConnect LEAN', 'Backtrader',
];

export const ASSET_CLASSES = [
  'Forex', 'Spot currencies', 'Currency futures', 'Stocks', 'ETFs', 'CFDs',
  'Bonds', 'Government securities', 'Corporate debt', 'Commodities',
  'Precious metals', 'Industrial metals', 'Energy', 'Agricultural',
  'Global indices', 'Index futures', 'Options', 'Futures', 'Cryptocurrency',
  'Crypto derivatives', 'Perpetual futures', 'Tokenised assets',
  'Synthetic instruments', 'Volatility products', 'Interest-rate products',
];

export const INDIA_SEGMENTS = [
  'NSE & BSE equities', 'Equity derivatives (F&O)', 'Index futures & options',
  'Currency derivatives', 'MCX commodity F&O', 'NCDEX agri commodities',
  'ETFs & mutual-fund data', 'Government securities & corporate bonds',
  'Sectoral indices', 'SME-listed securities',
];

// Code-export targets for the "one strategy, many platforms" model.
export const EXPORT_TARGETS = [
  { label: 'MQL5', platform: 'MetaTrader 5', ext: 'mq5' },
  { label: 'MQL4', platform: 'MetaTrader 4', ext: 'mq4' },
  { label: 'Pine Script', platform: 'TradingView', ext: 'pine' },
  { label: 'C#', platform: 'cTrader / NinjaTrader', ext: 'cs' },
  { label: 'Python', platform: 'Broker / exchange APIs', ext: 'py' },
  { label: 'TypeScript', platform: 'Web / WebSocket engines', ext: 'ts' },
  { label: 'Raptor Module', platform: 'GIO Raptor native', ext: 'json' },
  { label: 'FIX', platform: 'FIX 4.4 execution', ext: 'txt' },
];
