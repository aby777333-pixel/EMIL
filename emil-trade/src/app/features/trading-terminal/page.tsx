import FeaturePage from '@/components/FeaturePage';

export default function TradingTerminalPage() {
  return (
    <FeaturePage
      badge="Trading Terminal"
      badgeColor="#0091D5"
      title="Professional Trading Terminal"
      subtitle="Institutional-grade execution in your browser"
      description="A fully-featured web trading terminal with real-time charting, one-click execution, advanced order types, and multi-asset support. No downloads required — trade forex, metals, indices, crypto, and commodities from any device."
      features={[
        { title: 'Real-Time Market Data', desc: 'Live streaming quotes with sub-millisecond updates across 500+ instruments. Bid/ask spreads, depth of market, and tick-by-tick data.' },
        { title: 'Advanced Charting', desc: 'TradingView-powered charts with 100+ indicators, drawing tools, multiple timeframes, and customizable layouts.' },
        { title: 'One-Click Trading', desc: 'Execute market orders instantly with a single click. Configurable default lot sizes, stop-loss, and take-profit levels.' },
        { title: 'Multi-Asset Support', desc: 'Trade forex pairs, precious metals, indices, cryptocurrencies, energies, and commodities from a single unified interface.' },
        { title: 'Advanced Order Types', desc: 'Market, limit, stop, OCO, trailing stop, and multiple take-profit levels for precise position management.' },
        { title: 'Keyboard Shortcuts', desc: 'Professional hotkeys for rapid order entry — B for buy, S for sell, 1-6 for timeframes, F11 for fullscreen.' },
        { title: 'Position Management', desc: 'Real-time P&L tracking, margin monitoring, partial close, and one-click close-all functionality.' },
        { title: 'Dark & Light Themes', desc: 'Switch between carefully crafted dark and light modes for comfortable trading in any environment.' },
        { title: 'Cross-Device', desc: 'Responsive design works seamlessly on desktop, tablet, and mobile browsers with synchronized preferences.' },
      ]}
    />
  );
}
