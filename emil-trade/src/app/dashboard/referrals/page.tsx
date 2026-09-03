import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import IbOverviewStats from '@/components/portal/ib/IbOverviewStats';
import ReferralLinkCard from '@/components/portal/ib/ReferralLinkCard';
import CommissionStructureCard from '@/components/portal/ib/CommissionStructureCard';
import ClientsTable from '@/components/portal/ib/ClientsTable';
import { loadIbContext, loadClients } from '@/lib/ib/server';

export default async function IbOverviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/referrals');

  const ctx = await loadIbContext(user.id, user.email ?? '');
  const topClients = ctx.profile?.id ? (await loadClients(ctx.profile.id)).slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <IbOverviewStats stats={ctx.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <ReferralLinkCard refCode={ctx.refCode} tier={ctx.profile?.tier ?? 1} />
        <CommissionStructureCard
          currentTier={ctx.profile?.tier ?? 1}
          lotsMTD={Number(ctx.stats.lotsMTD)}
        />
      </div>

      <ClientsTable clients={topClients} title="Top clients (this month)" />
    </div>
  );
}
