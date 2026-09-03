import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SupportView } from './SupportView';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
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

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      *,
      user:users!support_tickets_user_id_fkey(full_name, email)
    `)
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false });

  const openCount = tickets?.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Support Helpdesk</h1>
        <p className="text-xs text-secondary">{openCount} open tickets</p>
      </div>
      <SupportView tickets={tickets ?? []} />
    </div>
  );
}
