import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import WalletHeader from '@/components/portal/wallet/WalletHeader';
import QuickActionRow from '@/components/portal/wallet/QuickActionRow';
import MultiCurrencyList, { type CurrencyWallet } from '@/components/portal/wallet/MultiCurrencyList';
import TransactionHistoryTable, {
  type WalletTransaction,
  type TxType,
  type TxStatus,
} from '@/components/portal/wallet/TransactionHistoryTable';
import type { SupportedCurrency } from '@/lib/wallet/money';

interface WalletRow {
  currency: string;
  balance: number | string;
  locked_balance: number | string;
}

interface ClientTxRow {
  id: string;
  type: string;
  amount: number | string;
  currency: string;
  method: string | null;
  status: string;
  reference: string | null;
  created_at: string;
}

const FX_TO_USD: Record<string, string> = {
  USD: '1',     EUR: '1.08',  GBP: '1.27',
  INR: '0.012', USDT: '1',
};

export default async function WalletOverviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/wallet');

  // Verification status — withdrawals are gated by it.
  const { data: profile } = await supabase
    .from('users')
    .select('kyc_status')
    .eq('id', user.id)
    .single();
  const kycRaw = (profile?.kyc_status ?? '').toString().toLowerCase();
  const withdrawalsEnabled = kycRaw === 'verified' || kycRaw === 'approved' || kycRaw === 'tier2_verified' || kycRaw === 'tier2';

  // Multi-currency wallets.
  const { data: walletsRaw } = await supabase
    .from('client_wallets')
    .select('currency, balance, locked_balance')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const wallets: WalletRow[] = (walletsRaw ?? []) as WalletRow[];

  // Pending deposits per currency for the Pending column.
  const { data: pendingRaw } =
    wallets.length > 0
      ? await supabase
          .from('client_transactions')
          .select('currency, amount, status, type')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('type', 'deposit')
      : { data: [] as Array<Record<string, unknown>> };

  const pendingByCcy = new Map<string, Decimal>();
  for (const row of pendingRaw ?? []) {
    const ccy = (row.currency as string) ?? 'USD';
    const cur = pendingByCcy.get(ccy) ?? new Decimal(0);
    pendingByCcy.set(ccy, cur.plus(new Decimal((row.amount as number | string) ?? 0)));
  }

  const wallets5: CurrencyWallet[] = wallets.map((w) => ({
    currency: (w.currency as SupportedCurrency) ?? 'USD',
    available: new Decimal(w.balance ?? 0).toFixed(2),
    pending: (pendingByCcy.get(w.currency) ?? new Decimal(0)).toFixed(2),
    locked: new Decimal(w.locked_balance ?? 0).toFixed(2),
  }));

  // Compute total equity in USD (base currency for v1 — full FX module is a later phase).
  const totalUsd = wallets.reduce((acc, w) => {
    const rate = new Decimal(FX_TO_USD[(w.currency as string) ?? 'USD'] ?? '0');
    return acc.plus(new Decimal(w.balance ?? 0).times(rate));
  }, new Decimal(0));

  // Recent transactions, latest first.
  const { data: txRaw } = await supabase
    .from('client_transactions')
    .select('id, type, amount, currency, method, status, reference, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const transactions: WalletTransaction[] = ((txRaw ?? []) as ClientTxRow[]).map((tx) => ({
    id: tx.id,
    type: tx.type as TxType,
    amount: new Decimal(tx.amount ?? 0).toFixed(2),
    currency: tx.currency,
    method: tx.method,
    status: tx.status as TxStatus,
    reference: tx.reference,
    created_at: tx.created_at,
  }));

  return (
    <div className="space-y-6">
      <WalletHeader
        totalEquity={totalUsd.toFixed(2)}
        baseCurrency="USD"
        delta24hPct={0}
        delta24hAmount="0.00"
      />

      <QuickActionRow withdrawalsEnabled={withdrawalsEnabled} />

      <MultiCurrencyList wallets={wallets5} />

      <TransactionHistoryTable transactions={transactions} />
    </div>
  );
}
