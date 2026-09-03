'use client';

import { AlertCircle } from 'lucide-react';

/**
 * Small inline alert shown above the form on submit errors.
 * Crimson-tinted, hairline border — never blocks the layout, never wraps
 * past two lines. Pair with `g-shake` on the form wrapper for emphasis.
 */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[13px]"
      style={{
        background: 'rgba(220, 38, 38, 0.06)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        color: 'var(--g-pnl-negative)',
      }}
    >
      <AlertCircle size={15} className="shrink-0 mt-px" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}
