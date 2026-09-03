import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import ConvertClient, { type ConvertWallet } from './ConvertClient';

export default async function ConvertPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/wallet/convert');

  const { data: walletsRaw } = await supabase
    .from('client_wallets')
    .select('currency, balance')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const wallets: ConvertWallet[] = ((walletsRaw ?? []) as Array<Record<string, unknown>>).map((w) => ({
    currency: ((w.currency as string) ?? 'USD').toUpperCase(),
    balance: new Decimal((w.balance as number | string) ?? 0).toFixed(2),
  }));

  return <ConvertClient wallets={wallets} />;
}
