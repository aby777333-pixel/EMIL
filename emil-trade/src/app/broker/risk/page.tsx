import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RiskDashboardView } from './RiskDashboardView';

export const dynamic = 'force-dynamic';

const INSTRUMENTS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD',
  'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY',
  'XAUUSD', 'XAGUSD', 'US30', 'SPX500', 'NAS100',
  'BTCUSD', 'ETHUSD', 'USOIL', 'UKBRENT', 'DE40',
];

export default async function RiskPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('users')
    .select('broker_id')
    .eq('id', user!.id)
    .single();

  const brokerId = profile?.broker_id;
  if (!brokerId) {
    return <p className="py-20 text-center text-secondary">No broker assigned.</p>;
  }

  // Fetch all open positions for exposure calculation
  const { data: positions } = await supabase
    .from('positions')
    .select(`
      id, symbol, direction, lots, profit, user_id,
      account:trading_accounts!inner(broker_id)
    `)
    .eq('account.broker_id', brokerId)
    .eq('status', 'open');

  // Calculate exposure per symbol
  const exposureMap: Record<string, { long: number; short: number; net: number }> = {};
  INSTRUMENTS.forEach((sym) => {
    exposureMap[sym] = { long: 0, short: 0, net: 0 };
  });
  (positions ?? []).forEach((p: Record<string, unknown>) => {
    const sym = String(p.symbol);
    if (!exposureMap[sym]) exposureMap[sym] = { long: 0, short: 0, net: 0 };
    const lots = Number(p.lots);
    if (p.direction === 'buy') {
      exposureMap[sym].long += lots;
    } else {
      exposureMap[sym].short += lots;
    }
    exposureMap[sym].net = exposureMap[sym].long - exposureMap[sym].short;
  });

  // Margin call watchlist (margin level < 60%)
  const { data: marginCallAccounts } = await supabase
    .from('trading_accounts')
    .select('*, user:users!inner(full_name, email)')
    .eq('broker_id', brokerId)
    .lt('margin_level', 60)
    .gt('margin_level', 0)
    .order('margin_level', { ascending: true });

  // Stop-out imminent (margin level < 30%)
  const { data: stopOutAccounts } = await supabase
    .from('trading_accounts')
    .select('*, user:users!inner(full_name, email)')
    .eq('broker_id', brokerId)
    .lt('margin_level', 30)
    .gt('margin_level', 0)
    .order('margin_level', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Risk Management</h1>
        <p className="text-xs text-secondary">Exposure limits, A/B book rules, margin monitoring</p>
      </div>

      <RiskDashboardView
        exposureMap={exposureMap}
        instruments={INSTRUMENTS}
        marginCallAccounts={marginCallAccounts ?? []}
        stopOutAccounts={stopOutAccounts ?? []}
      />
    </div>
  );
}
