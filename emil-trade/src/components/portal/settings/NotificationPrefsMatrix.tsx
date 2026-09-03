'use client';

import { useState } from 'react';
import { Mail, Smartphone, MessageSquare, Bell } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { PrimaryButton } from '@/components/auth/Buttons';
import { CATEGORY_LABELS, CATEGORY_ORDER, type NotificationCategory } from '@/lib/notifications/types';

type Channel = 'in_app' | 'email' | 'push' | 'sms';

const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'in_app', label: 'In-app', icon: Bell },
  { id: 'email',  label: 'Email',  icon: Mail },
  { id: 'push',   label: 'Push',   icon: Smartphone },
  { id: 'sms',    label: 'SMS',    icon: MessageSquare },
];

type PrefsMatrix = Record<NotificationCategory, Record<Channel, boolean>>;

const DEFAULT_MATRIX: PrefsMatrix = {
  trading:  { in_app: true,  email: false, push: true,  sms: false },
  wallet:   { in_app: true,  email: true,  push: true,  sms: true  },  // money in/out — loud by default
  kyc:      { in_app: true,  email: true,  push: false, sms: false },
  security: { in_app: true,  email: true,  push: true,  sms: true  },  // security — loud by default
  ib:       { in_app: true,  email: true,  push: false, sms: false },
  pamm:     { in_app: true,  email: true,  push: false, sms: false },
  system:   { in_app: true,  email: false, push: false, sms: false },
};

const STORAGE_KEY = 'gio.portal.notification_prefs';

/**
 * Categories × channels toggle grid. Wallet + security default to all
 * channels because money-in/out and security alerts are the events
 * users most regret missing. Everything else is in-app + email by
 * default to keep the inbox quiet.
 */
export default function NotificationPrefsMatrix() {
  const [matrix, setMatrix] = useState<PrefsMatrix>(() => {
    if (typeof window === 'undefined') return DEFAULT_MATRIX;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_MATRIX, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULT_MATRIX;
  });
  const [saved, setSaved] = useState(false);

  function toggle(cat: NotificationCategory, ch: Channel) {
    setMatrix((m) => ({ ...m, [cat]: { ...m[cat], [ch]: !m[cat][ch] } }));
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix)); } catch { /* ignore */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <DashboardCard title="Where to send notifications" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--g-border-hair)' }}>
              <th
                className="text-left text-[11px] uppercase tracking-[0.14em] font-normal"
                style={{ padding: '14px 18px', color: 'var(--g-text-muted)' }}
              >
                Category
              </th>
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                return (
                  <th
                    key={c.id}
                    className="text-center text-[11px] uppercase tracking-[0.14em] font-normal"
                    style={{ padding: '14px 18px', color: 'var(--g-text-muted)' }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={12} />
                      {c.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((cat) => (
              <tr key={cat} className="border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
                <td className="text-[13px]" style={{ padding: '14px 18px', color: 'var(--g-text-primary)' }}>
                  {CATEGORY_LABELS[cat]}
                </td>
                {CHANNELS.map((c) => (
                  <td key={c.id} style={{ padding: '12px 18px', textAlign: 'center' }}>
                    <Toggle
                      checked={matrix[cat][c.id]}
                      onChange={() => toggle(cat, c.id)}
                      label={`${CATEGORY_LABELS[cat]} via ${c.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center gap-3 px-5 py-4 border-t"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <PrimaryButton onClick={save} className="!w-auto !px-6">Save preferences</PrimaryButton>
        {saved && (
          <span className="text-[12px]" style={{ color: 'var(--g-pnl-positive)' }}>Saved.</span>
        )}
        <span className="ml-auto text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          Critical security and margin events always send via every enabled channel.
        </span>
      </div>
    </DashboardCard>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="inline-flex items-center"
      style={{
        width: 32, height: 18, borderRadius: 18,
        background: checked ? 'var(--g-accent)' : 'rgba(255,255,255,0.1)',
        transition: 'background 160ms ease',
        padding: 2,
      }}
    >
      <span
        style={{
          width: 14, height: 14, borderRadius: 14,
          background: '#fff',
          transform: checked ? 'translateX(14px)' : 'translateX(0)',
          transition: 'transform 160ms ease',
        }}
      />
    </button>
  );
}
