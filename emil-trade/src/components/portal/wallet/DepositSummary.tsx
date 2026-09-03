'use client';

import { computeDeposit } from '@/lib/wallet/money';
import { currencySymbol } from '@/lib/wallet/money';

/**
 * Right-rail summary card for the deposit flow. Recomputes fees + net
 * via Decimal on every render — no JS Number math anywhere.
 */
export default function DepositSummary({
  method,
  amount,
  currency,
  eta,
}: {
  method: string | null;
  amount: string;
  currency: string;
  eta: string;
}) {
  const safeAmount = amount && Number.isFinite(Number(amount)) ? amount : '0';
  const { gross, fee, net } = computeDeposit(method ?? '', safeAmount);

  return (
    <aside
      className="rounded-xl p-5"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="text-[11px] uppercase tracking-[0.14em] mb-3"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        Summary
      </div>

      <Row label="Method" value={prettyMethod(method)} />
      <Row label="Amount" value={`${currencySymbol(currency)}${formatThousands(gross)}`} mono />
      <Row label="Fee" value={`${currencySymbol(currency)}${formatThousands(fee)}`} mono muted />
      <div className="my-3 border-t" style={{ borderColor: 'var(--g-border-hair)' }} />
      <Row
        label="You receive"
        value={`${currencySymbol(currency)}${formatThousands(net)}`}
        mono
        emphasis
      />
      <div className="mt-3 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
        ETA: {eta}
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  mono,
  muted,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-[12px] mb-1.5">
      <span style={{ color: 'var(--g-text-muted)' }}>{label}</span>
      <span
        className={mono ? 'num' : ''}
        style={{
          color: muted
            ? 'var(--g-text-muted)'
            : emphasis
              ? 'var(--g-text-primary)'
              : 'var(--g-text-secondary)',
          fontWeight: emphasis ? 500 : 400,
          fontSize: emphasis ? 14 : 12,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function prettyMethod(m: string | null): string {
  if (!m) return '—';
  switch (m) {
    case 'bank_wire': return 'Bank wire';
    case 'card':      return 'Card';
    case 'upi':       return 'UPI';
    case 'crypto':    return 'Crypto';
    case 'local':     return 'Local PSP';
    case 'voucher':   return 'Voucher';
    default:          return m;
  }
}

function formatThousands(d: string): string {
  const [whole, frac] = d.split('.');
  const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${w}${frac ? '.' + frac : '.00'}`;
}
