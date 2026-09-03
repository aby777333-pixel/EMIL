'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import AvailableBalancePanel from '@/components/portal/wallet/AvailableBalancePanel';
import WithdrawMethodPicker, { type WithdrawMethod } from '@/components/portal/wallet/WithdrawMethodPicker';
import DestinationForm, { type Destination } from '@/components/portal/wallet/DestinationForm';
import WithdrawAmountInput from '@/components/portal/wallet/WithdrawAmountInput';
import WithdrawalRulesPanel from '@/components/portal/wallet/WithdrawalRulesPanel';
import TwoFactorInput from '@/components/auth/TwoFactorInput';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/wallet/money';

interface BalanceMap {
  [currency: string]: { available: string; locked: string; pending: string };
}

interface WithdrawResponse {
  ok: boolean;
  data?: {
    reference: string;
    status: string;
    estimated_eta: string;
    large_transaction_flag: boolean;
  };
  error?: string;
}

export default function WithdrawClient({
  balances,
  defaultCurrency,
  beneficiaryName,
}: {
  balances: BalanceMap;
  defaultCurrency: string;
  beneficiaryName: string;
}) {
  const [currency, setCurrency] = useState<SupportedCurrency>(
    (SUPPORTED_CURRENCIES as readonly string[]).includes(defaultCurrency)
      ? (defaultCurrency as SupportedCurrency)
      : 'USD',
  );
  const [method, setMethod] = useState<WithdrawMethod | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawResponse['data'] | null>(null);

  const balance = balances[currency] ?? { available: '0.00', locked: '0.00', pending: '0.00' };

  // Reset destination when method changes — different shapes.
  useEffect(() => { setDestination(null); }, [method]);
  useEffect(() => { setError(null); }, [method, currency, amount]);

  const destinationValid = useMemo(() => {
    if (!destination) return false;
    if (destination.kind === 'bank') {
      return (
        destination.beneficiary_name.length >= 2 &&
        destination.bank_name.length >= 2 &&
        destination.account_number.length >= 4 &&
        destination.swift_or_ifsc.length >= 4
      );
    }
    if (destination.kind === 'upi') {
      return destination.beneficiary_name.length >= 2 && /[a-z0-9._-]+@[a-z]+/i.test(destination.upi_id);
    }
    return destination.address.length >= 20;
  }, [destination]);

  const amountValid =
    !!amount &&
    !!Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= Number(balance.available);

  const canRequestOtp = !!method && destinationValid && amountValid;

  function prefillBeneficiary() {
    if (!method) return;
    if (method === 'bank_wire') {
      setDestination({
        kind: 'bank',
        beneficiary_name: beneficiaryName,
        bank_name: '',
        account_number: '',
        swift_or_ifsc: '',
      });
    } else if (method === 'upi') {
      setDestination({ kind: 'upi', beneficiary_name: beneficiaryName, upi_id: '' });
    } else {
      setDestination({ kind: 'crypto', network: 'TRC20', address: '' });
    }
  }

  async function submit() {
    if (submitting) return;
    setError(null);
    if (!method || !destination) {
      setError('Pick a method and fill in the destination.');
      return;
    }
    if (!amountValid) {
      setError('Enter an amount within your available balance.');
      return;
    }
    if (otp.length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          amount,
          currency,
          destination,
          otp,
        }),
      });
      const body: WithdrawResponse = await res.json();
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error || 'Withdrawal failed. Please retry.');
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
            Withdrawal submitted
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            Your request is in the finance review queue.{' '}
            {result.large_transaction_flag
              ? 'Amounts above the standard threshold are reviewed manually — expect a brief delay.'
              : 'Standard reviews complete the same business day.'}{' '}
            We&apos;ll notify you the moment funds leave the platform.
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
            ETA: {result.estimated_eta}
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
    <div className="max-w-5xl mx-auto">
      <BackLink />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
            Withdraw funds
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            Funds settle to a beneficiary whose name matches your verified ID.
          </p>
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
          className="num bg-transparent text-[12px] px-3 py-2 rounded-md outline-none"
          style={{
            color: 'var(--g-text-primary)',
            border: '1px solid var(--g-border-soft)',
          }}
          aria-label="Source currency"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c} style={{ background: '#16161A' }}>
              {c}
            </option>
          ))}
        </select>
      </header>

      <AvailableBalancePanel
        available={balance.available}
        lockedMargin={balance.locked}
        pendingReview={balance.pending}
        currency={currency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="space-y-6">
          <section>
            <StepLabel index={1}>Method</StepLabel>
            <WithdrawMethodPicker
              value={method}
              onChange={(m) => {
                setMethod(m);
                // Pre-fill the beneficiary name if we know it.
                if (beneficiaryName) {
                  setTimeout(() => {
                    setDestination((curr) => {
                      if (curr) return curr;
                      if (m === 'bank_wire') {
                        return { kind: 'bank', beneficiary_name: beneficiaryName, bank_name: '', account_number: '', swift_or_ifsc: '' };
                      }
                      if (m === 'upi') {
                        return { kind: 'upi', beneficiary_name: beneficiaryName, upi_id: '' };
                      }
                      return { kind: 'crypto', network: 'TRC20', address: '' };
                    });
                  }, 0);
                }
              }}
            />
          </section>

          {method && (
            <section>
              <StepLabel index={2}>Destination</StepLabel>
              <DestinationForm method={method} value={destination} onChange={setDestination} />
              {!destination && method !== 'crypto' && beneficiaryName && (
                <button
                  type="button"
                  onClick={prefillBeneficiary}
                  className="mt-2 text-[11px] hover:underline"
                  style={{ color: 'var(--g-accent)' }}
                >
                  Use my verified name
                </button>
              )}
            </section>
          )}

          {method && (
            <section>
              <StepLabel index={3}>Amount</StepLabel>
              <WithdrawAmountInput
                amount={amount}
                available={balance.available}
                currency={currency}
                onAmountChange={setAmount}
              />
            </section>
          )}

          {method && (
            <section>
              <StepLabel index={4}>Verify</StepLabel>
              {otpRequested ? (
                <div className="space-y-3">
                  <p className="text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
                    Enter the 6-digit code we sent to your registered email and phone.
                    Codes expire in 5 minutes.
                  </p>
                  <TwoFactorInput value={otp} onChange={setOtp} disabled={submitting} />
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canRequestOtp}
                  onClick={() => setOtpRequested(true)}
                  className="g-btn-secondary !w-auto !px-5"
                  style={{ opacity: canRequestOtp ? 1 : 0.5 }}
                >
                  Send verification code
                </button>
              )}
            </section>
          )}

          {error && <InlineError message={error} />}
        </div>

        <div className="space-y-3 lg:sticky lg:top-4 self-start">
          <WithdrawalRulesPanel />
          <PrimaryButton
            onClick={submit}
            loading={submitting}
            disabled={!otpRequested || otp.length !== 6}
          >
            Submit withdrawal
          </PrimaryButton>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            Withdrawals enter the finance review queue. We never auto-approve — your funds are
            held safely on platform until a human signs off.
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
