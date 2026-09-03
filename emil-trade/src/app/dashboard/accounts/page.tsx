import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import AccountsClient from './AccountsClient';
import type { PortalAccountFull } from '@/components/portal/accounts/AccountCard';

interface AccountRow {
  id: string;
  account_number: string;
  account_type: string;
  platform: string | null;
  currency: string;
  leverage: number;
  balance: number | string;
  credit: number | string;
  is_demo: boolean;
  is_active: boolean;
  server: string | null;
}

interface PositionRow {
  account_id: string;
  floating_pnl: number | string | null;
}

export default async function AccountsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/accounts');

  const { data: rowsRaw } = await supabase
    .from('trading_accounts')
    .select('id, account_number, account_type, platform, currency, leverage, balance, credit, is_demo, is_active, server')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = (rowsRaw ?? []) as AccountRow[];
  const accountIds = rows.map((r) => r.id);

  const { data: positionsRaw } =
    accountIds.length > 0
      ? await supabase
          .from('positions')
          .select('account_id, floating_pnl')
          .in('account_id', accountIds)
          .eq('status', 'open')
      : { data: [] as PositionRow[] };

  const floatingByAcct = new Map<string, Decimal>();
  for (const p of (positionsRaw ?? []) as PositionRow[]) {
    const cur = floatingByAcct.get(p.account_id) ?? new Decimal(0);
    floatingByAcct.set(p.account_id, cur.plus(new Decimal((p.floating_pnl ?? 0) as number | string)));
  }

  const accounts: PortalAccountFull[] = rows.map((r) => {
    const balance = new Decimal(r.balance ?? 0);
    const floating = floatingByAcct.get(r.id) ?? new Decimal(0);
    const equity = balance.plus(floating);
    return {
      id: r.id,
      account_number: r.account_number ?? '—',
      account_type: r.account_type ?? 'standard',
      platform: (r.platform ?? 'MT5').toUpperCase(),
      currency: r.currency ?? 'USD',
      leverage: r.leverage ?? 100,
      balance: balance.toFixed(2),
      equity: equity.toFixed(2),
      free_margin: equity.toFixed(2), // Until per-position margin tracking lands.
      margin_level: floating.isZero() ? null : equity.div(balance.lessThan(1) ? new Decimal(1) : balance).times(100).toFixed(0) + '%',
      is_demo: r.is_demo,
      is_active: r.is_active,
      server: r.server,
    };
  });

  const liveEquity = accounts
    .filter((a) => a.is_active && !a.is_demo)
    .reduce((acc, a) => acc.plus(new Decimal(a.equity)), new Decimal(0));
  const demoEquity = accounts
    .filter((a) => a.is_demo)
    .reduce((acc, a) => acc.plus(new Decimal(a.equity)), new Decimal(0));

  return (
    <AccountsClient
      accounts={accounts}
      liveEquity={liveEquity.toFixed(2)}
      demoEquity={demoEquity.toFixed(2)}
    />
  );
}
