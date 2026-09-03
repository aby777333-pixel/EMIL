'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { formatMoney } from '@/lib/wallet/money';

export interface TransferAccount {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  balance: string;
  is_demo: boolean;
}

interface TransferResponse {
  ok: boolean;
  data?: { reference: string; from_balance: string; to_balance: string };
  error?: string;
}

export default function TransferClient({ accounts }: { accounts: TransferAccount[] }) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransferResponse['data'] | null>(null);

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);

  const sameCurrency = !!from && !!to && from.currency === to.currency;
  const sameAccount = fromId === toId;
  const amountValid = !!amount && Number(amount) > 0 && !!from && Number(amount) <= Number(from.balance);

  const validations = useMemo(() => {
    const out: string[] = [];
    if (!from || !to) out.push('Pick a source and a destination account.');
    if (sameAccount) out.push('Source and destination must differ.');
    if (from && to && !sameCurrency) out.push(`Currency mismatch: ${from.currency} → ${to.currency}. Use Convert for cross-currency.`);
    if (amount && from && !amountValid) out.push(`Insufficient balance — you have ${from.balance} ${from.currency} on the source account.`);
    return out;
  }, [from, to, sameAccount, sameCurrency, amount, amountValid]);

  const canSubmit = !!from && !!to && !sameAccount && sameCurrency && amountValid && !submitting;

  function setAmountSafe(raw: string) {
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setAmount(raw.replace(/^0+(?=\d)/, ''));
      setError(null);
    }
  }

  async function submit() {
    if (!canSubmit || !from || !to) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account_id: fromId,
          to_account_id: toId,
          amount,
        }),
      });
      const body: TransferResponse = await res.json();
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error || 'Transfer failed.');
        setSubmitting(false);
        return;
      }
      setResult(body.data);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (accounts.length < 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink />
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <h1 className="text-[22px] font-light" style={{ color: 'var(--g-text-primary)' }}>
            Open a second account first
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            Internal transfers move funds between two of your trading accounts. Open at least one
            more account to enable transfers.
          </p>
          <Link
            href="/dashboard/positions"
            className="inline-flex items-center justify-center mt-6 px-5 h-10 rounded-md text-[13px] font-medium"
            style={{ background: 'var(--g-accent)', color: '#fff', border: '1px solid var(--g-accent)' }}
          >
            Open new account
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink />
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 52, height: 52, borderRadius: 999,
              background: 'rgba(16,185,129,0.12)',
              color: 'var(--g-buy)',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <h1 className="text-[22px] font-light" style={{ color: 'var(--g-text-primary)' }}>
            Transfer complete
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            Funds moved instantly between your accounts.
          </p>

          <div
            className="mt-5 grid grid-cols-2 gap-3 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 12 }}
          >
            <Stat label={from!.account_number} value={formatMoney(result.from_balance, from!.currency)} />
            <Stat label={to!.account_number} value={formatMoney(result.to_balance, to!.currency)} />
          </div>

          <div className="mt-3 text-[11px] num" style={{ color: 'var(--g-text-muted)' }}>
            {result.reference}
          </div>

          <Link
            href="/dashboard/wallet"
            className="inline-block mt-6 text-[13px] hover:underline"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            ← Back to wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink />
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Internal transfer
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Move funds between two of your trading accounts. Same currency only — use Convert for FX.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch mb-6">
        <AccountPicker label="From" value={fromId} onChange={setFromId} accounts={accounts} excludeId={toId} />
        <div className="hidden md:flex items-center justify-center" style={{ color: 'var(--g-text-muted)' }}>
          <ArrowRight size={18} />
        </div>
        <AccountPicker label="To" value={toId} onChange={setToId} accounts={accounts} excludeId={fromId} />
      </div>

      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
          Amount
        </div>
        <div className="flex items-center justify-between mb-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          <span>Available on source: {from ? formatMoney(from.balance, from.currency) : '—'}</span>
          {from && (
            <button
              type="button"
              onClick={() => setAmountSafe(from.balance)}
              className="hover:underline"
              style={{ color: 'var(--g-accent)' }}
            >
              Transfer all
            </button>
          )}
        </div>
        <div
          className="flex items-stretch rounded-lg overflow-hidden"
          style={{ background: 'var(--g-bg-surface)', border: '1px solid var(--g-border-soft)' }}
        >
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmountSafe(e.target.value)}
            placeholder="0.00"
            className="num flex-1 bg-transparent outline-none px-4 text-[24px] font-medium py-3"
            style={{ color: 'var(--g-text-primary)' }}
          />
          <span
            className="flex items-center justify-center px-4 text-[14px] border-l"
            style={{
              color: 'var(--g-text-secondary)',
              borderColor: 'var(--g-border-hair)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {from?.currency ?? '—'}
          </span>
        </div>
      </div>

      {validations.length > 0 && amount && (
        <div className="mb-4 text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
          {validations.map((v, i) => <div key={i}>· {v}</div>)}
        </div>
      )}

      {error && <InlineError message={error} />}

      <div className="mt-2">
        <PrimaryButton onClick={submit} loading={submitting} disabled={!canSubmit} className="!w-auto !px-6">
          Transfer funds
        </PrimaryButton>
      </div>
    </div>
  );
}

function AccountPicker({
  label,
  value,
  onChange,
  accounts,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  accounts: TransferAccount[];
  excludeId?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num w-full bg-transparent outline-none px-3 py-3 rounded-lg text-[13px]"
        style={{
          color: 'var(--g-text-primary)',
          background: 'var(--g-bg-surface)',
          border: '1px solid var(--g-border-soft)',
        }}
      >
        {accounts.map((a) => (
          <option
            key={a.id}
            value={a.id}
            disabled={a.id === excludeId}
            style={{ background: '#16161A', color: '#F5F5F7' }}
          >
            {a.account_number} · {prettyType(a.account_type)} · {formatMoney(a.balance, a.currency)} {a.is_demo ? '(demo)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </div>
      <div className="num text-[14px] font-medium mt-0.5" style={{ color: 'var(--g-text-primary)' }}>
        New balance: {value}
      </div>
    </div>
  );
}

function prettyType(t: string): string {
  return t.split(/[_\s]/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function BackLink() {
  return (
    <Link
      href="/dashboard/wallet"
      className="inline-flex items-center gap-1.5 text-[12px] mb-6 hover:underline"
      style={{ color: 'var(--g-text-secondary)' }}
    >
      <ArrowLeft size={13} /> Back to wallet
    </Link>
  );
}
