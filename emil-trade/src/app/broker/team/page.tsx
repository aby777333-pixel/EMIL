import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TeamView } from './TeamView';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
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

  const { data: staff } = await supabase
    .from('users')
    .select('id, full_name, email, role, last_sign_in_at, status, created_at')
    .eq('broker_id', brokerId)
    .in('role', ['broker_admin', 'dealer', 'support_agent', 'compliance_officer', 'risk_manager'])
    .order('role')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Team Management</h1>
        <p className="text-xs text-secondary">{staff?.length ?? 0} team members</p>
      </div>
      <TeamView staff={staff ?? []} />
    </div>
  );
}
