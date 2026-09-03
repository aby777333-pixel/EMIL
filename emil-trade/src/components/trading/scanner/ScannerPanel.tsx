'use client';

// RAPTOR Global Trade Opportunity Scanner — the command centre.
// Modular intelligence layer over scanner-engine: ranked opportunity cards
// with full trade plans, transparent score breakdowns, reasons for AND
// against, invalidation, news + exposure warnings, filters (persisted),
// a color-coded Auto-Trade control and a signal log with JSON export.
//
// Execution policy (§13/§14): OFF and SIGNAL ONLY never touch orders.
// MANUAL CONFIRMATION prepares an order and requires an explicit click —
// routed through the normal Shield-gated order service with the unique
// source tag `Scanner:<tf>`. Semi/Fully-Automatic are displayed but LOCKED
// (broker enablement + separate consent would be required); no autonomous
// execution loop exists in this build. Emergency Stop reverts to OFF.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Radar, Download, AlertTriangle, OctagonX } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { getCalendar, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';
import {
  runScan, loadScanFilters, saveScanFilters, SCAN_TFS,
  appendSignalLog, loadSignalLog,
  recordScanGrades, resolveScanGrades, scanGradeSummary,
  type Opportunity, type ScanFilters, type AssetClass,
} from '@/lib/trading/scanner-engine';
import AutoScanSection from '@/components/trading/scanner/AutoScanSection';

type AutoMode = 'off' | 'signal' | 'manual';

const MODE_META: Record<AutoMode, { label: string; color: string; desc: string }> = {
  off:    { label: 'OFF',                 color: '#8B93A7', desc: 'Scanner idle — no analysis, no alerts, no orders.' },
  signal: { label: 'SIGNAL ONLY',         color: '#29ABE2', desc: 'Analyse and display only. The scanner cannot place orders.' },
  manual: { label: 'MANUAL CONFIRMATION', color: '#FFB300', desc: 'Prepare trades from cards; every execution needs your explicit confirm. Shield rules apply.' },
};

const CONSENT_KEY = 'raptor_scanner_consent_v1';
const AUTOPARAMS_KEY = 'raptor_scanner_autoparams_v1';

// §1 — the one-line exoneration shown in the window, the settings and the consent.
export const SCANNER_EXONERATION =
  'All signals, hedge suggestions and automated trades are used entirely at the trader’s own risk; neither the broker nor the Raptor platform is responsible for trading losses, missed opportunities, execution delays or market outcomes.';

interface AutoParams { maxPerDay: number; minScore: number; minGapMin: number }
const DEFAULT_AUTOPARAMS: AutoParams = { maxPerDay: 10, minScore: 60, minGapMin: 5 };

function loadAutoParams(): AutoParams {
  try { return { ...DEFAULT_AUTOPARAMS, ...(JSON.parse(localStorage.getItem(AUTOPARAMS_KEY) || '{}')) }; } catch { return { ...DEFAULT_AUTOPARAMS }; }
}

export default function ScannerPanel({ ohlcvBuilder, isLiveData, onClose, standalone = false }: {
  ohlcvBuilder: OHLCVBuilder | null; isLiveData: boolean; onClose: () => void; standalone?: boolean;
}) {
  const { prices, positions, activeAccountId, accountSummary, triggerRefresh, setActiveSymbol } = useTradingStore();
  const [mode, setMode] = useState<AutoMode>('signal');
  const [filters, setFilters] = useState<ScanFilters>(loadScanFilters);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmOpp, setConfirmOpp] = useState<Opportunity | null>(null);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [consented, setConsented] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [autoParams, setAutoParams] = useState<AutoParams>(loadAutoParams);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;
  const loggedRef = useRef<Set<string>>(new Set());

  useEffect(() => { getCalendar().then(setCalendar); }, []);
  useEffect(() => { try { setConsented(!!localStorage.getItem(CONSENT_KEY)); } catch { /* ignore */ } }, []);

  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 5000); }, []);

  const universe = useMemo(() => Object.keys(prices).filter((s) => prices[s]?.bid != null), [prices]);

  const scan = useCallback(() => {
    const builder = builderRef.current;
    if (!builder || mode === 'off') return;
    const found = runScan({
      builder, universe, ticks: prices, calendar,
      openPositions: positions, balance: Number(accountSummary?.balance ?? 0),
      isLiveData, filters,
    });
    setOpps(found);
    setScannedAt(Date.now());
    // Self-grading: remember strong cards, resolve older ones vs real bars.
    try { recordScanGrades(found); resolveScanGrades(builder); } catch { /* grading never breaks the scan */ }
    for (const o of found) {
      if (o.score >= 70 && !loggedRef.current.has(o.id)) {
        loggedRef.current.add(o.id);
        appendSignalLog({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, direction: o.direction, score: o.score, action: 'shown' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universe, prices, calendar, positions, accountSummary, isLiveData, filters, mode]);

  // Scan on open + every 30s (asynchronous, cheap: reuses cached bars).
  useEffect(() => {
    scan();
    const id = setInterval(scan, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, mode, calendar.length]);

  const patchFilters = useCallback((patch: Partial<ScanFilters>) => {
    setFilters((prev) => { const next = { ...prev, ...patch }; saveScanFilters(next); return next; });
  }, []);

  const emergencyStop = useCallback(() => {
    setMode('off');
    setConfirmOpp(null);
    appendSignalLog({ ts: Date.now(), symbol: '-', tf: '-', direction: '-', score: 0, action: 'rejected', detail: 'EMERGENCY STOP pressed — scanner set to OFF' });
    say('⛔ EMERGENCY STOP — scanner OFF. No scanner orders can be created. Manual trading and other engines are untouched.');
  }, [say]);

  const execute = useCallback(async (o: Opportunity) => {
    if (!activeAccountId) { say('Select a trading account first'); return; }
    const t = prices[o.symbol];
    if (!t?.bid || !t?.ask) { say(`No live quote for ${o.symbol} — refusing to trade stale data`); return; }
    // Automation & risk parameters (trader-set, enforced here for real).
    const ap = loadAutoParams();
    const log = loadSignalLog();
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const executedToday = log.filter((e) => e.action === 'executed' && e.ts >= midnight.getTime());
    if (executedToday.length >= ap.maxPerDay) {
      appendSignalLog({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, direction: o.direction, score: o.score, action: 'rejected', detail: `max ${ap.maxPerDay} scanner trades/day reached` });
      say(`⛔ Your automation limit: ${ap.maxPerDay} scanner trades/day already used.`); return;
    }
    const lastExec = executedToday.length ? Math.max(...executedToday.map((e) => e.ts)) : 0;
    if (lastExec && Date.now() - lastExec < ap.minGapMin * 60_000) {
      const left = Math.ceil((ap.minGapMin * 60_000 - (Date.now() - lastExec)) / 60_000);
      say(`⛔ Trade spacing: your rule requires ${ap.minGapMin} min between scanner trades (${left} min left).`); return;
    }
    if (o.score < ap.minScore) {
      say(`⛔ Score ${o.score} is below your minimum-to-execute (${ap.minScore}). Signal stays watch-only.`); return;
    }
    // Conflict check (§14): one scanner trade per symbol; warn on any open position.
    const open = positions.filter((p) => p.status === 'open' && p.symbol === o.symbol);
    if (open.some((p) => String((p as unknown as { comment?: string }).comment ?? '').startsWith('Scanner:'))) {
      say(`A scanner trade is already open on ${o.symbol} — one per symbol.`); return;
    }
    setPlacing(true);
    try {
      const lots = o.suggestedLots ?? 0.01;
      const fill = o.direction === 'BUY' ? t.ask : t.bid;
      await orderService.placeMarketOrder({
        accountId: activeAccountId, symbol: o.symbol, direction: o.direction, size: lots,
        sl: o.zone.stop, tp: o.zone.target1, fillPrice: fill, comment: `Scanner:${o.tfLabel}`,
      });
      appendSignalLog({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, direction: o.direction, score: o.score, action: 'executed', detail: `${lots} lots @ ${fill}, SL ${o.zone.stop}, TP ${o.zone.target1}` });
      say(`✓ ${o.direction} ${lots} ${o.symbol} @ ${fill} — SL ${o.zone.stop} / TP1 ${o.zone.target1} (tag Scanner:${o.tfLabel})`);
      setConfirmOpp(null);
      triggerRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendSignalLog({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, direction: o.direction, score: o.score, action: 'rejected', detail: msg });
      say(`Blocked/failed: ${msg}`);
    } finally {
      setPlacing(false);
    }
  }, [activeAccountId, prices, positions, say, triggerRefresh]);

  const exportLog = useCallback(() => {
    const blob = new Blob([JSON.stringify(loadSignalLog(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `raptor-scanner-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const acceptConsent = useCallback(() => {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ acceptedAt: new Date().toISOString(), mode: 'manual' })); } catch { /* ignore */ }
    setConsented(true);
    setMode('manual');
  }, []);

  const meta = MODE_META[mode];
  const openScannerTrades = positions.filter((p) => p.status === 'open' && String((p as unknown as { comment?: string }).comment ?? '').startsWith('Scanner:')).length;

  const chipBtn = (active: boolean, color: string): React.CSSProperties => ({
    backgroundColor: active ? `${color}2E` : 'rgba(255,255,255,0.04)',
    color: active ? color : 'rgba(255,255,255,0.4)',
    border: `1px solid ${active ? `${color}88` : 'rgba(255,255,255,0.1)'}`,
  });

  const patchAuto = (patch: Partial<AutoParams>) => {
    setAutoParams((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(AUTOPARAMS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div
      className={standalone ? 'flex w-full items-start justify-center p-4' : 'fixed inset-0 z-[9500] flex items-start justify-center overflow-y-auto p-4'}
      style={standalone ? undefined : { backgroundColor: 'rgba(3,7,12,0.88)', backdropFilter: 'blur(3px)' }}
      onMouseDown={standalone ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full rounded-xl border shadow-2xl ${standalone ? '' : 'my-4 max-w-[1150px]'}`} style={{ backgroundColor: '#080D16', borderColor: 'rgba(41,171,226,0.35)' }}>

        {/* ── Top command bar ── */}
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 text-[15px] font-bold text-white">
            <Radar size={16} style={{ color: '#29ABE2' }} /> Trade Scanner
          </div>
          <span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold" style={{ backgroundColor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}66` }}>
            {meta.label}
          </span>
          <span className="text-[10px] text-white/40">
            {universe.length} instruments · {isLiveData ? 'live feed' : 'platform feed (simulated)'} ·
            {scannedAt ? ` scanned ${Math.round((Date.now() - scannedAt) / 1000)}s ago` : ' scanning…'} ·
            {` ${opps.length} opportunities`} · {openScannerTrades} open scanner trade(s)
          </span>
          <button onClick={emergencyStop}
            className="ml-auto flex items-center gap-1 rounded px-3 py-1.5 text-[10px] font-bold transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(255,82,82,0.15)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.55)' }}>
            <OctagonX size={12} /> EMERGENCY STOP
          </button>
          {!standalone && (
            <button onClick={() => window.open('/terminal/scan-trade', '_blank')}
              title="Open SCAN & TRADE as a standalone window (new tab) — same account, positions and rules; ideal for a second monitor"
              className="rounded px-2.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-125"
              style={{ backgroundColor: 'rgba(41,171,226,0.12)', color: '#29ABE2', border: '1px solid rgba(41,171,226,0.4)' }}>
              ⧉ Window
            </button>
          )}
          <button onClick={onClose} className="rounded p-1.5 text-white/40 transition-colors hover:text-white"><X size={16} /></button>
        </div>

        {/* ── Auto-trade control ── */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Auto Trade</span>
          {(['off', 'signal', 'manual'] as AutoMode[]).map((m) => (
            <button key={m}
              onClick={() => {
                if (m === 'manual' && !consented) { setConfirmOpp(null); setMode('signal'); setExpanded('__consent__'); return; }
                setMode(m);
              }}
              className="rounded px-2.5 py-1 text-[10px] font-bold transition-all hover:brightness-125"
              style={chipBtn(mode === m, MODE_META[m].color)}
              title={MODE_META[m].desc}>
              {MODE_META[m].label}
            </button>
          ))}
          <span className="rounded px-2.5 py-1 text-[10px] font-bold" style={chipBtn(false, '#00C27A')}
            title="Fully-automatic execution lives in the AUTO SCAN TRADE engine below — its own consent, limits and log, fully separate from Auto Hedge.">
            FULL AUTO ↓
          </span>
          <span className="ml-auto text-[9px] text-white/35">{meta.desc}</span>
        </div>

        {/* ── AUTO SCAN TRADE — independent engine (separate consent) ── */}
        <AutoScanSection
          ohlcvBuilder={ohlcvBuilder}
          prices={prices}
          calendar={calendar}
          accountId={activeAccountId}
          isLiveData={isLiveData}
          say={say}
          triggerRefresh={triggerRefresh}
        />

        {/* EMIL removed from this module entirely (2026-07-21, owner request):
            Scan Trade is fully independent — EMIL lives only in /terminal/emil. */}

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['forex', 'metal', 'energy', 'index', 'crypto'] as AssetClass[]).map((ac) => (
            <button key={ac}
              onClick={() => patchFilters({ assetClasses: filters.assetClasses.includes(ac) ? filters.assetClasses.filter((x) => x !== ac) : [...filters.assetClasses, ac] })}
              className="rounded px-2 py-0.5 text-[9px] font-bold uppercase transition-all" style={chipBtn(filters.assetClasses.includes(ac), '#29ABE2')}>
              {ac}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          {SCAN_TFS.map((tf) => (
            <button key={tf.style}
              onClick={() => patchFilters({ styles: filters.styles.includes(tf.style) ? filters.styles.filter((x) => x !== tf.style) : [...filters.styles, tf.style] })}
              className="rounded px-2 py-0.5 text-[9px] font-bold transition-all" style={chipBtn(filters.styles.includes(tf.style), '#AB47BC')}
              title={`${tf.label} · holding ${tf.holding}`}>
              {tf.style}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          {(['both', 'BUY', 'SELL'] as const).map((d) => (
            <button key={d} onClick={() => patchFilters({ direction: d })}
              className="rounded px-2 py-0.5 text-[9px] font-bold uppercase transition-all"
              style={chipBtn(filters.direction === d, d === 'SELL' ? '#FF5252' : d === 'BUY' ? '#00C27A' : '#8B93A7')}>
              {d}
            </button>
          ))}
          <label className="flex items-center gap-1 text-[9px] text-white/45">
            min score
            <input type="number" value={filters.minScore} min={0} max={100}
              onChange={(e) => patchFilters({ minScore: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
              className="w-[46px] rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          </label>
          <button onClick={() => patchFilters({ portfolioOnly: !filters.portfolioOnly })}
            className="rounded px-2 py-0.5 text-[9px] font-bold transition-all" style={chipBtn(filters.portfolioOnly, '#00E5A0')}
            title="Only scan symbols where you hold an open position">
            Portfolio mode
          </button>
          <button onClick={() => setShowAuto((s) => !s)} className="ml-auto rounded px-2 py-0.5 text-[9px] font-bold transition-all"
            style={{ backgroundColor: showAuto ? 'rgba(255,179,0,0.18)' : 'rgba(255,179,0,0.06)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.35)' }}>
            ⚙ Automation
          </button>
          <button onClick={() => setShowLog((s) => !s)}
            className="rounded px-2 py-0.5 text-[9px] font-semibold transition-all hover:brightness-125"
            style={{
              color: showLog ? '#29ABE2' : 'rgba(255,255,255,0.45)',
              border: `1px solid ${showLog ? 'rgba(41,171,226,0.55)' : 'rgba(255,255,255,0.12)'}`,
              backgroundColor: showLog ? 'rgba(41,171,226,0.12)' : 'transparent',
            }}>
            Signal log {showLog ? '▴' : '▾'}
          </button>
          <button onClick={exportLog} className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold text-white/45 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <Download size={10} /> Export
          </button>
        </div>

        {/* ── Automation & risk parameters (trader-set, enforced at execution) ── */}
        {showAuto && (
          <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(255,179,0,0.25)', backgroundColor: 'rgba(255,179,0,0.04)' }}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#FFB300' }}>Automation & risk parameters — enforced on every scanner execution</div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-[10px] text-white/50">Max scanner trades / day
                <input type="number" min={1} max={100} value={autoParams.maxPerDay}
                  onChange={(e) => patchAuto({ maxPerDay: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                  className="ml-2 w-[56px] rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[11px] text-white outline-none" style={{ border: '1px solid rgba(255,179,0,0.3)' }} />
              </label>
              <label className="text-[10px] text-white/50">Min score to execute
                <input type="number" min={0} max={100} value={autoParams.minScore}
                  onChange={(e) => patchAuto({ minScore: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
                  className="ml-2 w-[56px] rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[11px] text-white outline-none" style={{ border: '1px solid rgba(255,179,0,0.3)' }} />
              </label>
              <label className="text-[10px] text-white/50">Min minutes between trades
                <input type="number" min={0} max={720} value={autoParams.minGapMin}
                  onChange={(e) => patchAuto({ minGapMin: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  className="ml-2 w-[56px] rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[11px] text-white outline-none" style={{ border: '1px solid rgba(255,179,0,0.3)' }} />
              </label>
              <span className="text-[9px] text-white/40">
                Auto entry/exit executes SL + TP1 with every order; trailing/BE plan shown per card. Loss control (daily loss,
                equity floor, cooldowns, news guard…) is enforced by your 🛡 Shield rules on this same order path.
              </span>
            </div>
            <p className="mt-2 text-[9px]" style={{ color: '#FFB300' }}>{SCANNER_EXONERATION}</p>
          </div>
        )}

        {/* ── Body ── */}
        <div className={`overflow-y-auto p-4 ${standalone ? '' : 'max-h-[66vh]'}`} style={{ scrollbarWidth: 'thin' }}>
          {mode === 'off' && (
            <p className="py-8 text-center text-[12px] text-white/40">Scanner is OFF. Switch to SIGNAL ONLY to analyse the market.</p>
          )}

          {/* 📋 Self-grade scoreboard: the scanner grades ITSELF against real bars */}
          {(() => {
            const g = scanGradeSummary();
            const resolved = g.reduce((a, x) => a + x.wins + x.losses, 0);
            const pending = g.reduce((a, x) => a + x.open, 0);
            return resolved + pending > 0 ? (
              <p className="mb-2 text-[9px] text-white/40">
                📋 <b className="text-white/60">Scanner self-grade</b> (strong cards resolved vs real bars, stop-first = loss):{' '}
                {resolved > 0 ? g.filter((x) => x.wins + x.losses > 0).map((x) => `${x.style} ${x.wins}W/${x.losses}L`).join(' · ') : 'no cards resolved yet'}
                {pending > 0 ? ` · ${pending} pending` : ''} — the scanner is graded publicly, wins and losses alike.
              </p>
            ) : null;
          })()}

          {/* Signal log — rendered at the TOP of the body so toggling it gives
              immediate visible feedback (it used to sit below dozens of cards,
              which read as a dead button). */}
          {showLog && (
            <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'rgba(41,171,226,0.35)', backgroundColor: 'rgba(41,171,226,0.04)' }}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#29ABE2' }}>Signal log (latest 40 · full log via Export)</div>
              {loadSignalLog().slice(-40).reverse().map((e, i) => (
                <p key={i} className="font-mono text-[9px] text-white/45">
                  {new Date(e.ts).toLocaleTimeString()} · {e.action.toUpperCase()} · {e.symbol} {e.tf} {e.direction} · score {e.score}{e.detail ? ` · ${e.detail}` : ''}
                </p>
              ))}
              {loadSignalLog().length === 0 && <p className="text-[10px] text-white/30">No signals logged yet — entries appear when cards are shown, prepared, executed or rejected.</p>}
            </div>
          )}

          {mode !== 'off' && opps.length === 0 && (
            <p className="py-8 text-center text-[12px] text-white/40">
              No opportunities pass the current filters — the scanner shows nothing rather than forcing weak setups.
              Ranges and chop are skipped by design; lower the min score to see Watchlist-grade candidates.
            </p>
          )}

          {mode !== 'off' && opps.map((o) => (
            <div key={o.id} className="mb-2 rounded-lg border p-3" style={{ borderColor: o.score >= 80 ? `${o.labelColor}55` : 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${o.labelColor}1F`, color: o.labelColor, border: `1px solid ${o.labelColor}66` }}>{o.label}</span>
                <button onClick={() => setActiveSymbol(o.symbol)} title="Load on the charts" className="font-mono text-[13px] font-bold text-white transition-colors hover:text-[#29ABE2]">{o.symbol}</button>
                <span className="text-[10px] text-white/45">{o.style} · {o.tfLabel} · {o.opportunityType}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold" style={{ color: o.score >= 80 ? '#00C27A' : o.score >= 60 ? '#FFB300' : '#8B93A7', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {o.score} · {o.scoreLabel}
                </span>
                {o.news && <span className="flex items-center gap-1 text-[9px]" style={{ color: '#FFB300' }}><AlertTriangle size={10} /> {o.news.currency} news {fmtEta(o.news.timeMs)}</span>}
                {o.correlatedExposure && <span className="text-[9px]" style={{ color: '#FF8A65' }}>adds {o.correlatedExposure} exposure</span>}
                <button onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="ml-auto rounded px-2.5 py-1 text-[9px] font-bold text-white/55 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                  {expanded === o.id ? 'Hide detail' : 'Full card'}
                </button>
                {mode === 'manual' && (
                  <button onClick={() => { setConfirmOpp(o); appendSignalLog({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, direction: o.direction, score: o.score, action: 'prepared' }); }}
                    className="rounded px-3 py-1 text-[10px] font-bold text-black transition-all hover:brightness-110"
                    style={{ background: o.direction === 'BUY' ? 'linear-gradient(180deg,#00E5A0,#00B87F)' : 'linear-gradient(180deg,#FF8A80,#FF5252)' }}>
                    Prepare {o.direction}
                  </button>
                )}
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5 font-mono text-[10px] text-white/60 sm:grid-cols-4">
                <span>Entry {o.zone.preferred} <span className="text-white/30">(alt {o.zone.conservative})</span></span>
                <span>SL {o.zone.stop}</span>
                <span>TP1 {o.zone.target1} · TP2 {o.zone.target2} · TP3 {o.tp3}</span>
                <span>{o.zone.riskReward1}R · ~{o.expectedPips.toFixed(0)} pips{o.spreadPips != null ? ` · spread ${o.spreadPips.toFixed(1)}p` : ''}</span>
              </div>

              {expanded === o.id && (
                <div className="mt-2 grid gap-3 border-t pt-2 md:grid-cols-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] leading-relaxed">
                    <div className="mb-1 font-bold uppercase tracking-wide text-white/40">Why this appeared</div>
                    {o.reasonsFor.map((r, i) => <p key={i} style={{ color: '#00C27A' }}>+ {r}</p>)}
                    <div className="mb-1 mt-2 font-bold uppercase tracking-wide text-white/40">Against it / risks</div>
                    {o.reasonsAgainst.map((r, i) => <p key={i} style={{ color: '#FF8A65' }}>− {r}</p>)}
                    <p className="mt-2 text-white/45">Invalidation: {o.invalidation}</p>
                    <p className="mt-1 text-white/45">Duration: {o.expectedDurationNote}. Trailing: {o.trailingNote}. Break-even at TP1 {o.breakEvenTrigger}.</p>
                    {o.suggestedLots != null && (
                      <p className="mt-1 text-white/45">
                        Sizing @1% risk: {o.suggestedLots} lots · margin ~${o.marginEstimate?.toFixed(0)} · max est. loss ~${o.maxLossEstimate?.toFixed(0)}
                      </p>
                    )}
                    <p className="mt-1 text-white/30">Venue: {o.venue} · fresh {new Date(o.freshAt).toLocaleTimeString()} · setup stale after {new Date(o.expiresAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-[10px]">
                    <div className="mb-1 font-bold uppercase tracking-wide text-white/40">Score breakdown (transparent weights)</div>
                    {o.components.map((c) => (
                      <div key={c.name} className="mb-1 flex items-center gap-2">
                        <span className="w-32 shrink-0 text-white/45">{c.name}</span>
                        <div className="h-2 flex-1 rounded bg-white/[0.05]">
                          <div className="h-full rounded" style={{ width: `${c.score}%`, backgroundColor: c.score >= 70 ? 'rgba(0,194,122,0.7)' : c.score >= 40 ? 'rgba(255,179,0,0.7)' : 'rgba(255,82,82,0.7)' }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-mono text-white/55">{Math.round(c.score)}·w{c.weight}</span>
                      </div>
                    ))}
                    {o.components.map((c) => <p key={c.name} className="text-white/30">· {c.name}: {c.note}</p>)}
                  </div>
                </div>
              )}
            </div>
          ))}

          <p className="mt-3 text-[9px] font-semibold leading-relaxed" style={{ color: 'rgba(255,179,0,0.75)' }}>
            {SCANNER_EXONERATION}
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-white/30">
            Trade opportunities, scores, alerts, forecasts, hedging suggestions and automated actions are analytical
            tools, not guarantees of profit. Markets can move rapidly, correlations can fail, and losses may exceed
            expectations. The trader remains responsible for enabling automation, reviewing risk settings and deciding
            whether a trade is suitable. Past performance, backtests and simulated results do not guarantee future results.
          </p>
        </div>

        {/* ── Consent gate for Manual Confirmation ── */}
        {expanded === '__consent__' && !consented && (
          <div className="fixed inset-0 z-[9600] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(3,7,12,0.8)' }}>
            <div className="w-full max-w-[520px] rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,179,0,0.5)' }}>
              <div className="mb-2 text-[14px] font-bold text-white">Scanner trading consent</div>
              <p className="mb-2 text-[11px] leading-relaxed text-white/65">
                MANUAL CONFIRMATION lets you execute scanner-prepared trades with one confirmed click. Before enabling it,
                acknowledge: scanner signals are analytical estimates that can be wrong; leverage amplifies losses;
                slippage, gaps, news and liquidity can breach stops; model and data-feed failures are possible; historical
                or simulated results do not guarantee future results. Every scanner order passes your Shield rules and is
                tagged <span className="font-mono">Scanner:&lt;tf&gt;</span> for a separate audit trail. You remain fully
                responsible for every execution.
              </p>
              <p className="mb-2 text-[10px] font-semibold" style={{ color: '#FFB300' }}>{SCANNER_EXONERATION}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setExpanded(null)} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Stay in Signal Only</button>
                <button onClick={() => { acceptConsent(); setExpanded(null); }}
                  className="rounded px-4 py-2 text-[11px] font-bold text-black" style={{ background: 'linear-gradient(180deg,#FFD54F,#FFB300)' }}>
                  I understand — enable Manual Confirmation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Prepare/confirm modal ── */}
        {confirmOpp && (
          <div className="fixed inset-0 z-[9600] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(3,7,12,0.8)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmOpp(null); }}>
            <div className="w-full max-w-[520px] rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: `${confirmOpp.labelColor}88` }}>
              <div className="mb-2 text-[14px] font-bold text-white">
                Confirm scanner trade — {confirmOpp.direction} {confirmOpp.suggestedLots ?? 0.01} {confirmOpp.symbol}
              </div>
              <div className="mb-2 grid grid-cols-2 gap-x-6 gap-y-0.5 font-mono text-[11px] text-white/70">
                <span>Entry: market (~{confirmOpp.zone.aggressive})</span>
                <span>SL: {confirmOpp.zone.stop}</span>
                <span>TP1 (attached): {confirmOpp.zone.target1}</span>
                <span>{confirmOpp.zone.riskReward1}R · score {confirmOpp.score}</span>
              </div>
              <p className="mb-2 text-[10px] leading-relaxed text-white/50">
                Plan: bank TP1, then stop to break-even and trail 1.5–2×ATR toward {confirmOpp.zone.target2} / {confirmOpp.tp3}.
                {confirmOpp.maxLossEstimate != null && <> Max estimated loss at SL ~${confirmOpp.maxLossEstimate.toFixed(0)}.</>}
                {' '}Invalidation: {confirmOpp.invalidation} Shield rules apply; order is tagged Scanner:{confirmOpp.tfLabel}.
              </p>
              {confirmOpp.news && <p className="mb-2 text-[10px]" style={{ color: '#FFB300' }}>⚠ {confirmOpp.news.currency} “{confirmOpp.news.title}” {fmtEta(confirmOpp.news.timeMs)} — consider waiting it out.</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmOpp(null)} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
                <button onClick={() => execute(confirmOpp)} disabled={placing}
                  className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: confirmOpp.direction === 'BUY' ? 'linear-gradient(180deg,#00E5A0,#00B87F)' : 'linear-gradient(180deg,#FF8A80,#FF5252)' }}>
                  {placing ? 'Placing…' : `CONFIRM ${confirmOpp.direction}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none fixed left-1/2 top-10 z-[9700] -translate-x-1/2 rounded-lg px-4 py-2.5 text-[11px] font-semibold" style={{ backgroundColor: '#0A0F1A', color: '#29ABE2', border: '1px solid rgba(41,171,226,0.6)', boxShadow: '0 0 16px rgba(41,171,226,0.4)' }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
