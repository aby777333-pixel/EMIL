import { createServerSupabaseClient } from '@/lib/supabase/server';
import { KycReviewView } from './KycReviewView';

export const dynamic = 'force-dynamic';

export default async function KycPage() {
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

  const { data: documents } = await supabase
    .from('kyc_documents')
    .select(`
      *,
      user:users!inner(id, full_name, email, broker_id)
    `)
    .eq('user.broker_id', brokerId)
    .order('created_at', { ascending: false });

  const pendingCount = documents?.filter((d) => d.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">KYC Review Queue</h1>
        <p className="text-xs text-secondary">{pendingCount} documents pending review</p>
      </div>
      <KycReviewView documents={documents ?? []} />
    </div>
  );
}
