'use client';

// Trader chips — eight compact live readouts filling the timeframe bar's free
// space. All computed from REAL platform data (bars, live ticks, the trader's
// own positions and history); nothing simulated. Each chip is click-to-explain:
// a popover describes what the reading means and how to use it.
//
//  ⏳ Bar-close countdown     🚦 Multi-TF regime lights (M15·H1·H4·D1)
//  🌡 Account heat            📏 Spread meter (live vs typical)
//  🔥 Daily range fuse        🏅 Discipline streak (SL on every trade)
//  ⏱ Patience clock           🧲 Round-number radar

import { useCallback, useEffect, useRef, useState } from 'react';
import HeaderPortal from './HeaderPortal';
import { useTradingStore } from '@/stores/trading';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { TF_TO_RESOLUTION, RESOLUTION_MS, type OHLCVBuilder, type Resolution } from '@/lib/trading/ohlcv-builder';
import { getInstrumentSpecs, valuePerUnitPerLot, type InstrumentSpec } from '@/lib/insights/risk';
import { getPipSize } from '@/lib/trading/ticket-math';
import { orderService } from '@/lib/trading/order-service';
import { symbolCurrencies } from '@/lib/trading/protection';
import { getCalendar, nextHighImpact, upcomingHighImpact, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';

const REGIME_TFS: { label: string; res: Resolution }[] = [
  { label: 'M15', res: '15' }, { label: 'H1', res: '60' }, { label: 'H4', res: '240' }, { label: 'D1', res: '1D' },
];

type RegimeDot = { label: string; state: string | null };

interface ChipInfo { title: string; body: string[] }

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 86_400) return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`;
  if (s >= 3_600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function dotColor(state: string | null): string {
  if (!state) return 'rgba(255,255,255,0.2)';
  if (state.includes('Uptrend')) return '#00C27A';
  if (state.includes('Downtrend')) return '#FF5252';
  return '#FFB300';
}

export default function TraderChips({ ohlcvBuilder }: { ohlcvBuilder: OHLCVBuilder | null }) {
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const activeTimeframe = useTradingStore((s) => s.activeTimeframe);
  const accountId = useTradingStore((s) => s.activeAccountId);

  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  const [now, setNow] = useState(0);                       // 1s tick (countdown/spread/radar)
  const [regimes, setRegimes] = useState<RegimeDot[]>([]);
  const [heat, setHeat] = useState<{ pct: number | null; unbounded: number } | null>(null);
  const [rangeUsed, setRangeUsed] = useState<number | null>(null);
  const [discipline, setDiscipline] = useState<number | null>(null);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [patience, setPatience] = useState<{ sinceMin: number | null; avgMin: number | null }>({ sinceMin: null, avgMin: null });
  const [info, setInfo] = useState<ChipInfo | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<Record<string, InstrumentSpec> | null>(null);
  const spreadHistRef = useRef<Record<string, number[]>>({});

  useEffect(() => { getInstrumentSpecs().then((s) => { specsRef.current = s; }).catch(() => {}); }, []);

  // 1-second heartbeat for the fast chips.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Economic calendar (10-min client cache inside getCalendar).
  useEffect(() => {
    let active = true;
    const load = () => getCalendar().then((ev) => { if (active) setCalendar(ev); });
    load();
    const id = setInterval(load, 10 * 60_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setInfo(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Slow loop (10s): regime lights + range fuse + account heat.
  useEffect(() => {
    const compute = () => {
      const builder = builderRef.current;
      if (builder) {
        setRegimes(REGIME_TFS.map((tf) => ({
          label: tf.label,
          state: classifyMarketState(builder.getAllBars(activeSymbol, tf.res))?.state ?? null,
        })));
        const daily = builder.getAllBars(activeSymbol, '1D');
        if (daily.length >= 6) {
          const today = daily[daily.length - 1];
          const prev = daily.slice(-21, -1).map((b) => b.high - b.low).filter((r) => r > 0).sort((a, b) => a - b);
          const median = prev[Math.floor(prev.length / 2)];
          if (median > 0) setRangeUsed(Math.round(((today.high - today.low) / median) * 100));
        } else setRangeUsed(null);
      }
      // Account heat from the store's live positions + summary.
      const { positions, accountSummary } = useTradingStore.getState();
      const specs = specsRef.current;
      const equity = Number(accountSummary?.equity ?? 0);
      if (specs && equity > 0 && positions.length) {
        let risk = 0; let unbounded = 0;
        for (const p of positions) {
          if (p.status !== 'open') continue;
          if (p.sl == null || p.sl === 0) { unbounded++; continue; }
          const spec = specs[p.symbol];
          if (!spec) continue;
          const cur = Number(p.current_price ?? p.open_price);
          const lossToSl = (p.direction === 'BUY' ? cur - p.sl : p.sl - cur) * p.size * valuePerUnitPerLot(spec);
          if (lossToSl > 0) risk += lossToSl;
        }
        setHeat({ pct: (risk / equity) * 100, unbounded });
      } else {
        setHeat(positions.some((p) => p.status === 'open') ? { pct: null, unbounded: positions.filter((p) => p.status === 'open' && (p.sl == null || p.sl === 0)).length } : null);
      }
    };
    compute();
    const id = setInterval(compute, 10_000);
    return () => clearInterval(id);
  }, [activeSymbol]);

  // Slowest loop (60s): discipline streak + patience clock from real history.
  useEffect(() => {
    if (!accountId) { setDiscipline(null); setPatience({ sinceMin: null, avgMin: null }); return; }
    let active = true;
    const compute = async () => {
      try {
        const rows = (await orderService.getTradeHistory(accountId, 120)) as Array<{ sl: number | null; opened_at: string; closed_at: string | null; realized_pnl: number | null }>;
        if (!active || !rows) return;
        // Discipline: consecutive calendar days (back from the most recent
        // trading day) where every closed trade carried a stop loss.
        const byDay = new Map<string, { allSl: boolean; pnl: number; opens: number[] }>();
        for (const r of rows) {
          const day = (r.closed_at ?? r.opened_at).slice(0, 10);
          const d = byDay.get(day) ?? { allSl: true, pnl: 0, opens: [] };
          if (r.sl == null || r.sl === 0) d.allSl = false;
          d.pnl += Number(r.realized_pnl ?? 0);
          d.opens.push(new Date(r.opened_at).getTime());
          byDay.set(day, d);
        }
        const days = [...byDay.keys()].sort().reverse();
        let streak = 0;
        for (const day of days) { if (byDay.get(day)!.allSl) streak++; else break; }
        setDiscipline(days.length ? streak : null);
        // Patience: time since the latest open vs winning days' average gap.
        const lastOpen = rows.length ? Math.max(...rows.map((r) => new Date(r.opened_at).getTime())) : null;
        const gaps: number[] = [];
        for (const d of byDay.values()) {
          if (d.pnl <= 0 || d.opens.length < 2) continue;
          const sorted = [...d.opens].sort((a, b) => a - b);
          for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
        }
        setPatience({
          sinceMin: lastOpen ? Math.round((Date.now() - lastOpen) / 60_000) : null,
          avgMin: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length / 60_000) : null,
        });
      } catch { /* signed-out — chips simply stay neutral */ }
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => { active = false; clearInterval(id); };
  }, [accountId]);

  // ── Fast-derived values (recomputed on the 1s heartbeat render) ──
  const resolution: Resolution = TF_TO_RESOLUTION[activeTimeframe] ?? '60';
  const resMs = RESOLUTION_MS[resolution];
  const countdown = resMs ? fmtCountdown(resMs - ((now || Date.now()) % resMs)) : '—';

  const tick = useTradingStore.getState().prices[activeSymbol];
  const pip = getPipSize(activeSymbol);
  let spreadPips: number | null = null;
  let spreadRatio: number | null = null;
  if (tick?.bid != null && tick?.ask != null) {
    spreadPips = (tick.ask - tick.bid) / pip;
    const hist = (spreadHistRef.current[activeSymbol] ??= []);
    hist.push(spreadPips);
    if (hist.length > 240) hist.shift();
    const sorted = [...hist].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) spreadRatio = spreadPips / median;
  }

  let radar: { dist: number; level: number } | null = null;
  if (tick?.bid != null && tick?.ask != null) {
    const mid = (tick.bid + tick.ask) / 2;
    const step = 50 * pip; // 50-pip psychological grid
    const level = Math.round(mid / step) * step;
    radar = { dist: Math.abs(mid - level) / pip, level };
  }

  const heatColor = heat?.pct == null ? 'rgba(255,255,255,0.4)' : heat.pct < 3 ? '#00C27A' : heat.pct < 6 ? '#FFB300' : '#FF5252';
  const fuseColor = rangeUsed == null ? 'rgba(255,255,255,0.4)' : rangeUsed < 60 ? '#00C27A' : rangeUsed < 90 ? '#FFB300' : '#FF5252';
  const spreadColor = spreadRatio == null ? 'rgba(255,255,255,0.4)' : spreadRatio <= 1.3 ? '#00C27A' : spreadRatio <= 2 ? '#FFB300' : '#FF5252';

  const chip = 'flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] transition-all hover:brightness-125';
  const chipStyle = (rgb: string): React.CSSProperties => ({
    backgroundColor: `rgba(${rgb},0.08)`,
    border: `1px solid rgba(${rgb},0.22)`,
  });

  // Toggle: clicking the same chip again closes its popover.
  const show = useCallback((title: string, body: string[]) => setInfo((prev) => (prev?.title === title ? null : { title, body })), []);

  return (
    <div className="flex items-center gap-1" ref={anchorRef}>
      {/* ⏳ Bar-close countdown */}
      <button className={chip} style={chipStyle('41,171,226')}
        onClick={() => show('⏳ Bar-close countdown', [
          `Time until the current ${activeTimeframe} bar closes.`,
          'Signals and regimes confirm on CLOSED bars — entering mid-bar acts on a candle that may still change. Waiting out the countdown is cheap discipline.',
        ])}
        title="Bar-close countdown — click to learn more">
        <span style={{ color: '#29ABE2' }}>⏳ {countdown}</span>
      </button>

      {/* 🚦 Multi-TF regime lights */}
      <button className={chip} style={chipStyle('255,255,255')}
        onClick={() => show('🚦 Multi-timeframe regime', regimes.length
          ? [...regimes.map((r) => `${r.label}: ${r.state ?? 'collecting bars…'}`),
             'Green = uptrend · Red = downtrend · Amber = range/chop. When timeframes disagree (e.g. H1 long, D1 strong down), trend trades carry extra risk.']
          : ['Collecting bar history…'])}
        title="M15 · H1 · H4 · D1 regime lights — click for detail">
        {(regimes.length ? regimes : REGIME_TFS.map((t) => ({ label: t.label, state: null }))).map((r) => (
          <span key={r.label} className="flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor(r.state), boxShadow: r.state ? `0 0 4px ${dotColor(r.state)}` : 'none' }} />
          </span>
        ))}
        <span className="text-white/35">TFs</span>
      </button>

      {/* 🌡 Account heat */}
      {heat && (
        <button className={chip} style={chipStyle('255,82,82')}
          onClick={() => show('🌡 Account heat', [
            heat.pct != null ? `If every stop loss is hit right now, you lose ~${heat.pct.toFixed(1)}% of equity.` : 'Equity unknown — select an account.',
            heat.unbounded > 0 ? `⚠ ${heat.unbounded} open position(s) have NO stop loss — their downside is unbounded and not counted here.` : 'Every open position has a stop loss. Good.',
            'Professionals keep total heat under ~5%. Above that, one bad session can force emotional decisions.',
          ])}
          title="Total % of equity at risk across all stop losses — click for detail">
          <span style={{ color: heatColor }}>🌡 {heat.pct != null ? `${heat.pct.toFixed(1)}%` : '—'}{heat.unbounded > 0 ? ' ∞' : ''}</span>
        </button>
      )}

      {/* 📏 Spread meter */}
      <button className={chip} style={chipStyle('0,191,165')}
        onClick={() => show('📏 Spread meter', [
          spreadPips != null ? `${activeSymbol} spread: ${spreadPips.toFixed(1)} pips${spreadRatio != null ? ` (${spreadRatio.toFixed(1)}× its typical level this session)` : ''}.` : 'Waiting for live prices…',
          'Green = tight, amber = elevated, red = abnormally wide (news, rollover). A wide spread is a hidden fee on entry AND exit — patience here is pure saved money.',
        ])}
        title="Live spread vs typical — click for detail">
        <span style={{ color: spreadColor }}>📏 {spreadPips != null ? spreadPips.toFixed(1) : '—'}p</span>
      </button>

      {/* 🔥 Daily range fuse */}
      <button className={chip} style={chipStyle('255,112,67')}
        onClick={() => show('🔥 Daily range fuse', [
          rangeUsed != null ? `Today ${activeSymbol} has already covered ~${rangeUsed}% of its typical daily range.` : 'Needs a few daily bars of history…',
          'Past ~90%, the day\'s move is statistically mostly done — chasing a late breakout is buying what\'s left of a burnt fuse. Early in the fuse, moves have more room to run.',
        ])}
        title="% of the typical daily range already used — click for detail">
        <span style={{ color: fuseColor }}>🔥 {rangeUsed != null ? `${Math.min(rangeUsed, 999)}%` : '—'}</span>
      </button>

      {/* 🏅 Discipline streak */}
      {discipline != null && (
        <button className={chip} style={chipStyle('0,229,160')}
          onClick={() => show('🏅 Discipline streak', [
            `${discipline} consecutive trading day(s) where every closed trade carried a stop loss.`,
            'The streak resets on any trade closed without an SL. Consistency in the boring things is what actually compounds — protect the streak.',
          ])}
          title="Days in a row with an SL on every trade — click for detail">
          <span style={{ color: '#00E5A0' }}>🏅 {discipline}d</span>
        </button>
      )}

      {/* ⏱ Patience clock */}
      {patience.sinceMin != null && (
        <button className={chip} style={chipStyle('171,71,188')}
          onClick={() => show('⏱ Patience clock', [
            `${patience.sinceMin} min since your last trade.`,
            patience.avgMin != null
              ? `On your PROFITABLE days, trades average ${patience.avgMin} min apart. Firing much faster than that is historically how your green days turn red.`
              : 'Once you have a few profitable multi-trade days, this shows your winning pace to compare against.',
          ])}
          title="Time since last trade vs your winning-day pace — click for detail">
          <span style={{ color: '#CE93D8' }}>⏱ {patience.sinceMin}m{patience.avgMin != null ? `/${patience.avgMin}m` : ''}</span>
        </button>
      )}

      {/* 📅 News radar — next high-impact event for this symbol's currencies */}
      {(() => {
        const ccys = symbolCurrencies(activeSymbol);
        const next = nextHighImpact(ccys, calendar);
        if (!next) return null;
        const minsAway = (next.timeMs - (now || Date.now())) / 60_000;
        const color = minsAway <= 15 ? '#FF5252' : minsAway <= 60 ? '#FFB300' : 'rgba(255,255,255,0.55)';
        return (
          <button className={`${chip} ${minsAway <= 15 ? 'animate-pulse' : ''}`} style={chipStyle('255,112,67')}
            onClick={() => show('📅 News radar — high-impact events', [
              ...upcomingHighImpact(ccys, calendar).slice(0, 6).map((e) =>
                `${e.currency} · ${e.title} — ${fmtEta(e.timeMs)}${e.forecast ? ` (fcst ${e.forecast}, prev ${e.previous})` : ''}`),
              'Red-flag releases blow out spreads and slip stops. Entering minutes before one is a coin flip with worse odds — the Shield "News guard" rule can block it automatically.',
            ])}
            title={`Next high-impact: ${next.currency} ${next.title} in ${fmtEta(next.timeMs)} — click for the list`}>
            <span style={{ color, textShadow: minsAway <= 60 ? `0 0 6px ${color}` : 'none' }}>
              📅 {next.currency} {fmtEta(next.timeMs)}
            </span>
          </button>
        );
      })()}

      {/* 🧲 Round-number radar */}
      <button className={chip} style={chipStyle('255,179,0')}
        onClick={() => show('🧲 Round-number radar', [
          radar ? `${radar.dist.toFixed(0)} pips from ${radar.level.toFixed(pip < 0.01 ? 4 : 2)} — the nearest 50-pip psychological level.` : 'Waiting for live prices…',
          'Stops and orders cluster at round numbers, so price often stalls, wicks or reverses there. Placing YOUR stop exactly on one puts it where everyone else\'s is hunted.',
        ])}
        title="Distance to the nearest psychological level — click for detail">
        <span style={{ color: radar && radar.dist < 10 ? '#FFB300' : 'rgba(255,179,0,0.75)' }}>🧲 {radar ? `${radar.dist.toFixed(0)}p` : '—'}</span>
      </button>

      {/* Shared explainer popover */}
      <HeaderPortal open={!!info} anchorRef={anchorRef}>
        {info && (
          <div className="w-[300px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="mb-1.5 text-[12px] font-bold text-white">{info.title}</div>
            {info.body.map((line, i) => (
              <p key={i} className="mb-1.5 text-[10px] leading-relaxed text-white/60 last:mb-0">{line}</p>
            ))}
            <p className="mt-2 border-t pt-1.5 text-[8px] text-white/25" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              Computed from real platform data · informational, not advice
            </p>
          </div>
        )}
      </HeaderPortal>
    </div>
  );
}
