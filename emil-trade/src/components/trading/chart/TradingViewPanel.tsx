'use client';

// TradingView Advanced Chart embed — streams REAL TradingView market data
// for the active symbol. Used as the terminal's default chart view; the
// native RAPTOR chart (ChartPanel) remains available via the source toggle.

import { useEffect, useMemo, useRef } from 'react';
import { useTradingStore } from '@/stores/trading';

// Internal symbol → TradingView symbol mapping.
const TV_SYMBOLS: Record<string, string> = {
  EURUSD: 'FX:EURUSD', GBPUSD: 'FX:GBPUSD', USDJPY: 'FX:USDJPY',
  USDCHF: 'FX:USDCHF', AUDUSD: 'FX:AUDUSD', USDCAD: 'FX:USDCAD',
  NZDUSD: 'FX:NZDUSD', EURGBP: 'FX:EURGBP', EURJPY: 'FX:EURJPY',
  GBPJPY: 'FX:GBPJPY',
  XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD',
  BTCUSD: 'BITSTAMP:BTCUSD', ETHUSD: 'BITSTAMP:ETHUSD',
  US30: 'FOREXCOM:DJI', NAS100: 'FOREXCOM:NSXUSD', SPX500: 'FOREXCOM:SPXUSD',
  USOIL: 'TVC:USOIL', UKOIL: 'TVC:UKOIL', NATGAS: 'NYMEX:NG1!',
};

// Shared TF label → TradingView interval code.
const TV_INTERVALS: Record<string, string> = {
  // Seconds are RAPTOR-chart-only (the free TV widget has no seconds bars) —
  // map them to 1m here so the TV tab stays sensible if one is selected.
  '5s': '1', '10s': '1', '15s': '1', '30s': '1',
  '1m': '1', '2m': '2', '3m': '3', '5m': '5', '10m': '10', '15m': '15',
  '20m': '20', '30m': '30', '45m': '45',
  '1H': '60', '2H': '120', '3H': '180', '4H': '240', '6H': '360', '8H': '480', '12H': '720',
  '1D': 'D', '1W': 'W', '1Mo': 'M',
};

export default function TradingViewPanel() {
  const { activeSymbol, activeTimeframe } = useTradingStore();
  const hostRef = useRef<HTMLDivElement>(null);

  const tvSymbol = useMemo(
    () => TV_SYMBOLS[activeSymbol] ?? `FX:${activeSymbol}`,
    [activeSymbol]
  );
  const tvInterval = useMemo(
    () => TV_INTERVALS[activeTimeframe] ?? '60',
    [activeTimeframe]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#060D16',
      gridColor: 'rgba(255,255,255,0.04)',
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    host.appendChild(container);
    return () => {
      host.innerHTML = '';
    };
  }, [tvSymbol, tvInterval]);

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: '#060D16' }}>
      <div ref={hostRef} className="absolute inset-0" />
      {/* The "Live Data" state is shown by the source tab ("TradingView (Live
          Data)"). We no longer overlay a badge here — it previously sat at
          top-left and covered the TradingView widget's own timeframe buttons
          (1m / 30m / 1h), causing the reported overlap. */}
    </div>
  );
}
