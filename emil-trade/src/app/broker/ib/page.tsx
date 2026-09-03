import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IBNetworkView } from './IBNetworkView';

export const dynamic = 'force-dynamic';

export default async function IBPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('users')
    .select('broker_id')
    .eq('id', user!.id)
    .single();

  const brokerId = profile?.broker_id;
  if (!brokerId) {
    return <p className="py-20 text-center text-secondary">No broker assigned.</p>;
  }

  // Fetch IB tree entries with user info
  const { data: ibEntries } = await supabase
    .from('ib_tree')
    .select(`
      *,
      user:users!inner(id, full_name, email, broker_id, status)
    `)
    .eq('user.broker_id', brokerId)
    .order('tier_level', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">IB Network</h1>
        <p className="text-xs text-secondary">{ibEntries?.length ?? 0} introducing brokers</p>
      </div>
      <IBNetworkView ibEntries={ibEntries ?? []} />
    </div>
  );
}
