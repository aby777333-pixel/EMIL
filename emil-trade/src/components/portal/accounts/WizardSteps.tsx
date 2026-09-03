'use client';

import {
  ACCOUNT_TYPES,
  PLATFORMS,
  SUPPORTED_BASE_CURRENCIES,
  LEVERAGE_TIERS,
  type AccountTypeId,
  type PlatformId,
  type BaseCurrency,
  type LeverageTier,
} from '@/lib/accounts/types';
import { currencySymbol } from '@/lib/wallet/money';

/** Step 1 — Account type cards. */
export function AccountTypeStep({
  value,
  onChange,
}: {
  value: AccountTypeId | null;
  onChange: (id: AccountTypeId) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      {ACCOUNT_TYPES.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={selected}
            className="text-left rounded-xl p-5 transition-all"
            style={{
              background: selected ? 'rgba(220,38,38,0.06)' : 'var(--g-bg-surface)',
              border: `1px solid ${selected ? 'var(--g-accent)' : 'var(--g-border-hair)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-baseline justify-between">
              <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
                {t.label}
              </div>
              {t.isDemo && (
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(220,38,38,0.14)', color: 'var(--g-accent)' }}
                >
                  Demo
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-snug" style={{ color: 'var(--g-text-secondary)' }}>
              {t.blurb}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <Row label="Spread from" value={`${t.spreadFromPips} pip`} />
              <Row label="Commission" value={`$${t.commissionPerLot}/lot`} />
              <Row label="Min deposit" value={t.isDemo ? 'Free' : `$${t.minDepositUsd}`} />
              <Row label="Max leverage" value={`1:${t.maxLeverage}`} />
            </dl>
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>{label}</dt>
      <dd className="num text-[11px] text-right" style={{ color: 'var(--g-text-secondary)' }}>{value}</dd>
    </>
  );
}

/** Step 2 — Platform picker. */
export function PlatformStep({
  value,
  onChange,
}: {
  value: PlatformId | null;
  onChange: (id: PlatformId) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {PLATFORMS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={selected}
            className="text-left rounded-xl p-5 transition-all"
            style={{
              background: selected ? 'rgba(220,38,38,0.06)' : 'var(--g-bg-surface)',
              border: `1px solid ${selected ? 'var(--g-accent)' : 'var(--g-border-hair)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
                {p.label}
              </div>
              {p.tag && (
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      p.tag === 'recommended' ? 'rgba(16,185,129,0.14)' :
                      p.tag === 'legacy'      ? 'rgba(107,107,115,0.14)' :
                                                'rgba(220,38,38,0.14)',
                    color:
                      p.tag === 'recommended' ? 'var(--g-buy)' :
                      p.tag === 'legacy'      ? 'var(--g-text-muted)' :
                                                'var(--g-accent)',
                  }}
                >
                  {p.tag}
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-snug" style={{ color: 'var(--g-text-secondary)' }}>
              {p.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/** Step 3 — Settings: base currency + leverage + swap-free toggle. */
export function SettingsStep({
  baseCurrency,
  leverage,
  swapFree,
  maxAllowedLeverage,
  onBaseCurrencyChange,
  onLeverageChange,
  onSwapFreeChange,
}: {
  baseCurrency: BaseCurrency;
  leverage: LeverageTier;
  swapFree: boolean;
  maxAllowedLeverage: number;
  onBaseCurrencyChange: (c: BaseCurrency) => void;
  onLeverageChange: (l: LeverageTier) => void;
  onSwapFreeChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <SectionLabel>Base currency</SectionLabel>
        <div className="flex flex-wrap gap-2 mt-3">
          {SUPPORTED_BASE_CURRENCIES.map((c) => {
            const active = c === baseCurrency;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onBaseCurrencyChange(c)}
                className="num text-[12px] px-3 py-2 rounded-md transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.08)' : 'transparent',
                  color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                }}
              >
                {currencySymbol(c)} {c}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Leverage</SectionLabel>
        <div className="flex flex-wrap gap-2 mt-3">
          {LEVERAGE_TIERS.map((t) => {
            const active = t === leverage;
            const allowed = t <= maxAllowedLeverage;
            return (
              <button
                key={t}
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onLeverageChange(t)}
                className="num text-[12px] px-3 py-2 rounded-md transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.08)' : 'transparent',
                  color: active
                    ? 'var(--g-text-primary)'
                    : allowed
                      ? 'var(--g-text-secondary)'
                      : 'var(--g-text-muted)',
                  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                  opacity: allowed ? 1 : 0.5,
                  cursor: allowed ? 'pointer' : 'not-allowed',
                }}
              >
                1:{t}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          This account type allows up to <span className="num">1:{maxAllowedLeverage}</span>.
          Higher tiers on a live account require verified KYC.
        </p>
      </section>

      <section>
        <SectionLabel>Swap type</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <SwapChoice
            checked={!swapFree}
            onChange={() => onSwapFreeChange(false)}
            title="Standard"
            subtitle="Conventional overnight swap rates apply when positions roll past the daily session close."
          />
          <SwapChoice
            checked={swapFree}
            onChange={() => onSwapFreeChange(true)}
            title="Swap-free (Islamic)"
            subtitle="No overnight interest charged. Subject to declaration and may exclude certain symbols."
          />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
      {children}
    </div>
  );
}

function SwapChoice({
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
      className="text-left rounded-lg p-4 transition-colors"
      style={{
        background: checked ? 'rgba(220,38,38,0.06)' : 'var(--g-bg-surface)',
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
            <span style={{ width: 5, height: 5, borderRadius: 5, background: '#fff' }} />
          )}
        </span>
        <div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>{title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--g-text-muted)' }}>{subtitle}</div>
        </div>
      </div>
    </button>
  );
}
