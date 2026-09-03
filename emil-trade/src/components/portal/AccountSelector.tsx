'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PortalAccount {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  leverage: number;
  balance: number;
  is_demo: boolean;
}

const STORAGE_KEY = 'gio.portal.activeAccountId';

/**
 * Topbar account selector. Loads the user's trading_accounts on mount,
 * persists the chosen account in localStorage so the choice sticks
 * across page navigation. Falls back to a single demo card when the
 * Supabase fetch errors (offline / build-time stub).
 */
export default function AccountSelector() {
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data, error } = await supabase
          .from('trading_accounts')
          .select('id, account_number, account_type, currency, leverage, balance, is_demo')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        if (error || !data || cancelled) return;
        setAccounts(data as PortalAccount[]);

        let stored: string | null = null;
        try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* noop */ }
        const chosen = data.find((a) => a.id === stored) ?? data[0];
        if (chosen) setActiveId(chosen.id);
      } catch {
        /* network/Supabase unavailable — leave list empty */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function pick(id: string) {
    setActiveId(id);
    try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
    setOpen(false);
  }

  const active = accounts.find((a) => a.id === activeId) ?? null;

  if (accounts.length === 0) {
    return (
      <Link
        href="/dashboard/accounts/new"
        className="flex items-center gap-2 px-3 h-9 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
        style={{
          color: 'var(--g-text-secondary)',
          border: '1px solid var(--g-border-soft)',
        }}
      >
        <Plus size={13} /> Open account
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-3 h-9 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
        style={{
          color: 'var(--g-text-primary)',
          border: '1px solid var(--g-border-soft)',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ color: 'var(--g-text-muted)' }}>Account</span>
        <span className="num font-medium">{active?.account_number ?? '—'}</span>
        {active?.is_demo && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--g-accent)', color: '#fff' }}
          >
            DEMO
          </span>
        )}
        <ChevronDown size={12} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-72 rounded-xl border g-fade-in z-50 py-1"
          style={{
            background: 'var(--g-bg-elevated)',
            borderColor: 'var(--g-border-hair)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <ul className="list-none m-0 p-0 max-h-72 overflow-y-auto">
            {accounts.map((a) => {
              const isActive = a.id === activeId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => pick(a.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04] text-left"
                    style={{ color: 'var(--g-text-secondary)' }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        style={{
                          width: 6, height: 6, borderRadius: 6,
                          background: isActive ? 'var(--g-accent)' : 'transparent',
                          border: isActive ? 'none' : '1px solid var(--g-border-strong)',
                          flexShrink: 0,
                        }}
                      />
                      <span className="num" style={{ color: 'var(--g-text-primary)' }}>{a.account_number}</span>
                      {a.is_demo && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(220,38,38,0.15)', color: 'var(--g-accent)' }}
                        >
                          DEMO
                        </span>
                      )}
                    </span>
                    <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                      1:{a.leverage} · {a.currency}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t my-1" style={{ borderColor: 'var(--g-border-hair)' }} />
          <Link
            href="/dashboard/accounts/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04]"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            <Plus size={12} /> Open new account
          </Link>
        </div>
      )}
    </div>
  );
}
