'use client';

import { useEffect, useRef } from 'react';

/**
 * Six discrete input cells for TOTP codes. Auto-advances to the next
 * cell on entry, supports backspace, arrow keys, and pasting a full
 * 6-digit code. Reports the assembled code to `onComplete` when all
 * six cells are filled, and `onChange` on every keystroke.
 */
export default function TwoFactorInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const cells = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(i: number, ch: string) {
    const next = cells.slice();
    next[i] = ch;
    const code = next.join('');
    onChange(code);
    if (code.length === 6 && /^\d{6}$/.test(code)) onComplete?.(code);
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Two-factor code">
      {cells.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={c}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/[^0-9]/g, '').slice(-1);
            setAt(i, ch);
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !cells[i] && i > 0) {
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowLeft' && i > 0) {
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowRight' && i < 5) {
              refs.current[i + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted.length === 0) return;
            e.preventDefault();
            onChange(pasted);
            if (pasted.length === 6) {
              refs.current[5]?.focus();
              onComplete?.(pasted);
            } else {
              refs.current[Math.min(pasted.length, 5)]?.focus();
            }
          }}
          className="num text-center text-[20px] font-medium"
          style={{
            width: 48,
            height: 56,
            background: 'transparent',
            border: `1px solid ${c ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
            borderRadius: 8,
            color: 'var(--g-text-primary)',
            outline: 'none',
            transition: 'border-color 160ms ease',
          }}
        />
      ))}
    </div>
  );
}
