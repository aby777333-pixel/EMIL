'use client';

import { Check } from 'lucide-react';

export function RememberMeToggle({
  checked,
  onChange,
  label = 'Remember this device',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      className="flex items-center gap-2.5 text-[13px] select-none"
      style={{ color: 'var(--g-text-secondary)' }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-strong)'}`,
          background: checked ? 'var(--g-accent)' : 'transparent',
          transition: 'background 160ms ease, border-color 160ms ease',
        }}
      >
        {checked && <Check size={11} strokeWidth={3} className="text-white" />}
      </span>
      {label}
    </button>
  );
}
