'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp } from 'lucide-react';
import { TabGroup } from '@/components/ui/TabGroup';
import { PriceEngine } from '@/lib/trading/price-engine';
import { cn, formatPrice } from '@/lib/utils/format';
import type { PriceTick } from '@/types/trading';

const ASSET_TABS = [
  { id: 'all', label: 'All' },
  { id: 'forex', label: 'Forex' },
  { id: 'metal', label: 'Metals' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'index', label: 'Indices' },
  { id: 'energy', label: 'Energy' },
];

const SYMBOL_TYPES: Record<string, string> = {
  EURUSD: 'forex', GBPUSD: 'forex', USDJPY: 'forex', USDCHF: 'forex',
  AUDUSD: 'forex', USDCAD: 'forex', NZDUSD: 'forex', EURGBP: 'forex',
  EURJPY: 'forex', GBPJPY: 'forex',
  XAUUSD: 'metal', XAGUSD: 'metal',
  BTCUSD: 'crypto', ETHUSD: 'crypto',
  US30: 'index', NAS100: 'index', SPX500: 'index',
  USOIL: 'energy', UKOIL: 'energy', NATGAS: 'energy',
};

export default function MarketsPage() {
  const router = useRouter();
  const engineRef = useRef<PriceEngine | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceTick>>({});
  const [prevMids, setPrevMids] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;
    engine.start((ticks) => {
      setPrices((prev) => {
        const prevMap: Record<string, number> = {};
        Object.entries(prev).forEach(([k, v]) => {
          prevMap[k] = v.mid;
        });
        setPrevMids(prevMap);
        const next = { ...prev };
        ticks.forEach((t) => { next[t.symbol] = t; });
        return next;
      });
    }, 800);
    return () => engine.stop();
  }, []);

  const symbols = Object.keys(SYMBOL_TYPES).filter((sym) => {
    if (activeTab !== 'all' && SYMBOL_TYPES[sym] !== activeTab) return false;
    if (search && !sym.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-foreground">Market Watch</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      <TabGroup tabs={ASSET_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="overflow-hidden rounded-xl border border-border bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted">Symbol</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Bid</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Ask</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Spread</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Change %</th>
                <th className="px-4 py-3 text-right font-medium text-muted">High</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Low</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((sym, i) => {
                const tick = prices[sym];
                const prevMid = prevMids[sym] ?? tick?.mid ?? 0;
                const changePct = tick && prevMid ? ((tick.mid - prevMid) / prevMid) * 100 : 0;
                const dec = tick && tick.mid > 100 ? 1 : tick && tick.mid > 10 ? 3 : 5;
                const engine = engineRef.current;
                const cfg = engine?.getConfig(sym);
                const dailyHigh = tick ? tick.mid * 1.002 : 0;
                const dailyLow = tick ? tick.mid * 0.998 : 0;

                return (
                  <tr
                    key={sym}
                    onClick={() => router.push(`/terminal?symbol=${sym}`)}
                    className={cn(
                      'border-b border-border cursor-pointer transition-colors last:border-0 hover:bg-surface/50',
                      i % 2 === 1 && 'bg-surface/20'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: 'var(--accent-glow)',
                            color: 'var(--accent)',
                          }}
                        >
                          {SYMBOL_TYPES[sym]}
                        </span>
                        <span className="font-medium text-foreground">{sym}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right mono text-foreground">
                      {tick?.bid.toFixed(dec) ?? '---'}
                    </td>
                    <td className="px-4 py-3 text-right mono text-foreground">
                      {tick?.ask.toFixed(dec) ?? '---'}
                    </td>
                    <td className="px-4 py-3 text-right mono text-secondary">
                      {tick?.spread.toFixed(dec + 1) ?? '---'}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right mono font-semibold',
                      changePct >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right mono text-secondary">
                      {dailyHigh.toFixed(dec)}
                    </td>
                    <td className="px-4 py-3 text-right mono text-secondary">
                      {dailyLow.toFixed(dec)}
                    </td>
                  </tr>
                );
              })}
              {symbols.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-secondary">
                    No instruments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
