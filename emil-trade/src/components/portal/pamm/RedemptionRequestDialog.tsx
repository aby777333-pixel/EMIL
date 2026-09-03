'use client';

import { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import { X, AlertTriangle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { Field } from '@/components/auth/Field';
import { formatMoney } from '@/lib/wallet/money';
import type { PammManager, PammSubscription, RedemptionRequest } from '@/lib/pamm/types';

/**
 * Redemption dialog. Per spec: amount-or-full toggle + lockup-penalty
 * disclosure if the user is still inside the manager's lockup window.
 */
export default function RedemptionRequestDialog({
  manager,
  subscription,
  open,
  onClose,
  onSubmit,
}: {
  manager: PammManager | null;
  subscription: PammSubscription | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (request: RedemptionRequest) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [mode, setMode] = useState<'partial' | 'full'>('partial');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode('partial');
      setAmount('');
      setError(null);
    }
  }, [open, manager?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !manager || !subscription) return null;

  const equity = new Decimal(subscription.current_equity);

  // In-lockup check.
  const investedAt = new Date(subscription.invested_at).getTime();
  const lockupEndsAt = investedAt + manager.lockup_days * 24 * 60 * 60 * 1000;
  const inLockup = Date.now() < lockupEndsAt;
  const lockupRemainingDays = Math.max(0, Math.ceil((lockupEndsAt - Date.now()) / (24 * 60 * 60 * 1000)));

  const amountValid =
    mode === 'full' ||
    (amount && /^\d+(\.\d{1,2})?$/.test(amount) && new Decimal(amount).greaterThan(0) && new Decimal(amount).lessThanOrEqualTo(equity));
  const canSubmit = amountValid && !submitting;

  function setAmountSafe(raw: string) {
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setAmount(raw.replace(/^0+(?=\d)/, ''));
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const finalAmount = mode === 'full' ? equity.toFixed(2) : amount;
    const res = await onSubmit({ amount: finalAmount, full: mode === 'full' });
    if (!res.ok) {
      setError(res.error ?? 'Failed to submit redemption.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-center justify-center px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div
        role="dialog"
        aria-label={`Redeem from ${manager.name}`}
        className="relative w-full max-w-md rounded-xl"
        style={{
          background: 'var(--g-bg-elevated)',
          border: '1px solid var(--g-border-hair)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <header
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <h2 className="text-[14px] font-medium m-0" style={{ color: 'var(--g-text-primary)' }}>
            Redeem from {manager.name}
          </h2>
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
          <div
            className="flex items-baseline justify-between rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
              Current equity
            </span>
            <span className="num text-[18px]" style={{ color: 'var(--g-text-primary)' }}>
              {formatMoney(subscription.current_equity, 'USD')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ModeChoice
              checked={mode === 'partial'}
              onChange={() => setMode('partial')}
              title="Partial"
              subtitle="Specify how much to redeem."
            />
            <ModeChoice
              checked={mode === 'full'}
              onChange={() => { setMode('full'); setAmount(equity.toFixed(2)); }}
              title="Full redemption"
              subtitle="Close the position entirely."
            />
          </div>

          {mode === 'partial' && (
            <Field
              label="Amount (USD)"
              value={amount}
              onChange={(e) => setAmountSafe(e.target.value)}
              inputMode="decimal"
              className="num"
              placeholder="0.00"
              hint={`Up to ${formatMoney(subscription.current_equity, 'USD')}.`}
            />
          )}

          {inLockup && (
            <div
              className="flex items-start gap-2.5 rounded-lg p-3 text-[12px]"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: 'var(--g-text-secondary)',
              }}
            >
              <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="shrink-0 mt-px" />
              <div>
                Still inside the {manager.lockup_days}-day lockup —{' '}
                <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                  {lockupRemainingDays}
                </span>{' '}
                day{lockupRemainingDays === 1 ? '' : 's'} remaining. The request will queue and
                process at the next redemption window after lockup expires.
              </div>
            </div>
          )}

          <p className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Redemptions process per the manager&apos;s window: {manager.redemption_window}. Final
            settled amount is calculated at the next NAV strike after approval.
          </p>

          {error && <InlineError message={error} />}
        </div>

        <footer
          className="px-5 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} loading={submitting} disabled={!canSubmit} className="!w-auto !px-5">
            Submit redemption
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}

function ModeChoice({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className="text-left rounded-lg p-3 transition-colors"
      style={{
        background: checked ? 'rgba(220,38,38,0.06)' : 'transparent',
        border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
      }}
    >
      <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>{title}</div>
      <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--g-text-muted)' }}>{subtitle}</div>
    </button>
  );
}
