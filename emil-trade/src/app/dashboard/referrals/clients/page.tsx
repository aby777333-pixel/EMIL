import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ClientsTable from '@/components/portal/ib/ClientsTable';
import { loadIbContext, loadClients } from '@/lib/ib/server';

export default async function IbClientsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/referrals/clients');

  const ctx = await loadIbContext(user.id, user.email ?? '');
  const clients = ctx.profile?.id ? await loadClients(ctx.profile.id) : [];

  return (
    <div className="space-y-4">
      <ClientsTable clients={clients} title="All referred clients" />
    </div>
  );
}
