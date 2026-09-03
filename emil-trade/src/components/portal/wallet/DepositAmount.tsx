'use client';

import { currencySymbol, METHOD_MIN, METHOD_MAX, type SupportedCurrency, SUPPORTED_CURRENCIES } from '@/lib/wallet/money';

/**
 * Big monospaced amount input + currency selector.  Enforces decimal-
 * only input at the keystroke level so the value can be safely fed
 * into Decimal at submit time.
 */
export default function DepositAmount({
  amount,
  currency,
  method,
  onAmountChange,
  onCurrencyChange,
}: {
  amount: string;
  currency: SupportedCurrency;
  method: string | null;
  onAmountChange: (next: string) => void;
  onCurrencyChange: (next: SupportedCurrency) => void;
}) {
  const min = method ? METHOD_MIN[method] : null;
  const max = method ? METHOD_MAX[method] : null;

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Reject anything that isn't a positive decimal with at most 2 places.
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      // strip leading zeros except for "0." pattern
      const cleaned = raw.replace(/^0+(?=\d)/, '');
      onAmountChange(cleaned);
    }
  }

  return (
    <div>
      <div
        className="text-[11px] uppercase tracking-[0.14em] mb-2"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        Amount
      </div>

      <div
        className="flex items-stretch rounded-lg overflow-hidden"
        style={{
          background: 'var(--g-bg-surface)',
          border: '1px solid var(--g-border-soft)',
        }}
      >
        <span
          className="num flex items-center justify-center px-4 text-[18px]"
          style={{ color: 'var(--g-text-muted)', minWidth: 56 }}
        >
          {currencySymbol(currency)}
        </span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={handle}
          placeholder="0.00"
          className="num flex-1 bg-transparent outline-none px-2 text-[28px] font-medium"
          style={{ color: 'var(--g-text-primary)' }}
          aria-label="Deposit amount"
        />
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as SupportedCurrency)}
          className="num bg-transparent text-[14px] px-3 outline-none border-l"
          style={{
            color: 'var(--g-text-secondary)',
            borderColor: 'var(--g-border-hair)',
          }}
          aria-label="Currency"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c} style={{ background: '#16161A', color: '#F5F5F7' }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {(min || max) && (
        <div className="mt-1.5 text-[11px] num" style={{ color: 'var(--g-text-muted)' }}>
          {min && `Min ${currencySymbol(currency)}${min.toFixed(2)}`}
          {min && max && ' · '}
          {max && `Max ${currencySymbol(currency)}${formatCompact(max.toNumber())}`}
        </div>
      )}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}
