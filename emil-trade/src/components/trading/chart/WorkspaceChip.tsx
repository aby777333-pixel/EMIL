'use client';

// 💼 Smart Workspaces — save the current setup as a named preset and
// restore it in one click: active symbol, timeframe, 1-Click state and
// which standalone windows to open (EMIL / ABIN / World / Scan / Hedge).
// Pure convenience layer: applying a workspace changes NO risk settings,
// consents or permissions — those always stay exactly as the trader
// configured them.

import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/trading';

interface Workspace {
  name: string;
  symbol: string;
  tf: string;
  oneClick: boolean;
  windows: string[]; // '/terminal/emil' etc.
}

const WS_KEY = 'raptor_workspaces_v1';

const WINDOW_OPTIONS: Array<{ id: string; label: string }> = [
  { id: '/terminal/emil', label: 'EMIL' },
  { id: '/terminal/abin', label: 'ABIN' },
  { id: '/terminal/world', label: 'World' },
  { id: '/terminal/scan-trade', label: 'Scan' },
  { id: '/terminal/hedge-trade', label: 'Hedge' },
];

function loadWs(): Workspace[] {
  try { return JSON.parse(localStorage.getItem(WS_KEY) || '[]'); } catch { return []; }
}

function saveWs(list: Workspace[]): void {
  try { localStorage.setItem(WS_KEY, JSON.stringify(list.slice(0, 12))); } catch { /* ignore */ }
}

export default function WorkspaceChip() {
  const { activeSymbol, activeTimeframe, oneClickTrading, setActiveSymbol, setActiveTimeframe, setOneClickTrading } = useTradingStore();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [wins, setWins] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setList(loadWs()); }, [open]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const apply = (w: Workspace) => {
    setActiveSymbol(w.symbol);
    setActiveTimeframe(w.tf);
    try { window.dispatchEvent(new CustomEvent('raptor-timeframe-change', { detail: w.tf })); } catch { /* ignore */ }
    setOneClickTrading(w.oneClick);
    for (const url of w.windows) window.open(url, '_blank');
    setOpen(false);
  };

  const saveCurrent = () => {
    if (!name.trim()) return;
    const next = [...list.filter((w) => w.name !== name.trim()), { name: name.trim(), symbol: activeSymbol, tf: activeTimeframe, oneClick: oneClickTrading, windows: wins }];
    setList(next); saveWs(next); setName(''); setWins([]);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button onClick={() => setOpen((s) => !s)}
        title="Smart Workspaces — save this setup (symbol, timeframe, 1-Click, windows) as a named preset and restore it in one click. Risk settings and consents are never touched."
        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
        style={{
          color: open ? '#9CCC65' : 'rgba(156,204,101,0.8)',
          border: `1px solid ${open ? 'rgba(156,204,101,0.7)' : 'rgba(156,204,101,0.4)'}`,
          backgroundColor: open ? 'rgba(156,204,101,0.14)' : 'rgba(156,204,101,0.06)',
        }}>
        💼 WORKSPACES
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[9600] mt-1 w-[290px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(156,204,101,0.4)' }}>
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#9CCC65' }}>💼 Smart Workspaces</div>
          {list.length ? list.map((w) => (
            <div key={w.name} className="mb-1 flex items-center gap-1.5">
              <button onClick={() => apply(w)} className="flex-1 rounded px-2 py-1 text-left text-[10px] transition-all hover:brightness-125" style={{ border: '1px solid rgba(156,204,101,0.3)', backgroundColor: 'rgba(156,204,101,0.06)' }}>
                <span className="font-bold text-white/80">{w.name}</span>
                <span className="text-white/40"> · {w.symbol} {w.tf}{w.oneClick ? ' · 1-Click' : ''}{w.windows.length ? ` · +${w.windows.length} window(s)` : ''}</span>
              </button>
              <button onClick={() => { const next = list.filter((x) => x.name !== w.name); setList(next); saveWs(next); }}
                title="Delete preset" className="rounded px-1.5 py-1 text-[10px] text-white/35 transition-colors hover:text-[#FF5252]">✕</button>
            </div>
          )) : <p className="mb-1 text-[9px] text-white/35">No presets yet — set up your screen, name it below, save.</p>}
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. "Scalping" · "News day"'
                onKeyDown={(e) => { if (e.key === 'Enter') saveCurrent(); }}
                className="min-w-0 flex-1 rounded bg-white/[0.06] px-2 py-1 text-[10px] text-white placeholder:text-white/25 outline-none" style={{ border: '1px solid rgba(156,204,101,0.3)' }} />
              <button onClick={saveCurrent} disabled={!name.trim()}
                className="shrink-0 rounded px-2.5 py-1 text-[10px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-30"
                style={{ background: 'linear-gradient(180deg,#9CCC65,#7CB342)' }}>
                Save current
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-white/50">
              <span className="text-white/30">Also open:</span>
              {WINDOW_OPTIONS.map((o) => (
                <label key={o.id} className="flex items-center gap-1">
                  <input type="checkbox" checked={wins.includes(o.id)}
                    onChange={(e) => setWins((p) => (e.target.checked ? [...p, o.id] : p.filter((x) => x !== o.id)))} className="accent-[#9CCC65]" />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[8px] text-white/25">Saves symbol · timeframe · 1-Click · window set. Never touches risk settings, consents or permissions.</p>
          </div>
        </div>
      )}
    </div>
  );
}
