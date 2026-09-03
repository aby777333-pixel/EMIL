'use client';

import { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import { X, Lock, FileSignature } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { Field } from '@/components/auth/Field';
import { formatMoney } from '@/lib/wallet/money';
import type { PammManager, InvestmentSettings } from '@/lib/pamm/types';

/**
 * Investment dialog. Per spec: amount + lockup acknowledgement +
 * profit-share confirmation + e-signature (typed full name).
 *
 * The e-signature pattern matches MAS / SEC retail-investor
 * conventions: an explicit typed name signals intent to be bound,
 * gated behind two prior checkboxes that name the lockup window
 * and the fee schedule the investor is agreeing to.
 */
export default function InvestmentDialog({
  manager,
  open,
  onClose,
  onSubmit,
  legalName,
}: {
  manager: PammManager | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (settings: InvestmentSettings) => Promise<{ ok: boolean; error?: string }>;
  /** the user's verified legal name from the users row, used to validate the signature */
  legalName: string | null;
}) {
  const [amount, setAmount] = useState('');
  const [ackLockup, setAckLockup] = useState(false);
  const [ackFees, setAckFees] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(manager ? String(manager.min_investment_usd) : '');
      setAckLockup(false);
      setAckFees(false);
      setSignature('');
      setError(null);
    }
  }, [open, manager?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !manager) return null;

  const amountDec = amount ? new Decimal(amount) : new Decimal(0);
  const amountValid = amount && /^\d+(\.\d{1,2})?$/.test(amount) && amountDec.greaterThanOrEqualTo(manager.min_investment_usd);
  const signatureValid =
    legalName
      ? signature.trim().toLowerCase() === legalName.trim().toLowerCase()
      : signature.trim().length >= 4;
  const canSubmit = amountValid && ackLockup && ackFees && signatureValid && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit({
      amount,
      acknowledged_lockup: ackLockup,
      acknowledged_profit_share: ackFees,
      signature_name: signature.trim(),
    });
    if (!res.ok) {
      setError(res.error ?? 'Failed to submit investment.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  function setAmountSafe(raw: string) {
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setAmount(raw.replace(/^0+(?=\d)/, ''));
    }
  }

  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-center justify-center px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div
        role="dialog"
        aria-label={`Invest in ${manager.name}`}
        className="relative w-full max-w-lg rounded-xl"
        style={{
          background: 'var(--g-bg-elevated)',
          border: '1px solid var(--g-border-hair)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--g-border-hair)' }}>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate" style={{ color: 'var(--g-text-primary)' }}>
              Invest in {manager.name}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              {manager.manager_name} · {manager.country}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded transition-colors hover:bg-white/[0.04]"
            style={{ color: 'var(--g-text-muted)' }}
          >
            <X size={15} />
          </button>
        </header>

        <div className="p-5 space-y-5">
          <Field
            label="Amount (USD)"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmountSafe(e.target.value)}
            placeholder={String(manager.min_investment_usd)}
            hint={`Minimum ${formatMoney(String(manager.min_investment_usd), 'USD')}.`}
            className="num"
          />

          {amountValid && (
            <div
              className="rounded-lg p-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--g-border-hair)',
              }}
            >
              <SummaryRow
                label="Profit share (above HWM)"
                value={`${manager.profit_share_pct}%`}
              />
              <SummaryRow label="Management fee (annual)" value={`${manager.management_fee_pct}%`} />
              <SummaryRow label="Lockup period" value={`${manager.lockup_days} days`} />
              <SummaryRow label="Redemption window" value={manager.redemption_window} />
              <SummaryRow label="High-water mark" value={manager.high_water_mark ? 'Yes' : 'No'} emphasis={manager.high_water_mark} />
            </div>
          )}

          <Acknowledge
            checked={ackLockup}
            onChange={setAckLockup}
            icon={<Lock size={13} />}
            title={`I understand the ${manager.lockup_days}-day lockup.`}
            subtitle={`Funds cannot be redeemed before ${manager.lockup_days} days have passed since the deposit. Redemptions then process per the manager's window: ${manager.redemption_window}.`}
          />

          <Acknowledge
            checked={ackFees}
            onChange={setAckFees}
            icon={<FileSignature size={13} />}
            title={`I agree to the ${manager.profit_share_pct}% profit share and ${manager.management_fee_pct}% management fee.`}
            subtitle={`Profit share applies only above the high-water mark. Management fee accrues daily and is deducted from NAV at month-end.`}
          />

          <div>
            <div
              className="text-[11px] uppercase tracking-[0.14em] mb-2 flex items-center justify-between"
              style={{ color: 'var(--g-text-secondary)' }}
            >
              <span>E-signature · type your full name</span>
              {legalName && (
                <span className="normal-case tracking-normal" style={{ color: 'var(--g-text-muted)' }}>
                  Must match your verified name
                </span>
              )}
            </div>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={legalName ?? 'Full legal name'}
              className="g-field"
              style={{
                fontFamily: 'cursive, system-ui',
                fontSize: 18,
                fontStyle: 'italic',
              }}
              autoComplete="off"
            />
            {legalName && signature.trim().length > 0 && !signatureValid && (
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--g-pnl-negative)' }}>
                Signature must match the verified name on your profile.
              </p>
            )}
          </div>

          {error && <InlineError message={error} />}
        </div>

        <footer className="px-5 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--g-border-hair)' }}>
          <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} loading={submitting} disabled={!canSubmit} className="!w-auto !px-5">
            Confirm investment
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1">
      <span style={{ color: 'var(--g-text-muted)' }}>{label}</span>
      <span
        className="num"
        style={{
          color: emphasis ? 'var(--g-buy)' : 'var(--g-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Acknowledge({
  checked,
  onChange,
  icon,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full flex items-start gap-3 text-left rounded-lg p-3 transition-colors"
      style={{
        background: checked ? 'rgba(220,38,38,0.05)' : 'transparent',
        border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
      }}
    >
      <span
        aria-hidden
        className="shrink-0 mt-0.5 flex items-center justify-center"
        style={{
          width: 18, height: 18, borderRadius: 4,
          background: checked ? 'var(--g-accent)' : 'transparent',
          border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-strong)'}`,
          color: '#fff',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--g-text-primary)' }}>
          <span style={{ color: 'var(--g-text-muted)' }}>{icon}</span>
          {title}
        </div>
        <div className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--g-text-muted)' }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
