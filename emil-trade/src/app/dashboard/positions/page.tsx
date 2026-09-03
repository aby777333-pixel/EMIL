import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { PositionsClient } from './PositionsClient';

export default async function PositionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: accounts } = await supabase
    .from('trading_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const accountIds = (accounts ?? []).map((a) => a.id);

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('status', 'open')
    .in('account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .order('opened_at', { ascending: false });

  return <PositionsClient positions={positions ?? []} />;
}
