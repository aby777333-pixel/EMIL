'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatMoney } from '@/lib/wallet/money';

/**
 * Top of the Accounts surface — total live equity + total demo equity
 * shown side-by-side so a glance tells the user how much real capital
 * is on platform vs how much practice runway they have. The "+ Open
 * new account" CTA is the only marketing-style button on the page.
 */
export default function AccountsHeader({
  liveEquity,
  demoEquity,
  baseCurrency = 'USD',
}: {
  liveEquity: string;
  demoEquity: string;
  baseCurrency?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <Stat label="Live equity" value={formatMoney(liveEquity, baseCurrency)} />
        <Stat label="Demo equity" value={formatMoney(demoEquity, baseCurrency)} muted />
      </div>
      <Link
        href="/dashboard/accounts/new"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[13px] font-medium"
        style={{ background: 'var(--g-accent)', color: '#fff', border: '1px solid var(--g-accent)' }}
      >
        <Plus size={14} /> Open new account
      </Link>
    </header>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
        {label}
      </div>
      <div
        className="num mt-1"
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: muted ? 'var(--g-text-secondary)' : 'var(--g-text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
