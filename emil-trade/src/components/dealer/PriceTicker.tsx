'use client';

import { useEffect, useRef } from 'react';
import { usePriceFeedStore } from '@/stores/dealer';

const TICKER_SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'BTCUSD', 'GBPJPY', 'ETHUSD', 'US500', 'USOIL', 'XAGUSD'];

const TWO_DEC = new Set(['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'US500', 'US30', 'NAS100', 'USOIL']);

function decimalsFor(symbol: string): number {
  if (TWO_DEC.has(symbol)) return 2;
  if (symbol.includes('JPY')) return 3;
  return 5;
}

function formatBid(symbol: string, bid: number): string {
  return bid.toFixed(decimalsFor(symbol));
}

function formatChange(symbol: string, change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(decimalsFor(symbol))}`;
}

export default function PriceTicker() {
  const prices = usePriceFeedStore((s) => s.prices);
  const sessionOpenRef = useRef<Record<string, number>>({});

  // Capture session-open prices (first price seen per symbol)
  useEffect(() => {
    for (const sym of TICKER_SYMBOLS) {
      const tick = prices[sym];
      if (tick && sessionOpenRef.current[sym] === undefined) {
        sessionOpenRef.current[sym] = tick.bid;
      }
    }
  }, [prices]);

  const items = TICKER_SYMBOLS.map((sym) => {
    const tick = prices[sym];
    if (!tick) return { sym, bid: '--', arrow: '', change: '', color: '#888899' };

    const openPrice = sessionOpenRef.current[sym];
    const change = openPrice !== undefined ? tick.bid - openPrice : 0;
    const color = change > 0 ? '#00C853' : change < 0 ? '#E50914' : '#888899';
    const arrow = change > 0 ? '\u25B2' : change < 0 ? '\u25BC' : '';

    return {
      sym,
      bid: formatBid(sym, tick.bid),
      arrow,
      change: formatChange(sym, change),
      color,
    };
  });

  const tickerContent = items.map((item, i) => (
    <span key={i} className="inline-flex items-center gap-1.5 px-4 whitespace-nowrap">
      <span className="text-[#888899]">{item.sym}</span>
      <span className="text-white">{item.bid}</span>
      <span style={{ color: item.color }}>{item.arrow}</span>
      <span style={{ color: item.color }}>{item.change}</span>
    </span>
  ));

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 32,
        background: '#0D0D12',
        borderTop: '1px solid #252530',
        borderBottom: '1px solid #252530',
      }}
    >
      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: inline-flex;
          animation: ticker-scroll 30s linear infinite;
          font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
          font-size: 11px;
          line-height: 32px;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track">
        {/* Duplicate content for seamless loop */}
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  );
}
