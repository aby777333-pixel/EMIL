'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import WizardStepper, { type WizardStepIndex } from '@/components/portal/accounts/WizardStepper';
import {
  AccountTypeStep,
  PlatformStep,
  SettingsStep,
} from '@/components/portal/accounts/WizardSteps';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import {
  ACCOUNT_TYPES,
  PLATFORMS,
  LEVERAGE_TIERS,
  prettyAccountType,
  type AccountTypeId,
  type PlatformId,
  type BaseCurrency,
  type LeverageTier,
} from '@/lib/accounts/types';
import { currencySymbol } from '@/lib/wallet/money';

interface CreateResponse {
  ok: boolean;
  data?: {
    id: string;
    account_number: string;
    account_type: string;
    platform: string;
    currency: string;
    leverage: number;
    is_demo: boolean;
  };
  error?: string;
}

export default function OpenAccountPage() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStepIndex>(0);
  const [type, setType] = useState<AccountTypeId | null>(null);
  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>('USD');
  const [leverage, setLeverage] = useState<LeverageTier>(100);
  const [swapFree, setSwapFree] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateResponse['data'] | null>(null);

  const typeSpec = type ? ACCOUNT_TYPES.find((t) => t.id === type) : null;
  const platformSpec = platform ? PLATFORMS.find((p) => p.id === platform) : null;
  const maxLeverage = typeSpec?.maxLeverage ?? 100;

  const canAdvance = useMemo(() => {
    if (step === 0) return !!type;
    if (step === 1) return !!platform;
    if (step === 2) return (LEVERAGE_TIERS as readonly number[]).includes(leverage);
    return agreed;
  }, [step, type, platform, leverage, agreed]);

  function next() {
    if (!canAdvance) return;
    if (step < 3) setStep((s) => (s + 1) as WizardStepIndex);
  }
  function back() {
    if (step > 0) setStep((s) => (s - 1) as WizardStepIndex);
  }

  // Clamp leverage when account type changes to a lower max.
  function pickType(id: AccountTypeId) {
    setType(id);
    const spec = ACCOUNT_TYPES.find((t) => t.id === id);
    if (spec && leverage > spec.maxLeverage) {
      setLeverage(Math.min(spec.maxLeverage, leverage) as LeverageTier);
    }
  }

  async function submit() {
    if (!canAdvance || submitting) return;
    if (!type || !platform) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type: type,
          platform,
          base_currency: baseCurrency,
          leverage,
          swap_free: swapFree,
          agreed_to_terms: true,
        }),
      });
      const body: CreateResponse = await res.json();
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error || 'Failed to open account.');
        setSubmitting(false);
        return;
      }
      setCreated(body.data);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
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
            Account opened
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            Your new {prettyAccountType(created.account_type)} account is provisioned. Trading
            credentials will be emailed within a minute.
          </p>

          <div
            className="mt-5 inline-flex items-center gap-3 rounded-lg px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--g-text-muted)' }}>
              Account
            </span>
            <span className="num text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              #{created.account_number}
            </span>
          </div>

          <div className="mt-3 num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            {created.platform.toUpperCase()} · 1:{created.leverage} · {created.currency}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <SecondaryButton
              onClick={() => router.push(`/dashboard/wallet/deposit?ccy=${created.currency}`)}
              className="!w-auto !px-5"
            >
              Fund this account
            </SecondaryButton>
            <SecondaryButton
              onClick={() => router.push('/dashboard/accounts')}
              className="!w-auto !px-5"
            >
              View all accounts
            </SecondaryButton>
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
          Open new account
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Four steps. Provisioning is instant — credentials arrive by email within a minute.
        </p>
      </header>

      <WizardStepper current={step} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="min-h-[320px]">
          {step === 0 && <AccountTypeStep value={type} onChange={pickType} />}
          {step === 1 && <PlatformStep value={platform} onChange={setPlatform} />}
          {step === 2 && (
            <SettingsStep
              baseCurrency={baseCurrency}
              leverage={leverage}
              swapFree={swapFree}
              maxAllowedLeverage={maxLeverage}
              onBaseCurrencyChange={setBaseCurrency}
              onLeverageChange={setLeverage}
              onSwapFreeChange={setSwapFree}
            />
          )}
          {step === 3 && (
            <ConfirmStep
              type={type}
              platform={platform}
              baseCurrency={baseCurrency}
              leverage={leverage}
              swapFree={swapFree}
              agreed={agreed}
              onAgreedChange={setAgreed}
            />
          )}

          {error && <div className="mt-4"><InlineError message={error} /></div>}

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <SecondaryButton onClick={back} className="!w-auto !px-5">Back</SecondaryButton>
            )}
            {step < 3 ? (
              <PrimaryButton onClick={next} disabled={!canAdvance} className="!w-auto !px-6">
                Continue
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={submit} loading={submitting} disabled={!canAdvance} className="!w-auto !px-6">
                Open account
              </PrimaryButton>
            )}
          </div>
        </div>

        <SummaryRail
          type={type}
          platform={platform}
          baseCurrency={baseCurrency}
          leverage={leverage}
          swapFree={swapFree}
        />
      </div>
    </div>
  );
}

function ConfirmStep({
  type,
  platform,
  baseCurrency,
  leverage,
  swapFree,
  agreed,
  onAgreedChange,
}: {
  type: AccountTypeId | null;
  platform: PlatformId | null;
  baseCurrency: BaseCurrency;
  leverage: LeverageTier;
  swapFree: boolean;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
}) {
  const typeSpec = type ? ACCOUNT_TYPES.find((t) => t.id === type) : null;
  const platformSpec = platform ? PLATFORMS.find((p) => p.id === platform) : null;
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <p className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        Review your selections. You can change all of these later from the account settings.
      </p>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-[13px]">
        <ConfirmRow label="Account type" value={typeSpec?.label ?? '—'} />
        <ConfirmRow label="Platform" value={platformSpec?.label ?? '—'} />
        <ConfirmRow label="Base currency" value={`${currencySymbol(baseCurrency)} ${baseCurrency}`} />
        <ConfirmRow label="Leverage" value={`1:${leverage}`} mono />
        <ConfirmRow label="Swap" value={swapFree ? 'Swap-free (Islamic)' : 'Standard'} />
        <ConfirmRow
          label="Min deposit"
          value={typeSpec?.isDemo ? 'Free (virtual)' : `$${typeSpec?.minDepositUsd ?? 0}`}
          mono
        />
      </dl>

      <label className="flex items-start gap-2.5 text-[12px] leading-snug pt-2 border-t" style={{ color: 'var(--g-text-secondary)', borderColor: 'var(--g-border-hair)' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 accent-[var(--g-accent)]"
          style={{ width: 14, height: 14 }}
        />
        <span>
          I&apos;ve read the trading conditions, the risk disclosure, and the terms applicable
          to this account type. I understand that {leverage >= 500
            ? 'high leverage can result in losses exceeding initial margin'
            : 'leveraged trading carries substantial risk'}.
        </span>
      </label>
    </div>
  );
}

function ConfirmRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>{label}</dt>
      <dd
        className={mono ? 'num' : ''}
        style={{ color: 'var(--g-text-primary)' }}
      >
        {value}
      </dd>
    </>
  );
}

function SummaryRail({
  type,
  platform,
  baseCurrency,
  leverage,
  swapFree,
}: {
  type: AccountTypeId | null;
  platform: PlatformId | null;
  baseCurrency: BaseCurrency;
  leverage: LeverageTier;
  swapFree: boolean;
}) {
  const typeSpec = type ? ACCOUNT_TYPES.find((t) => t.id === type) : null;
  const platformSpec = platform ? PLATFORMS.find((p) => p.id === platform) : null;

  return (
    <aside
      className="rounded-xl p-5 lg:sticky lg:top-4 self-start"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--g-text-secondary)' }}>
        Summary
      </div>
      <SummaryRow label="Type" value={typeSpec?.label ?? '—'} />
      <SummaryRow label="Platform" value={platformSpec?.label ?? '—'} />
      <SummaryRow label="Currency" value={`${currencySymbol(baseCurrency)} ${baseCurrency}`} />
      <SummaryRow label="Leverage" value={`1:${leverage}`} mono />
      <SummaryRow label="Swap" value={swapFree ? 'Swap-free' : 'Standard'} />
    </aside>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1.5">
      <span style={{ color: 'var(--g-text-muted)' }}>{label}</span>
      <span
        className={mono ? 'num' : ''}
        style={{ color: 'var(--g-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/accounts"
      className="inline-flex items-center gap-1.5 text-[12px] mb-6 hover:underline"
      style={{ color: 'var(--g-text-secondary)' }}
    >
      <ArrowLeft size={13} /> Back to accounts
    </Link>
  );
}
