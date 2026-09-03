// EMIL Data Provider Hub — the free/open-first global data catalog.
// Official APIs, public datasets and legitimate free tiers only; every entry
// records its license posture and freshness so research data is never passed
// off as execution data. Seeded into data_providers; keys are added by the
// owner from the Command Center. Autonomous execution must NEVER be driven by
// these research feeds.

export type DataProviderDef = {
  key: string
  name: string
  category: 'macro' | 'market_data' | 'fundamentals' | 'fx' | 'crypto' | 'news' | 'energy' | 'agriculture' | 'trade' | 'weather' | 'identifiers' | 'regulatory'
  baseUrl: string
  docsUrl: string
  authType: 'none' | 'api_key'
  priority: number
  fallbackKey?: string
  license: string
  freshness: 'realtime' | 'delayed' | 'daily' | 'eod' | 'varies'
  coverage: string
}

export const DATA_PROVIDERS: DataProviderDef[] = [
  // ---- Macroeconomics ----
  { key: 'fred', name: 'FRED — Federal Reserve Economic Data', category: 'macro', baseUrl: 'https://api.stlouisfed.org/fred', docsUrl: 'https://fred.stlouisfed.org/docs/api/fred/', authType: 'api_key', priority: 10, license: 'Free API key; check series-level terms; attribution appreciated.', freshness: 'daily', coverage: 'US rates, inflation, GDP, employment, money supply, yields, credit, 800k+ series' },
  { key: 'worldbank', name: 'World Bank Open Data', category: 'macro', baseUrl: 'https://api.worldbank.org/v2', docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589', authType: 'none', priority: 20, license: 'CC BY 4.0 — attribution required.', freshness: 'varies', coverage: 'Country GDP, trade, population, inflation, development indicators' },
  { key: 'imf', name: 'IMF Data (SDMX)', category: 'macro', baseUrl: 'https://dataservices.imf.org/REST/SDMX_JSON.svc', docsUrl: 'https://www.imf.org/en/Data', authType: 'none', priority: 30, license: 'Public API; verify dataset-level terms.', freshness: 'varies', coverage: 'Global macro, exchange rates, fiscal, balance of payments' },
  { key: 'oecd', name: 'OECD Data (SDMX)', category: 'macro', baseUrl: 'https://sdmx.oecd.org/public/rest', docsUrl: 'https://www.oecd.org/en/data.html', authType: 'none', priority: 40, license: 'Public API; attribution required for most datasets.', freshness: 'varies', coverage: 'OECD-country macro statistics' },
  { key: 'bis', name: 'BIS Statistics', category: 'macro', baseUrl: 'https://stats.bis.org/api/v2', docsUrl: 'https://www.bis.org/statistics/', authType: 'none', priority: 50, license: 'Public; BIS terms apply.', freshness: 'varies', coverage: 'Banking, credit, FX turnover, debt, property prices' },
  { key: 'eurostat', name: 'Eurostat', category: 'macro', baseUrl: 'https://ec.europa.eu/eurostat/api/dissemination', docsUrl: 'https://ec.europa.eu/eurostat/', authType: 'none', priority: 60, license: 'EU open data — attribution required.', freshness: 'varies', coverage: 'European economic statistics' },
  { key: 'nasdaq_data_link', name: 'Nasdaq Data Link', category: 'macro', baseUrl: 'https://data.nasdaq.com/api/v3', docsUrl: 'https://docs.data.nasdaq.com/', authType: 'api_key', priority: 70, license: 'Free datasets available; per-dataset licensing — verify before use.', freshness: 'varies', coverage: 'Mixed free/premium datasets' },

  // ---- Regulatory / company filings ----
  { key: 'sec_edgar', name: 'SEC EDGAR', category: 'regulatory', baseUrl: 'https://data.sec.gov', docsUrl: 'https://www.sec.gov/edgar/sec-api-documentation', authType: 'none', priority: 10, license: 'Public; SEC fair-access rules — declared User-Agent, ≤10 req/s.', freshness: 'daily', coverage: 'US filings: 10-K, 10-Q, 8-K, ownership, company facts' },

  // ---- Market data (research-grade free tiers) ----
  { key: 'twelve_data', name: 'Twelve Data', category: 'market_data', baseUrl: 'https://api.twelvedata.com', docsUrl: 'https://twelvedata.com/docs', authType: 'api_key', priority: 10, fallbackKey: 'finnhub', license: 'Free tier ~800 credits/day.', freshness: 'delayed', coverage: 'Stocks, FX, crypto, ETFs, indicators — powers the Global Markets board' },
  { key: 'alpha_vantage', name: 'Alpha Vantage', category: 'market_data', baseUrl: 'https://www.alphavantage.co', docsUrl: 'https://www.alphavantage.co/documentation/', authType: 'api_key', priority: 20, fallbackKey: 'twelve_data', license: 'Free key ~25 req/day; paid tiers for more.', freshness: 'delayed', coverage: 'Stocks, FX, crypto, technicals, some fundamentals' },
  { key: 'stooq', name: 'Stooq Quotes (CSV)', category: 'market_data', baseUrl: 'https://stooq.com', docsUrl: 'https://stooq.com/db/', authType: 'none', priority: 90, fallbackKey: 'twelve_data', license: 'Free for personal/research use.', freshness: 'delayed', coverage: 'RETIRED: the public quote-CSV endpoint returns 404 (verified 2026-09-01) — kept for reference, disabled' },
  { key: 'finnhub', name: 'Finnhub', category: 'market_data', baseUrl: 'https://finnhub.io/api/v1', docsUrl: 'https://finnhub.io/docs/api', authType: 'api_key', priority: 40, license: 'Free tier 60 req/min; display rules per plan.', freshness: 'delayed', coverage: 'Quotes, company data, market news, some economic data' },
  { key: 'fmp', name: 'Financial Modeling Prep', category: 'fundamentals', baseUrl: 'https://financialmodelingprep.com/api', docsUrl: 'https://site.financialmodelingprep.com/developer/docs', authType: 'api_key', priority: 10, license: 'Free tier limited; verify redistribution terms.', freshness: 'daily', coverage: 'Financial statements, ratios, profiles, earnings' },

  // ---- FX ----
  { key: 'frankfurter', name: 'Frankfurter (ECB reference rates)', category: 'fx', baseUrl: 'https://api.frankfurter.dev/v1', docsUrl: 'https://frankfurter.dev/', authType: 'none', priority: 10, fallbackKey: 'twelve_data', license: 'Open source, free; ECB daily reference rates.', freshness: 'daily', coverage: '30+ currencies vs EUR base, daily ECB fixing' },

  // ---- Crypto ----
  { key: 'coingecko', name: 'CoinGecko', category: 'crypto', baseUrl: 'https://api.coingecko.com/api/v3', docsUrl: 'https://docs.coingecko.com/', authType: 'none', priority: 10, license: 'Free public API (rate-limited); attribution required.', freshness: 'realtime', coverage: 'Crypto prices, market caps, volumes, metadata' },

  // ---- News / events ----
  { key: 'gdelt', name: 'GDELT DOC 2.0', category: 'news', baseUrl: 'https://api.gdeltproject.org/api/v2', docsUrl: 'https://www.gdeltproject.org/', authType: 'none', priority: 10, fallbackKey: 'google_news_rss', license: 'Open; attribution to GDELT required.', freshness: 'realtime', coverage: 'Global news index, events, geopolitics (15-min updates)' },
  { key: 'forexfactory', name: 'Forex Factory calendar feed', category: 'macro', baseUrl: 'https://nfs.faireconomy.media', docsUrl: 'https://www.forexfactory.com/calendar', authType: 'none', priority: 15, license: 'Free public JSON feed (this week + next week). Powers the Economic Calendar + Central Bank Monitor.', freshness: 'delayed', coverage: 'Global economic events, impact, forecast/previous/actual, central-bank rate decisions' },
  { key: 'google_news_rss', name: 'Google News RSS', category: 'news', baseUrl: 'https://news.google.com/rss', docsUrl: 'https://news.google.com/', authType: 'none', priority: 20, license: 'Public RSS feeds; links open original publishers — index only, never republish content.', freshness: 'realtime', coverage: 'Global news headlines by query (fallback for GDELT)' },

  // ---- Energy / agriculture / trade / weather ----
  { key: 'eia', name: 'US EIA Open Data', category: 'energy', baseUrl: 'https://api.eia.gov/v2', docsUrl: 'https://www.eia.gov/opendata/', authType: 'api_key', priority: 10, license: 'Free key; US government open data.', freshness: 'varies', coverage: 'Oil, gas, inventories, production, electricity' },
  { key: 'usda_nass', name: 'USDA QuickStats', category: 'agriculture', baseUrl: 'https://quickstats.nass.usda.gov/api', docsUrl: 'https://quickstats.nass.usda.gov/api/', authType: 'api_key', priority: 10, license: 'Free key; US government open data.', freshness: 'varies', coverage: 'US crops, livestock, agricultural statistics' },
  { key: 'faostat', name: 'FAOSTAT', category: 'agriculture', baseUrl: 'https://faostatservices.fao.org/api/v1', docsUrl: 'https://www.fao.org/faostat/', authType: 'none', priority: 20, license: 'CC BY-NC-SA for most datasets — verify commercial use.', freshness: 'varies', coverage: 'Global food & agriculture statistics' },
  { key: 'un_comtrade', name: 'UN Comtrade', category: 'trade', baseUrl: 'https://comtradeapi.un.org', docsUrl: 'https://comtradedeveloper.un.org/', authType: 'api_key', priority: 10, license: 'Free tier with subscription key; UN terms.', freshness: 'varies', coverage: 'Global import/export trade flows' },
  { key: 'open_meteo', name: 'Open-Meteo', category: 'weather', baseUrl: 'https://api.open-meteo.com/v1', docsUrl: 'https://open-meteo.com/', authType: 'none', priority: 10, license: 'Free for non-commercial; commercial plans available.', freshness: 'realtime', coverage: 'Global weather forecasts & history (energy/agri relevance)' },

  // ---- Identifiers ----
  { key: 'openfigi', name: 'OpenFIGI', category: 'identifiers', baseUrl: 'https://api.openfigi.com/v3', docsUrl: 'https://www.openfigi.com/api', authType: 'api_key', priority: 10, license: 'Free key; OpenFIGI terms — mapping aid, not sole identity source.', freshness: 'varies', coverage: 'Instrument identifier mapping (FIGI)' },
  { key: 'gleif', name: 'GLEIF LEI', category: 'identifiers', baseUrl: 'https://api.gleif.org/api/v1', docsUrl: 'https://www.gleif.org/en/lei-data/gleif-api', authType: 'none', priority: 20, license: 'CC0 public data.', freshness: 'daily', coverage: 'Legal Entity Identifiers for institutions/companies' },
]
