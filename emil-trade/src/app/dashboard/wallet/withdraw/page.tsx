import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import WithdrawClient from './WithdrawClient';

export default async function WithdrawPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/wallet/withdraw');

  // KYC gate — same logic as the API. Block the route entirely if the
  // user isn't verified, instead of letting them fill the form and
  // failing at submit.
  const { data: profile } = await supabase
    .from('users')
    .select('kyc_status, full_name')
    .eq('id', user.id)
    .single();
  const kyc = (profile?.kyc_status ?? '').toString().toLowerCase();
  const verified = kyc === 'verified' || kyc === 'approved' || kyc === 'tier2_verified' || kyc === 'tier2';

  if (!verified) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-[12px] mb-6 hover:underline"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          <ArrowLeft size={13} /> Back to wallet
        </Link>
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 52, height: 52, borderRadius: 999,
              background: 'rgba(245,158,11,0.12)',
              color: '#F59E0B',
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-[22px] font-light" style={{ color: 'var(--g-text-primary)' }}>
            Verify your identity to withdraw
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--g-text-secondary)' }}>
            We&apos;re required to verify your identity before processing any withdrawal. The
            review usually completes within 24 hours.
          </p>
          <Link
            href="/dashboard/profile/kyc"
            className="inline-flex items-center justify-center mt-6 px-5 h-10 rounded-md text-[13px] font-medium"
            style={{
              background: 'var(--g-accent)',
              color: '#fff',
              border: '1px solid var(--g-accent)',
            }}
          >
            Start verification
          </Link>
        </div>
      </div>
    );
  }

  // Compute the user's withdrawable balance per currency.
  const { data: wallets } = await supabase
    .from('client_wallets')
    .select('currency, balance, locked_balance')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const { data: pendingWdr } = await supabase
    .from('client_transactions')
    .select('amount, currency')
    .eq('user_id', user.id)
    .eq('type', 'withdrawal')
    .eq('status', 'pending');

  const balances: Record<string, { available: string; locked: string; pending: string }> = {};
  for (const w of wallets ?? []) {
    const ccy = (w.currency as string) ?? 'USD';
    balances[ccy] = {
      available: new Decimal(w.balance ?? 0).toFixed(2),
      locked: new Decimal(w.locked_balance ?? 0).toFixed(2),
      pending: '0.00',
    };
  }
  for (const p of pendingWdr ?? []) {
    const ccy = (p.currency as string) ?? 'USD';
    if (!balances[ccy]) {
      balances[ccy] = { available: '0.00', locked: '0.00', pending: '0.00' };
    }
    balances[ccy].pending = new Decimal(balances[ccy].pending)
      .plus(new Decimal((p.amount as number | string) ?? 0))
      .toFixed(2);
  }

  return (
    <WithdrawClient
      balances={balances}
      defaultCurrency={Object.keys(balances)[0] ?? 'USD'}
      beneficiaryName={(profile?.full_name ?? '').toString()}
    />
  );
}
