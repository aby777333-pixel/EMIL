import Link from 'next/link';
import { ShieldCheck, Smartphone } from 'lucide-react';
import ChangePasswordForm from '@/components/portal/profile/ChangePasswordForm';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

/**
 * Security tab — password change is fully wired to Supabase. The 2FA
 * card and active-sessions card are placeholders for the next phase
 * since Supabase MFA needs server-side enrolment + factor management
 * that we haven't scaffolded yet (the auth /2fa page has the same TODO).
 */
export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <ChangePasswordForm />

      <DashboardCard title="Two-factor authentication">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(220,38,38,0.08)',
              color: 'var(--g-accent)',
            }}
          >
            <Smartphone size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              Authenticator app
            </div>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-muted)' }}>
              Add a TOTP authenticator (Google Authenticator, Authy, 1Password) for a second factor on
              every sign-in. Backup codes are issued at enrolment.
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium shrink-0"
            style={{
              background: 'rgba(245,158,11,0.12)',
              color: '#F59E0B',
            }}
          >
            Coming soon
          </span>
        </div>
      </DashboardCard>

      <DashboardCard title="Active sessions">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(16,185,129,0.08)',
              color: 'var(--g-buy)',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              This device
            </div>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-muted)' }}>
              Cross-device session management (revoke individual sessions, log out everywhere) ships
              alongside Supabase MFA.{' '}
              <Link
                href="/dashboard/support"
                className="underline"
                style={{ color: 'var(--g-text-secondary)' }}
              >
                Contact support
              </Link>{' '}
              if you suspect unauthorized access.
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
