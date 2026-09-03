import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ComplianceView } from './ComplianceView';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
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

  const { data: alerts } = await supabase
    .from('aml_alerts')
    .select(`
      *,
      user:users!inner(id, full_name, email, broker_id)
    `)
    .eq('user.broker_id', brokerId)
    .order('created_at', { ascending: false });

  const pendingCount = alerts?.filter((a) => a.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AML Compliance</h1>
        <p className="text-xs text-secondary">{pendingCount} alerts pending review</p>
      </div>
      <ComplianceView alerts={alerts ?? []} />
    </div>
  );
}
