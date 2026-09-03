import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClientListView } from './ClientListView';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
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
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary">No broker assigned.</p>
      </div>
    );
  }

  const { data: clients, count } = await supabase
    .from('users')
    .select(
      `
      id,
      full_name,
      email,
      country,
      kyc_status,
      last_sign_in_at,
      created_at,
      trading_accounts(account_number, balance)
    `,
      { count: 'exact' },
    )
    .eq('broker_id', brokerId)
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="text-xs text-secondary">{count ?? 0} registered clients</p>
      </div>
      <ClientListView clients={clients ?? []} />
    </div>
  );
}
