'use client';

// Raptor AI Correlation Hedging Engine — the panel. An institutional-style
// portfolio-protection desk over the hedge-engine math core:
//   · Hedge Finder: live-ranked candidates (multi-TF correlations, stability,
//     confidence) with an honest "no reliable hedge available" verdict.
//   · Hedge Lot Calculator: ATR- and correlation-adjusted ratios, risk
//     before/after, costs, residual exposure.
//   · Currency Exposure Map: net per-currency exposure across open positions.
//   · One-click HEDGE TRADE with a full preview + explicit confirmation —
//     executed through the normal order service, so Shield rules apply.
//   · Combined Position View: primary + hedge grouped as one strategy unit,
//     with a health monitor (correlation drift alerts) and a downloadable
//     audit record per hedge.
// No automatic hedging exists — every execution is trader-confirmed.
// Every figure is an estimate; hedges are never presented as risk-free.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Shuffle, Download, AlertTriangle } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { getInstrumentSpecs, type InstrumentSpec } from '@/lib/insights/risk';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { symbolCurrencies } from '@/lib/trading/protection';
import { getCalendar, upcomingHighImpact, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';
import {
  findHedges, currencyExposureMap, loadHedgeGroups, saveHedgeGroups, correlationRead, decayForecast, portfolioHedgeSuggestion,
  stressTest, leadLag, spreadZ, weekendGap, correlationMatrix,
  type HedgeCandidate, type HedgeInputs, type HedgeGroup, type StressResult,
} from '@/lib/trading/hedge-engine';
import AutoHedgeSection from '@/components/trading/hedge/AutoHedgeSection';

const MINT = '#00E5A0';
const VIOLET = '#AB47BC';

// §1 — one-line exoneration, shown in the panel footer and the confirm modal.
export const HEDGE_EXONERATION =
  'All signals, hedge suggestions and automated trades are used entirely at the trader’s own risk; neither the broker nor the Raptor platform is responsible for trading losses, missed opportunities, execution delays or market outcomes.';

export default function HedgePanel({ ohlcvBuilder, onClose, standalone = false }: { ohlcvBuilder: OHLCVBuilder | null; onClose: () => void; standalone?: boolean }) {
  const { activeSymbol, prices, positions, activeAccountId, triggerRefresh } = useTradingStore();
  const [specs, setSpecs] = useState<Record<string, InstrumentSpec> | null>(null);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [primary, setPrimary] = useState(activeSymbol);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState('0.10');
  const [hedgePct, setHedgePct] = useState(0.5);
  const [customPct, setCustomPct] = useState('');
  const [preview, setPreview] = useState<HedgeCandidate | null>(null);
  const [placing, setPlacing] = useState(false);
  const [groups, setGroups] = useState<HedgeGroup[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [matrix, setMatrix] = useState<{ symbols: string[]; cells: (number | null)[][] } | null>(null);
  const [stress, setStress] = useState<StressResult | null>(null);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  useEffect(() => { getInstrumentSpecs().then(setSpecs).catch(() => {}); }, []);
  useEffect(() => { getCalendar().then(setCalendar); }, []);
  useEffect(() => { setGroups(loadHedgeGroups()); }, []);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  // Prefill from an open position on the chosen primary, when one exists.
  useEffect(() => {
    const pos = positions.find((p) => p.status === 'open' && p.symbol === primary);
    if (pos) { setDirection(pos.direction as 'BUY' | 'SELL'); setLots(String(pos.size)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary]);

  const say = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 5000); }, []);

  const inputs: HedgeInputs = useMemo(() => ({
    primary, direction, lots: Math.max(0.01, parseFloat(lots) || 0.01), hedgePct,
  }), [primary, direction, lots, hedgePct]);

  const universe = useMemo(() => Object.keys(prices).filter((s) => prices[s]?.bid != null), [prices]);

  // The core scan — recomputed when inputs change or every 20s.
  const scan = useMemo(() => {
    const builder = builderRef.current;
    if (!builder || !specs) return null;
    return findHedges(builder, inputs, universe, specs, prices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, specs, universe.length, refreshTick]);

  const newsFor = useCallback((symbols: string[]): NewsEvent | null => {
    const ccys = [...new Set(symbols.flatMap((s) => symbolCurrencies(s)))];
    const hits = upcomingHighImpact(ccys, calendar, 2);
    return hits[0] ?? null;
  }, [calendar]);

  // Standalone windows: the shared store's positions array is only
  // populated on the main terminal — fall back to a direct fetch so the
  // exposure map and portfolio suggestion work everywhere.
  const [fetchedPositions, setFetchedPositions] = useState<typeof positions>([]);
  useEffect(() => {
    // STANDALONE pages only: the terminal popup always has store positions,
    // and adding any periodic setState to the popup during the per-tick
    // subscriber cascade can tip React's nested-update clamp (measured —
    // see the audit gap entry; real fix = store tick batching).
    if (!standalone || !activeAccountId) return;
    let alive = true;
    const load = () => {
      // Store-populated pages don't need the fallback (read via getState to
      // keep deps minimal — this effect must stay quiet during render storms).
      if (useTradingStore.getState().positions.length > 0) return;
      orderService.getOpenPositions(activeAccountId)
        .then((rows) => {
          if (!alive || !Array.isArray(rows)) return;
          // Only update state when the position set actually changed — a
          // no-op set during a busy update cascade can tip React's nested-
          // update clamp and kill the whole panel (measured live).
          setFetchedPositions((prev) => {
            const key = (l: typeof prev) => l.map((p) => `${(p as { id?: string }).id ?? p.symbol}:${p.size}`).join('|');
            return key(prev) === key(rows as typeof prev) ? prev : (rows as typeof prev);
          });
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [standalone, activeAccountId]);
  const posSource = positions.length > 0 ? positions : fetchedPositions;

  const exposure = useMemo(() => (specs ? currencyExposureMap(posSource, specs) : []), [posSource, specs]);

  // The matrix auto-computes when the panel opens (it also powers the
  // opportunity scanner); Recompute refreshes it on demand.
  useEffect(() => {
    const builder = builderRef.current;
    if (!builder || !specs || matrix) return;
    if (universe.length >= 4) setMatrix(correlationMatrix(builder, universe));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs, universe.length]);

  // Best hedge opportunities across the whole market, from the live matrix.
  const opportunities = useMemo(() => {
    if (!matrix) return [];
    const out: { a: string; b: string; corr: number }[] = [];
    for (let i = 0; i < matrix.symbols.length; i++) {
      for (let j = i + 1; j < matrix.symbols.length; j++) {
        const v = matrix.cells[i][j];
        if (v != null && Math.abs(v) >= 0.6) out.push({ a: matrix.symbols[i], b: matrix.symbols[j], corr: v });
      }
    }
    return out.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr)).slice(0, 10);
  }, [matrix]);

  // Stress Lab runs automatically when a hedge preview opens.
  useEffect(() => {
    const builder = builderRef.current;
    if (!preview || !builder || !specs) { setStress(null); return; }
    setStress(stressTest(builder, inputs, preview, specs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  // ── Execute the hedge leg (trader-confirmed; Shield rules apply) ──
  const executeHedge = useCallback(async (c: HedgeCandidate) => {
    if (!activeAccountId) { say('Select a trading account first'); return; }
    const t = prices[c.symbol];
    if (!t?.bid || !t?.ask) { say(`No live price for ${c.symbol}`); return; }
    setPlacing(true);
    try {
      const fill = c.hedgeDirection === 'BUY' ? t.ask : t.bid;
      const result = await orderService.placeMarketOrder({
        accountId: activeAccountId, symbol: c.symbol, direction: c.hedgeDirection,
        size: c.suggestedLots, fillPrice: fill, comment: `Hedge:${inputs.primary}`,
      }) as { success?: boolean; position_id?: string; error?: string } | null;
      if (!result?.success || !result.position_id) { say(`Hedge order failed: ${result?.error ?? 'rejected'}`); return; }
      const primaryPos = positions.find((p) => p.status === 'open' && p.symbol === inputs.primary);
      const group: HedgeGroup = {
        id: `hg_${result.position_id.slice(0, 8)}`,
        name: `${inputs.primary} ⇄ ${c.symbol}`,
        primaryPositionId: primaryPos?.id ?? '',
        hedgePositionId: result.position_id,
        primarySymbol: inputs.primary,
        hedgeSymbol: c.symbol,
        corrAtEntry: c.corr.avg ?? 0,
        createdAt: Date.now(),
        record: {
          inputs, candidate: {
            symbol: c.symbol, direction: c.hedgeDirection, lots: c.suggestedLots,
            corrPerWindow: c.corr.perWindow, corrAvg: c.corr.avg, stability: c.corr.stability,
            confidence: c.corr.confidence, rawRatio: c.rawRatio, volAdjRatio: c.volAdjRatio,
            finalRatio: c.finalRatio, riskBefore: c.riskBefore, riskAfter: c.riskAfter,
            estReductionPct: c.reductionPct, estSpreadCost: c.spreadCost, estMargin: c.marginEstimate,
          },
          executedAt: new Date().toISOString(), fillPrice: fill,
          disclaimer: 'Estimates only. Correlations can weaken, reverse or break; hedging adds costs and residual risk remains.',
        },
      };
      const next = [...loadHedgeGroups(), group];
      saveHedgeGroups(next);
      setGroups(next);
      setPreview(null);
      triggerRefresh();
      say(`✓ Hedge placed: ${c.hedgeDirection} ${c.suggestedLots} ${c.symbol} — grouped as "${group.name}"`);
    } catch (err) {
      say(`Hedge blocked/failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [activeAccountId, prices, positions, inputs, say, triggerRefresh]);

  const closePos = useCallback(async (posId: string, symbol: string, dir: string) => {
    const t = prices[symbol];
    const p = positions.find((x) => x.id === posId);
    const cp = dir === 'BUY' ? (t?.bid ?? p?.current_price) : (t?.ask ?? p?.current_price);
    if (cp == null) throw new Error(`no price for ${symbol}`);
    await orderService.closePosition(posId, Number(cp));
  }, [prices, positions]);

  const closeGroup = useCallback(async (g: HedgeGroup, which: 'hedge' | 'both') => {
    setPlacing(true);
    try {
      const hedgePos = positions.find((p) => p.id === g.hedgePositionId && p.status === 'open');
      const primaryPos = positions.find((p) => p.id === g.primaryPositionId && p.status === 'open');
      if (hedgePos) await closePos(hedgePos.id, hedgePos.symbol, hedgePos.direction);
      if (which === 'both' && primaryPos) await closePos(primaryPos.id, primaryPos.symbol, primaryPos.direction);
      const next = loadHedgeGroups().filter((x) => x.id !== g.id);
      saveHedgeGroups(next); setGroups(next);
      triggerRefresh();
      say(which === 'both' ? `✓ Closed primary and hedge for "${g.name}"` : `✓ Hedge leg closed for "${g.name}"`);
    } catch (err) {
      say(`Close failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [positions, closePos, say, triggerRefresh]);

  const downloadRecord = useCallback((g: HedgeGroup) => {
    const blob = new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hedge-record-${g.name.replace(/[^\w-]+/g, '_')}-${new Date(g.createdAt).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const fmt = (v: number) => `$${v.toFixed(2)}`;
  const pctBtn = (v: number, label: string) => (
    <button key={label} onClick={() => { setHedgePct(v); setCustomPct(''); }}
      className="rounded px-2 py-1 text-[10px] font-bold transition-all hover:brightness-125"
      style={{
        backgroundColor: hedgePct === v && !customPct ? 'rgba(171,71,188,0.3)' : 'rgba(171,71,188,0.08)',
        color: hedgePct === v && !customPct ? '#CE93D8' : 'rgba(206,147,216,0.6)',
        border: `1px solid rgba(171,71,188,${hedgePct === v && !customPct ? 0.7 : 0.25})`,
      }}>
      {label}
    </button>
  );

  return (
    <div
      className={standalone ? 'flex w-full items-start justify-center p-4' : 'fixed inset-0 z-[9500] flex items-start justify-center overflow-y-auto p-4'}
      style={standalone ? undefined : { backgroundColor: 'rgba(3,7,12,0.85)', backdropFilter: 'blur(3px)' }}
      onMouseDown={standalone ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full rounded-xl border shadow-2xl ${standalone ? '' : 'my-4 max-w-[1150px]'}`} style={{ backgroundColor: '#080D16', borderColor: 'rgba(171,71,188,0.35)' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="flex items-center gap-2 text-[15px] font-bold text-white">
              <Shuffle size={16} style={{ color: VIOLET }} /> AI Correlation Hedging Engine
            </div>
            <p className="mt-0.5 text-[10px] text-white/40">
              Live-computed relationships — nothing hard-coded. Estimates only: correlations can weaken, reverse or break;
              hedging adds spread/swap/margin costs and residual risk always remains. Never a guarantee.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!standalone && (
              <button onClick={() => window.open('/terminal/hedge-trade', '_blank')}
                title="Open HEDGE & TRADE as a standalone window (new tab) — same account, positions, hedge groups and rules; ideal for a second monitor"
                className="rounded px-2.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-125"
                style={{ backgroundColor: 'rgba(171,71,188,0.12)', color: '#CE93D8', border: '1px solid rgba(171,71,188,0.4)' }}>
                ⧉ Window
              </button>
            )}
            <button onClick={onClose} className="rounded p-1.5 text-white/40 transition-colors hover:text-white"><X size={16} /></button>
          </div>
        </div>

        <div className={`overflow-y-auto p-4 ${standalone ? '' : 'max-h-[78vh]'}`} style={{ scrollbarWidth: 'thin' }}>
          {/* EMIL removed from this module entirely (2026-07-21, owner request):
              Hedge Trade is fully independent — EMIL lives only in /terminal/emil. */}

          {/* ── AUTO HEDGE — independent engine (consent-gated) ── */}
          <AutoHedgeSection
            ohlcvBuilder={ohlcvBuilder}
            prices={prices}
            specs={specs}
            calendar={calendar}
            accountId={activeAccountId}
            say={say}
            triggerRefresh={triggerRefresh}
          />

          {/* ── Inputs ── */}
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <label className="text-[9px] uppercase tracking-wide text-white/40">Primary
              <select value={primary} onChange={(e) => setPrimary(e.target.value)}
                className="mt-1 block rounded bg-white/[0.06] px-2 py-1.5 font-mono text-[11px] text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {universe.map((s) => <option key={s} value={s} style={{ backgroundColor: '#0A0F1A' }}>{s}</option>)}
              </select>
            </label>
            <label className="text-[9px] uppercase tracking-wide text-white/40">Direction
              <div className="mt-1 flex gap-1">
                {(['BUY', 'SELL'] as const).map((d) => (
                  <button key={d} onClick={() => setDirection(d)}
                    className="rounded px-3 py-1.5 text-[10px] font-bold transition-all"
                    style={{
                      backgroundColor: direction === d ? (d === 'BUY' ? 'rgba(0,194,122,0.25)' : 'rgba(255,82,82,0.25)') : 'rgba(255,255,255,0.05)',
                      color: direction === d ? (d === 'BUY' ? '#00C27A' : '#FF5252') : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${direction === d ? (d === 'BUY' ? 'rgba(0,194,122,0.6)' : 'rgba(255,82,82,0.6)') : 'rgba(255,255,255,0.1)'}`,
                    }}>{d}</button>
                ))}
              </div>
            </label>
            <label className="text-[9px] uppercase tracking-wide text-white/40">Lots
              <input value={lots} onChange={(e) => setLots(e.target.value)} inputMode="decimal"
                className="mt-1 block w-[70px] rounded bg-white/[0.06] px-2 py-1.5 font-mono text-[11px] text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            </label>
            <div className="text-[9px] uppercase tracking-wide text-white/40">Hedge %
              <div className="mt-1 flex items-center gap-1">
                {pctBtn(0.25, '25%')}{pctBtn(0.5, '50%')}{pctBtn(0.75, '75%')}{pctBtn(1, '100%')}
                <input value={customPct} placeholder="…%" inputMode="numeric"
                  onChange={(e) => { setCustomPct(e.target.value); const v = parseFloat(e.target.value); if (v > 0 && v <= 200) setHedgePct(v / 100); }}
                  className="w-[46px] rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/25 outline-none" style={{ border: '1px solid rgba(171,71,188,0.3)' }} />
              </div>
            </div>
            {positions.some((p) => p.status === 'open' && p.symbol === primary) && (
              <span className="rounded px-2 py-1 text-[9px]" style={{ backgroundColor: 'rgba(0,229,160,0.1)', color: MINT, border: '1px solid rgba(0,229,160,0.3)' }}>
                prefilled from your open {primary} position
              </span>
            )}
          </div>

          {/* ── Ranked hedge candidates ── */}
          {!scan && <p className="py-6 text-center text-[11px] text-white/40">Loading bars and instrument specs…</p>}
          {scan && scan.viable.length === 0 && (
            <div className="mb-3 rounded-lg border px-4 py-3 text-[11px]" style={{ borderColor: 'rgba(255,179,0,0.4)', backgroundColor: 'rgba(255,179,0,0.06)', color: '#FFB300' }}>
              <b>No reliable hedge is currently available for {primary}.</b> The engine refuses to force a weak or costly
              hedge just to create a trade. Best rejected candidates:{' '}
              {scan.rejected.slice(0, 3).map((r) => `${r.symbol} (${r.reasons[0]})`).join(' · ') || '—'}
            </div>
          )}
          {scan && scan.viable.slice(0, 5).map((c, rank) => {
            const news = newsFor([primary, c.symbol]);
            return (
              <div key={c.symbol} className="mb-2 rounded-lg border p-3" style={{ borderColor: rank === 0 ? 'rgba(171,71,188,0.45)' : 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  {rank === 0 && <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ backgroundColor: 'rgba(171,71,188,0.25)', color: '#CE93D8' }}>Best risk-reduction</span>}
                  <span className="font-mono text-[13px] font-bold text-white">{c.hedgeDirection} {c.suggestedLots} {c.symbol}</span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${c.corr.labelColor}1A`, color: c.corr.labelColor, border: `1px solid ${c.corr.labelColor}55` }}>{c.corr.label}</span>
                  <span className="text-[9px] text-white/40">confidence {c.corr.confidence}% · stability {(c.corr.stability * 100).toFixed(0)}% · trend {c.corr.trend}</span>
                  {(() => { const f = decayForecast(c.corr); return (
                    <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" title={f.note} style={{ color: f.color, border: `1px solid ${f.color}55`, backgroundColor: `${f.color}10` }}>
                      ⏳ {f.label}
                    </span>
                  ); })()}
                  <button onClick={() => setPreview(c)}
                    className="ml-auto rounded px-3 py-1.5 text-[10px] font-bold text-black transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(180deg, #CE93D8 0%, #AB47BC 100%)', boxShadow: '0 0 10px rgba(171,71,188,0.5)' }}>
                    HEDGE TRADE
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] sm:grid-cols-3">
                  <Row k="Correlation (avg)" v={c.corr.avg!.toFixed(2)} color={c.corr.labelColor} />
                  <Row k="Est. risk before (1×ATR)" v={fmt(c.riskBefore)} />
                  <Row k="Est. risk after" v={fmt(c.riskAfter)} color={MINT} />
                  <Row k="Est. drawdown reduction" v={`${c.reductionPct.toFixed(0)}%`} color={MINT} />
                  <Row k="Entry spread cost" v={fmt(c.spreadCost)} />
                  <Row k="Est. margin" v={fmt(c.marginEstimate)} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2 text-[9px] text-white/35">
                  {c.corr.perWindow.map((w) => (
                    <span key={w.label} className="font-mono">{w.label}: {w.corr != null ? w.corr.toFixed(2) : '—'}</span>
                  ))}
                  {c.sharedCurrencies.length > 0 && <span>· shares {c.sharedCurrencies.join('/')}</span>}
                </div>
                {(() => {
                  const builder = builderRef.current;
                  if (!builder) return null;
                  const ll = leadLag(builder, primary, c.symbol);
                  const z = spreadZ(builder, primary, c.symbol);
                  return (
                    <div className="mt-1 flex flex-wrap gap-3 text-[9px] text-white/40">
                      {ll && ll.shift !== 0 && (
                        <span>⏩ {ll.shift > 0 ? primary : c.symbol} tends to lead by ~{Math.abs(ll.shift)} H1 bar(s) (shifted corr {ll.corr.toFixed(2)} vs {ll.syncCorr.toFixed(2)} in sync)</span>
                      )}
                      {ll && ll.shift === 0 && <span>⏩ no lead–lag edge — the pair moves in sync</span>}
                      {z != null && (
                        <span style={{ color: Math.abs(z) > 2 ? '#FFB300' : undefined }}>
                          📐 spread z-score {z.toFixed(1)}σ{Math.abs(z) > 2 ? ' — unusually stretched apart (can revert OR keep stretching)' : ''}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {news && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: '#FFB300' }}>
                    <AlertTriangle size={11} /> {news.currency} “{news.title}” in {fmtEta(news.timeMs)} — the relationship can destabilise through news.
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Best hedge opportunities scanner (from the live matrix) ── */}
          {opportunities.length > 0 && (
            <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(0,180,216,0.3)' }}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#00B4D8' }}>
                Best hedge opportunities right now — strongest live relationships
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {opportunities.map((o) => (
                  <div key={`${o.a}-${o.b}`} className="flex items-center gap-2 rounded border px-2.5 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <span className="font-mono text-[11px] font-bold text-white">{o.a} ⇄ {o.b}</span>
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                      style={{
                        backgroundColor: o.corr >= 0 ? 'rgba(0,194,122,0.15)' : 'rgba(255,82,82,0.15)',
                        color: o.corr >= 0 ? '#00C27A' : '#FF5252',
                        border: `1px solid ${o.corr >= 0 ? 'rgba(0,194,122,0.4)' : 'rgba(255,82,82,0.4)'}`,
                      }}>
                      {o.corr.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-white/35">{Math.abs(o.corr) >= 0.8 ? 'strong' : 'moderate'} {o.corr >= 0 ? 'positive' : 'negative'}</span>
                    <button
                      onClick={() => { setPrimary(o.a); window.scrollTo?.(0, 0); }}
                      className="ml-auto rounded px-2.5 py-1 text-[9px] font-bold transition-all hover:brightness-125"
                      style={{ backgroundColor: 'rgba(171,71,188,0.15)', color: '#CE93D8', border: '1px solid rgba(171,71,188,0.4)' }}>
                      Hedge this →
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[9px] text-white/30">
                Ranked by live |correlation| (H1). Click "Hedge this" to load the pair into the finder above — full
                stability, cost and sizing checks still decide whether it is actually viable.
              </p>
            </div>
          )}

          {/* ── Correlation matrix (auto-computed — 20×20 live H1 grid) ── */}
          <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-white/50">Live correlation matrix (H1)</div>
              <button
                onClick={() => { const b = builderRef.current; if (b) setMatrix(correlationMatrix(b, universe)); }}
                className="rounded px-2.5 py-1 text-[10px] font-bold transition-all hover:brightness-125"
                style={{ backgroundColor: 'rgba(0,180,216,0.12)', color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}>
                {matrix ? 'Recompute' : 'Compute matrix'}
              </button>
            </div>
            {matrix && (
              <div className="mt-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                <table className="w-full border-collapse font-mono text-[10px]">
                  <thead>
                    <tr>
                      <th />
                      {matrix.symbols.map((s) => <th key={s} className="px-0.5 pb-1 text-white/40" style={{ writingMode: 'vertical-rl' }}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.symbols.map((row, i) => (
                      <tr key={row}>
                        <td className="pr-1.5 text-white/45">{row}</td>
                        {matrix.symbols.map((col, j) => {
                          const v = matrix.cells[i][j];
                          const bg = v == null ? 'rgba(255,255,255,0.03)'
                            : v >= 0 ? `rgba(0,194,122,${Math.min(0.85, Math.abs(v)) * 0.8})`
                            : `rgba(255,82,82,${Math.min(0.85, Math.abs(v)) * 0.8})`;
                          return (
                            <td key={col}
                              title={i === j ? row : `${row} vs ${col}: ${v != null ? v.toFixed(2) : 'insufficient data'} — click to hedge ${row}`}
                              onClick={() => { if (i !== j) setPrimary(row); }}
                              className="h-6 min-w-[34px] text-center transition-all"
                              style={{ backgroundColor: bg, color: i === j ? 'transparent' : 'rgba(255,255,255,0.8)', cursor: i === j ? 'default' : 'pointer' }}>
                              {i === j ? '' : v != null ? v.toFixed(1) : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[10px] text-white/30">Green = positive, red = negative, intensity = strength. Live H1 returns — click any cell to load that row&apos;s instrument into the finder.</p>
              </div>
            )}
          </div>

          {/* ── 🎯 Portfolio-level hedge suggestion (one trade, biggest cut) ── */}
          {(() => {
            const sug = portfolioHedgeSuggestion({ positions: posSource, universe, symbolCurrenciesFn: symbolCurrencies });
            return sug ? (
              <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(0,229,160,0.35)', backgroundColor: 'rgba(0,229,160,0.04)' }}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: MINT }}>🎯 Portfolio hedge — one trade to cut your biggest concentration</div>
                <p className="text-[10px] text-white/60">
                  <span className="font-mono font-bold" style={{ color: sug.direction === 'BUY' ? '#00C27A' : '#FF5252' }}>{sug.direction} {sug.lots} {sug.instrument}</span>
                  <span className="text-white/45"> — {sug.rationale}</span>
                </p>
                <button onClick={() => { setPrimary(sug.instrument); say(`${sug.instrument} loaded in the finder — review the correlation-adjusted math, then confirm like any order.`); }}
                  className="mt-1.5 rounded px-2.5 py-1 text-[9px] font-bold transition-all hover:brightness-125"
                  style={{ color: MINT, border: '1px solid rgba(0,229,160,0.45)' }}>
                  Load in the finder →
                </button>
              </div>
            ) : null;
          })()}

          {/* ── Currency exposure map ── */}
          {exposure.length > 0 && (
            <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">Currency exposure map — open positions</div>
              {exposure.map((r) => {
                const max = Math.max(...exposure.map((x) => Math.abs(x.net))) || 1;
                const w = Math.abs(r.net) / max * 100;
                return (
                  <div key={r.ccy} className="mb-1 flex items-center gap-2 text-[10px]">
                    <span className="w-8 font-mono font-bold text-white/70">{r.ccy}</span>
                    <div className="h-2.5 flex-1 rounded bg-white/[0.04]">
                      <div className="h-full rounded" style={{ width: `${w}%`, backgroundColor: r.net >= 0 ? 'rgba(0,194,122,0.6)' : 'rgba(255,82,82,0.6)' }} />
                    </div>
                    <span className="w-24 text-right font-mono" style={{ color: r.net >= 0 ? '#00C27A' : '#FF5252' }}>
                      {r.net >= 0 ? 'long' : 'short'} ${Math.abs(r.net).toFixed(0)}
                    </span>
                  </div>
                );
              })}
              <p className="mt-1 text-[9px] text-white/30">Notional estimates. Repeated exposure to one currency across “different” trades is hidden concentration — the finder accounts for it.</p>
            </div>
          )}

          {/* ── Hedge groups: combined position view + health ── */}
          {groups.length > 0 && (
            <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(0,229,160,0.25)' }}>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: MINT }}>Hedge groups — combined position view</div>
              {groups.map((g) => {
                const pPos = positions.find((p) => p.id === g.primaryPositionId);
                const hPos = positions.find((p) => p.id === g.hedgePositionId);
                const pPnl = pPos?.status === 'open' ? Number(pPos.floating_pnl ?? 0) : null;
                const hPnl = hPos?.status === 'open' ? Number(hPos.floating_pnl ?? 0) : null;
                const combined = (pPnl ?? 0) + (hPnl ?? 0);
                const builder = builderRef.current;
                const corrNow = builder ? correlationRead(builder, g.primarySymbol, g.hedgeSymbol).avg : null;
                const alerts: string[] = [];
                if (corrNow != null) {
                  if (Math.sign(corrNow) !== Math.sign(g.corrAtEntry) && Math.abs(g.corrAtEntry) > 0.3) alerts.push('⚠ correlation has REVERSED — the hedge may now add risk');
                  else if (Math.abs(corrNow) < Math.abs(g.corrAtEntry) - 0.2) alerts.push('⚠ correlation weakening vs entry — consider reducing');
                }
                if (pPos == null || pPos.status !== 'open') alerts.push('primary position is closed — the hedge leg is now a directional trade');
                return (
                  <div key={g.id} className="mb-2 rounded border p-2.5 last:mb-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-bold text-white">{g.name}</span>
                      <span className="font-mono text-[9px] text-white/35">corr @entry {g.corrAtEntry.toFixed(2)} → now {corrNow != null ? corrNow.toFixed(2) : '—'}</span>
                      <span className="ml-auto font-mono font-bold" style={{ color: combined >= 0 ? '#00C27A' : '#FF5252' }}>
                        net {combined >= 0 ? '+' : ''}${combined.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-6 text-[10px] text-white/50">
                      <span>Primary: {pPos ? `${pPos.direction} ${pPos.size} ${g.primarySymbol} · ${pPnl != null ? `${pPnl >= 0 ? '+' : ''}$${pPnl.toFixed(2)}` : 'closed'}` : 'closed / not tracked'}</span>
                      <span>Hedge: {hPos ? `${hPos.direction} ${hPos.size} ${g.hedgeSymbol} · ${hPnl != null ? `${hPnl >= 0 ? '+' : ''}$${hPnl.toFixed(2)}` : 'closed'}` : 'closed'}</span>
                    </div>
                    {alerts.map((a, i) => <p key={i} className="mt-1 text-[9px]" style={{ color: '#FFB300' }}>{a}</p>)}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <GroupBtn label="Close Hedge Only" onClick={() => closeGroup(g, 'hedge')} disabled={placing || !hPos || hPos.status !== 'open'} />
                      <GroupBtn label="Close Primary + Hedge" onClick={() => closeGroup(g, 'both')} disabled={placing} danger />
                      <GroupBtn label="Forget Group" onClick={() => { const next = loadHedgeGroups().filter((x) => x.id !== g.id); saveHedgeGroups(next); setGroups(next); }} disabled={placing} />
                      <button onClick={() => downloadRecord(g)} className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                        <Download size={10} /> Record
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[9px] font-semibold leading-relaxed" style={{ color: 'rgba(255,179,0,0.75)' }}>
            {HEDGE_EXONERATION}
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-white/30">
            Suggested exit conditions for any hedge: primary reaches its stop or target · correlation falls below your
            threshold or reverses · the news event passes · volatility normalises · hedge cost exceeds its protection.
            A hedge can reduce one risk while adding others (spread, swap, margin, execution, correlation). Estimated
            risk reduction only — costs and residual risk always remain. Not financial advice.
          </p>
        </div>

        {/* ── Preview + confirm modal ── */}
        {preview && (
          <div className="fixed inset-0 z-[9600] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(3,7,12,0.8)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
            <div className="max-h-[92vh] w-full max-w-[600px] overflow-y-auto rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(171,71,188,0.5)', scrollbarWidth: 'thin' }}>
              <div className="mb-2 text-[15px] font-bold text-white">Confirm hedge — {preview.hedgeDirection} {preview.suggestedLots} {preview.symbol}</div>
              <p className="mb-2 text-[11px] leading-relaxed text-white/65">
                You are {direction === 'BUY' ? 'long' : 'short'} {inputs.lots} {primary}. {preview.symbol} currently shows{' '}
                {preview.corr.label.toLowerCase()} (avg {preview.corr.avg!.toFixed(2)}, stability {(preview.corr.stability * 100).toFixed(0)}%).
                A {preview.suggestedLots}-lot {preview.hedgeDirection.toLowerCase()} may offset ~{preview.reductionPct.toFixed(0)}% of the
                position&apos;s 1×ATR risk after adjusting for volatility ({preview.volAdjRatio.toFixed(2)}×) and correlation ({Math.abs(preview.corr.avg!).toFixed(2)}×).
                Raw notional ratio {preview.rawRatio.toFixed(2)} · final ratio {preview.finalRatio.toFixed(2)} at {Math.round(hedgePct * 100)}% hedge.
                Residual exposure remains, the correlation can change, and this hedge adds ~${preview.spreadCost.toFixed(2)} spread cost
                plus ~${preview.marginEstimate.toFixed(0)} margin and overnight swap.
              </p>
              {(() => { const n = newsFor([primary, preview.symbol]); return n ? (
                <p className="mb-2 text-[11px]" style={{ color: '#FFB300' }}>⚠ {n.currency} “{n.title}” in {fmtEta(n.timeMs)} — relationships often destabilise through news.</p>
              ) : null; })()}
              {/* Stress Lab — real-history replay of this exact hedge */}
              {stress && (
                <div className="mb-2 rounded border p-2.5" style={{ borderColor: 'rgba(0,180,216,0.3)', backgroundColor: 'rgba(0,180,216,0.05)' }}>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#00B4D8' }}>
                    Stress Lab — last {stress.days} days replayed (history, not a forecast)
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                    <Row k="Unhedged P&L" v={`${stress.unhedgedFinal >= 0 ? '+' : ''}$${stress.unhedgedFinal.toFixed(0)}`} />
                    <Row k="Hedged P&L" v={`${stress.hedgedFinal >= 0 ? '+' : ''}$${stress.hedgedFinal.toFixed(0)}`} />
                    <Row k="Worst drawdown (unhedged)" v={`$${Math.abs(stress.ddUnhedged).toFixed(0)}`} color="#FF5252" />
                    <Row k="Worst drawdown (hedged)" v={`$${Math.abs(stress.ddHedged).toFixed(0)}`} color={Math.abs(stress.ddHedged) < Math.abs(stress.ddUnhedged) ? MINT : '#FF5252'} />
                    <Row k="Hourly volatility (unhedged)" v={`$${stress.volUnhedged.toFixed(1)}`} />
                    <Row k="Hourly volatility (hedged)" v={`$${stress.volHedged.toFixed(1)}`} />
                  </div>
                  <p className="mt-1 text-[9px] text-white/45">
                    The hedge reduced 24h drawdowns in <b>{stress.helpedPct.toFixed(0)}%</b> of {stress.windows} rolling windows
                    {stress.helpedPct < 50 ? ' — in this sample it hurt more often than it helped. Take that seriously.' : ' — and increased loss in the rest. Both outcomes are normal for hedges.'}
                  </p>
                </div>
              )}
              {(() => {
                const builder = builderRef.current;
                const g = builder ? weekendGap(builder, primary) : null;
                return g ? (
                  <p className="mb-2 text-[9px] text-white/40">
                    🌙 Weekend gaps on {primary} in this data: median {g.medianPct.toFixed(2)}%, worst {g.worstPct.toFixed(2)}% across {g.n} weekend(s) — relevant if you hold this hedge over a weekend.
                  </p>
                ) : null;
              })()}
              <p className="mb-1 text-[10px] text-white/40">
                Exit plan: remove the hedge when the primary hits its stop/target, the correlation drops or reverses, or the
                protection no longer justifies its cost. Shield rules apply to this order like any other. Estimates, not guarantees.
              </p>
              <p className="mb-3 text-[9px] font-semibold" style={{ color: '#FFB300' }}>{HEDGE_EXONERATION}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setPreview(null)} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
                <button onClick={() => executeHedge(preview)} disabled={placing}
                  className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: 'linear-gradient(180deg, #CE93D8 0%, #AB47BC 100%)', boxShadow: '0 0 12px rgba(171,71,188,0.5)' }}>
                  {placing ? 'Placing…' : 'CONFIRM HEDGE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none fixed left-1/2 top-10 z-[9700] -translate-x-1/2 rounded-lg px-4 py-2.5 text-[11px] font-semibold" style={{ backgroundColor: '#0A0F1A', color: '#CE93D8', border: '1px solid rgba(171,71,188,0.6)', boxShadow: '0 0 16px rgba(171,71,188,0.4)' }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{k}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? 'rgba(255,255,255,0.8)' }}>{v}</span>
    </div>
  );
}

function GroupBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded px-2 py-1 text-[9px] font-semibold transition-all hover:brightness-125 disabled:opacity-30"
      style={{
        backgroundColor: danger ? 'rgba(255,82,82,0.1)' : 'rgba(255,255,255,0.05)',
        color: danger ? '#FF5252' : 'rgba(255,255,255,0.6)',
        border: `1px solid ${danger ? 'rgba(255,82,82,0.35)' : 'rgba(255,255,255,0.12)'}`,
      }}>
      {label}
    </button>
  );
}
