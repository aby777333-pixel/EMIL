'use client';

import {
  Building2,
  CreditCard,
  Smartphone,
  Bitcoin,
  Globe2,
  Ticket,
} from 'lucide-react';
import { METHOD_FEE_RATE } from '@/lib/wallet/money';

export type DepositMethod = 'bank_wire' | 'card' | 'upi' | 'crypto' | 'local' | 'voucher';

const METHODS: {
  id: DepositMethod;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  eta: string;
  /** True if this method is wired up end-to-end. False = informational placeholder. */
  enabled: boolean;
}[] = [
  { id: 'bank_wire', icon: Building2,  label: 'Bank wire',  eta: '1–3 days',  enabled: true },
  { id: 'card',      icon: CreditCard, label: 'Card',       eta: 'Instant',   enabled: false },
  { id: 'upi',       icon: Smartphone, label: 'UPI',        eta: 'Instant',   enabled: true },
  { id: 'crypto',    icon: Bitcoin,    label: 'Crypto',     eta: '10–30 min', enabled: true },
  { id: 'local',     icon: Globe2,     label: 'Local PSP',  eta: 'Varies',    enabled: false },
  { id: 'voucher',   icon: Ticket,     label: 'Voucher',    eta: 'Instant',   enabled: false },
];

/**
 * Six-card deposit method picker. Disabled methods render dimmed with
 * a "Coming soon" pill so the surface area looks complete even before
 * each PSP integration is wired.
 */
export default function DepositMethodGrid({
  value,
  onChange,
}: {
  value: DepositMethod | null;
  onChange: (method: DepositMethod) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {METHODS.map((m) => {
        const Icon = m.icon;
        const selected = value === m.id;
        const fee = METHOD_FEE_RATE[m.id]?.toNumber() ?? 0;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => m.enabled && onChange(m.id)}
            disabled={!m.enabled}
            aria-pressed={selected}
            className="text-left rounded-xl p-4 transition-all"
            style={{
              background: selected ? 'rgba(220,38,38,0.06)' : 'var(--g-bg-surface)',
              border: `1px solid ${selected ? 'var(--g-accent)' : 'var(--g-border-hair)'}`,
              opacity: m.enabled ? 1 : 0.55,
              cursor: m.enabled ? 'pointer' : 'not-allowed',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="flex items-center justify-center"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: selected ? 'var(--g-accent)' : 'rgba(255,255,255,0.04)',
                  color: selected ? '#fff' : 'var(--g-text-secondary)',
                  transition: 'background 160ms ease',
                }}
              >
                <Icon size={15} />
              </span>
              {!m.enabled && (
                <span
                  className="text-[9px] font-medium uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                >
                  Soon
                </span>
              )}
            </div>

            <div className="mt-3 text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {m.label}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              {m.eta}
            </div>
            <div className="mt-1 text-[10px] num" style={{ color: 'var(--g-text-muted)' }}>
              Fee {fee === 0 ? '0%' : `${(fee * 100).toFixed(1)}%`}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { METHODS };
