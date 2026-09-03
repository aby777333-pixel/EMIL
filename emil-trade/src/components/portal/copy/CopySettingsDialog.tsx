'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Decimal from 'decimal.js';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { Field } from '@/components/auth/Field';
import { DEFAULT_COPY_SETTINGS, type CopySettings } from '@/lib/copy/types';
import type { StrategyProvider } from '@/lib/copy/types';

/**
 * Copy settings dialog — 7 dependent fields per spec. The defaults
 * are intentionally conservative (proportional / 25% DD stop / 5 max
 * trades) so a careless user can't end up over-leveraged on first try.
 *
 * The aggressive-strategy warning fires when the user pairs a low DD
 * stop (<10%) with a strategy whose historical max DD is higher,
 * since the copy will pause early and the user may misinterpret that
 * as a strategy underperforming.
 */
export default function CopySettingsDialog({
  strategy,
  open,
  onClose,
  onSubmit,
}: {
  strategy: StrategyProvider | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (settings: CopySettings) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [settings, setSettings] = useState<CopySettings>(DEFAULT_COPY_SETTINGS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSettings(DEFAULT_COPY_SETTINGS);
      setError(null);
    }
  }, [open, strategy?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function submit() {
    if (submitting || !strategy) return;
    setError(null);

    if (!/^\d+(\.\d{1,2})?$/.test(settings.allocation) || new Decimal(settings.allocation).lessThan('100')) {
      setError('Minimum allocation is $100.');
      return;
    }
    if (settings.ratio_mode === 'fixed_lot' && (!/^\d+(\.\d{1,2})?$/.test(settings.fixed_lot) || Number(settings.fixed_lot) <= 0)) {
      setError('Fixed lot must be a positive decimal.');
      return;
    }

    setSubmitting(true);
    const res = await onSubmit(settings);
    if (!res.ok) {
      setError(res.error ?? 'Failed to start copy.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  if (!open || !strategy) return null;

  const ddMismatch =
    settings.max_drawdown_stop > 0 &&
    settings.max_drawdown_stop < strategy.max_drawdown;

  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-center justify-center px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div
        role="dialog"
        aria-label={`Copy ${strategy.name}`}
        className="relative w-full max-w-lg rounded-xl"
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
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate" style={{ color: 'var(--g-text-primary)' }}>
              Copy {strategy.name}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              Settings can be edited or paused at any time from your active copies.
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
            label="Allocation (USD)"
            type="text"
            inputMode="decimal"
            value={settings.allocation}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*(\.\d{0,2})?$/.test(v)) {
                setSettings((s) => ({ ...s, allocation: v }));
              }
            }}
            hint="The maximum capital this copy can use. Min $100."
            className="num"
          />

          <RatioPicker
            value={settings.ratio_mode}
            fixedLot={settings.fixed_lot}
            onModeChange={(mode) => setSettings((s) => ({ ...s, ratio_mode: mode }))}
            onFixedLotChange={(v) => setSettings((s) => ({ ...s, fixed_lot: v }))}
          />

          <SliderRow
            label="Max drawdown stop"
            value={settings.max_drawdown_stop}
            min={5}
            max={50}
            step={1}
            unit="%"
            onChange={(v) => setSettings((s) => ({ ...s, max_drawdown_stop: v }))}
            hint="Pause copying if your equity on this copy drops by this much."
          />

          <SliderRow
            label="Max open trades"
            value={settings.max_open_trades}
            min={1}
            max={20}
            step={1}
            unit=""
            onChange={(v) => setSettings((s) => ({ ...s, max_open_trades: v }))}
            hint="Skip new copies once this many positions are open."
          />

          <Toggle
            label="Copy stop loss & take profit"
            checked={settings.copy_sl_tp}
            onChange={(v) => setSettings((s) => ({ ...s, copy_sl_tp: v }))}
            hint="Mirror the provider's exit levels onto your copied trades."
          />

          <Toggle
            label="Reverse copy"
            checked={settings.reverse_copy}
            onChange={(v) => setSettings((s) => ({ ...s, reverse_copy: v }))}
            hint="Invert direction on every copied trade. For confidence-shorting an anti-strategy."
            danger
          />

          {ddMismatch && (
            <div
              className="flex items-start gap-2.5 rounded-lg p-3 text-[12px]"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: 'var(--g-text-secondary)',
              }}
            >
              <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="shrink-0 mt-px" />
              <span>
                This strategy&apos;s historical max DD is{' '}
                <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                  {strategy.max_drawdown.toFixed(1)}%
                </span>
                . Your stop is set tighter at{' '}
                <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                  {settings.max_drawdown_stop}%
                </span>
                {' '}— a normal drawdown will pause the copy.
              </span>
            </div>
          )}

          {error && <InlineError message={error} />}
        </div>

        <footer
          className="px-5 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} loading={submitting} className="!w-auto !px-5">
            Start copying
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}

function RatioPicker({
  value,
  fixedLot,
  onModeChange,
  onFixedLotChange,
}: {
  value: 'proportional' | 'fixed_lot';
  fixedLot: string;
  onModeChange: (mode: 'proportional' | 'fixed_lot') => void;
  onFixedLotChange: (raw: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
        Sizing
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ModeChoice
          checked={value === 'proportional'}
          onChange={() => onModeChange('proportional')}
          title="Proportional"
          subtitle="Scale lot sizes by your allocation vs the provider's account."
        />
        <ModeChoice
          checked={value === 'fixed_lot'}
          onChange={() => onModeChange('fixed_lot')}
          title="Fixed lot"
          subtitle="Use a constant lot size on every copied trade regardless of provider sizing."
        />
      </div>
      {value === 'fixed_lot' && (
        <div className="mt-3">
          <Field
            label="Fixed lot size"
            value={fixedLot}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*(\.\d{0,2})?$/.test(v)) onFixedLotChange(v);
            }}
            inputMode="decimal"
            className="num"
            hint="0.10 = 1 micro lot of 10,000 units."
          />
        </div>
      )}
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
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1 shrink-0 inline-flex items-center justify-center"
          style={{
            width: 12, height: 12, borderRadius: 12,
            border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-strong)'}`,
            background: checked ? 'var(--g-accent)' : 'transparent',
          }}
        >
          {checked && <span style={{ width: 4, height: 4, borderRadius: 4, background: '#fff' }} />}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>{title}</div>
          <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--g-text-muted)' }}>{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (next: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
          {label}
        </div>
        <div className="num text-[13px]" style={{ color: 'var(--g-text-primary)' }}>
          {value}{unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--g-accent)' }}
      />
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>{hint}</p>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
  danger,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className="w-full flex items-start gap-3 text-left"
      >
        <span
          aria-hidden
          className="shrink-0 mt-0.5 inline-flex items-center"
          style={{
            width: 28, height: 16, borderRadius: 16,
            background: checked
              ? danger ? 'var(--g-accent)' : 'var(--g-buy)'
              : 'rgba(255,255,255,0.1)',
            transition: 'background 160ms ease',
            padding: 2,
          }}
        >
          <span
            style={{
              width: 12, height: 12, borderRadius: 12,
              background: '#fff',
              transform: checked ? 'translateX(12px)' : 'translateX(0)',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>{label}</div>
          {hint && (
            <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--g-text-muted)' }}>{hint}</div>
          )}
        </div>
      </button>
    </div>
  );
}
