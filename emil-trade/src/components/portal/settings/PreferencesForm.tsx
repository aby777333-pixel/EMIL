'use client';

import { useState } from 'react';
import { Globe, Hash, Calendar as CalendarIcon, Clock, Palette } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { PrimaryButton } from '@/components/auth/Buttons';

type Theme = 'dark' | 'dim' | 'high-contrast';
type DateFmt = 'iso' | 'us' | 'eu';
type NumberFmt = 'us' | 'eu' | 'in';

interface Preferences {
  language: string;
  number_format: NumberFmt;
  date_format: DateFmt;
  timezone: string;
  theme: Theme;
}

const DEFAULTS: Preferences = {
  language: 'en',
  number_format: 'us',
  date_format: 'iso',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  theme: 'dark',
};

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية (Arabic)' },
  { id: 'zh-Hans', label: '简体中文 (Chinese, Simplified)' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'es', label: 'Español (Spanish)' },
  { id: 'ru', label: 'Русский (Russian)' },
];

const NUMBER_SAMPLES: Record<NumberFmt, string> = {
  us: '1,234,567.89',
  eu: '1.234.567,89',
  in: '12,34,567.89',
};

const DATE_SAMPLES: Record<DateFmt, string> = {
  iso: '2026-05-09 14:32',
  us:  '05/09/2026 02:32 PM',
  eu:  '09/05/2026 14:32',
};

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
];

const STORAGE_KEY = 'gio.portal.preferences';

/**
 * UI-only preferences. Everything is persisted to localStorage —
 * server-side propagation lands when we add a `user_preferences`
 * Supabase table. Theme application also happens client-side via the
 * `data-theme` attribute on <html>, matching the existing terminal's
 * convention.
 *
 * Spec calls out "no Light theme — institutional dark only", so the
 * theme picker offers Dark / Dim / High Contrast.
 */
export default function PreferencesForm() {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULTS;
  });
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="Language & region">
        <Row icon={<Globe size={14} />} label="Language">
          <Select
            value={prefs.language}
            onChange={(v) => set('language', v)}
            options={LANGUAGES}
          />
        </Row>
        <Row icon={<Hash size={14} />} label="Number format">
          <Select
            value={prefs.number_format}
            onChange={(v) => set('number_format', v as NumberFmt)}
            options={[
              { id: 'us', label: `US · ${NUMBER_SAMPLES.us}` },
              { id: 'eu', label: `EU · ${NUMBER_SAMPLES.eu}` },
              { id: 'in', label: `IN · ${NUMBER_SAMPLES.in}` },
            ]}
          />
        </Row>
        <Row icon={<CalendarIcon size={14} />} label="Date format">
          <Select
            value={prefs.date_format}
            onChange={(v) => set('date_format', v as DateFmt)}
            options={[
              { id: 'iso', label: `ISO · ${DATE_SAMPLES.iso}` },
              { id: 'us',  label: `US · ${DATE_SAMPLES.us}` },
              { id: 'eu',  label: `EU · ${DATE_SAMPLES.eu}` },
            ]}
          />
        </Row>
        <Row icon={<Clock size={14} />} label="Timezone">
          <Select
            value={prefs.timezone}
            onChange={(v) => set('timezone', v)}
            options={TIMEZONES.map((tz) => ({ id: tz, label: tz.replace('_', ' ') }))}
          />
        </Row>
      </DashboardCard>

      <DashboardCard title="Theme">
        <p className="text-[12px] mb-4" style={{ color: 'var(--g-text-muted)' }}>
          Institutional terminals run dark. We don&apos;t offer a light theme.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ThemeChoice
            checked={prefs.theme === 'dark'}
            onChange={() => set('theme', 'dark')}
            label="Dark"
            sample={['#0A0A0B', '#111114', '#16161A']}
            description="Default. Standard issue."
          />
          <ThemeChoice
            checked={prefs.theme === 'dim'}
            onChange={() => set('theme', 'dim')}
            label="Dim"
            sample={['#161616', '#1C1C1F', '#222226']}
            description="Slightly elevated for ambient lighting."
          />
          <ThemeChoice
            checked={prefs.theme === 'high-contrast'}
            onChange={() => set('theme', 'high-contrast')}
            label="High contrast"
            sample={['#000000', '#0A0A0A', '#1A1A1A']}
            description="Maximum text contrast for legibility."
          />
        </div>
      </DashboardCard>

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={save} className="!w-auto !px-6">
          Save preferences
        </PrimaryButton>
        {saved && (
          <span className="text-[12px]" style={{ color: 'var(--g-pnl-positive)' }}>
            Saved.
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      <span className="inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        <span style={{ color: 'var(--g-text-muted)' }}>{icon}</span>
        {label}
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-[13px] outline-none rounded-md px-3 py-1.5"
      style={{
        color: 'var(--g-text-primary)',
        border: '1px solid var(--g-border-soft)',
        minWidth: 200,
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id} style={{ background: '#16161A' }}>{o.label}</option>
      ))}
    </select>
  );
}

function ThemeChoice({
  checked,
  onChange,
  label,
  sample,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sample: [string, string, string];
  description: string;
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
      <div className="flex items-center gap-2">
        <Palette size={13} style={{ color: 'var(--g-text-muted)' }} />
        <span className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {sample.map((c, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 22,
              borderRadius: 4,
              background: c,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>{description}</p>
    </button>
  );
}
