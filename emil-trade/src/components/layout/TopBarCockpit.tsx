'use client';

// Top-bar cockpit — fills the empty strip between the symbol search and the
// connection stats with four live readouts, all from the trader's own data:
//   🎯 Discipline Score dial   💓 P&L Heartbeat (session equity sparkline)
//   📋 Session Game Plan pin   💪 Currency Strength ribbon
// The Game Plan is a one-line contract the trader writes for the day; every
// accepted order is checked against it (via the raptor-order-placed event)
// and deviations trigger a big amber warning. Display-only otherwise.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Target, HeartPulse, ClipboardList, X } from 'lucide-react';
import HeaderPortal from '@/components/trading/chart/HeaderPortal';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { loadProtectionSettings } from '@/lib/trading/protection';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import {
  todayTrades, disciplineScore, currencyStrength, loadGamePlan, saveGamePlan, planViolations,
  type ClosedTrade, type DisciplineRead, type StrengthRead, type GamePlan,
} from '@/lib/trading/trader-metrics';

function planWarnToast(text: string): void {
  const div = document.createElement('div');
  div.className = 'fixed left-1/2 top-16 z-[9999] -translate-x-1/2 rounded-lg px-5 py-3 text-[13px] font-bold animate-pulse';
  div.style.cssText = 'background:#0A0F1A;color:#FFB300;border:1px solid rgba(255,179,0,0.7);box-shadow:0 0 24px rgba(255,179,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);text-shadow:0 0 8px rgba(255,179,0,0.8);max-width:90vw;text-align:center;';
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8000);
}

const scoreColor = (s: number) => (s >= 80 ? '#00E5A0' : s >= 60 ? '#FFB300' : '#FF5252');

export default function TopBarCockpit() {
  const accountId = useTradingStore((s) => s.activeAccountId);
  const [disc, setDisc] = useState<DisciplineRead | null>(null);
  const [strength, setStrength] = useState<StrengthRead[]>([]);
  const [plan, setPlan] = useState<GamePlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [popover, setPopover] = useState<{ title: string; lines: string[] } | null>(null);
  // Toggle: clicking the same chip again closes its popover.
  const togglePopover = (next: { title: string; lines: string[] }) =>
    setPopover((prev) => (prev?.title === next.title ? null : next));
  const [equityPath, setEquityPath] = useState<number[]>([]);
  const [realizedToday, setRealizedToday] = useState<number | null>(null);
  const rowsRef = useRef<ClosedTrade[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<GamePlan>({ text: '', symbols: '', direction: 'both', maxTrades: null });

  useEffect(() => { const p = loadGamePlan(); setPlan(p); if (p) setDraft(p); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setPopover(null); setPlanOpen(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // History loop (30s): discipline + realized P&L.
  useEffect(() => {
    if (!accountId) { setDisc(null); setRealizedToday(null); return; }
    let active = true;
    const load = async () => {
      try {
        const rows = (await orderService.getTradeHistory(accountId, 120)) as unknown as ClosedTrade[];
        if (!active || !rows) return;
        rowsRef.current = rows;
        const today = todayTrades(rows);
        const shield = loadProtectionSettings(accountId);
        setDisc(disciplineScore(today, shield.overtradeGovernor.on ? shield.overtradeGovernor.maxPerDay : null));
        setRealizedToday(today.reduce((a, r) => a + Number(r.realized_pnl ?? 0), 0));
      } catch { /* signed-out */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [accountId]);

  // Equity heartbeat: sample the live equity every 20s (session-local path).
  useEffect(() => {
    const id = setInterval(() => {
      const eq = Number(useTradingStore.getState().accountSummary?.equity ?? 0);
      if (eq > 0) setEquityPath((prev) => [...prev.slice(-149), eq]);
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  // Currency strength (60s) from real H1 bars via the NEXUS bar bridge.
  useEffect(() => {
    const compute = () => {
      const builder = getOhlcvBuilder();
      if (!builder) return;
      setStrength(currencyStrength((symbol) => builder.getAllBars(symbol, '60')));
    };
    compute();
    // 15s: cheap (12 pairs × 1 subtraction) and catches the bar seeding
    // finishing shortly after the terminal loads.
    const id = setInterval(compute, 15_000);
    return () => clearInterval(id);
  }, []);

  // Game-plan deviation watch on every accepted order.
  useEffect(() => {
    const onOrder = (e: Event) => {
      const d = (e as CustomEvent<{ symbol: string; direction: string }>).detail;
      const p = loadGamePlan();
      if (!d || !p) return;
      const trades = todayTrades(rowsRef.current).length;
      const v = planViolations(p, d, trades);
      if (v.length) planWarnToast(`📋 PLAN DEVIATION — ${v.join(' · ')}. You wrote the plan for a reason.`);
    };
    window.addEventListener('raptor-order-placed', onOrder);
    return () => window.removeEventListener('raptor-order-placed', onOrder);
  }, []);

  const savePlan = useCallback(() => {
    const p = { ...draft, symbols: draft.symbols.toUpperCase() };
    saveGamePlan(p);
    setPlan(loadGamePlan());
    setPlanOpen(false);
  }, [draft]);

  // Sparkline geometry.
  const spark = (() => {
    if (equityPath.length < 2) return null;
    const min = Math.min(...equityPath), max = Math.max(...equityPath);
    const range = max - min || 1;
    const w = 72, h = 18;
    const pts = equityPath.map((v, i) => `${((i / (equityPath.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
    const up = equityPath[equityPath.length - 1] >= equityPath[0];
    return { pts, up };
  })();

  const chip = 'flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] cursor-pointer transition-all hover:brightness-125';
  // Hidden per owner request (2026-07-20) — flip to true to restore the chip.
  const SHOW_HEARTBEAT: boolean = false;

  return (
    <div className="relative hidden min-w-0 items-center gap-1.5 overflow-x-auto px-2 lg:flex" ref={wrapRef} style={{ scrollbarWidth: 'none' }}>
      {/* 🎯 Discipline Score */}
      {disc && (
        <button className={chip} style={{ backgroundColor: 'rgba(0,229,160,0.07)', border: `1px solid ${scoreColor(disc.score)}44` }}
          onClick={() => togglePopover({ title: '🎯 Discipline Score', lines: [
            `${disc.score}/100 today — computed from your actual closed trades: stop-loss usage, overtrading, tilt signals and revenge patterns.`,
            ...disc.notes,
            'Traders who keep this above 80 keep their accounts. Protect the score like it is P&L — because it becomes P&L.',
          ] })}
          title="Discipline Score — click for the breakdown"
        >
          <Target size={11} style={{ color: scoreColor(disc.score) }} />
          <span style={{ color: scoreColor(disc.score), textShadow: `0 0 6px ${scoreColor(disc.score)}88` }}>{disc.score}</span>
        </button>
      )}

      {/* 💓 P&L Heartbeat — hidden per owner request (2026-07-20); flip
          SHOW_HEARTBEAT to re-enable. All sampling logic stays intact. */}
      {SHOW_HEARTBEAT && (spark || realizedToday != null) && (
        <button className={chip} style={{ backgroundColor: 'rgba(41,171,226,0.06)', border: '1px solid rgba(41,171,226,0.2)' }}
          onClick={() => togglePopover({ title: '💓 P&L Heartbeat', lines: [
            realizedToday != null ? `Realized today: ${realizedToday >= 0 ? '+' : ''}$${realizedToday.toFixed(2)}.` : 'No closed trades yet today.',
            spark ? 'The line is your live equity path this session (sampled every 20s).' : 'The equity sparkline appears a minute after the session starts.',
            'A flat line is not failure — flat is a position. Chasing action to make the line move is how the line goes down.',
          ] })}
          title="Session equity heartbeat — click for detail"
        >
          <HeartPulse size={11} style={{ color: '#29ABE2' }} />
          {spark ? (
            <svg width="72" height="18" className="shrink-0">
              <polyline points={spark.pts} fill="none" stroke={spark.up ? '#00C27A' : '#FF5252'} strokeWidth="1.5" />
            </svg>
          ) : (
            <span style={{ color: (realizedToday ?? 0) >= 0 ? '#00C27A' : '#FF5252' }}>
              {realizedToday != null ? `${realizedToday >= 0 ? '+' : ''}$${realizedToday.toFixed(0)}` : '—'}
            </span>
          )}
        </button>
      )}

      {/* 📋 Session Game Plan */}
      <button className={chip}
        style={{
          backgroundColor: plan ? 'rgba(0,229,160,0.08)' : 'rgba(255,179,0,0.07)',
          border: plan ? '1px solid rgba(0,229,160,0.35)' : '1px solid rgba(255,179,0,0.3)',
        }}
        onClick={() => { setPopover(null); setPlanOpen((o) => !o); }}
        title={plan ? `Today's plan: ${plan.text || '(rules only)'} — click to edit` : 'No game plan for today — click to write one'}
      >
        <ClipboardList size={11} style={{ color: plan ? '#00E5A0' : '#FFB300' }} />
        <span className="max-w-[180px] truncate" style={{ color: plan ? '#00E5A0' : '#FFB300' }}>
          {plan ? (plan.text || 'Plan set') : 'No plan'}
        </span>
      </button>

      {/* 💪 Currency Strength ribbon */}
      {strength.length >= 4 && (
        <button className={chip} style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => togglePopover({ title: '💪 Currency Strength (last 24 H1 bars)', lines: [
            ...strength.map((s, i) => `${i + 1}. ${s.ccy}  ${s.raw >= 0 ? '+' : ''}${s.raw.toFixed(2)}%`),
            'Strongest → weakest, from real platform bars. The cleanest trends pair the top currency against the bottom one.',
          ] })}
          title="Live currency strength ranking — click for the full table"
        >
          {strength.slice(0, 8).map((s, i) => (
            <span key={s.ccy} className="rounded px-0.5 text-[8px] font-bold"
              style={{
                color: i < 2 ? '#00C27A' : i >= strength.length - 2 ? '#FF5252' : 'rgba(255,255,255,0.5)',
              }}>
              {s.ccy}
            </span>
          ))}
        </button>
      )}

      {/* Shared popover — portaled to <body>: the strip scrolls horizontally,
          so an absolutely-positioned child here would be clipped invisible
          (same fix as the shared-header pop-downs). */}
      <HeaderPortal open={!!popover} anchorRef={wrapRef}>
        {popover && (
          <div className="w-[300px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="mb-1.5 text-[12px] font-bold text-white">{popover.title}</div>
            {popover.lines.map((l, i) => <p key={i} className="mb-1 text-[10px] leading-relaxed text-white/60 last:mb-0">{l}</p>)}
          </div>
        )}
      </HeaderPortal>

      {/* Game plan editor — portaled for the same reason */}
      <HeaderPortal open={planOpen} anchorRef={wrapRef}>
        <div className="w-[320px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(0,229,160,0.3)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-bold text-white">📋 Today&apos;s Game Plan</span>
            <button onClick={() => setPlanOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
          <p className="mb-2 text-[9px] leading-relaxed text-white/40">
            One line, written before you trade. It stays pinned all session and every order is checked
            against it — deviations get called out. A plan you must face beats a plan you can forget.
          </p>
          <input value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder='e.g. "EURUSD longs on pullbacks only, quality over quantity"'
            className="mb-2 w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-[9px] text-white/45">Symbols (optional)
              <input value={draft.symbols} onChange={(e) => setDraft({ ...draft, symbols: e.target.value })} placeholder="EURUSD, GBPUSD"
                className="mt-0.5 w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
            </label>
            <label className="text-[9px] text-white/45">Max trades (optional)
              <input type="number" value={draft.maxTrades ?? ''} onChange={(e) => setDraft({ ...draft, maxTrades: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : null })} placeholder="3"
                className="mt-0.5 w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
            </label>
          </div>
          <div className="mb-2 flex gap-1">
            {(['both', 'long', 'short'] as const).map((d) => (
              <button key={d} onClick={() => setDraft({ ...draft, direction: d })}
                className="flex-1 rounded py-1 text-[9px] font-bold uppercase transition-all"
                style={{
                  backgroundColor: draft.direction === d ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.05)',
                  color: draft.direction === d ? '#00E5A0' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${draft.direction === d ? 'rgba(0,229,160,0.5)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {d === 'both' ? 'Long & Short' : d === 'long' ? 'Longs only' : 'Shorts only'}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { saveGamePlan(null); setPlan(null); setPlanOpen(false); }}
              className="rounded px-3 py-1.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Clear
            </button>
            <button onClick={savePlan}
              className="rounded px-4 py-1.5 text-[10px] font-bold text-black"
              style={{ background: 'linear-gradient(180deg, #00E5A0 0%, #00B87F 100%)', boxShadow: '0 0 10px rgba(0,229,160,0.4)' }}>
              Pin the plan
            </button>
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
