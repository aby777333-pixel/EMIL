'use client';

// Edge chips — the timeframe bar's middle strip. Personal performance
// intelligence computed from the trader's OWN closed trades + real bars:
//   ⚡ Edge Meter        🎓 Trade Grade (instant post-close report card)
//   🧠 Exit IQ           🌡️ Tilt-O-Meter
//   🆓 Free-Trade prompt 🎲 Confidence Calibration
// Each chip is click-to-explain. History-based chips hide until an account
// with closed trades is active. Display-only except the Free-Trade prompt,
// which (on the trader's click) moves a stop loss to break-even via the
// real modify RPC.

import { useCallback, useEffect, useRef, useState } from 'react';
import HeaderPortal from './HeaderPortal';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import {
  todayTrades, edgeMeter, gradeTrade, gradeLetterColor, exitIQ, tiltScore,
  type ClosedTrade, type EdgeRead, type TiltRead, type TradeGrade,
} from '@/lib/trading/trader-metrics';

const CAL_PENDING = 'raptor_conviction_pending';
const CAL_STATS = 'raptor_conviction_stats';

interface CalStats { [bucket: string]: { n: number; wins: number } }

function gradeToast(symbol: string, pnl: number, grade: TradeGrade): void {
  const color = gradeLetterColor(grade.letter);
  const div = document.createElement('div');
  div.className = 'fixed left-1/2 top-16 z-[9999] -translate-x-1/2 rounded-lg px-5 py-3 text-[12px] font-semibold';
  div.style.cssText = `background:#0A0F1A;color:rgba(255,255,255,0.85);border:1px solid ${color};box-shadow:0 0 20px ${color}66, inset 0 1px 0 rgba(255,255,255,0.12);max-width:90vw;text-align:center;`;
  div.innerHTML = `<span style="color:${color};font-weight:800;text-shadow:0 0 8px ${color}">Grade ${grade.letter}</span> — ${symbol} closed ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} · ${grade.notes[0]}`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8000);
}

export default function EdgeChips({ ohlcvBuilder }: { ohlcvBuilder: OHLCVBuilder | null }) {
  const accountId = useTradingStore((s) => s.activeAccountId);
  const [edge, setEdge] = useState<EdgeRead | null>(null);
  const [tilt, setTilt] = useState<TiltRead | null>(null);
  const [sessionGrades, setSessionGrades] = useState<{ letter: string; score: number }[]>([]);
  const [exitIq, setExitIq] = useState<number | null>(null);
  const [freeCandidates, setFreeCandidates] = useState<{ id: string; symbol: string; open: number }[]>([]);
  const [cal, setCal] = useState<CalStats>({});
  const [info, setInfo] = useState<{ title: string; lines: string[] } | null>(null);
  // Toggle: clicking the same chip again closes its popover.
  const toggleInfo = (next: { title: string; lines: string[] }) =>
    setInfo((prev) => (prev?.title === next.title ? null : next));
  const anchorRef = useRef<HTMLDivElement>(null);
  const lastClosedRef = useRef<number | null>(null);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  useEffect(() => {
    try { setCal(JSON.parse(localStorage.getItem(CAL_STATS) || '{}')); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setInfo(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Record conviction tags fired by QuickTrade at order time.
  useEffect(() => {
    const onTag = (e: Event) => {
      const d = (e as CustomEvent<{ symbol: string; direction: string; conviction: number; ts: number }>).detail;
      if (!d?.conviction) return;
      try {
        const pending = JSON.parse(localStorage.getItem(CAL_PENDING) || '[]') as unknown[];
        pending.push(d);
        localStorage.setItem(CAL_PENDING, JSON.stringify(pending.slice(-20)));
      } catch { /* ignore */ }
    };
    window.addEventListener('raptor-conviction', onTag);
    return () => window.removeEventListener('raptor-conviction', onTag);
  }, []);

  // Main loop (15s): history metrics + new-close detection (grades, calibration).
  useEffect(() => {
    if (!accountId) { setEdge(null); setTilt(null); setSessionGrades([]); setExitIq(null); return; }
    let active = true;
    const load = async () => {
      try {
        const rows = (await orderService.getTradeHistory(accountId, 60)) as unknown as ClosedTrade[];
        if (!active || !rows) return;
        setEdge(edgeMeter(rows));
        const today = todayTrades(rows);
        setTilt(today.length ? tiltScore(today) : null);

        // Exit IQ rolling average over the last 20 computable trades.
        const builder = builderRef.current;
        if (builder) {
          const iqs = rows.slice(0, 20)
            .map((r) => exitIQ(r, builder.getAllBars(r.symbol, '5')))
            .filter((v): v is number => v != null);
          setExitIq(iqs.length >= 3 ? iqs.reduce((a, b) => a + b, 0) / iqs.length : null);
        }

        // Detect newly-closed trades → instant grade toast + calibration match.
        const newestClosed = rows.length ? new Date(rows[0].closed_at ?? rows[0].opened_at).getTime() : null;
        if (lastClosedRef.current != null && newestClosed != null && newestClosed > lastClosedRef.current) {
          const fresh = rows.filter((r) => new Date(r.closed_at ?? r.opened_at).getTime() > lastClosedRef.current!).reverse();
          for (const t of fresh) {
            const idx = rows.indexOf(t);
            const prev = idx >= 0 && idx + 1 < rows.length ? rows[idx + 1] : null;
            const bars60 = builder ? builder.getAllBars(t.symbol, '60') : [];
            const g = gradeTrade(t, bars60, prev);
            gradeToast(t.symbol, Number(t.realized_pnl ?? 0), g);
            setSessionGrades((prevG) => [...prevG.slice(-19), { letter: g.letter, score: g.score }]);
            // Calibration: match the oldest pending tag for this symbol+direction.
            try {
              const pending = JSON.parse(localStorage.getItem(CAL_PENDING) || '[]') as { symbol: string; direction: string; conviction: number; ts: number }[];
              const i = pending.findIndex((p) => p.symbol === t.symbol && p.direction.toUpperCase() === t.direction.toUpperCase() && Math.abs(new Date(t.opened_at).getTime() - p.ts) < 3 * 60_000);
              if (i >= 0) {
                const [tag] = pending.splice(i, 1);
                localStorage.setItem(CAL_PENDING, JSON.stringify(pending));
                const stats = JSON.parse(localStorage.getItem(CAL_STATS) || '{}') as CalStats;
                const b = (stats[String(tag.conviction)] ??= { n: 0, wins: 0 });
                b.n += 1;
                if (Number(t.realized_pnl ?? 0) > 0) b.wins += 1;
                localStorage.setItem(CAL_STATS, JSON.stringify(stats));
                setCal(stats);
              }
            } catch { /* ignore */ }
          }
        }
        if (newestClosed != null) lastClosedRef.current = newestClosed;
      } catch { /* signed-out */ }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { active = false; clearInterval(id); };
  }, [accountId]);

  // Free-trade watch (5s): open positions ≥ +1R with SL not yet at break-even.
  useEffect(() => {
    const id = setInterval(() => {
      const { positions, prices } = useTradingStore.getState();
      const out: { id: string; symbol: string; open: number }[] = [];
      for (const p of positions) {
        if (p.status !== 'open' || p.sl == null || p.sl === 0) continue;
        const dir = p.direction === 'BUY' ? 1 : -1;
        const risk = (Number(p.open_price) - Number(p.sl)) * dir; // positive when SL is protective
        if (risk <= 0) continue; // SL already at/beyond break-even
        const t = prices[p.symbol];
        const cur = dir > 0 ? (t?.bid ?? Number(p.current_price)) : (t?.ask ?? Number(p.current_price));
        if (cur == null) continue;
        const move = (Number(cur) - Number(p.open_price)) * dir;
        if (move >= risk) out.push({ id: p.id, symbol: p.symbol, open: Number(p.open_price) });
      }
      setFreeCandidates(out);
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  const makeFree = useCallback(async () => {
    for (const c of freeCandidates) {
      try { await orderService.modifyPosition(c.id, c.open); } catch { /* may have closed */ }
    }
    setFreeCandidates([]);
    setInfo(null);
    useTradingStore.getState().triggerRefresh();
  }, [freeCandidates]);

  const avgGrade = sessionGrades.length
    ? sessionGrades.reduce((a, g) => a + g.score, 0) / sessionGrades.length : null;
  const avgLetter = avgGrade == null ? null : avgGrade >= 90 ? 'A' : avgGrade >= 75 ? 'B' : avgGrade >= 60 ? 'C' : avgGrade >= 45 ? 'D' : 'F';

  const bestBucket = Object.entries(cal).sort((a, b) => b[1].n - a[1].n)[0] ?? null;

  const tiltColor = tilt?.level === 'HIGH' ? '#FF5252' : tilt?.level === 'ELEVATED' ? '#FFB300' : '#00C27A';
  const chip = 'flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] transition-all hover:brightness-125';
  const cs = (rgb: string): React.CSSProperties => ({ backgroundColor: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.22)` });

  return (
    <div className="flex items-center gap-1" ref={anchorRef}>
      {/* ⚡ Edge Meter */}
      {edge && (
        <button className={chip} style={cs('0,180,216')}
          onClick={() => toggleInfo({ title: '⚡ Edge Meter — your personal expectancy', lines: [
            `Last ${edge.n} closed trades: ${edge.avgPnl >= 0 ? '+' : ''}$${edge.avgPnl.toFixed(2)} per trade · ${edge.winRate.toFixed(0)}% win rate.`,
            edge.avgPnl >= 0
              ? 'Your process has a positive edge right now. The job is to repeat it, not to improve it mid-session.'
              : 'Your recent trades have negative expectancy — smaller size and fewer trades until the number turns green is the professional response.',
          ] })}
          title="Your rolling expectancy — click for detail">
          <span style={{ color: edge.avgPnl >= 0 ? '#00E5A0' : '#FF5252' }}>⚡ {edge.avgPnl >= 0 ? '+' : ''}${edge.avgPnl.toFixed(0)}/t</span>
        </button>
      )}

      {/* 🎓 Trade Grade */}
      {avgLetter && (
        <button className={chip} style={cs('156,204,101')}
          onClick={() => toggleInfo({ title: '🎓 Trade Grades — this session', lines: [
            `Session average: ${avgLetter} (${avgGrade!.toFixed(0)}/100) over ${sessionGrades.length} graded close(s).`,
            `Recent: ${sessionGrades.slice(-8).map((g) => g.letter).join(' · ')}`,
            'Every close is graded instantly on: stop loss, planned R:R, trend alignment, chasing and revenge timing. Grade the process — the P&L follows.',
          ] })}
          title="Session trade grades — click for detail">
          <span style={{ color: gradeLetterColor(avgLetter) }}>🎓 {avgLetter}</span>
        </button>
      )}

      {/* 🧠 Exit IQ */}
      {exitIq != null && (
        <button className={chip} style={cs('124,111,255')}
          onClick={() => toggleInfo({ title: '🧠 Exit IQ', lines: [
            `You are capturing ~${exitIq.toFixed(0)}% of the favorable move available around your trades (last 20 closes, measured on M5 bars to 1h after each exit).`,
            exitIq >= 70 ? 'Strong exits — you take what the market offers.' : exitIq >= 45 ? 'Decent, but a meaningful slice is being left on the table — partial exits + trailing the rest usually lifts this.' : 'Exits are cutting winners early — consider the Take-Profit ladder: bank a third, trail the rest.',
          ] })}
          title="How much of the available move your exits capture — click for detail">
          <span style={{ color: '#9C8CFF' }}>🧠 {exitIq.toFixed(0)}%</span>
        </button>
      )}

      {/* 🌡️ Tilt-O-Meter */}
      {tilt && (
        <button className={`${chip} ${tilt.level === 'HIGH' ? 'animate-pulse' : ''}`} style={cs('255,82,82')}
          onClick={() => toggleInfo({ title: '🌡️ Tilt-O-Meter', lines: [
            `Current read: ${tilt.level}.`,
            ...tilt.reasons.map((r) => `· ${r}`),
            'Tilt is invisible from the inside — that is the whole problem. When this reads HIGH, the highest-expectancy action available is a 15-minute walk.',
          ] })}
          title="Behavioral tilt risk — click for detail">
          <span style={{ color: tiltColor, textShadow: tilt.level !== 'CALM' ? `0 0 6px ${tiltColor}` : 'none' }}>🌡 {tilt.level}</span>
        </button>
      )}

      {/* 🆓 Free-Trade prompt */}
      {freeCandidates.length > 0 && (
        <button className={`${chip} animate-pulse`} style={{ backgroundColor: 'rgba(0,229,160,0.15)', border: '1px solid rgba(0,229,160,0.6)', boxShadow: '0 0 10px rgba(0,229,160,0.4)' }}
          onClick={() => toggleInfo({ title: '🆓 Make it a free trade', lines: [
            `${freeCandidates.length} position(s) are ≥ +1R in profit: ${freeCandidates.map((c) => c.symbol).join(', ')}.`,
            'Moving the stop to break-even now removes ALL remaining risk — the trade cannot lose anymore, only win less. One click below does it for every candidate.',
            '▶ Click "MAKE FREE" to move those stops to break-even.',
          ] })}
          title="Positions at +1R — one click moves stops to break-even">
          <span style={{ color: '#00E5A0', textShadow: '0 0 6px rgba(0,229,160,0.8)' }}>🆓 {freeCandidates.length}</span>
        </button>
      )}

      {/* 🎲 Confidence Calibration */}
      <button className={chip} style={cs('255,179,0')}
        onClick={() => toggleInfo({ title: '🎲 Confidence Calibration', lines: [
          bestBucket
            ? `When you tag a trade "${bestBucket[0]}% sure", you actually win ${bestBucket[1].n ? Math.round((bestBucket[1].wins / bestBucket[1].n) * 100) : 0}% of the time (${bestBucket[1].wins}/${bestBucket[1].n}).`
            : 'Tag your next QuickTrade with a conviction level (the "Sure?" selector) and the platform will start comparing what you BELIEVE with what actually HAPPENS.',
          ...Object.entries(cal).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `@${k}%: real ${v.n ? Math.round((v.wins / v.n) * 100) : 0}% (${v.wins}/${v.n})`),
          'Overconfidence is measurable — and once measured, fixable. Well-calibrated traders size correctly by instinct.',
        ] })}
        title="Your stated confidence vs reality — click for detail">
        <span style={{ color: '#FFB300' }}>🎲 {bestBucket ? `${bestBucket[0]}%→${bestBucket[1].n ? Math.round((bestBucket[1].wins / bestBucket[1].n) * 100) : 0}%` : '—'}</span>
      </button>

      {/* Shared popover */}
      <HeaderPortal open={!!info} anchorRef={anchorRef}>
        {info && (
          <div className="w-[310px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="mb-1.5 text-[12px] font-bold text-white">{info.title}</div>
            {info.lines.map((l, i) => <p key={i} className="mb-1.5 text-[10px] leading-relaxed text-white/60 last:mb-0">{l}</p>)}
            {info.title.startsWith('🆓') && (
              <button onClick={makeFree}
                className="mt-1 w-full rounded py-2 text-[11px] font-bold text-black transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(180deg, #00E5A0 0%, #00B87F 100%)', boxShadow: '0 0 12px rgba(0,229,160,0.5)' }}>
                MAKE FREE — stops to break-even
              </button>
            )}
            <p className="mt-2 border-t pt-1.5 text-[8px] text-white/25" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              Computed from your own trades · informational, not advice
            </p>
          </div>
        )}
      </HeaderPortal>
    </div>
  );
}
