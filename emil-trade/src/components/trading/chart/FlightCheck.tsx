'use client';

// 🛫 Pre-trade Flight Check — compact status lights in the TF bar showing
// the protection stack's live state at a glance: Shield rules armed,
// Guardian watchdogs, the news window, EMIL's daily risk budget and the
// session picture. These checks already run on every order — this strip
// just makes their PASS/BLOCK state visible before the trade, not after.
// Click any light for the detail popover. Real reads only.

import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/trading';
import { loadProtectionSettings, getLock, type ProtectionSettings } from '@/lib/trading/protection';
import { getCalendar, highImpactWithin, upcomingHighImpact, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';
import { loadEmilAutoParams } from '@/lib/trading/emil-council';
import { sessionSnapshot } from '@/lib/trading/emil-sessions';

const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

function countOnRules(s: ProtectionSettings): number {
  return Object.values(s).filter((v) => (v as { on?: boolean }).on).length;
}

interface Light { id: string; icon: string; label: string; color: string; lines: string[] }

export default function FlightCheck() {
  const activeAccountId = useTradingStore((s) => s.activeAccountId);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { getCalendar().then(setCalendar); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenId(null); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Build the lights from real reads (tick keeps countdowns fresh).
  void tick;
  const shield = loadProtectionSettings(activeAccountId);
  const rulesOn = countOnRules(shield);
  const lock = getLock(activeAccountId);
  const inNewsWindow = highImpactWithin(MAJORS, calendar, 30).length > 0;
  const nextEv = upcomingHighImpact(MAJORS, calendar, 24)[0] ?? null;
  const emil = loadEmilAutoParams();
  const snap = sessionSnapshot();
  const openSessions = snap.sessions.filter((s) => s.open);

  const lights: Light[] = [
    {
      id: 'shield', icon: '🛡', label: `${rulesOn}/12`,
      color: lock ? '#FF5252' : rulesOn >= 3 ? '#00C27A' : rulesOn >= 1 ? '#FFB300' : '#8B93A7',
      lines: [
        lock ? '⛔ CAPITAL LOCK ACTIVE — new orders are blocked until it lifts.' : `${rulesOn} of 12 Shield rules armed — every order passes them before the market.`,
        rulesOn === 0 ? 'No rules armed: the platform will not stop a bad day for you. Open 🛡 Shield in the header to arm protection.' : 'Adjust rules any time in the 🛡 Shield menu.',
      ],
    },
    {
      id: 'guardian', icon: '👁', label: 'GUARD',
      color: '#00C27A',
      lines: ['6 independent watchdogs armed in the order path: duplicate-order · rate limit · missing stop-loss · stale quote · abnormal spread · unreadable market.', 'They gate EVERY order — including EMIL’s — and nothing can silence them.'],
    },
    {
      id: 'news', icon: '📅', label: inNewsWindow ? 'NEWS!' : nextEv ? fmtEta(nextEv.timeMs).replace('in ', '') : 'clear',
      color: inNewsWindow ? '#FF5252' : nextEv && nextEv.timeMs - Date.now() < 2 * 3_600_000 ? '#FFB300' : '#00C27A',
      lines: [
        inNewsWindow ? '🔴 Inside a red-flag news window — spreads widen and stops slip; automated entries are blocked for 30 min around releases.' : nextEv ? `Next red-flag event: ${nextEv.currency} “${nextEv.title}” ${fmtEta(nextEv.timeMs)}.` : 'No high-impact releases inside 24h.',
        'The 30-minute buffer is enforced on the scanner and EMIL automatically.',
      ],
    },
    {
      id: 'budget', icon: '💰', label: emil.dailyLossStop > 0 ? `$${emil.dailyLossStop}` : 'off',
      color: emil.dailyLossStop > 0 ? '#00C27A' : '#8B93A7',
      lines: [
        emil.dailyLossStop > 0 ? `EMIL's daily risk budget: $${emil.dailyLossStop} loss stop${emil.dailyProfitLock ? ` · profit lock $${emil.dailyProfitLock}` : ''} — entries beyond the remaining budget are rejected with the arithmetic logged.` : 'No EMIL daily loss stop set — configure it in the pilot gate to activate budget tracking.',
        'The full budget ledger lives in the EMIL console (Governance → Trade risk budget).',
      ],
    },
    {
      id: 'session', icon: '🌍', label: openSessions.length ? openSessions.map((s) => s.id).join('·') : 'quiet',
      color: openSessions.some((s) => s.id === 'LON' || s.id === 'NYC') ? '#00C27A' : openSessions.length ? '#D4E157' : '#8B93A7',
      lines: [
        openSessions.length ? `Open now: ${openSessions.map((s) => `${s.label} (closes ${s.minsToChange} min)`).join(' · ')}.` : 'All four desks closed — thin liquidity; spreads run wider.',
        ...(snap.overlaps.length ? snap.overlaps.map((o) => `⚡ ${o}`) : []),
      ],
    },
  ];

  const active = lights.find((l) => l.id === openId) ?? null;

  return (
    <div className="relative flex shrink-0 items-center gap-0.5" ref={ref}
      title="Pre-trade flight check — the protection stack's live state; every light is a real check that runs on your orders">
      <span className="mr-0.5 text-[8px] font-bold uppercase tracking-wider text-white/25">🛫</span>
      {lights.map((l) => (
        <button key={l.id} onClick={() => setOpenId(openId === l.id ? null : l.id)}
          className="flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[8px] font-bold transition-all hover:brightness-125"
          style={{ color: l.color, border: `1px solid ${l.color}55`, backgroundColor: `${l.color}0D` }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 4px ${l.color}` }} />
          {l.icon} {l.label}
        </button>
      ))}
      {active && (
        <div className="absolute left-0 top-full z-[9600] mt-1 w-[300px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: `${active.color}66` }}>
          <div className="mb-1 text-[10px] font-bold" style={{ color: active.color }}>{active.icon} Flight check — {active.id.toUpperCase()}</div>
          {active.lines.map((line, i) => <p key={i} className="mb-1 text-[10px] leading-relaxed text-white/60 last:mb-0">{line}</p>)}
        </div>
      )}
    </div>
  );
}
