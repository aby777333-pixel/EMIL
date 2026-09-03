'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Repeat } from 'lucide-react';

/**
 * Four primary wallet actions: Deposit · Withdraw · Internal Transfer
 * · Convert. Each is a full-bleed button — no other CTAs nearby per
 * spec ("every CTA must do something operational").
 *
 * Withdraw is intentionally rendered as a secondary button when the
 * KYC status isn't `verified` so the gating is visually obvious.
 */
export default function QuickActionRow({
  withdrawalsEnabled,
}: {
  withdrawalsEnabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <PrimaryAction
        href="/dashboard/wallet/deposit"
        icon={<ArrowDownToLine size={16} />}
        label="Deposit"
        emphasis
      />
      <PrimaryAction
        href={withdrawalsEnabled ? '/dashboard/wallet/withdraw' : '/dashboard/profile/kyc'}
        icon={<ArrowUpFromLine size={16} />}
        label={withdrawalsEnabled ? 'Withdraw' : 'Withdraw (verify ID)'}
        muted={!withdrawalsEnabled}
      />
      <PrimaryAction
        href="/dashboard/wallet/transfer"
        icon={<ArrowLeftRight size={16} />}
        label="Internal transfer"
      />
      <PrimaryAction
        href="/dashboard/wallet/convert"
        icon={<Repeat size={16} />}
        label="Convert"
      />
    </div>
  );
}

function PrimaryAction({
  href,
  icon,
  label,
  emphasis = false,
  muted = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors"
      style={{
        height: 48,
        background: emphasis ? 'var(--g-accent)' : 'transparent',
        border: emphasis ? '1px solid var(--g-accent)' : '1px solid var(--g-border-soft)',
        color: emphasis ? '#fff' : muted ? 'var(--g-text-muted)' : 'var(--g-text-primary)',
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
