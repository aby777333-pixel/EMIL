'use client';

import TopBar from '@/components/layout/TopBar';
import MarketHeatmap from '@/components/trading/MarketHeatmap';
import CurrencyStrength from '@/components/trading/CurrencyStrength';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function HeatmapPage() {
  usePriceEngine();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="overflow-y-auto" style={{ borderRight: '1px solid var(--border)' }}>
          <MarketHeatmap />
        </div>
        <div className="overflow-hidden hidden lg:block">
          <CurrencyStrength />
        </div>
      </div>
    </div>
  );
}
