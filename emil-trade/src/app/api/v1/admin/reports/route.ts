// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Admin Reports API
// GET: PnL attribution, revenue breakdown, performance reports
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['gio4x_admin', 'broker_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'pnl';
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get('to') || new Date().toISOString();

    if (reportType === 'pnl') {
      // P&L Attribution Report
      const { data: trades } = await supabase
        .from('trades')
        .select('symbol, direction, volume, execution_price, commission, pnl, routing_mode, executed_at')
        .gte('executed_at', from)
        .lte('executed_at', to)
        .order('executed_at', { ascending: false });

      const bySymbol: Record<string, { volume: number; pnl: number; commission: number; trades: number }> = {};
      let totalPnl = 0, totalCommission = 0, totalVolume = 0, aBookCount = 0, bBookCount = 0;

      for (const t of trades || []) {
        const sym = t.symbol;
        if (!bySymbol[sym]) bySymbol[sym] = { volume: 0, pnl: 0, commission: 0, trades: 0 };
        bySymbol[sym].volume += parseFloat(t.volume) || 0;
        bySymbol[sym].pnl += parseFloat(t.pnl) || 0;
        bySymbol[sym].commission += parseFloat(t.commission) || 0;
        bySymbol[sym].trades++;
        totalPnl += parseFloat(t.pnl) || 0;
        totalCommission += parseFloat(t.commission) || 0;
        totalVolume += parseFloat(t.volume) || 0;
        if (t.routing_mode === 'A') aBookCount++;
        else bBookCount++;
      }

      return NextResponse.json({
        type: 'pnl',
        period: { from, to },
        summary: {
          totalPnl: Math.round(totalPnl * 100) / 100,
          totalCommission: Math.round(totalCommission * 100) / 100,
          totalVolume: Math.round(totalVolume * 100) / 100,
          totalTrades: trades?.length || 0,
          aBookRatio: trades?.length ? Math.round((aBookCount / trades.length) * 100) : 0,
          bBookRatio: trades?.length ? Math.round((bBookCount / trades.length) * 100) : 0,
        },
        bySymbol: Object.entries(bySymbol).map(([symbol, data]) => ({
          symbol,
          ...data,
          pnl: Math.round(data.pnl * 100) / 100,
          commission: Math.round(data.commission * 100) / 100,
        })).sort((a, b) => b.volume - a.volume),
      });
    }

    if (reportType === 'clients') {
      // Client profitability report
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select('id, user_id, account_number, account_type, balance, equity, is_demo')
        .eq('is_active', true)
        .eq('is_demo', false);

      return NextResponse.json({
        type: 'clients',
        accounts: accounts || [],
        count: accounts?.length || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid report type. Use: pnl, clients' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
