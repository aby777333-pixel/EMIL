'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils/format';

interface CurrencyInputProps {
  /** Value in cents (integer) */
  value: number;
  /** Called with new value in cents */
  onChange: (cents: number) => void;
  currency?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
};

export function CurrencyInput({
  value,
  onChange,
  currency = 'USD',
  min,
  max,
  step = 100,
  className,
}: CurrencyInputProps) {
  const symbol = SYMBOLS[currency] ?? currency;
  const displayValue = (value / 100).toFixed(2);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      if (raw === '' || raw === '.') {
        onChange(0);
        return;
      }
      const parsed = Math.round(parseFloat(raw) * 100);
      if (isNaN(parsed)) return;

      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(clamped);
    },
    [onChange, min, max],
  );

  const handleIncrement = useCallback(
    (dir: 1 | -1) => {
      let next = value + dir * step;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      onChange(next);
    },
    [value, onChange, step, min, max],
  );

  return (
    <div
      className={cn(
        'flex items-center overflow-hidden rounded-lg border border-border bg-surface text-sm transition-colors focus-within:border-accent',
        className,
      )}
    >
      <span className="flex h-full items-center border-r border-border bg-elevated px-3 py-2 text-xs font-medium text-muted">
        {symbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        className="mono w-full bg-transparent px-3 py-2 text-foreground outline-none"
      />
      <div className="flex flex-col border-l border-border">
        <button
          type="button"
          onClick={() => handleIncrement(1)}
          className="px-2 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface hover:text-foreground"
          aria-label="Increment"
        >
          &#9650;
        </button>
        <button
          type="button"
          onClick={() => handleIncrement(-1)}
          className="px-2 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface hover:text-foreground"
          aria-label="Decrement"
        >
          &#9660;
        </button>
      </div>
    </div>
  );
}
