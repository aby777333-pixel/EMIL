import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: accounts } = await supabase
    .from('trading_accounts')
    .select('id')
    .eq('user_id', user.id);

  const accountIds = (accounts ?? []).map((a) => a.id);

  const { data: trades, count } = await supabase
    .from('positions')
    .select('*', { count: 'exact' })
    .eq('status', 'closed')
    .in('account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .order('closed_at', { ascending: false })
    .range(0, 49);

  return <HistoryClient trades={trades ?? []} totalCount={count ?? 0} />;
}
