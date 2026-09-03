'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet, X, ShieldCheck } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { SecondaryButton } from '@/components/auth/Buttons';

export interface PortalSession {
  id: string;
  /** "Chrome on Windows", "Safari on iOS", etc. */
  client: string;
  device_kind: 'desktop' | 'mobile' | 'tablet';
  ip: string;
  /** Coarse city/country, server-resolved */
  location: string;
  /** ISO timestamp */
  last_active: string;
  current: boolean;
}

const ICONS: Record<PortalSession['device_kind'], React.ComponentType<{ size?: number }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

/**
 * Active session list. Until Supabase MFA + dedicated session tracking
 * lands, the only session we know about is the current one — that
 * row is always shown and tagged "this session". Other devices appear
 * once we wire the auth.sessions feed.
 */
export default function ActiveSessionsList({
  sessions,
  onRevoke,
  onSignOutAll,
}: {
  sessions: PortalSession[];
  onRevoke: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onSignOutAll: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [busy, setBusy] = useState(false);

  async function revoke(id: string) {
    setBusy(true);
    await onRevoke(id);
    setBusy(false);
  }
  async function signOutAll() {
    setBusy(true);
    await onSignOutAll();
    setBusy(false);
  }

  return (
    <DashboardCard title="Active sessions" padding="none">
      <ul className="list-none m-0 p-0">
        {sessions.map((s) => {
          const Icon = ICONS[s.device_kind];
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 px-5 py-4 border-t first:border-t-0"
              style={{ borderColor: 'var(--g-border-hair)' }}
            >
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--g-text-secondary)',
                }}
              >
                <Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
                    {s.client}
                  </span>
                  {s.current && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--g-buy)' }}
                    >
                      <ShieldCheck size={10} /> This session
                    </span>
                  )}
                </div>
                <div className="num text-[11px] mt-1" style={{ color: 'var(--g-text-muted)' }}>
                  {s.ip} · {s.location} · last active {formatRelative(s.last_active)}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-md transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                  style={{ color: 'var(--g-text-secondary)', border: '1px solid var(--g-border-soft)' }}
                >
                  <X size={12} /> Revoke
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div
        className="flex items-center justify-end px-5 py-3 border-t"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <SecondaryButton onClick={signOutAll} disabled={busy} className="!w-auto !px-4">
          Sign out of all other sessions
        </SecondaryButton>
      </div>
    </DashboardCard>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
