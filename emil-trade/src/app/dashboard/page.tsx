import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import BalanceTriad from '@/components/portal/dashboard/BalanceTriad';
import EquityChart, { type EquityPoint } from '@/components/portal/dashboard/EquityChart';
import AccountsTable, { type PortalAccountRow } from '@/components/portal/dashboard/AccountsTable';
import OpenPositionsStrip, { type OpenPosition } from '@/components/portal/dashboard/OpenPositionsStrip';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard');

  // Trading accounts.
  const { data: accountsRaw } = await supabase
    .from('trading_accounts')
    .select('id, account_number, account_type, leverage, balance, credit, currency, is_demo, is_active, created_at, server, platform')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const accounts = accountsRaw ?? [];
  const accountIds = accounts.map((a) => a.id as string);

  // Open positions across all the user's accounts.
  const { data: positionsRaw } =
    accountIds.length > 0
      ? await supabase
          .from('positions')
          .select('id, account_id, symbol, direction, size, open_price, current_price, floating_pnl, status')
          .in('account_id', accountIds)
          .eq('status', 'open')
      : { data: [] as Array<Record<string, unknown>> };

  const positions: OpenPosition[] = (positionsRaw ?? []).map((p) => ({
    id: p.id as string,
    account_id: p.account_id as string,
    symbol: p.symbol as string,
    direction: (p.direction as string).toUpperCase() as OpenPosition['direction'],
    size: Number(p.size ?? 0),
    open_price: Number(p.open_price ?? 0),
    current_price: p.current_price == null ? null : Number(p.current_price),
    floating_pnl: p.floating_pnl == null ? null : Number(p.floating_pnl),
  }));

  // Aggregate Decimal balances + floating P&L.
  const totalBalance = accounts.reduce(
    (acc, a) => acc.plus(new Decimal(a.balance ?? 0)),
    new Decimal(0),
  );
  const totalFloating = positions.reduce(
    (acc, p) => acc.plus(new Decimal(p.floating_pnl ?? 0)),
    new Decimal(0),
  );
  const totalEquity = totalBalance.plus(totalFloating);
  // Free margin proxy: equity minus locked margin. We don't yet track
  // per-position margin so for v1 we surface equity as free margin.
  // The spec calls this out as needing the MT5 manager API in Phase F.
  const freeMargin = totalEquity;

  // Equity history series — placeholder until /api/portfolio/equity is wired.
  const equityPoints: EquityPoint[] = synthesizeEquityHistory(totalEquity.toNumber(), 60);
  const baseCurrency = accounts[0]?.currency ?? 'USD';

  // Build account row models with Decimal-formatted strings — no JS-Number money in the table.
  const accountRows: PortalAccountRow[] = accounts.map((a) => {
    const balance = new Decimal(a.balance ?? 0);
    const accountFloating = positions
      .filter((p) => p.account_id === a.id)
      .reduce((acc, p) => acc.plus(new Decimal(p.floating_pnl ?? 0)), new Decimal(0));
    return {
      id: a.id as string,
      account_number: (a.account_number as string) ?? '—',
      account_type: (a.account_type as string) ?? 'standard',
      platform: ((a.platform as string) ?? 'MT5').toUpperCase(),
      leverage: Number(a.leverage ?? 100),
      currency: (a.currency as string) ?? 'USD',
      balance: balance.toFixed(2),
      equity: balance.plus(accountFloating).toFixed(2),
      is_demo: Boolean(a.is_demo),
    };
  });

  // 60-day sparklines — synthesized for now from the current totals.
  const walletSpark = synthesizeSparkline(totalBalance.toNumber(), 60);
  const equitySpark = synthesizeSparkline(totalEquity.toNumber(), 60);
  const marginSpark = synthesizeSparkline(freeMargin.toNumber(), 60);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Live snapshot of your trading capital and exposure.
        </p>
      </header>

      <BalanceTriad
        walletBalance={totalBalance.toFixed(2)}
        totalEquity={totalEquity.toFixed(2)}
        freeMargin={freeMargin.toFixed(2)}
        marginLevel={null}
        walletDelta24h={deltaFromSpark(walletSpark)}
        equityDelta24h={deltaFromSpark(equitySpark)}
        walletSpark={walletSpark}
        equitySpark={equitySpark}
        marginSpark={marginSpark}
        currency={baseCurrency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EquityChart points={equityPoints} />
        </div>
        <OpenPositionsStrip initialPositions={positions} accountIds={accountIds} />
      </div>

      <AccountsTable accounts={accountRows} />
    </div>
  );
}

/**
 * Build a deterministic placeholder equity series ending at `endValue`.
 * Replaced by a real `/api/portfolio/equity` query in Phase E.
 */
function synthesizeEquityHistory(endValue: number, days: number): EquityPoint[] {
  if (endValue <= 0) return [];
  const out: EquityPoint[] = [];
  const start = Date.now() - days * 24 * 60 * 60 * 1000;
  // Simple smooth random walk anchored to endValue.
  let v = endValue * 0.92;
  for (let i = 0; i <= days; i++) {
    const t = i / days;
    const drift = (endValue - endValue * 0.92) * t;
    const wobble = Math.sin(i * 0.7) * endValue * 0.012;
    v = endValue * 0.92 + drift + wobble;
    out.push({
      date: new Date(start + i * 24 * 60 * 60 * 1000).toISOString(),
      value: Number(v.toFixed(2)),
    });
  }
  return out;
}

function synthesizeSparkline(endValue: number, len: number): number[] {
  if (endValue <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    out.push(endValue * (0.96 + 0.04 * t + Math.sin(i * 0.6) * 0.008));
  }
  out[out.length - 1] = endValue;
  return out;
}

function deltaFromSpark(spark: number[]): number {
  if (spark.length < 2) return 0;
  const start = spark[Math.max(0, spark.length - 24)] ?? spark[0];
  if (!start) return 0;
  return ((spark[spark.length - 1] - start) / start) * 100;
}
