'use client';

// ═══════════════════════════════════════════════════════════════
// Command Palette (enhancement prompt §30 ultra-fast search / §35
// VS-Code-style palette). Ctrl/Cmd+K on the terminal. Every command is
// wired to a REAL existing bridge — store setters or the window events
// other components already listen to. Nothing decorative.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { adjustScale, setScale, toggleHighContrast, resetLayout, loadWorkspacePrefs, SCALE_STEP } from '@/lib/insights/workspace';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

const TIMEFRAMES: [string, string][] = [
  ['1m', 'M1'], ['5m', 'M5'], ['15m', 'M15'], ['30m', 'M30'],
  ['1H', 'H1'], ['4H', 'H4'], ['1D', 'D1'], ['1W', 'W1'], ['1Mo', 'MN'],
];

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const prices = useTradingStore((s) => s.prices);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const dispatch = (name: string, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(name, detail !== undefined ? { detail } : undefined));
  };

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    for (const s of Object.keys(prices).sort()) {
      cmds.push({
        id: `sym-${s}`, group: 'Symbols',
        label: `Switch to ${s}`,
        hint: s === activeSymbol ? 'active' : undefined,
        run: () => setActiveSymbol(s),
      });
    }
    for (const [tf, label] of TIMEFRAMES) {
      cmds.push({
        id: `tf-${tf}`, group: 'Timeframes',
        label: `Timeframe ${label}`, hint: 'both charts',
        run: () => dispatch('raptor-timeframe-change', tf),
      });
    }
    cmds.push(
      { id: 'chart-raptor', group: 'Charts', label: 'Show RAPTOR chart', run: () => dispatch('nexus-ensure-raptor') },
      { id: 'chart-tv', group: 'Charts', label: 'Show TradingView chart', run: () => dispatch('raptor-ensure-tradingview') },
      { id: 'panel-insights', group: 'Panels', label: 'Open Market Insights', hint: 'heat map · sessions · regime', run: () => dispatch('raptor-open-insights') },
      { id: 'panel-risk', group: 'Panels', label: 'Open Risk Tools', hint: 'dashboard · position sizer', run: () => dispatch('raptor-open-risk') },
      { id: 'panel-journal', group: 'Panels', label: 'Open Trade Journal', run: () => dispatch('raptor-open-journal') },
      { id: 'panel-order', group: 'Panels', label: 'Toggle order panel', hint: 'Order / Account / Tools', run: () => dispatch('raptor-toggle-right-panel') },
      { id: 'nexus-open', group: 'NEXUS', label: 'Open NEXUS', run: () => dispatch('nexus-ask', {}) },
      { id: 'nexus-brief', group: 'NEXUS', label: 'NEXUS: Daily Briefing', run: () => dispatch('nexus-ask', { question: 'Give me my daily briefing' }) },
      { id: 'nexus-scan', group: 'NEXUS', label: 'NEXUS: Trade Ideas (scan)', run: () => dispatch('nexus-ask', { question: 'Give me 3 trade setups right now' }) },
      { id: 'nav-lab', group: 'Navigate', label: 'Open AI Strategy Lab', hint: 'new tab', run: () => window.open('/ai-lab/', '_blank') },
    );
    // §35 workspace: scale / contrast / layout recovery (all reversible).
    const wp = loadWorkspacePrefs();
    cmds.push(
      { id: 'ws-larger', group: 'Workspace', label: 'UI size: larger', hint: `now ${Math.round(wp.scale * 100)}%`, run: () => adjustScale(SCALE_STEP) },
      { id: 'ws-smaller', group: 'Workspace', label: 'UI size: smaller', hint: `now ${Math.round(wp.scale * 100)}%`, run: () => adjustScale(-SCALE_STEP) },
      { id: 'ws-reset-scale', group: 'Workspace', label: 'UI size: reset to 100%', run: () => setScale(1) },
      { id: 'ws-contrast', group: 'Workspace', label: `High contrast: turn ${wp.highContrast ? 'off' : 'on'}`, run: () => toggleHighContrast() },
      {
        id: 'ws-reset-layout', group: 'Workspace', label: 'Reset layout', hint: 'panels + scale, then reload',
        run: () => { if (window.confirm('Reset layout? Panel sizes, hidden panels, UI scale and contrast return to stock. Trading data, alerts, journals and watchlists are untouched.')) resetLayout(); },
      },
    );
    return cmds;
  }, [prices, activeSymbol, setActiveSymbol]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const base = q
      ? commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
      : commands;
    const out = base.slice(0, 40);
    // Free-text NEXUS question — always available when the query isn't a
    // direct command match.
    if (q.length > 2) {
      out.push({
        id: 'nexus-free', group: 'NEXUS',
        label: `Ask NEXUS: “${query.trim()}”`,
        run: () => dispatch('nexus-ask', { question: query.trim() }),
      });
    }
    return out;
  }, [commands, q, query]);

  useEffect(() => { setSelected(0); }, [q]);

  const runCommand = (c: Command) => { c.run(); onClose(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = filtered[selected]; if (c) runCommand(c); }
  };

  // Keep the selected row in view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onMouseDown={onClose}>
      <div
        className="w-[560px] max-w-[94vw] overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.12)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Search size={14} className="shrink-0 text-white/35" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands, symbols, panels — or type a question for NEXUS…"
            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
          />
          <kbd className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] text-white/35" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] text-white/30">No matching commands.</div>
          )}
          {filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {showGroup && (
                  <div className="px-3 pb-0.5 pt-2 text-[8.5px] font-bold uppercase tracking-wider text-white/25">{c.group}</div>
                )}
                <button
                  data-idx={i}
                  onClick={() => runCommand(c)}
                  onMouseEnter={() => setSelected(i)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]"
                  style={{ backgroundColor: i === selected ? 'rgba(41,171,226,0.12)' : 'transparent', color: i === selected ? '#fff' : 'rgba(255,255,255,0.7)' }}
                >
                  <ArrowRight size={11} className="shrink-0" style={{ opacity: i === selected ? 1 : 0.2, color: '#0091D5' }} />
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="shrink-0 text-[9px] text-white/30">{c.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t px-3 py-1.5 text-[9px] text-white/25" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          ↑↓ navigate · Enter run · every command drives the platform&apos;s real controls
        </div>
      </div>
    </div>
  );
}
