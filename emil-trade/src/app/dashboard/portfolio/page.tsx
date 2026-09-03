import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortfolioClient } from './PortfolioClient';

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: accounts } = await supabase
    .from('trading_accounts')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const accountIds = (accounts ?? []).map((a) => a.id);

  const { data: closedTrades } = await supabase
    .from('positions')
    .select('realized_pnl, opened_at, closed_at, direction, size, symbol')
    .eq('status', 'closed')
    .in('account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .order('closed_at', { ascending: false })
    .limit(500);

  const balance = accounts?.[0]?.balance ?? 0;

  return <PortfolioClient trades={closedTrades ?? []} balance={balance} />;
}
