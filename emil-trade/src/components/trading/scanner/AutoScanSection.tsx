'use client';

// AUTO SCAN TRADE — the independent Scan Trade engine, wired into the
// Scanner panel/page. Fully separate from Auto Hedge (own consent, own
// params, own log, own tag ScanAuto:*) — activating one never activates
// the other. EMIL has no execution authority here. Every automated
// order passes Shield → Guardian → account-level Risk Governor, and a
// hard stop is attached to every position at entry (no stop, no trade).
// Evaluation cycle runs every 30s while a Scan Trade window is open;
// server-side 24/7 execution is a future phase — stated, not claimed.

import { useEffect, useRef, useState } from 'react';
import { Power, OctagonX } from 'lucide-react';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { NewsEvent } from '@/lib/trading/news-guard';
import { orderService } from '@/lib/trading/order-service';
import {
  evaluateScanAuto, scanAutoToday, markEntry, scanAutoLog, loadScanAutoLog,
  loadScanAutoParams, saveScanAutoParams, SCAN_MODES,
  isScanAutoOn, setScanAutoOn, isScanAutoConsented, recordScanAutoConsent, SCAN_AUTO_DISCLAIMER,
  type ScanAutoParams, type ScanLivePosition, type ScanClosedRow,
} from '@/lib/trading/scan-auto';
import TradeCommandBar from '@/components/trading/TradeCommandBar';

const BLUE = '#29ABE2';

export default function AutoScanSection({ ohlcvBuilder, prices, calendar, accountId, isLiveData, say, triggerRefresh }: {
  ohlcvBuilder: OHLCVBuilder | null;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[];
  accountId: string | null;
  isLiveData: boolean;
  say: (msg: string) => void;
  triggerRefresh: () => void;
}) {
  const [on, setOn] = useState(false);
  const [consented, setConsented] = useState(false);
  const [gate, setGate] = useState(false);
  const [typed, setTyped] = useState('');
  const [params, setParams] = useState<ScanAutoParams>(loadScanAutoParams);
  const [lastNote, setLastNote] = useState('engine idle');
  const [showParams, setShowParams] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [todayStats, setTodayStats] = useState<{ trades: number; pnl: number } | null>(null);
  const [tick, setTick] = useState(0);
  const busyRef = useRef(false);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const calRef = useRef(calendar);
  calRef.current = calendar;

  useEffect(() => { setOn(isScanAutoOn()); setConsented(isScanAutoConsented()); }, []);

  const patch = (p: Partial<ScanAutoParams>) => {
    setParams((prev) => { const next = { ...prev, ...p, mode: 'custom' as const }; saveScanAutoParams(next); return next; });
  };
  const applyMode = (name: keyof typeof SCAN_MODES) => {
    setParams((prev) => { const next = { ...prev, ...SCAN_MODES[name], mode: name } as ScanAutoParams; saveScanAutoParams(next); return next; });
  };

  const toggle = () => {
    if (!on && !consented) { setGate(true); return; }
    const next = !on;
    setScanAutoOn(next); setOn(next);
    scanAutoLog('toggle', next ? 'AUTO SCAN ON — engine evaluates every 30s while a Scan Trade window is open' : 'AUTO SCAN OFF — scanning continues, no orders');
    say(next ? 'Auto Scan Trade ON — evaluating every 30s while this window is open.' : 'Auto Scan Trade OFF — signals only.');
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!on || !consented || !accountId || busyRef.current) return;
    const builder = builderRef.current;
    if (!builder) return;
    busyRef.current = true;
    (async () => {
      try {
        const [sum, rows, hist] = await Promise.all([
          orderService.getAccountSummary(accountId) as Promise<{ balance?: number; equity?: number } | null>,
          orderService.getOpenPositions(accountId) as Promise<ScanLivePosition[]>,
          orderService.getTradeHistory(accountId, 80) as Promise<ScanClosedRow[]>,
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const realizedToday = (hist ?? []).filter((r) => (r.closed_at ?? '').slice(0, 10) === today)
          .reduce((a, r) => a + Number(r.realized_pnl ?? 0), 0);
        const mine = scanAutoToday(hist ?? []);
        setTodayStats({ trades: mine.trades, pnl: mine.pnl });

        const decision = evaluateScanAuto({
          builder, positions: rows ?? [], closedToday: hist ?? [], ticks: pricesRef.current,
          calendar: calRef.current, balance: Number(sum?.balance ?? 0), equity: Number(sum?.equity ?? 0),
          realizedToday, isLiveData,
        });

        if (decision.kind === 'halt') {
          setLastNote(decision.note);
          scanAutoLog('halt', decision.note);
          setScanAutoOn(false); setOn(false);
          say(`Auto Scan halted: ${decision.note}`);
          return;
        }
        if (decision.kind === 'none') { setLastNote(decision.note); return; }

        // enter
        await orderService.placeMarketOrder({
          accountId, symbol: decision.opp.symbol, direction: decision.opp.direction,
          size: decision.lots, sl: decision.sl, tp: decision.tp, fillPrice: decision.entry,
          comment: `ScanAuto:${decision.opp.tfLabel}`,
        });
        markEntry();
        scanAutoLog('entry', decision.reason);
        say(`Auto Scan: ${decision.opp.direction} ${decision.lots} ${decision.opp.symbol} @ ${decision.entry.toFixed(5)} (SL/TP attached).`);
        setLastNote(`entered ${decision.opp.symbol} ${decision.opp.tfLabel}`);
        triggerRefresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        scanAutoLog('blocked', `order path refused: ${msg}`);
        setLastNote(`blocked: ${msg}`);
      } finally {
        busyRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, on, consented, accountId]);

  const num = (label: string, key: keyof ScanAutoParams, step = 1) => (
    <label className="flex items-center justify-between gap-2 text-[9px] text-white/55">
      <span>{label}</span>
      <input type="number" step={step} value={params[key] as number}
        onChange={(e) => patch({ [key]: Number(e.target.value) } as Partial<ScanAutoParams>)}
        className="w-20 rounded bg-white/[0.06] px-1.5 py-0.5 text-right font-mono text-[9px] text-white outline-none" />
    </label>
  );

  return (
    <div className="border-b px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <p className="mb-1.5 rounded border px-2 py-1 text-[9px]" style={{ borderColor: 'rgba(77,208,225,0.3)', color: 'rgba(255,255,255,0.5)' }}>
        <b style={{ color: '#4DD0E1' }}>Scan Trade operates independently.</b> EMIL provides advice only and has no trading authority inside this
        module. Auto Hedge has no operational connection here — separate consent, separate limits, separate log. Every automated order passes
        Shield rules, the independent Guardian, and the account-level Risk Governor, and always carries a hard stop.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>⚡ Auto Scan Trade</span>
        <button onClick={toggle}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-bold transition-all hover:brightness-125"
          style={{
            backgroundColor: on ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.05)',
            color: on ? BLUE : 'rgba(255,255,255,0.45)',
            border: `1px solid ${on ? 'rgba(41,171,226,0.5)' : 'rgba(255,255,255,0.15)'}`,
          }}>
          <Power size={12} /> {on ? 'AUTO SCAN ON' : 'AUTO SCAN OFF'}
        </button>
        <span className="text-[9px] text-white/40">
          {on ? `engine: ${lastNote}` : 'scanning continues — opportunities shown, nothing traded'}
          {todayStats ? ` · today: ${todayStats.trades} trade(s), ${todayStats.pnl >= 0 ? '+' : ''}$${todayStats.pnl.toFixed(2)}` : ''}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setShowParams((s) => !s)} className="rounded px-2 py-1 text-[9px] font-bold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {showParams ? 'Hide settings' : 'Risk settings'}
          </button>
          <button onClick={() => setShowLog((s) => !s)} className="rounded px-2 py-1 text-[9px] font-bold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {showLog ? 'Hide log' : `Engine log (${loadScanAutoLog().length})`}
          </button>
          {on && (
            <button onClick={() => { setScanAutoOn(false); setOn(false); scanAutoLog('toggle', 'EMERGENCY: Auto Scan disabled by trader'); say('Auto Scan disabled.'); }}
              className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }}>
              <OctagonX size={11} /> Disable
            </button>
          )}
        </div>
      </div>

      {/* Natural-language command bar */}
      <TradeCommandBar scope="scan" accent={BLUE}
        onApplied={(summary) => { setParams(loadScanAutoParams()); setOn(isScanAutoOn()); say(summary); }} />

      {showParams && (
        <div className="mt-2 grid gap-3 lg:grid-cols-3">
          <div className="rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-white/40">Profit modes</div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(SCAN_MODES) as Array<keyof typeof SCAN_MODES>).map((k) => (
                <button key={k} onClick={() => applyMode(k)}
                  className="rounded px-2 py-0.5 text-[9px] font-bold capitalize transition-all"
                  style={{
                    backgroundColor: params.mode === k ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)',
                    color: params.mode === k ? BLUE : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${params.mode === k ? 'rgba(41,171,226,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {k.replace('-', ' ')}
                </button>
              ))}
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between gap-2 text-[9px] text-white/55">
                <span>Lot sizing</span>
                <span className="flex gap-1">
                  {(['fixed', 'risk'] as const).map((m) => (
                    <button key={m} onClick={() => patch({ lotMode: m })}
                      className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase transition-all"
                      style={{
                        backgroundColor: params.lotMode === m ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)',
                        color: params.lotMode === m ? BLUE : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${params.lotMode === m ? 'rgba(41,171,226,0.45)' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {m === 'fixed' ? 'Fixed lot' : 'Risk %'}
                    </button>
                  ))}
                </span>
              </div>
              {params.lotMode === 'fixed' ? num('Fixed lot (default 0.01)', 'fixedLot', 0.01) : num('Risk % per trade', 'riskPct', 0.25)}
              {num('Max lot per trade (hard cap)', 'maxLotPerTrade', 0.01)}
              {num('Min opportunity score', 'minScore', 5)}
              {num('Min risk:reward', 'minRR', 0.1)}
            </div>
          </div>
          <div className="space-y-1 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/40">Limits & cooldowns</div>
            {num('Max trades per day', 'maxPerDay')}
            {num('Max open engine trades', 'maxOpenTrades')}
            {num('Max per instrument', 'maxPerSymbol')}
            {num('Cooldown between entries (min)', 'cooldownMin', 5)}
            {num('Cooldown after a loss (min)', 'lossCooldownMin', 5)}
            {num('Stop after consecutive losses', 'consecutiveLossStop')}
          </div>
          <div className="space-y-1 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/40">Daily protection</div>
            {num('Daily loss limit $', 'dailyLossLimitUsd', 5)}
            {num('Daily profit lock $ (0 = off)', 'dailyProfitLockUsd', 5)}
            <label className="flex items-center gap-1.5 text-[9px] text-white/55">
              <input type="checkbox" checked={params.newsFilter} onChange={(e) => patch({ newsFilter: e.target.checked })} className="accent-[#29ABE2]" />
              News filter (stand aside near red-flag events)
            </label>
            <div className="text-[9px] text-white/55">Allowed timeframes:</div>
            <div className="flex flex-wrap gap-1">
              {['M1', 'M5', 'M15', 'H1', 'H4', 'D1'].map((tf) => (
                <button key={tf} onClick={() => patch({ allowedTfs: params.allowedTfs.includes(tf) ? params.allowedTfs.filter((x) => x !== tf) : [...params.allowedTfs, tf] })}
                  className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold transition-all"
                  style={{
                    backgroundColor: params.allowedTfs.includes(tf) ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)',
                    color: params.allowedTfs.includes(tf) ? BLUE : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${params.allowedTfs.includes(tf) ? 'rgba(41,171,226,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLog && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)', scrollbarWidth: 'thin' }}>
          {loadScanAutoLog().slice(-30).reverse().map((l, i) => (
            <p key={i} className="mb-0.5 font-mono text-[8px] leading-relaxed text-white/45">
              <span className="text-white/25">{new Date(l.ts).toLocaleTimeString()}</span>{' '}
              <span className="font-bold uppercase" style={{ color: l.kind === 'entry' ? BLUE : l.kind === 'blocked' || l.kind === 'halt' ? '#FF8A65' : 'rgba(255,255,255,0.5)' }}>{l.kind}</span>{' '}
              {l.text}
            </p>
          ))}
          {loadScanAutoLog().length === 0 && <p className="text-[9px] text-white/30">No engine decisions yet.</p>}
        </div>
      )}

      <p className="mt-1.5 text-[8px] leading-relaxed text-white/25">
        Engine positions carry their SL/TP from entry (bracket-managed server-side). If you manually modify or close an engine position, it
        becomes yours — the engine never fights or silently reverses a manual change, and the intervention is visible in the position history.
        Evaluates every 30s while a Scan Trade window is open; server-side 24/7 execution is a future phase and is not claimed before it exists.
      </p>

      {gate && (
        <div className="fixed inset-0 z-[9700] flex items-center justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(3,7,12,0.85)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) setGate(false); }}>
          <div className="my-4 w-full max-w-[560px] rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(41,171,226,0.5)' }}>
            <div className="mb-2 text-[15px] font-bold text-white">Enable Auto Scan Trade</div>
            <p className="mb-2 rounded border px-3 py-2 text-[9px] leading-relaxed" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.05)', color: 'rgba(255,213,120,0.9)' }}>
              {SCAN_AUTO_DISCLAIMER}
            </p>
            <div className="mb-2 rounded border p-2 text-[9px] text-white/55" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              You are confirming these limits: lots <b className="text-white">{params.lotMode === 'fixed' ? `fixed ${params.fixedLot}` : `${params.riskPct}% risk`}</b> (cap {params.maxLotPerTrade}) · max <b className="text-white">{params.maxPerDay}</b>/day ·
              max <b className="text-white">{params.maxOpenTrades}</b> open · daily loss stop <b className="text-white">${params.dailyLossLimitUsd}</b> ·
              stop after <b className="text-white">{params.consecutiveLossStop}</b> straight losses · min score <b className="text-white">{params.minScore}</b>.
              This consent is separate from Auto Hedge — enabling one never enables the other.
            </div>
            <p className="mb-1 text-[10px] text-white/55">Type <b className="text-white">I ACCEPT SCAN RISK</b> to record consent:</p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="I ACCEPT SCAN RISK"
              className="mb-3 w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setGate(false)} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
              <button disabled={typed.trim().toUpperCase() !== 'I ACCEPT SCAN RISK'}
                onClick={() => {
                  recordScanAutoConsent(typed.trim(), params, accountId);
                  scanAutoLog('consent', `Auto Scan consent recorded (risk ${params.riskPct}%, ${params.maxPerDay}/day, daily stop $${params.dailyLossLimitUsd})`);
                  setConsented(true); setGate(false); setTyped('');
                  setScanAutoOn(true); setOn(true);
                  say('Consent recorded — Auto Scan Trade is ON.');
                }}
                className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg,#29ABE2,#1B7FB0)' }}>
                I ACCEPT — enable Auto Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
