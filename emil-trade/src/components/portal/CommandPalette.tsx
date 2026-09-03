'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
  group: 'Navigate' | 'Actions';
}

const STATIC_ITEMS: PaletteItem[] = [
  { id: 'go-dashboard',     label: 'Go to dashboard',          group: 'Navigate', href: '/dashboard' },
  { id: 'go-wallet',        label: 'Go to wallet',             group: 'Navigate', href: '/dashboard/wallet' },
  { id: 'go-positions',     label: 'Go to accounts',           group: 'Navigate', href: '/dashboard/positions' },
  { id: 'go-history',       label: 'Trade history',            group: 'Navigate', href: '/dashboard/history' },
  { id: 'go-copy',          label: 'Copy trading',             group: 'Navigate', href: 'https://zippy-piroshki-21aa30.netlify.app/copy', hint: 'opens new tab' },
  { id: 'go-pamm',          label: 'PAMM',                     group: 'Navigate', href: 'https://zippy-piroshki-21aa30.netlify.app/pamm', hint: 'opens new tab' },
  { id: 'go-ib',            label: 'IB / Referrals',           group: 'Navigate', href: '/dashboard/referrals' },
  { id: 'go-profile',       label: 'KYC & Profile',            group: 'Navigate', href: '/dashboard/profile' },
  { id: 'go-support',       label: 'Support',                  group: 'Navigate', href: '/dashboard/support' },
  { id: 'go-settings',      label: 'Settings',                 group: 'Navigate', href: '/dashboard/settings' },
  { id: 'open-terminal',    label: 'Open trading terminal',    group: 'Actions',  href: 'https://zippy-piroshki-21aa30.netlify.app', hint: 'opens new tab' },
  { id: 'deposit',          label: 'Deposit funds',            group: 'Actions',  href: '/dashboard/wallet',  hint: 'go to wallet' },
];

/**
 * ⌘K command palette. Static list for now — real-world implementations
 * would also hit a server endpoint for symbols, accounts, and tickets.
 * Keyboard: ↑↓ to move, Enter to run, Esc to close.
 */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_ITEMS;
    return STATIC_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const groups = useMemo(() => {
    const out: Record<string, PaletteItem[]> = {};
    for (const item of filtered) {
      (out[item.group] ??= []).push(item);
    }
    return out;
  }, [filtered]);

  function run(item: PaletteItem) {
    onClose();
    if (item.href) {
      const isExternal = item.href.startsWith('http');
      if (isExternal) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(item.href);
      }
    } else if (item.action) {
      item.action();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[active];
      if (item) run(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  // Build a flat index map so the highlight survives across grouped rendering.
  let runningIndex = -1;

  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      />
      <div
        className="relative w-full max-w-xl g-card overflow-hidden"
        role="dialog"
        aria-label="Command palette"
        style={{ background: 'var(--g-bg-elevated)' }}
      >
        <div
          className="flex items-center gap-2.5 px-4 border-b"
          style={{ borderColor: 'var(--g-border-hair)', height: 52 }}
        >
          <Search size={16} style={{ color: 'var(--g-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search modules, accounts, actions…"
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: 'var(--g-text-primary)' }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              borderColor: 'var(--g-border-soft)',
              color: 'var(--g-text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--g-text-muted)' }}>
              No matches.
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div
                  className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: 'var(--g-text-muted)' }}
                >
                  {group}
                </div>
                {items.map((item) => {
                  runningIndex++;
                  const isActive = runningIndex === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(runningIndex)}
                      onClick={() => run(item)}
                      className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-left transition-colors"
                      style={{
                        color: isActive ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      <span>{item.label}</span>
                      {item.hint && (
                        <span className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                          {item.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 border-t text-[11px]"
          style={{ borderColor: 'var(--g-border-hair)', color: 'var(--g-text-muted)', height: 36 }}
        >
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
