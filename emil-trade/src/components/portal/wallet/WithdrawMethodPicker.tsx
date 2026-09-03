'use client';

import { Building2, Smartphone, Bitcoin } from 'lucide-react';

export type WithdrawMethod = 'bank_wire' | 'upi' | 'crypto';

const METHODS: {
  id: WithdrawMethod;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  eta: string;
}[] = [
  { id: 'bank_wire', icon: Building2,  label: 'Bank wire',          eta: '1–3 business days' },
  { id: 'upi',       icon: Smartphone, label: 'UPI',                eta: 'Same day' },
  { id: 'crypto',    icon: Bitcoin,    label: 'Crypto (USDT TRC20)', eta: 'Within 30 min' },
];

/**
 * Withdraw method selector. Per-spec rule: same beneficiary as the
 * original deposit method when possible — that AML check happens
 * in the API, not the picker. Card refunds aren't offered as a user
 * action because card refunds settle through the same PSP route as
 * the deposit and don't need a separate flow.
 */
export default function WithdrawMethodPicker({
  value,
  onChange,
}: {
  value: WithdrawMethod | null;
  onChange: (m: WithdrawMethod) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {METHODS.map((m) => {
        const Icon = m.icon;
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={selected}
            className="text-left rounded-xl p-4 transition-all"
            style={{
              background: selected ? 'rgba(220,38,38,0.06)' : 'var(--g-bg-surface)',
              border: `1px solid ${selected ? 'var(--g-accent)' : 'var(--g-border-hair)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: selected ? 'var(--g-accent)' : 'rgba(255,255,255,0.04)',
                color: selected ? '#fff' : 'var(--g-text-secondary)',
              }}
            >
              <Icon size={15} />
            </span>
            <div className="mt-3 text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {m.label}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              {m.eta}
            </div>
          </button>
        );
      })}
    </div>
  );
}
