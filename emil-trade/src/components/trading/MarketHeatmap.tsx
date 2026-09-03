'use client';

import { useMemo, useCallback } from 'react';
import { useTradingStore } from '@/stores/trading';
import type { InstrumentType } from '@/types/trading';

// Base prices for % change calculation
const INSTRUMENTS: { symbol: string; type: InstrumentType; basePrice: number }[] = [
  { symbol: 'EURUSD', type: 'forex', basePrice: 1.0845 },
  { symbol: 'GBPUSD', type: 'forex', basePrice: 1.2650 },
  { symbol: 'USDJPY', type: 'forex', basePrice: 154.50 },
  { symbol: 'USDCHF', type: 'forex', basePrice: 0.8820 },
  { symbol: 'AUDUSD', type: 'forex', basePrice: 0.6550 },
  { symbol: 'USDCAD', type: 'forex', basePrice: 1.3650 },
  { symbol: 'NZDUSD', type: 'forex', basePrice: 0.6120 },
  { symbol: 'EURGBP', type: 'forex', basePrice: 0.8570 },
  { symbol: 'EURJPY', type: 'forex', basePrice: 167.50 },
  { symbol: 'GBPJPY', type: 'forex', basePrice: 195.40 },
  { symbol: 'XAUUSD', type: 'metal', basePrice: 2340.0 },
  { symbol: 'XAGUSD', type: 'metal', basePrice: 27.50 },
  { symbol: 'BTCUSD', type: 'crypto', basePrice: 67500.0 },
  { symbol: 'ETHUSD', type: 'crypto', basePrice: 3450.0 },
  { symbol: 'US30', type: 'index', basePrice: 39800.0 },
  { symbol: 'NAS100', type: 'index', basePrice: 17950.0 },
  { symbol: 'SPX500', type: 'index', basePrice: 5280.0 },
  { symbol: 'USOIL', type: 'energy', basePrice: 78.50 },
  { symbol: 'UKOIL', type: 'energy', basePrice: 82.30 },
  { symbol: 'NATGAS', type: 'energy', basePrice: 2.15 },
];

const CATEGORIES: { label: string; type: InstrumentType }[] = [
  { label: 'Forex', type: 'forex' },
  { label: 'Metals', type: 'metal' },
  { label: 'Crypto', type: 'crypto' },
  { label: 'Indices', type: 'index' },
  { label: 'Energy', type: 'energy' },
];

function getChangeColor(pct: number): string {
  if (Math.abs(pct) < 0.01) return 'rgba(255,255,255,0.05)';
  if (pct > 0) {
    const intensity = Math.min(0.7, 0.1 + Math.abs(pct) * 0.3);
    return `rgba(0,194,122,${intensity})`;
  }
  const intensity = Math.min(0.7, 0.1 + Math.abs(pct) * 0.3);
  return `rgba(193,18,31,${intensity})`;
}

export default function MarketHeatmap() {
  const prices = useTradingStore(s => s.prices);
  const setActiveSymbol = useTradingStore(s => s.setActiveSymbol);

  const heatmapData = useMemo(() => {
    return INSTRUMENTS.map(inst => {
      const tick = prices[inst.symbol];
      const mid = tick?.mid ?? inst.basePrice;
      const pctChange = ((mid - inst.basePrice) / inst.basePrice) * 100;
      return { ...inst, pctChange, mid };
    });
  }, [prices]);

  const handleClick = useCallback((symbol: string) => {
    setActiveSymbol(symbol);
  }, [setActiveSymbol]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
        {CATEGORIES.map(cat => {
          const items = heatmapData.filter(d => d.type === cat.type);
          if (items.length === 0) return null;
          return (
            <div key={cat.type}>
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-40 mb-2">{cat.label}</div>
              <div className="grid gap-2" style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${cat.type === 'forex' ? '140px' : '160px'}, 1fr))`,
              }}>
                {items.map(item => {
                  const bg = getChangeColor(item.pctChange);
                  const textColor = Math.abs(item.pctChange) < 0.01
                    ? 'var(--text-muted)'
                    : item.pctChange > 0 ? '#00C27A' : '#C1121F';
                  return (
                    <button
                      key={item.symbol}
                      onClick={() => handleClick(item.symbol)}
                      className="flex flex-col items-center justify-center rounded-lg p-3 transition-all hover:scale-[1.02] cursor-pointer"
                      style={{
                        backgroundColor: bg,
                        border: '1px solid rgba(255,255,255,0.04)',
                        minHeight: 80,
                      }}
                    >
                      <span className="text-[14px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="text-[18px] font-mono font-bold mt-1" style={{ color: textColor }}>
                        {item.pctChange >= 0 ? '+' : ''}{item.pctChange.toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
