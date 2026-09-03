'use client';

import { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import { X, AlertTriangle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { LEVERAGE_TIERS, type LeverageTier } from '@/lib/accounts/types';
import type { PortalAccountFull } from './AccountCard';

/**
 * Lightweight modal shell shared by every account-action dialog.
 * Closes on backdrop click + Escape. Wrapped in `.gentleman` so the
 * institutional palette is in scope even when the dialog is rendered
 * via a portal-style fixed overlay.
 */
function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-center justify-center px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      />
      <div
        role="dialog"
        aria-label={title}
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
            {title}
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
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Leverage change dialog — slider snaps to allowed tiers, surfaces the
 * margin-impact delta so users understand what shifting from 1:200 to
 * 1:500 actually does to their free margin.
 */
export function LeverageChangeDialog({
  account,
  open,
  onClose,
  onSubmit,
}: {
  account: PortalAccountFull | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (newLeverage: LeverageTier) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [newLeverage, setNewLeverage] = useState<LeverageTier>(LEVERAGE_TIERS[2]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      const cur = (LEVERAGE_TIERS as readonly number[]).includes(account.leverage)
        ? (account.leverage as LeverageTier)
        : LEVERAGE_TIERS[2];
      setNewLeverage(cur);
    }
    setError(null);
  }, [account, open]);

  async function submit() {
    if (!account || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(newLeverage);
    if (!res.ok) {
      setError(res.error ?? 'Failed to change leverage.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  if (!account) return null;
  const isHighRisk = newLeverage >= 500;

  return (
    <ModalShell open={open} title="Change leverage" onClose={onClose}>
      <p className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        Account <span className="num" style={{ color: 'var(--g-text-primary)' }}>#{account.account_number}</span>{' '}
        is currently at <span className="num">1:{account.leverage}</span>.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
            New leverage
          </span>
          <span className="num text-[14px]" style={{ color: 'var(--g-text-primary)' }}>
            1:{newLeverage}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LEVERAGE_TIERS.map((t) => {
            const active = newLeverage === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setNewLeverage(t)}
                className="num text-[12px] px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.08)' : 'transparent',
                  color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                }}
              >
                1:{t}
              </button>
            );
          })}
        </div>
      </div>

      {isHighRisk && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-[12px]"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--g-text-secondary)',
          }}
        >
          <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="shrink-0 mt-px" />
          <div>
            High leverage amplifies both gains and losses. A 1% adverse move on a 1:{newLeverage} position
            wipes <span className="num">{(newLeverage / 100).toFixed(1)}%</span> of margin.
          </div>
        </div>
      )}

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      <div className="mt-5 flex gap-3 justify-end">
        <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
        <PrimaryButton
          onClick={submit}
          loading={submitting}
          disabled={newLeverage === account.leverage}
          className="!w-auto !px-5"
        >
          Apply
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

/**
 * Reset password dialog — choose between trading vs investor password,
 * then dispatches a reset email per the platform convention.
 */
export function ResetPasswordDialog({
  account,
  open,
  onClose,
  onSubmit,
}: {
  account: PortalAccountFull | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (kind: 'trading' | 'investor') => Promise<{ ok: boolean; error?: string }>;
}) {
  const [kind, setKind] = useState<'trading' | 'investor'>('trading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => { setError(null); setSent(false); setKind('trading'); }, [account, open]);

  async function submit() {
    if (!account || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(kind);
    if (!res.ok) {
      setError(res.error ?? 'Failed to dispatch reset.');
      setSubmitting(false);
      return;
    }
    setSent(true);
    setSubmitting(false);
  }

  if (!account) return null;

  return (
    <ModalShell open={open} title="Reset account password" onClose={onClose}>
      {sent ? (
        <div className="text-center py-4">
          <div className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>
            Reset link sent.
          </div>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
            Check your registered email for instructions to set a new {kind} password for{' '}
            <span className="num">#{account.account_number}</span>.
          </p>
          <SecondaryButton onClick={onClose} className="!w-auto !px-5 mt-5">
            Close
          </SecondaryButton>
        </div>
      ) : (
        <>
          <p className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            We&apos;ll email a one-time link to set a new password. The link expires in 30 minutes.
          </p>

          <div className="mt-5 space-y-2">
            <Choice
              checked={kind === 'trading'}
              onChange={() => setKind('trading')}
              title="Trading password"
              subtitle="Used to place trades, modify positions, and withdraw."
            />
            <Choice
              checked={kind === 'investor'}
              onChange={() => setKind('investor')}
              title="Investor (read-only) password"
              subtitle="Lets a manager or auditor see your account without trading rights."
            />
          </div>

          {error && <div className="mt-4"><InlineError message={error} /></div>}

          <div className="mt-5 flex gap-3 justify-end">
            <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
            <PrimaryButton onClick={submit} loading={submitting} className="!w-auto !px-5">
              Send reset link
            </PrimaryButton>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/** Archive dialog — soft delete with confirmation + reason capture. */
export function ArchiveAccountDialog({
  account,
  open,
  onClose,
  onSubmit,
}: {
  account: PortalAccountFull | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setReason(''); setError(null); }, [account, open]);

  async function submit() {
    if (!account || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(reason);
    if (!res.ok) {
      setError(res.error ?? 'Failed to archive.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  if (!account) return null;
  const hasBalance = !new Decimal(account.balance).isZero();

  return (
    <ModalShell open={open} title="Archive account" onClose={onClose}>
      <p className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        Archiving <span className="num" style={{ color: 'var(--g-text-primary)' }}>#{account.account_number}</span>{' '}
        moves it out of your active list. You can ask support to restore it later.
      </p>

      {hasBalance && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-[12px]"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--g-text-secondary)',
          }}
        >
          <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="shrink-0 mt-px" />
          <div>
            Account still has a non-zero balance. Transfer or withdraw before archiving.
          </div>
        </div>
      )}

      <div className="mt-5">
        <div
          className="text-[11px] uppercase tracking-[0.14em] mb-2"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          Reason (optional)
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Helps us improve the platform — what's prompting the archive?"
          className="g-field"
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      <div className="mt-5 flex gap-3 justify-end">
        <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
        <PrimaryButton
          onClick={submit}
          loading={submitting}
          disabled={hasBalance}
          className="!w-auto !px-5"
        >
          Archive account
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

function Choice({
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
      className="w-full text-left rounded-lg p-3 transition-colors"
      style={{
        background: checked ? 'rgba(220,38,38,0.06)' : 'transparent',
        border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 shrink-0 inline-flex items-center justify-center"
          style={{
            width: 14, height: 14, borderRadius: 14,
            border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-strong)'}`,
            background: checked ? 'var(--g-accent)' : 'transparent',
          }}
        >
          {checked && (
            <span
              style={{ width: 5, height: 5, borderRadius: 5, background: '#fff' }}
            />
          )}
        </span>
        <div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
            {title}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--g-text-muted)' }}>
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
}
