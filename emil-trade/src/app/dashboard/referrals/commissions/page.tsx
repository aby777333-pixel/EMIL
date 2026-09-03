import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CommissionsTable from '@/components/portal/ib/CommissionsTable';
import { loadIbContext, loadCommissions } from '@/lib/ib/server';
import { formatMoney } from '@/lib/wallet/money';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export default async function IbCommissionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/referrals/commissions');

  const ctx = await loadIbContext(user.id, user.email ?? '');
  const commissions = ctx.profile?.id ? await loadCommissions(ctx.profile.id) : [];
  const pending = ctx.stats.pendingPayout;

  return (
    <div className="space-y-6">
      <DashboardCard title="Pending payout">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div
              className="num"
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: 'var(--g-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {formatMoney(pending, ctx.stats.baseCurrency)}
            </div>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
              Once approved, payouts route to your wallet and become available for withdrawal.
            </p>
          </div>
          <Link
            href="/dashboard/wallet"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md text-[13px] font-medium"
            style={{
              background: Number(pending) > 0 ? 'var(--g-accent)' : 'transparent',
              color: Number(pending) > 0 ? '#fff' : 'var(--g-text-muted)',
              border: `1px solid ${Number(pending) > 0 ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
              pointerEvents: Number(pending) > 0 ? 'auto' : 'none',
            }}
          >
            Pull to wallet
          </Link>
        </div>
      </DashboardCard>

      <CommissionsTable commissions={commissions} />
    </div>
  );
}
