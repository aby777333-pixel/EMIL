'use client';

// ⌘K Command Palette — the ABIN command bar, one keystroke away on every
// page. Ctrl+K / Cmd+K opens it; type a command ("compare EURUSD and
// GBPUSD", "find hedge for gold", "scan", "show my exposure") or search
// anything (instruments — English or native script — countries, central
// banks, events, tools). Commands navigate and focus; they can never
// execute a trade.

import { openEmilCockpit } from '@/lib/emil-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/trading';
import { getCalendar, type NewsEvent } from '@/lib/trading/news-guard';
import { universalSearch, parseAbinCommand, type SearchGroup } from '@/lib/trading/abin';

export default function CommandPalette() {
  const { prices, setActiveSymbol } = useTradingStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((s) => !s);
        setQuery(''); setResults([]); setNote(null);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) { getCalendar().then(setCalendar); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const universe = Object.keys(prices).filter((s) => prices[s]?.bid != null);

  const act = useCallback((action: { type: string; payload: string }) => {
    if (action.type === 'instrument') { setActiveSymbol(action.payload); setNote(`${action.payload} loaded on the charts`); }
    else if (action.type === 'region') window.open('/terminal/world', '_blank');
    else if (action.type === 'cb' || action.type === 'event') window.open('/terminal/abin', '_blank');
    else if (action.type === 'page') window.open(action.payload, '_blank');
    else if (action.type === 'emil') openEmilCockpit();
    if (action.type !== 'instrument') setOpen(false);
  }, [setActiveSymbol]);

  const run = useCallback(() => {
    if (!query.trim()) return;
    const cmd = parseAbinCommand(query, universe);
    setNote(cmd.note);
    if (cmd.kind === 'instrument') { setActiveSymbol(cmd.payload); setResults([]); }
    else if (cmd.kind === 'compare') { window.open('/terminal/abin', '_blank'); setOpen(false); }
    else if (cmd.kind === 'page') { if (cmd.payload.startsWith('#')) window.open('/terminal/world', '_blank'); else window.open(cmd.payload, '_blank'); setOpen(false); }
    else if (cmd.kind === 'emil') { openEmilCockpit(); setOpen(false); }
    else setResults(universalSearch(query, { universe, calendar }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, universe.length, calendar]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-start justify-center pt-[12vh]" style={{ backgroundColor: 'rgba(3,7,12,0.72)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="w-full max-w-[560px] rounded-xl border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(41,171,226,0.5)' }}>
        <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="font-mono text-[10px] font-bold" style={{ color: '#29ABE2' }}>⌘K</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
            placeholder='Command or search — "gold" · "सोना" · "compare EURUSD and GBPUSD" · "scan" · "find hedge for gold" · "show my exposure"'
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white placeholder:text-white/25 outline-none" />
          <button onClick={run} className="shrink-0 rounded px-2.5 py-1 text-[10px] font-bold text-black transition-all hover:brightness-110" style={{ background: 'linear-gradient(180deg,#29ABE2,#0091D5)' }}>Run</button>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
          {note && <p className="mb-2 text-[10px]" style={{ color: '#D4E157' }}>{note}</p>}
          {results.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <div className="text-[8px] font-bold uppercase tracking-wide text-white/35">{g.label}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <button key={it.title + it.sub} onClick={() => act(it.action)}
                    className="rounded px-2 py-1 text-left text-[10px] transition-all hover:brightness-125" style={{ border: '1px solid rgba(41,171,226,0.3)', backgroundColor: 'rgba(41,171,226,0.06)' }}>
                    <span className="font-bold text-white/80">{it.title}</span> <span className="text-white/40">· {it.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!results.length && !note && (
            <p className="text-[9px] text-white/30">
              Enter runs the command. Instruments load on the charts; workspaces open in new tabs. Commands can never execute a
              trade — orders always go through their own confirmation paths.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
