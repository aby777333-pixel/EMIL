// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Positions API
// GET: List open positions  |  POST: Close position
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
    const status = searchParams.get('status') || 'open';

    let query = supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('opened_at', { ascending: false });

    if (accountId) query = query.eq('account_id', accountId);

    const { data: positions, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    return NextResponse.json({ positions: positions || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { position_id, close_price, action } = body;

    if (!position_id) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: position } = await supabase
      .from('positions')
      .select('id, user_id, status')
      .eq('id', position_id)
      .eq('user_id', user.id)
      .single();

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    if (position.status !== 'open') {
      return NextResponse.json({ error: 'Position is already closed' }, { status: 400 });
    }

    if (action === 'close') {
      if (!close_price) {
        return NextResponse.json({ error: 'Close price is required' }, { status: 400 });
      }

      const { data, error: rpcError } = await supabase.rpc('close_position', {
        p_position_id: position_id,
        p_close_price: parseFloat(close_price),
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message || 'Failed to close position' }, { status: 500 });
      }

      return NextResponse.json({ result: data, message: 'Position closed successfully' });
    }

    if (action === 'modify') {
      const { sl, tp } = body;
      const { data, error: rpcError } = await supabase.rpc('modify_position', {
        p_position_id: position_id,
        p_sl: sl ?? null,
        p_tp: tp ?? null,
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message || 'Failed to modify position' }, { status: 500 });
      }

      return NextResponse.json({ result: data, message: 'Position modified successfully' });
    }

    return NextResponse.json({ error: 'Invalid action. Use "close" or "modify"' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
