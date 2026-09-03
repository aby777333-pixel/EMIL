'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Generic labelled field used for email + plain text auth inputs.
 * Pairs with the `.g-field` style in globals.css.
 */
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const fieldId = id ?? `f-${label.toLowerCase().replace(/[^a-z]/g, '-')}`;
  return (
    <label htmlFor={fieldId} className="block">
      <div
        className="text-[11px] uppercase tracking-[0.14em] mb-2"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        {label}
      </div>
      <input
        id={fieldId}
        ref={ref}
        className={`g-field ${className ?? ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
        {...rest}
      />
      {(hint || error) && (
        <div
          id={`${fieldId}-hint`}
          className="mt-1.5 text-[11px]"
          style={{ color: error ? 'var(--g-pnl-negative)' : 'var(--g-text-muted)' }}
        >
          {error || hint}
        </div>
      )}
    </label>
  );
});

/**
 * Password field with show/hide toggle and a 4-bar strength meter.
 * The meter uses a length-and-class-mix heuristic — light, no zxcvbn dep.
 */
type PasswordFieldProps = Omit<FieldProps, 'type'> & {
  showStrength?: boolean;
};

export function PasswordField({
  label,
  showStrength = false,
  error,
  hint,
  value,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const score = scorePassword(typeof value === 'string' ? value : '');
  return (
    <div className="relative">
      <label
        htmlFor={(rest.id as string) ?? `f-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}
        className="block"
      >
        <div
          className="text-[11px] uppercase tracking-[0.14em] mb-2 flex items-center justify-between"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          <span>{label}</span>
          {showStrength && typeof value === 'string' && value.length > 0 && (
            <StrengthMeter score={score} />
          )}
        </div>
        <div className="relative">
          <input
            id={(rest.id as string) ?? `f-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}
            type={visible ? 'text' : 'password'}
            className="g-field pr-11"
            value={value}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-100 opacity-50"
            tabIndex={-1}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </label>
      {(hint || error) && (
        <div
          className="mt-1.5 text-[11px]"
          style={{ color: error ? 'var(--g-pnl-negative)' : 'var(--g-text-muted)' }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}

function StrengthMeter({ score }: { score: number }) {
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const color =
    score < 2 ? 'var(--g-pnl-negative)' : score < 3 ? '#F59E0B' : 'var(--g-pnl-positive)';
  return (
    <span className="flex items-center gap-2 normal-case tracking-normal">
      <span className="flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block"
            style={{
              width: 14,
              height: 3,
              borderRadius: 2,
              background: i < score ? color : 'rgba(255,255,255,0.1)',
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </span>
      <span className="text-[10px]" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

/**
 * Length + character-class heuristic. Returns 0..4.
 *  0 — under 8 chars
 *  1 — 8+ chars, single class
 *  2 — 8+ chars, two classes
 *  3 — 12+ chars, three classes
 *  4 — 14+ chars, four classes
 */
function scorePassword(pw: string): number {
  if (!pw || pw.length < 8) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^a-zA-Z0-9]/.test(pw)) classes++;
  if (pw.length >= 14 && classes >= 4) return 4;
  if (pw.length >= 12 && classes >= 3) return 3;
  if (classes >= 2) return 2;
  return 1;
}
