import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import TransferClient, { type TransferAccount } from './TransferClient';

export default async function TransferPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/wallet/transfer');

  const { data: accountsRaw } = await supabase
    .from('trading_accounts')
    .select('id, account_number, account_type, currency, balance, is_demo, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const accounts: TransferAccount[] = ((accountsRaw ?? []) as Array<Record<string, unknown>>).map((a) => ({
    id: a.id as string,
    account_number: (a.account_number as string) ?? '—',
    account_type: ((a.account_type as string) ?? 'standard'),
    currency: (a.currency as string) ?? 'USD',
    balance: new Decimal((a.balance as number | string) ?? 0).toFixed(2),
    is_demo: Boolean(a.is_demo),
  }));

  return <TransferClient accounts={accounts} />;
}
