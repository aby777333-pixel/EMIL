'use client';

// RAPTOR Trader Utility Widget Suite — the full board. An ACTIONABLE
// trading layer, not information cards: each widget answers "should I
// trade / what / which way / where / how much / should I hedge or
// reduce?" and carries the common Trade · Auto Hedge · Exit All
// controls. Widgets are defined in widget-registry.ts and rendered
// generically here from one shared, precomputed context. Every read
// reuses the platform's real engines and is an estimate — never a
// profit promise. Opens as an overlay and as a standalone window.

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { getInstrumentSpecs, type InstrumentSpec } from '@/lib/insights/risk';
import { getCalendar, type NewsEvent } from '@/lib/trading/news-guard';
import { orderService } from '@/lib/trading/order-service';
import type { JournalRow } from '@/lib/trading/trade-journal';
import {
  WIDGETS, CATEGORIES, type SharedCtx, type WidgetDef, type LivePos,
} from '@/lib/trading/widget-registry';
import WidgetControls from '@/components/trading/widgets/WidgetControls';

const ACC = '#4DD0E1';
const DEFAULT_IDS = ['pressure', 'mtf', 'volflow', 'sr', 'breakout', 'correlation', 'hedgeopp', 'riskreward', 'possize', 'portexposure', 'ccystrength', 'session'];

// Per-category hue — dim at rest, bright when active.
const CAT_COLOR: Record<string, string> = {
  'Default': '#4DD0E1',
  'Direction & Pressure': '#29ABE2',
  'Trend & Structure': '#00E5A0',
  'Levels & Setups': '#66BB6A',
  'Strength & Correlation': '#26C6DA',
  'Volatility & Cost': '#FFB300',
  'Risk & Sizing': '#9CCC65',
  'Hedging': '#CE93D8',
  'Account Safety': '#FF5252',
  'Trade Management': '#7C6FFF',
  'Timing & News': '#FF8A65',
  'Scanner & Opportunity': '#29ABE2',
  'Platform & Emergency': '#EF5350',
};
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function WidgetCard({ def, s }: { def: WidgetDef; s: SharedCtx }) {
  const out = useMemo(() => { try { return def.compute(s); } catch { return { rows: [], note: 'unavailable' }; } }, [def, s]);
  const ctx = { symbol: out.trade?.symbol ?? s.symbol, direction: out.trade?.direction, entry: out.trade?.entry, stop: out.trade?.stop, target: out.trade?.target, lots: out.trade?.lots, source: def.name };
  return (
    <div className="flex flex-col rounded-lg border p-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: def.accent }}>{def.name}</span>
        {out.tag && <span className="ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ color: out.tagColor ?? '#fff', border: `1px solid ${out.tagColor ?? '#fff'}55` }}>{out.tag}</span>}
      </div>
      {out.bar != null && (
        <div className="mb-1 h-1.5 w-full overflow-hidden rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, out.bar))}%`, backgroundColor: out.tagColor ?? def.accent }} />
        </div>
      )}
      <div className="flex-1 text-[10px] leading-relaxed text-white/60">
        {out.rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-white/40">{r.k}</span>
            <span className="text-right font-mono" style={{ color: r.c ?? 'rgba(255,255,255,0.75)' }}>{r.v}</span>
          </div>
        ))}
        {out.note && <p className="mt-0.5 text-[8px] text-white/35">{out.note}</p>}
      </div>
      <WidgetControls ctx={ctx} accent={def.accent} />
    </div>
  );
}

export default function WidgetHub({ open, onClose, ohlcvBuilder, standalone = false }: {
  open: boolean; onClose: () => void; ohlcvBuilder: OHLCVBuilder | null; standalone?: boolean;
}) {
  const { activeSymbol, prices, positions, accountSummary, activeAccountId } = useTradingStore();
  const [specs, setSpecs] = useState<Record<string, InstrumentSpec> | null>(null);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [closed, setClosed] = useState<JournalRow[]>([]);
  const [tick, setTick] = useState(0);
  // Dashboard memory — the board reopens on the last category + risk %.
  const [riskPct, setRiskPct] = useState<number>(() => { try { return Number(localStorage.getItem('raptor_widget_risk') || '0.5') || 0.5; } catch { return 0.5; } });
  const [cat, setCat] = useState<string>(() => { try { return localStorage.getItem('raptor_widget_cat') || 'Default'; } catch { return 'Default'; } });
  useEffect(() => { try { localStorage.setItem('raptor_widget_cat', cat); } catch { /* ignore */ } }, [cat]);
  useEffect(() => { try { localStorage.setItem('raptor_widget_risk', String(riskPct)); } catch { /* ignore */ } }, [riskPct]);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  useEffect(() => { getInstrumentSpecs().then(setSpecs).catch(() => {}); }, []);
  useEffect(() => { getCalendar().then(setCalendar).catch(() => {}); }, []);
  useEffect(() => { if (!open && !standalone) return; const id = setInterval(() => setTick((t) => t + 1), 6000); return () => clearInterval(id); }, [open, standalone]);
  // Closed-trade history for the journal-backed widgets (refreshed slowly).
  useEffect(() => {
    if ((!open && !standalone) || !activeAccountId) return;
    let alive = true;
    const load = () => orderService.getTradeHistory(activeAccountId, 120).then((r) => { if (alive && Array.isArray(r)) setClosed(r as unknown as JournalRow[]); }).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [open, standalone, activeAccountId]);

  const universe = useMemo(() => Object.keys(prices).filter((sy) => prices[sy]?.bid != null), [prices]);

  const shared: SharedCtx | null = useMemo(() => {
    const b = builderRef.current;
    if (!b) return null;
    return {
      builder: b, symbol: activeSymbol, prices, universe, positions: positions as unknown as LivePos[], specs, calendar, closed,
      balance: Number(accountSummary?.balance ?? 0), equity: Number(accountSummary?.equity ?? 0),
      freeMargin: Number(accountSummary?.free_margin ?? 0), usedMargin: Number(accountSummary?.margin_used ?? 0),
      marginLevel: Number(accountSummary?.margin_level_pct ?? 0), riskPct,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbol, specs, calendar, closed, universe.length, positions, accountSummary, tick, riskPct]);

  if (!open && !standalone) return null;

  const shown = cat === 'Default' ? DEFAULT_IDS.map((id) => WIDGETS.find((w) => w.id === id)).filter(Boolean) as WidgetDef[] : WIDGETS.filter((w) => w.category === cat);
  const tabs = ['Default', ...CATEGORIES];

  const bodyInner = (
    <div className={`w-full ${standalone ? '' : 'my-4 max-w-[1240px]'} rounded-xl border shadow-2xl`} style={{ backgroundColor: '#080D16', borderColor: 'rgba(77,208,225,0.35)' }}>
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="flex items-center gap-2 text-[15px] font-bold text-white">🧩 Trader Widget Suite</span>
        <span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold" style={{ backgroundColor: 'rgba(77,208,225,0.12)', color: ACC, border: '1px solid rgba(77,208,225,0.4)' }}>{activeSymbol} · {universe.length} instruments · {WIDGETS.length} widgets</span>
        <span className="text-[9px] text-white/40">Actionable reads over live engines — estimates, never a profit promise. Each carries Trade · Auto Hedge (this-instrument by default) · Exit All.</span>
        <label className="ml-auto flex items-center gap-1 text-[9px] text-white/45">risk %
          <input type="number" step={0.25} value={riskPct} onChange={(e) => setRiskPct(Math.max(0.1, Number(e.target.value) || 0.1))} className="w-14 rounded bg-white/[0.06] px-1.5 py-0.5 text-right font-mono text-[10px] text-white outline-none" />
        </label>
        {!standalone && (
          <button onClick={() => window.open('/terminal/widget-suite', '_blank')} title="Open the widget board as a standalone window (new tab) — ideal for a second monitor"
            className="rounded px-2.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-125" style={{ backgroundColor: 'rgba(77,208,225,0.12)', color: ACC, border: '1px solid rgba(77,208,225,0.4)' }}>⧉ Window</button>
        )}
        <button onClick={onClose} className="rounded p-1.5 text-white/40 transition-colors hover:text-white"><X size={16} /></button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {tabs.map((t) => {
          const col = CAT_COLOR[t] ?? ACC;
          const on = cat === t;
          return (
            <button key={t} onClick={() => setCat(t)}
              className="rounded px-2 py-0.5 text-[9px] font-bold transition-all hover:brightness-125"
              style={{
                backgroundColor: on ? hexA(col, 0.22) : hexA(col, 0.05),
                color: on ? col : hexA(col, 0.5),
                border: `1px solid ${on ? hexA(col, 0.7) : hexA(col, 0.18)}`,
                boxShadow: on ? `0 0 10px ${hexA(col, 0.4)}` : 'none',
                textShadow: on ? `0 0 6px ${hexA(col, 0.6)}` : 'none',
              }}>
              {t}{t !== 'Default' ? ` (${WIDGETS.filter((w) => w.category === t).length})` : ` (${DEFAULT_IDS.length})`}
            </button>
          );
        })}
      </div>

      {!shared ? (
        <div className="p-8 text-center text-[11px] text-white/40">Collecting bar history…</div>
      ) : (
        <div className="grid gap-2.5 p-3 md:grid-cols-2 lg:grid-cols-3" style={{ maxHeight: standalone ? undefined : '74vh', overflowY: 'auto' }}>
          {shown.map((def) => <WidgetCard key={def.id} def={def} s={shared} />)}
        </div>
      )}

      <p className="border-t px-4 py-2 text-[8px] leading-relaxed text-white/25" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {WIDGETS.length} widgets across {CATEGORIES.length} categories. Every widget routes trades through Shield → Guardian → the account Risk
        Governor; Auto Hedge is always a toggle (this-instrument by default, account-wide only when chosen) with disclaimer + consent and never
        activates silently. Reads are estimates over {universe.length ? 'live' : 'loading'} platform data — never a profit promise. Where a reading
        needs a feed we don't have yet (order-flow depth, resting-order liquidity, per-venue slippage) the card says so plainly.
      </p>
    </div>
  );

  if (standalone) return bodyInner;

  return (
    <div className="fixed inset-0 z-[9500] flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(3,7,12,0.88)', backdropFilter: 'blur(3px)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {bodyInner}
    </div>
  );
}
