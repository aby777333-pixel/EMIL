'use client';

// Market Widgets — the TradingView widget set from "Trading view widgets.docx",
// hosted inside the terminal (dark theme). Reachable from the Tools menu.

import { TVWidget } from '@/components/widgets/TVEmbeds';

// Doc-specified market-data sections via the classic market-quotes embed
// (the tv-market-data web component failed to load quote data).
const MARKET_DATA_GROUPS = [
  { name: 'Indices', symbols: [
    { name: 'FOREXCOM:SPXUSD', displayName: 'S&P 500' },
    { name: 'FOREXCOM:NSXUSD', displayName: 'US 100' },
    { name: 'FOREXCOM:DJI', displayName: 'Dow 30' },
    { name: 'INDEX:NKY', displayName: 'Nikkei 225' },
    { name: 'INDEX:DEU40', displayName: 'DAX 40' },
    { name: 'FOREXCOM:UKXGBP', displayName: 'FTSE 100' },
  ] },
  { name: 'Futures', symbols: [
    { name: 'BMFBOVESPA:ISP1!', displayName: 'S&P 500 Futures' },
    { name: 'BMFBOVESPA:EUR1!', displayName: 'Euro Futures' },
    { name: 'CMCMARKETS:GOLD', displayName: 'Gold' },
    { name: 'TVC:USOIL', displayName: 'WTI Crude' },
    { name: 'BMFBOVESPA:CCM1!', displayName: 'Corn Futures' },
  ] },
  { name: 'Bonds', symbols: [
    { name: 'EUREX:FGBL1!', displayName: 'Euro Bund' },
    { name: 'EUREX:FBTP1!', displayName: 'Euro BTP' },
    { name: 'EUREX:FGBM1!', displayName: 'Euro BOBL' },
  ] },
  { name: 'Forex', symbols: [
    { name: 'FX:EURUSD', displayName: 'EUR/USD' },
    { name: 'FX:GBPUSD', displayName: 'GBP/USD' },
    { name: 'FX:USDJPY', displayName: 'USD/JPY' },
    { name: 'FX:USDCHF', displayName: 'USD/CHF' },
    { name: 'FX:AUDUSD', displayName: 'AUD/USD' },
    { name: 'FX:USDCAD', displayName: 'USD/CAD' },
  ] },
];

function Panel({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/5 ${wide ? 'lg:col-span-2' : ''}`}
      style={{ backgroundColor: '#0A0F1A' }}
    >
      <div className="border-b border-white/5 px-4 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">{title}</h2>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

export default function TerminalWidgetsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">MARKET WIDGETS</h1>
        <p className="text-xs text-white/30">
          Live TradingView widgets — market data, screeners, fundamentals, calendar & news
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Market Data — Indices · Futures · Bonds · Forex" wide>
          <TVWidget
            widget="market-quotes"
            height={560}
            config={{ width: '100%', height: '100%', symbolsGroups: MARKET_DATA_GROUPS, showSymbolLogo: true, isTransparent: false, colorTheme: 'dark', locale: 'en' }}
          />
        </Panel>

        <Panel title="Forex Cross Rates">
          <TVWidget
            widget="forex-cross-rates"
            height={460}
            config={{ width: '100%', height: '100%', currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'], isTransparent: false, colorTheme: 'dark', locale: 'en' }}
          />
        </Panel>
        <Panel title="Forex Heat Map">
          <TVWidget
            widget="forex-heat-map"
            height={460}
            config={{ width: '100%', height: '100%', currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'], isTransparent: false, colorTheme: 'dark', locale: 'en' }}
          />
        </Panel>

        <Panel title="Forex Screener">
          <TVWidget
            widget="screener"
            height={550}
            config={{ market: 'forex', showToolbar: true, defaultColumn: 'overview', defaultScreen: 'general', isTransparent: false, locale: 'en', colorTheme: 'dark', width: '100%', height: 550 }}
          />
        </Panel>
        <Panel title="Crypto Markets">
          <TVWidget
            widget="screener"
            height={550}
            config={{ defaultColumn: 'overview', screener_type: 'crypto_mkt', displayCurrency: 'USD', colorTheme: 'dark', isTransparent: false, locale: 'en', width: '100%', height: 550 }}
          />
        </Panel>

        <Panel title="Top Stories">
          <TVWidget
            widget="timeline"
            height={550}
            config={{ displayMode: 'regular', feedMode: 'all_symbols', colorTheme: 'dark', isTransparent: false, locale: 'en', width: '100%', height: 550 }}
          />
        </Panel>
        <Panel title="Economic Calendar">
          <TVWidget
            widget="events"
            height={550}
            config={{ colorTheme: 'dark', isTransparent: false, locale: 'en', countryFilter: 'ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu', importanceFilter: '-1,0,1', width: '100%', height: 550 }}
          />
        </Panel>
      </div>

      <p className="mt-5 text-center text-[11px] text-white/25">
        Widgets and market data provided by{' '}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow noreferrer" className="underline hover:no-underline">
          TradingView
        </a>
        .
      </p>
    </div>
  );
}
