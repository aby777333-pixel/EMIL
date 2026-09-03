'use client';

import { currencySymbol, type SupportedCurrency } from '@/lib/wallet/money';

/**
 * Big monospaced amount input with a "withdraw all" shortcut. Same
 * keystroke-level decimal regex as the deposit input, so values pass
 * through Decimal cleanly on submit.
 */
export default function WithdrawAmountInput({
  amount,
  available,
  currency,
  onAmountChange,
}: {
  amount: string;
  available: string;
  currency: SupportedCurrency;
  onAmountChange: (next: string) => void;
}) {
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      onAmountChange(raw.replace(/^0+(?=\d)/, ''));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
          Amount
        </div>
        <button
          type="button"
          onClick={() => onAmountChange(available)}
          className="text-[11px] hover:underline"
          style={{ color: 'var(--g-accent)' }}
        >
          Withdraw all
        </button>
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
          aria-label="Withdraw amount"
        />
        <span
          className="flex items-center justify-center px-3 text-[14px] border-l"
          style={{
            color: 'var(--g-text-secondary)',
            borderColor: 'var(--g-border-hair)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {currency}
        </span>
      </div>
    </div>
  );
}
