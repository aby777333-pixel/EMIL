import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trading accounts for the user
    const { data: accounts, error: accountsError } = await supabase
      .from('trading_accounts')
      .select('id, balance, equity, margin_used, margin_free, currency')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError) {
      return NextResponse.json({ error: 'Failed to fetch account data' }, { status: 500 });
    }

    // Fetch open positions count
    const { count: openPositions, error: positionsError } = await supabase
      .from('positions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'open');

    if (positionsError) {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    // Aggregate across all active accounts
    const totals = (accounts || []).reduce(
      (acc, acct) => ({
        balance: acc.balance + (acct.balance || 0),
        equity: acc.equity + (acct.equity || 0),
        margin_used: acc.margin_used + (acct.margin_used || 0),
        margin_free: acc.margin_free + (acct.margin_free || 0),
      }),
      { balance: 0, equity: 0, margin_used: 0, margin_free: 0 }
    );

    const openPnl = totals.equity - totals.balance;

    return NextResponse.json({
      balance: totals.balance,
      equity: totals.equity,
      open_pnl: openPnl,
      margin_used: totals.margin_used,
      margin_free: totals.margin_free,
      open_positions: openPositions || 0,
      accounts_count: accounts?.length || 0,
      currency: accounts?.[0]?.currency || 'USD',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
