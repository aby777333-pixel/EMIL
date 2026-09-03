// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Orders API
// POST: Place new order (market/limit/stop)
// GET: List orders for account
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateRequiredMargin, type MarginParams } from '@/lib/engine/margin-calculator';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) query = query.eq('account_id', accountId);
    if (status) query = query.eq('status', status);

    const { data: orders, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      pagination: { page, limit, total: count || 0 },
    });
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
    const { account_id, symbol, direction, order_type, size, price, sl, tp, comment } = body;

    // ── Validate required fields ──
    if (!account_id || !symbol || !direction || !order_type || !size) {
      return NextResponse.json({ error: 'Missing required fields: account_id, symbol, direction, order_type, size' }, { status: 400 });
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      return NextResponse.json({ error: 'Direction must be BUY or SELL' }, { status: 400 });
    }

    if (!['market', 'limit', 'stop', 'stop_limit'].includes(order_type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
    }

    const numSize = parseFloat(size);
    if (isNaN(numSize) || numSize <= 0) {
      return NextResponse.json({ error: 'Size must be a positive number' }, { status: 400 });
    }

    // ── Verify account ownership ──
    const { data: account, error: accError } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (accError || !account) {
      return NextResponse.json({ error: 'Account not found or not active' }, { status: 404 });
    }

    // ── Get instrument config ──
    const { data: instrument } = await supabase
      .from('instruments')
      .select('*')
      .eq('symbol', symbol)
      .eq('is_active', true)
      .single();

    if (!instrument) {
      return NextResponse.json({ error: `Symbol ${symbol} is not available for trading` }, { status: 400 });
    }

    // ── Validate lot size ──
    const minLot = parseFloat(instrument.min_lot) || 0.01;
    const maxLot = parseFloat(instrument.max_lot) || 100;
    if (numSize < minLot || numSize > maxLot) {
      return NextResponse.json({ error: `Volume must be between ${minLot} and ${maxLot} lots` }, { status: 400 });
    }

    // ── For limit/stop orders, price is required ──
    if (['limit', 'stop', 'stop_limit'].includes(order_type) && !price) {
      return NextResponse.json({ error: 'Price is required for limit/stop orders' }, { status: 400 });
    }

    // ── Check margin sufficiency ──
    const executionPrice = price || body.fill_price || 1; // market price for market orders
    const marginParams: MarginParams = {
      volume: numSize,
      contractSize: parseFloat(instrument.contract_size) || 100000,
      price: executionPrice,
      leverage: account.leverage || 100,
      marginRate: parseFloat(instrument.margin_rate) || undefined,
    };
    const requiredMargin = calculateRequiredMargin(marginParams);
    const freeMargin = parseFloat(account.free_margin) || parseFloat(account.balance) || 0;

    if (requiredMargin > freeMargin) {
      return NextResponse.json({
        error: 'INSUFFICIENT_MARGIN',
        code: 'INSUFFICIENT_MARGIN',
        required: requiredMargin,
        available: freeMargin,
      }, { status: 400 });
    }

    // ── Place order via RPC ──
    if (order_type === 'market') {
      const { data, error: rpcError } = await supabase.rpc('place_market_order', {
        p_account_id: account_id,
        p_symbol: symbol,
        p_direction: direction,
        p_size: numSize,
        p_sl: sl || null,
        p_tp: tp || null,
        p_fill_price: executionPrice,
        p_comment: comment || null,
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message || 'Order placement failed' }, { status: 500 });
      }

      return NextResponse.json({ order: data, message: 'Market order placed successfully' }, { status: 201 });
    } else {
      const { data, error: rpcError } = await supabase.rpc('place_pending_order', {
        p_account_id: account_id,
        p_symbol: symbol,
        p_direction: direction,
        p_order_type: order_type,
        p_size: numSize,
        p_price: parseFloat(price),
        p_sl: sl || null,
        p_tp: tp || null,
        p_comment: comment || null,
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message || 'Order placement failed' }, { status: 500 });
      }

      return NextResponse.json({ order: data, message: `${order_type} order placed successfully` }, { status: 201 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
