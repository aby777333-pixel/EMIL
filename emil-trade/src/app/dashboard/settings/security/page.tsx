import Link from 'next/link';
import { ShieldCheck, Smartphone } from 'lucide-react';
import ChangePasswordForm from '@/components/portal/profile/ChangePasswordForm';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

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
              Authenticator app (TOTP)
            </div>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-muted)' }}>
              Once Supabase MFA is enabled in the project config, partners will scan a QR code with
              Google Authenticator / Authy / 1Password and download 10 backup recovery codes.
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
          >
            Coming soon
          </span>
        </div>
      </DashboardCard>

      <DashboardCard title="Login activity">
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
              30-day login history
            </div>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-muted)' }}>
              Successful and failed login attempts with IP + geolocation. Live once Supabase auth
              hooks are wired into a server-side audit log.
            </p>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              See currently active sessions on the{' '}
              <Link href="/dashboard/settings/sessions" className="underline" style={{ color: 'var(--g-text-secondary)' }}>
                Sessions tab
              </Link>
              .
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
