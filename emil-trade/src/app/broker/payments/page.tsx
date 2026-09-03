import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PaymentsView } from './PaymentsView';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
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

  // Pending deposits
  const { data: pendingDeposits } = await supabase
    .from('transactions')
    .select('*, user:users!inner(full_name, email)')
    .eq('broker_id', brokerId)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Pending withdrawals
  const { data: pendingWithdrawals } = await supabase
    .from('transactions')
    .select('*, user:users!inner(full_name, email)')
    .eq('broker_id', brokerId)
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Completed (last 50)
  const { data: completed } = await supabase
    .from('transactions')
    .select('*, user:users!inner(full_name, email)')
    .eq('broker_id', brokerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payment Management</h1>
        <p className="text-xs text-secondary">
          {(pendingDeposits?.length ?? 0) + (pendingWithdrawals?.length ?? 0)} pending transactions
        </p>
      </div>
      <PaymentsView
        pendingDeposits={pendingDeposits ?? []}
        pendingWithdrawals={pendingWithdrawals ?? []}
        completed={completed ?? []}
      />
    </div>
  );
}
