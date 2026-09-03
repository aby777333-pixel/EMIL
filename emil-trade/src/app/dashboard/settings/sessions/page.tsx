'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ActiveSessionsList, { type PortalSession } from '@/components/portal/settings/ActiveSessionsList';

/**
 * The Supabase client SDK doesn't surface other-device sessions yet —
 * we know about the current one. The list shape is what a server-side
 * /api/me/sessions endpoint will return; for now we present the
 * current session and route the "Sign out everywhere" button through
 * `signOut({ scope: 'others' })` when the SDK supports it.
 */
export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PortalSession[]>([]);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const client = describeUserAgent(ua);
    const kind = ua.toLowerCase().includes('mobile')
      ? 'mobile'
      : ua.toLowerCase().includes('tablet')
        ? 'tablet'
        : 'desktop';
    setSessions([
      {
        id: 'current',
        client,
        device_kind: kind,
        ip: '—',
        location: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Local',
        last_active: new Date().toISOString(),
        current: true,
      },
    ]);
  }, []);

  async function onRevoke(_id: string) {
    // Real revoke needs server-side admin API access; UI is wired ready.
    void _id;
    return { ok: false, error: 'Per-session revoke needs server-side admin access. Use sign-out-everywhere instead.' };
  }

  async function onSignOutAll() {
    try {
      const supabase = createClient();
      // `scope: 'others'` exists in supabase-js v2 but isn't always
      // surfaced; fallback to a full signOut so the UX still works.
      const result = await supabase.auth.signOut({ scope: 'others' as const });
      if (result.error) {
        const fallback = await supabase.auth.signOut();
        if (fallback.error) return { ok: false, error: fallback.error.message };
        router.push('/auth/login');
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Sign-out failed.' };
    }
  }

  return <ActiveSessionsList sessions={sessions} onRevoke={onRevoke} onSignOutAll={onSignOutAll} />;
}

function describeUserAgent(ua: string): string {
  const lower = ua.toLowerCase();
  const browser =
    lower.includes('edg/')      ? 'Edge'    :
    lower.includes('chrome')    ? 'Chrome'  :
    lower.includes('firefox')   ? 'Firefox' :
    lower.includes('safari')    ? 'Safari'  :
                                  'Browser';
  const os =
    lower.includes('windows')   ? 'Windows' :
    lower.includes('mac os')    ? 'macOS'   :
    lower.includes('linux')     ? 'Linux'   :
    lower.includes('iphone')    ? 'iOS'     :
    lower.includes('android')   ? 'Android' :
                                  '—';
  return `${browser} on ${os}`;
}
