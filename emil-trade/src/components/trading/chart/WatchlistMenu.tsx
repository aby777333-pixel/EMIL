'use client';

import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

// Smart Watchlist (charting super-prompt §13 + enhancement prompt §4).
// Multiple named lists, cloud-synced to public.watchlists when signed in
// (local-only otherwise — shown honestly). Rows keep live bid/ask/spread
// with tick colouring and add real intelligence: 24-bar change %, the
// NEXUS regime badge, and this symbol's active price-alert count.
// Clicking a row switches the active symbol on BOTH charts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, Plus, Trash2, ChevronDown, TrendingUp, TrendingDown, Cloud, CloudOff, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import { classifyMarketState } from '@/lib/nexus/market-state';

interface Tick { bid: number; ask: number; mid: number; spread: number }
interface WatchList { id: string; name: string; symbols: string[] }

const LEGACY_KEY = 'raptor_watchlist_symbols';
const KEY_V2 = 'raptor_watchlists_v2';
const DEFAULTS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'US30', 'NAS100', 'USOIL'];

function loadLocal(): { lists: WatchList[]; activeId: string } {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY_V2) || 'null');
    if (v2 && Array.isArray(v2.lists) && v2.lists.length) return v2;
  } catch { /* fall through */ }
  // Migrate the single legacy list (or defaults) into v2.
  let symbols = DEFAULTS;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (Array.isArray(legacy) && legacy.length) symbols = legacy;
  } catch { /* defaults */ }
  const lists = [{ id: 'main', name: 'Main', symbols }];
  return { lists, activeId: 'main' };
}

function digits(v: number) { return v < 20 ? 5 : v < 500 ? 3 : 2; }

const REGIME_SHORT: Record<string, { label: string; color: string }> = {
  'Strong Uptrend': { label: 'UP', color: '#00C27A' },
  'Weak Uptrend': { label: 'up', color: '#7ddfb0' },
  'Strong Downtrend': { label: 'DN', color: '#FF5252' },
  'Weak Downtrend': { label: 'dn', color: '#ff9e9e' },
  'Range Bound': { label: 'RNG', color: '#FFD700' },
  'Sideways / Consolidation': { label: 'SIDE', color: '#FF9800' },
};

export default function WatchlistMenu({
  activeSymbol, prices, setActiveSymbol,
}: {
  activeSymbol: string;
  prices: Record<string, Tick | undefined>;
  setActiveSymbol: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<WatchList[]>([]);
  const [activeId, setActiveId] = useState('main');
  const [input, setInput] = useState('');
  const [cloud, setCloud] = useState<'local' | 'synced' | 'syncing'>('local');
  const ref = useRef<HTMLDivElement>(null);
  const prevMid = useRef<Record<string, number>>({});
  const userIdRef = useRef<string | null>(null);

  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const symbols = useMemo(() => active?.symbols ?? [], [active]);

  // Load local first, then merge cloud (cloud wins per list name) when signed in.
  useEffect(() => {
    const local = loadLocal();
    setLists(local.lists);
    setActiveId(local.activeId);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // local-only, shown honestly
        userIdRef.current = user.id;
        setCloud('syncing');
        const { data } = await supabase.from('watchlists').select('id, name, symbols');
        const cloudLists: WatchList[] = (data ?? []).map((r) => ({
          id: String(r.id), name: String(r.name),
          symbols: Array.isArray(r.symbols) ? (r.symbols as string[]) : [],
        }));
        if (cloudLists.length > 0) {
          setLists(cloudLists);
          setActiveId((prev) => (cloudLists.some((l) => l.id === prev) ? prev : cloudLists[0].id));
        } else {
          // First sign-in: push the local lists up once.
          for (const l of local.lists) {
            const { data: ins } = await supabase.from('watchlists')
              .insert({ name: l.name, symbols: l.symbols })
              .select('id').single();
            if (ins) l.id = String(ins.id);
          }
          setLists([...local.lists]);
          setActiveId(local.lists[0]?.id ?? 'main');
        }
        setCloud('synced');
      } catch { setCloud('local'); }
    })();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const persist = useCallback((nextLists: WatchList[], nextActive: string) => {
    setLists(nextLists);
    setActiveId(nextActive);
    try { localStorage.setItem(KEY_V2, JSON.stringify({ lists: nextLists, activeId: nextActive })); } catch { /* ignore */ }
    // Keep the legacy key mirrored to the active list so older code paths agree.
    const act = nextLists.find((l) => l.id === nextActive);
    try { if (act) localStorage.setItem(LEGACY_KEY, JSON.stringify(act.symbols)); } catch { /* ignore */ }
    // Cloud upsert (fire-and-forget; failures leave local state intact).
    if (userIdRef.current) {
      const act2 = nextLists.find((l) => l.id === nextActive);
      if (act2) {
        void createClient().from('watchlists')
          .upsert({ ...(act2.id.length === 36 ? { id: act2.id } : {}), name: act2.name, symbols: act2.symbols, updated_at: new Date().toISOString() }, { onConflict: 'user_id,name' })
          .then(() => setCloud('synced'), () => setCloud('local'));
      }
    }
  }, []);

  const mutateActive = (fn: (s: string[]) => string[]) => {
    if (!active) return;
    const next = lists.map((l) => (l.id === active.id ? { ...l, symbols: fn(l.symbols) } : l));
    persist(next, activeId);
  };

  const add = () => {
    const s = input.trim().toUpperCase();
    setInput('');
    if (!s || symbols.includes(s)) return;
    mutateActive((cur) => [...cur, s]);
  };
  const remove = (s: string) => mutateActive((cur) => cur.filter((x) => x !== s));

  const createList = () => {
    const name = window.prompt('New watchlist name:')?.trim();
    if (!name || lists.some((l) => l.name === name)) return;
    const nl: WatchList = { id: `local-${Date.now()}`, name, symbols: [] };
    if (userIdRef.current) {
      void createClient().from('watchlists').insert({ name, symbols: [] }).select('id').single()
        .then(({ data }) => {
          const id = data ? String(data.id) : nl.id;
          persist([...lists, { ...nl, id }], id);
        }, () => persist([...lists, nl], nl.id));
    } else {
      persist([...lists, nl], nl.id);
    }
  };

  const deleteList = () => {
    if (!active || lists.length <= 1) return;
    if (!window.confirm(`Delete watchlist "${active.name}"?`)) return;
    if (userIdRef.current && active.id.length === 36) {
      void createClient().from('watchlists').delete().eq('id', active.id);
    }
    const next = lists.filter((l) => l.id !== active.id);
    persist(next, next[0].id);
  };

  // Live intelligence: change %, regime, alert count. Recomputed when the
  // dropdown opens and on a slow tick while it stays open.
  const [intelTick, setIntelTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setIntelTick((t) => t + 1), 20_000);
    return () => clearInterval(id);
  }, [open]);

  const intel = useMemo(() => {
    if (!open) return new Map<string, { changePct: number | null; regime: { label: string; color: string } | null; alerts: number }>();
    const builder = getOhlcvBuilder();
    let alerts: { symbol: string; triggered: boolean }[] = [];
    try { alerts = JSON.parse(localStorage.getItem('raptor_price_alerts') || '[]'); } catch { /* none */ }
    const map = new Map<string, { changePct: number | null; regime: { label: string; color: string } | null; alerts: number }>();
    for (const s of symbols) {
      let changePct: number | null = null;
      let regime: { label: string; color: string } | null = null;
      try {
        const bars = builder ? builder.getAllBars(s, '60') : [];
        if (bars.length >= 16) {
          const win = bars.slice(-24);
          const first = win[0].close, last = win[win.length - 1].close;
          if (first > 0) changePct = ((last - first) / first) * 100;
        }
        const ms = classifyMarketState(bars);
        if (ms) regime = REGIME_SHORT[ms.state] ?? { label: '?', color: '#9aa4b2' };
      } catch { /* leave nulls */ }
      map.set(s, { changePct, regime, alerts: alerts.filter((a) => a.symbol === s && !a.triggered).length });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbols, intelTick]);

  // Tick-direction colour vs the previous render's mid.
  const rows = useMemo(() => symbols.map((s) => {
    const t = prices[s];
    const mid = t?.mid;
    const prev = prevMid.current[s];
    const dir = mid != null && prev != null ? (mid > prev ? 1 : mid < prev ? -1 : 0) : 0;
    if (mid != null) prevMid.current[s] = mid;
    return { symbol: s, t, dir };
  }), [symbols, prices]);

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Watchlist"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('watchlist', open)}
      >
        <List size={12} /> <span className="hidden 2xl:inline">Watchlist</span> <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[360px] rounded-lg border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* List switcher + cloud status */}
          <div className="flex items-center gap-1.5 border-b p-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <select value={activeId} onChange={(e) => persist(lists, e.target.value)}
              className="flex-1 rounded border bg-[#060D16] px-2 py-1 text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.symbols.length})</option>)}
            </select>
            <button onClick={createList} title="New watchlist" className="rounded px-1.5 py-1 text-white/40 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}><Plus size={11} /></button>
            <button onClick={deleteList} disabled={lists.length <= 1} title="Delete this watchlist" className="rounded px-1.5 py-1 text-white/40 hover:text-red-400 disabled:opacity-25" style={{ border: '1px solid rgba(255,255,255,0.12)' }}><Trash2 size={11} /></button>
            <span title={cloud === 'synced' ? 'Cloud-synced to your account' : cloud === 'syncing' ? 'Syncing…' : 'Local only — sign in to sync across devices'}>
              {cloud === 'synced' ? <Cloud size={12} className="text-[#00C27A]" /> : <CloudOff size={12} className="text-white/30" />}
            </span>
          </div>
          {/* Add symbol */}
          <div className="flex items-center gap-1.5 border-b p-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              placeholder="Add symbol (e.g. GBPJPY)" className="flex-1 rounded bg-white/[0.06] px-2 py-1 text-[11px] uppercase text-white placeholder:text-white/25 outline-none" />
            <button onClick={add} className="rounded px-2 py-1 text-[10px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}><Plus size={12} /></button>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-3 py-1 text-[8px] uppercase tracking-wide text-white/30">
            <span>Symbol</span><span className="text-right">Bid / Ask</span><span className="text-right">Δ24h</span><span className="text-right">Regime</span><span className="text-right">Sprd</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {rows.map(({ symbol, t, dir }) => {
              const isActive = symbol === activeSymbol;
              const d = t ? digits(t.mid) : 2;
              const color = dir > 0 ? '#00C27A' : dir < 0 ? '#FF5252' : 'rgba(255,255,255,0.75)';
              const iv = intel.get(symbol);
              return (
                <div key={symbol}
                  onClick={() => { setActiveSymbol(symbol); setOpen(false); }}
                  className="group grid cursor-pointer grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2 border-t px-3 py-1.5 text-[11px] transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: 'rgba(255,255,255,0.04)', backgroundColor: isActive ? 'rgba(41,171,226,0.08)' : 'transparent' }}>
                  <span className="flex items-center gap-1 font-mono font-semibold" style={{ color: isActive ? '#0091D5' : '#fff' }}>
                    {dir > 0 && <TrendingUp size={9} className="text-[#00C27A]" />}
                    {dir < 0 && <TrendingDown size={9} className="text-[#FF5252]" />}
                    {symbol}
                    {iv && iv.alerts > 0 && (
                      <span className="flex items-center gap-0.5 text-[8px]" style={{ color: '#FFD700' }} title={`${iv.alerts} active price alert(s)`}>
                        <Bell size={8} />{iv.alerts}
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-[10px]" style={{ color }}>
                    {t ? `${t.bid.toFixed(d)} / ${t.ask.toFixed(d)}` : '—'}
                  </span>
                  <span className="text-right font-mono text-[10px]" style={{ color: iv?.changePct == null ? 'rgba(255,255,255,0.25)' : iv.changePct >= 0 ? '#00C27A' : '#FF5252' }}
                    title="Change over the last 24 H1 bars (platform feed)">
                    {iv?.changePct != null ? `${iv.changePct >= 0 ? '+' : ''}${iv.changePct.toFixed(2)}%` : '—'}
                  </span>
                  <span className="text-right font-mono text-[9px] font-bold" style={{ color: iv?.regime?.color ?? 'rgba(255,255,255,0.25)' }}
                    title="NEXUS regime classifier (real H1 bars)">
                    {iv?.regime?.label ?? '—'}
                  </span>
                  <span className="flex items-center justify-end gap-1 text-right font-mono text-[10px] text-white/35">
                    {t ? (t.spread).toFixed(d) : '—'}
                    <button onClick={(e) => { e.stopPropagation(); remove(symbol); }} className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:text-red-400"><Trash2 size={10} /></button>
                  </span>
                </div>
              );
            })}
            {rows.length === 0 && <div className="py-3 text-center text-[10px] text-white/30">Watchlist empty — add a symbol above.</div>}
          </div>
          <div className="border-t px-3 py-1.5 text-[8.5px] text-white/25" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            Δ24h &amp; regime from real platform bars (— until enough history). {cloud === 'synced' ? 'Lists sync to your account.' : 'Lists stored locally — sign in to sync.'}
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
