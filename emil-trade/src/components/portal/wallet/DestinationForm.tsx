'use client';

import { Field } from '@/components/auth/Field';
import type { WithdrawMethod } from './WithdrawMethodPicker';

export interface BankDestination {
  kind: 'bank';
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
  swift_or_ifsc: string;
}
export interface UpiDestination {
  kind: 'upi';
  beneficiary_name: string;
  upi_id: string;
}
export interface CryptoDestination {
  kind: 'crypto';
  network: 'TRC20' | 'ERC20';
  address: string;
}
export type Destination = BankDestination | UpiDestination | CryptoDestination;

/**
 * Method-specific destination fields. The beneficiary-name field is
 * present on bank + UPI so the AML same-name check has something to
 * match against. New destinations are subject to a 24h cooldown
 * enforced server-side — the panel shows a hint about it.
 */
export default function DestinationForm({
  method,
  value,
  onChange,
}: {
  method: WithdrawMethod;
  value: Destination | null;
  onChange: (next: Destination) => void;
}) {
  if (method === 'bank_wire') {
    const v: BankDestination = (value && value.kind === 'bank' ? value : {
      kind: 'bank', beneficiary_name: '', bank_name: '', account_number: '', swift_or_ifsc: '',
    });
    const set = (patch: Partial<BankDestination>) => onChange({ ...v, ...patch });
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Beneficiary name"
          value={v.beneficiary_name}
          onChange={(e) => set({ beneficiary_name: e.target.value })}
          required
          hint="Must match the name on your verified ID."
        />
        <Field
          label="Bank name"
          value={v.bank_name}
          onChange={(e) => set({ bank_name: e.target.value })}
          required
        />
        <Field
          label="Account / IBAN"
          value={v.account_number}
          onChange={(e) => set({ account_number: e.target.value })}
          required
          className="num"
          autoComplete="off"
        />
        <Field
          label="SWIFT / IFSC"
          value={v.swift_or_ifsc}
          onChange={(e) => set({ swift_or_ifsc: e.target.value.toUpperCase() })}
          required
          className="num"
          maxLength={11}
        />
      </div>
    );
  }

  if (method === 'upi') {
    const v: UpiDestination = (value && value.kind === 'upi' ? value : {
      kind: 'upi', beneficiary_name: '', upi_id: '',
    });
    const set = (patch: Partial<UpiDestination>) => onChange({ ...v, ...patch });
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Beneficiary name"
          value={v.beneficiary_name}
          onChange={(e) => set({ beneficiary_name: e.target.value })}
          required
          hint="Must match the name on your verified ID."
        />
        <Field
          label="UPI ID"
          value={v.upi_id}
          onChange={(e) => set({ upi_id: e.target.value })}
          required
          className="num"
          placeholder="name@bank"
        />
      </div>
    );
  }

  // crypto
  const v: CryptoDestination = (value && value.kind === 'crypto' ? value : {
    kind: 'crypto', network: 'TRC20', address: '',
  });
  const set = (patch: Partial<CryptoDestination>) => onChange({ ...v, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
          Network
        </div>
        <div className="flex flex-wrap gap-2">
          {(['TRC20', 'ERC20'] as const).map((n) => {
            const active = n === v.network;
            return (
              <button
                key={n}
                type="button"
                onClick={() => set({ network: n })}
                className="text-[12px] px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.08)' : 'transparent',
                  color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                }}
              >
                USDT · {n}
              </button>
            );
          })}
        </div>
      </div>
      <Field
        label={`${v.network} address`}
        value={v.address}
        onChange={(e) => set({ address: e.target.value })}
        required
        className="num"
        hint="Sends on the wrong network are unrecoverable. Triple-check before submitting."
      />
    </div>
  );
}
