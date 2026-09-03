import { useMemo } from 'react';
import { useMarkets } from '../hooks/useApi';
import { useStore } from '../store';
import { fmtPct } from './ui';
import type { MarketTick } from '../types';

export function MarketTicker() {
  const { data } = useMarkets();
  const liveTicks = useStore((s) => s.ticks);

  const ticks = useMemo<MarketTick[]>(() => {
    const base = data?.symbols || [];
    return base.map((t) => liveTicks[t.symbol] || t);
  }, [data, liveTicks]);

  if (!ticks.length) {
    return <div className="glass h-9 skeleton" />;
  }

  const doubled = [...ticks, ...ticks];

  return (
    <div className="glass overflow-hidden h-9 flex items-center relative">
      <div className="flex gap-6 whitespace-nowrap animate-marquee will-change-transform px-4">
        {doubled.map((t, i) => (
          <span key={`${t.symbol}-${i}`} className="text-xs font-mono flex items-center gap-1.5">
            <span className="text-subtext font-semibold">{t.symbol}</span>
            <span className="text-text">{t.price}</span>
            <span className={t.change_pct >= 0 ? 'text-success' : 'text-danger'}>
              {fmtPct(t.change_pct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
