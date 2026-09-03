'use client';

// ═══════════════════════════════════════════════════════════════
// Market Insights module (enhancement prompt §2 Heat Map, §3 Regime,
// §7 Sessions). Modular overlay panel — lazy-loaded, entitlement-gated
// (market_insights), display-only: it never touches orders, EAs or charts.
// Everything shown is computed from the platform's real quotes and bars.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { X, Grid3x3, Clock, Activity, RefreshCw } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import { computeHeatmap, heatColor, classSummary, type HeatCell } from '@/lib/insights/heatmap';
import { sessionStatuses, activeOverlaps, fmtCountdown } from '@/lib/insights/sessions';
import { classifyMarketState } from '@/lib/nexus/market-state';

type Tab = 'heatmap' | 'sessions' | 'regime';

const REGIME_COLORS: Record<string, string> = {
  'Strong Uptrend': '#00C27A',
  'Weak Uptrend': '#7ddfb0',
  'Strong Downtrend': '#FF5252',
  'Weak Downtrend': '#ff9e9e',
  'Range Bound': '#FFD700',
  'Sideways / Consolidation': '#FF9800',
};

export default function InsightsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('heatmap');
  const prices = useTradingStore((s) => s.prices);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  // Recompute on a slow tick so the panel stays live without hammering.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const builder = getOhlcvBuilder();

  const heat = useMemo(() => computeHeatmap(prices, builder), [prices, builder, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => classSummary(heat.cells), [heat]);
  const sessions = useMemo(() => sessionStatuses(new Date(), activeSymbol, builder), [activeSymbol, builder, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const overlaps = activeOverlaps(sessions);

  const regimes = useMemo(() => {
    const out: { symbol: string; state: string; confidence: number; volatility: string }[] = [];
    if (!builder) return out;
    for (const symbol of Object.keys(prices)) {
      try {
        const ms = classifyMarketState(builder.getAllBars(symbol, '60'));
        if (ms) out.push({ symbol, state: ms.state, confidence: ms.confidence, volatility: ms.volatility });
      } catch { /* skip */ }
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }, [prices, builder, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedCells = useMemo(
    () => [...heat.cells].sort((a, b) => a.assetClass.localeCompare(b.assetClass) || b.changePct - a.changePct),
    [heat]
  );

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-[860px] max-w-[96vw] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">Market Insights</div>
            <div className="text-[10px] text-white/40">
              Computed live from the platform&apos;s streamed quotes and bars · refreshes every 15s
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTick((t) => t + 1)} title="Refresh now" className="text-white/40 hover:text-white"><RefreshCw size={13} /></button>
            <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
        </div>

        <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {([['heatmap', 'Heat Map', Grid3x3], ['sessions', 'Sessions', Clock], ['regime', 'Regime', Activity]] as [Tab, string, typeof Grid3x3][]).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: tab === t ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'heatmap' && (
            heat.cells.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-white/35">
                Waiting for bar data — the heat map needs at least 16 bars per symbol. Leave the terminal open a moment and refresh.
              </div>
            ) : (
              <div>
                {/* Class rollup strip */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {summary.map((s) => (
                    <div key={s.assetClass} className="rounded-md border px-2.5 py-1.5 text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <span className="font-bold text-white/80">{s.assetClass}</span>
                      <span className="ml-1.5 font-mono" style={{ color: s.avgChange >= 0 ? '#00C27A' : '#FF5252' }}>
                        {s.avgChange >= 0 ? '+' : ''}{s.avgChange.toFixed(2)}%
                      </span>
                      <span className="ml-1.5 text-white/35">({s.count})</span>
                    </div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {sortedCells.map((c: HeatCell) => (
                    <div key={c.symbol} className="rounded-md border p-2" style={{ backgroundColor: heatColor(c.changePct), borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-bold text-white">{c.symbol}</span>
                        <span className="text-[8px] uppercase text-white/50">{c.assetClass}</span>
                      </div>
                      <div className="mt-1 font-mono text-[12px] font-bold text-white">
                        {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
                      </div>
                      <div className="mt-1 flex justify-between font-mono text-[8.5px] text-white/70">
                        <span title="ATR(14) % of price — volatility">Vol {c.atrPct.toFixed(2)}%</span>
                        <span title="5-bar rate of change — momentum">Mom {c.momentumPct >= 0 ? '+' : ''}{c.momentumPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[9px] leading-snug text-white/30">
                  Coverage = the {heat.cells.length} symbols this terminal streams{heat.skipped > 0 ? ` (${heat.skipped} awaiting bar history)` : ''}.
                  Change over the last 24 H1 bars; Vol = ATR(14)/price; Mom = 5-bar rate of change. Volume comes from the platform feed.
                </p>
              </div>
            )
          )}

          {tab === 'sessions' && (
            <div>
              {overlaps.length > 0 && (
                <div className="mb-3 rounded-md border px-3 py-2 text-[11px]" style={{ borderColor: 'rgba(0,194,122,0.35)', backgroundColor: 'rgba(0,194,122,0.06)', color: '#00C27A' }}>
                  Active overlap{overlaps.length > 1 ? 's' : ''}: <b>{overlaps.join(' · ')}</b> — historically the deepest-liquidity windows.
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sessions.map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-md border px-3 py-2.5" style={{ borderColor: s.open ? 'rgba(0,194,122,0.35)' : 'rgba(255,255,255,0.08)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${s.open ? 'animate-pulse' : ''}`} style={{ backgroundColor: s.open ? '#00C27A' : 'rgba(255,255,255,0.2)' }} />
                        <span className="text-[12px] font-bold text-white">{s.name}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-white/40">
                        {String(Math.floor(s.openUtc)).padStart(2, '0')}:{String(Math.round((s.openUtc % 1) * 60)).padStart(2, '0')}–
                        {String(Math.floor(s.closeUtc)).padStart(2, '0')}:{String(Math.round((s.closeUtc % 1) * 60)).padStart(2, '0')} UTC
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono" style={{ color: s.open ? '#00C27A' : 'rgba(255,255,255,0.5)' }}>
                        {s.open ? `closes in ${fmtCountdown(s.minutesToChange)}` : `opens in ${fmtCountdown(s.minutesToChange)}`}
                      </div>
                      <div className="mt-0.5 text-[9px] text-white/40" title={`Mean H1 bar range for ${activeSymbol} during these hours`}>
                        {s.barsMeasured > 0 ? `avg range ${s.measuredVolPct.toFixed(2)}% (${s.barsMeasured} bars)` : 'no bars yet'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[9px] leading-snug text-white/30">
                Fixed UTC schedules (winter time — London/New York shift 1h under DST). &quot;Avg range&quot; is measured
                from {activeSymbol}&apos;s real H1 bars whose hour falls in each session — not an estimate.
              </p>
            </div>
          )}

          {tab === 'regime' && (
            regimes.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-white/35">
                Waiting for bar data — regime classification needs 60+ bars per symbol.
              </div>
            ) : (
              <div>
                {regimes.map((r) => (
                  <div key={r.symbol} className="flex items-center gap-3 border-t border-white/[0.04] py-2 first:border-t-0">
                    <button
                      onClick={() => useTradingStore.getState().setActiveSymbol(r.symbol)}
                      className="w-20 shrink-0 text-left font-mono text-[11px] font-bold text-white hover:text-[#0091D5]"
                      title="Set as active symbol"
                    >
                      {r.symbol}
                    </button>
                    <span className="w-44 shrink-0 text-[10px] font-semibold" style={{ color: REGIME_COLORS[r.state] ?? '#9aa4b2' }}>{r.state}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${r.confidence}%`, backgroundColor: REGIME_COLORS[r.state] ?? '#9aa4b2' }} />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-[10px] text-white/60">{r.confidence}%</span>
                    <span className="w-20 shrink-0 text-right text-[9px] text-white/35">{r.volatility.replace(' Volatility', ' vol')}</span>
                  </div>
                ))}
                <p className="mt-3 text-[9px] leading-snug text-white/30">
                  Same ADX/EMA/DI classifier NEXUS uses, run on each symbol&apos;s real H1 bars. Confidence = indicator
                  agreement, capped at 95% — a probability meter, not a certainty.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
