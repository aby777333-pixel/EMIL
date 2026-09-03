'use client';

import { formatMoney } from '@/lib/wallet/money';

/**
 * Three-cell breakdown of withdrawable funds shown at the top of the
 * Withdraw flow: Available · Locked as margin · Pending review.
 * All values arrive as already-formatted Decimal strings.
 */
export default function AvailableBalancePanel({
  available,
  lockedMargin,
  pendingReview,
  currency,
}: {
  available: string;
  lockedMargin: string;
  pendingReview: string;
  currency: string;
}) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden"
      style={{ background: 'var(--g-border-hair)' }}
    >
      <Cell
        label="Available to withdraw"
        value={formatMoney(available, currency)}
        emphasis
      />
      <Cell label="Locked as margin" value={formatMoney(lockedMargin, currency)} />
      <Cell label="Pending review" value={formatMoney(pendingReview, currency)} />
    </div>
  );
}

function Cell({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--g-bg-surface)',
        padding: '18px 20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        {label}
      </div>
      <div
        className="num mt-2"
        style={{
          fontSize: emphasis ? 26 : 18,
          fontWeight: 500,
          color: emphasis ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
