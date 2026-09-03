'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import DepositMethodGrid, { type DepositMethod } from '@/components/portal/wallet/DepositMethodGrid';
import DepositAmount from '@/components/portal/wallet/DepositAmount';
import DepositSummary from '@/components/portal/wallet/DepositSummary';
import DepositInstructions from '@/components/portal/wallet/DepositInstructions';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/wallet/money';

interface DepositResponse {
  ok: boolean;
  data?: { reference: string; status: string; estimated_eta: string };
  error?: string;
}

function DepositForm() {
  const search = useSearchParams();
  const ccyFromUrl = (search.get('ccy') ?? 'USD').toUpperCase() as SupportedCurrency;
  const initialCcy: SupportedCurrency = SUPPORTED_CURRENCIES.includes(ccyFromUrl) ? ccyFromUrl : 'USD';

  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(initialCcy);
  const [network, setNetwork] = useState('TRC20');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string; eta: string } | null>(null);

  useEffect(() => { setError(null); }, [method, amount, currency]);

  const eta =
    method === 'bank_wire' ? '1–3 business days'
    : method === 'crypto'  ? '10–30 minutes'
    : method === 'card' || method === 'upi' ? 'Instant'
    : 'Varies';

  async function submit() {
    if (submitting) return;
    setError(null);
    if (!method) return setError('Pick a deposit method to continue.');
    if (!amount || amount === '0') return setError('Enter an amount.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          amount,
          currency,
          ...(method === 'crypto' ? { network } : {}),
        }),
      });
      const body: DepositResponse = await res.json();
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error || 'Deposit failed. Please retry.');
        setSubmitting(false);
        return;
      }
      setResult({ reference: body.data.reference, eta: body.data.estimated_eta });
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto">
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
            Deposit recorded
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            We&apos;ve created a pending entry in your wallet. Send the funds using the instructions
            for your method and quote the reference below — funds credit automatically once we
            match the transfer.
          </p>

          <div
            className="mt-5 inline-flex items-center gap-3 rounded-lg px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--g-text-muted)' }}>
              Reference
            </span>
            <span className="num text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {result.reference}
            </span>
          </div>

          <div className="mt-3 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            ETA: {result.eta}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/wallet"
              className="text-[13px] hover:underline"
              style={{ color: 'var(--g-text-secondary)' }}
            >
              ← Back to wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <BackLink />
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Deposit funds
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Pick a method, enter the amount, and follow the on-screen instructions to settle.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section>
            <StepLabel index={1}>Choose method</StepLabel>
            <DepositMethodGrid value={method} onChange={setMethod} />
          </section>

          <section>
            <StepLabel index={2}>Amount</StepLabel>
            <DepositAmount
              amount={amount}
              currency={currency}
              method={method}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
            />
          </section>

          {method && (
            <section>
              <StepLabel index={3}>Pay</StepLabel>
              <DepositInstructions
                method={method}
                reference="GR-DEP-PREVIEW"
                network={network}
                onNetworkChange={setNetwork}
              />
            </section>
          )}

          {error && <InlineError message={error} />}
        </div>

        <div className="lg:sticky lg:top-4 self-start space-y-3">
          <DepositSummary method={method} amount={amount || '0'} currency={currency} eta={eta} />
          <PrimaryButton onClick={submit} loading={submitting} disabled={!method || !amount}>
            Confirm deposit
          </PrimaryButton>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            We&apos;ll record a pending entry in your wallet. Funds credit once compliance and
            finance reconcile the transfer.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepLabel({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="num inline-flex items-center justify-center text-[11px] font-medium"
        style={{
          width: 22, height: 22, borderRadius: 22,
          background: 'rgba(220,38,38,0.12)',
          color: 'var(--g-accent)',
        }}
      >
        {index}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
        {children}
      </span>
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

export default function DepositPage() {
  return (
    <Suspense fallback={<div />}>
      <DepositForm />
    </Suspense>
  );
}
