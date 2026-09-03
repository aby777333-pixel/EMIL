// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Trades API (immutable execution fills)
// GET: List trade history with pagination and filters
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

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const symbol = searchParams.get('symbol');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('trades')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) query = query.eq('account_id', accountId);
    if (symbol) query = query.eq('symbol', symbol);
    if (from) query = query.gte('executed_at', from);
    if (to) query = query.lte('executed_at', to);

    const { data: trades, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    // Calculate summary stats
    const totalPnl = (trades || []).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
    const totalCommission = (trades || []).reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);
    const totalVolume = (trades || []).reduce((s, t) => s + (parseFloat(t.volume) || 0), 0);

    return NextResponse.json({
      trades: trades || [],
      summary: {
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        tradeCount: count || 0,
      },
      pagination: { page, limit, total: count || 0 },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
