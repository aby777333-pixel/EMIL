'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowDown, CheckCircle2 } from 'lucide-react';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  formatMoney,
  currencySymbol,
  quoteConvert,
} from '@/lib/wallet/money';

export interface ConvertWallet {
  currency: string;
  balance: string;
}

interface ConvertResponse {
  ok: boolean;
  data?: { reference: string; rate: string; from_amount: string; to_amount: string; spread_bps: number };
  error?: string;
}

export default function ConvertClient({ wallets }: { wallets: ConvertWallet[] }) {
  const balanceByCcy = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of wallets) map.set(w.currency, w.balance);
    return map;
  }, [wallets]);

  const initialFrom: SupportedCurrency =
    (wallets.find((w) => Number(w.balance) > 0)?.currency as SupportedCurrency) ?? 'USD';
  const initialTo: SupportedCurrency = initialFrom === 'EUR' ? 'USD' : 'EUR';

  const [from, setFrom] = useState<SupportedCurrency>(initialFrom);
  const [to, setTo] = useState<SupportedCurrency>(initialTo);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResponse['data'] | null>(null);

  useEffect(() => { setError(null); }, [from, to, amount]);

  const fromBalance = balanceByCcy.get(from) ?? '0.00';
  const quote = useMemo(() => {
    if (!amount) return null;
    return quoteConvert(from, to, amount);
  }, [from, to, amount]);

  const amountValid = !!amount && Number(amount) > 0 && Number(amount) <= Number(fromBalance);
  const canSubmit = from !== to && amountValid && !!quote && !submitting;

  function setAmountSafe(raw: string) {
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setAmount(raw.replace(/^0+(?=\d)/, ''));
    }
  }

  function flip() {
    const newFrom = to;
    const newTo = from;
    setFrom(newFrom);
    setTo(newTo);
    setAmount('');
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_currency: from, to_currency: to, amount }),
      });
      const body: ConvertResponse = await res.json();
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error || 'Convert failed.');
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
            Conversion complete
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            <span className="num">{formatMoney(result.from_amount, from)}</span> converted to{' '}
            <span className="num" style={{ color: 'var(--g-text-primary)' }}>
              {formatMoney(result.to_amount, to)}
            </span>
          </p>
          <div className="mt-3 num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Rate {result.rate} · spread {result.spread_bps} bps · {result.reference}
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
    <div className="max-w-2xl mx-auto">
      <BackLink />
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Convert currency
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Convert between your portal wallets at the indicative spot rate. Spread is shown before
          you submit — no hidden fees.
        </p>
      </header>

      <Side
        label="From"
        currency={from}
        balance={fromBalance}
        amount={amount}
        editable
        onCurrencyChange={(c) => { if (c === to) setTo(from); setFrom(c); }}
        onAmountChange={setAmountSafe}
        onMax={() => setAmountSafe(fromBalance)}
      />

      <div className="flex justify-center my-2">
        <button
          type="button"
          onClick={flip}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 36, height: 36, borderRadius: 36,
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-soft)',
            color: 'var(--g-text-secondary)',
          }}
          aria-label="Flip currencies"
        >
          <ArrowDown size={14} />
        </button>
      </div>

      <Side
        label="To"
        currency={to}
        balance={balanceByCcy.get(to) ?? '0.00'}
        amount={quote ? quote.to_amount : ''}
        editable={false}
        onCurrencyChange={(c) => { if (c === from) setFrom(to); setTo(c); }}
        onAmountChange={() => {}}
      />

      <div
        className="mt-3 rounded-lg px-4 py-3 text-[12px] flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--g-text-secondary)' }}
      >
        <span>
          1 {from} ={' '}
          <span className="num" style={{ color: 'var(--g-text-primary)' }}>
            {quote?.rate ?? quoteConvert(from, to, '1')?.rate ?? '—'}
          </span>{' '}
          {to}
        </span>
        <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          spread 15 bps
        </span>
      </div>

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      <div className="mt-5">
        <PrimaryButton onClick={submit} loading={submitting} disabled={!canSubmit} className="!w-auto !px-6">
          Convert {amount && quote ? formatMoney(quote.from_amount, from) : ''}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Side({
  label,
  currency,
  balance,
  amount,
  editable,
  onCurrencyChange,
  onAmountChange,
  onMax,
}: {
  label: string;
  currency: SupportedCurrency;
  balance: string;
  amount: string;
  editable: boolean;
  onCurrencyChange: (c: SupportedCurrency) => void;
  onAmountChange: (raw: string) => void;
  onMax?: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
          {label}
        </div>
        <div className="text-[11px] num flex items-center gap-2" style={{ color: 'var(--g-text-muted)' }}>
          Available {formatMoney(balance, currency)}
          {onMax && (
            <button type="button" onClick={onMax} className="hover:underline" style={{ color: 'var(--g-accent)' }}>
              Max
            </button>
          )}
        </div>
      </div>
      <div className="flex items-stretch">
        <span
          className="num flex items-center px-2 text-[18px]"
          style={{ color: 'var(--g-text-muted)', minWidth: 32 }}
        >
          {currencySymbol(currency)}
        </span>
        <input
          inputMode={editable ? 'decimal' : 'none'}
          readOnly={!editable}
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className="num flex-1 bg-transparent outline-none px-1 text-[24px] font-medium"
          style={{ color: editable ? 'var(--g-text-primary)' : 'var(--g-text-secondary)' }}
        />
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as SupportedCurrency)}
          className="num bg-transparent text-[14px] px-3 outline-none border-l"
          style={{
            color: 'var(--g-text-secondary)',
            borderColor: 'var(--g-border-hair)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c} style={{ background: '#16161A' }}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
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
