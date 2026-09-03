import { createClient } from '@/lib/supabase/client';
import { protectionCheck, invalidateDayStats } from '@/lib/trading/protection';
import { guardianCheck } from '@/lib/trading/emil-guardian';

// Notify cockpit features (Session Game Plan, calibration) that an order was
// accepted. Fire-and-forget; never affects the order path.
function announceOrder(symbol: string, direction: 'BUY' | 'SELL', size: number) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('raptor-order-placed', { detail: { symbol, direction, size, ts: Date.now() } }));
    }
  } catch { /* ignore */ }
}

export const orderService = {
  async placeMarketOrder(params: {
    accountId: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    size: number;
    sl?: number;
    tp?: number;
    fillPrice: number;
    comment?: string;
  }) {
    // Trader Protection gate (Shield menu rules) — throws with a
    // plain-language reason when a self-imposed rule blocks the order.
    await protectionCheck({
      accountId: params.accountId, symbol: params.symbol, direction: params.direction,
      size: params.size, sl: params.sl ?? null, entryPrice: params.fillPrice,
    });
    // EMIL GUARDIAN: independent veto layer for EMIL-tagged orders — lives
    // here, outside EMIL's brain, and cannot be disabled by it.
    await guardianCheck({ symbol: params.symbol, direction: params.direction, size: params.size, sl: params.sl ?? null, comment: params.comment });
    const supabase = createClient();
    const { data, error } = await supabase.rpc('place_market_order', {
      p_account_id: params.accountId,
      p_symbol: params.symbol,
      p_direction: params.direction,
      p_size: params.size,
      p_sl: params.sl ?? null,
      p_tp: params.tp ?? null,
      p_fill_price: params.fillPrice,
      p_comment: params.comment ?? null,
    });
    if (error) throw error;
    invalidateDayStats();
    announceOrder(params.symbol, params.direction, params.size);
    return data;
  },

  async closePosition(positionId: string, closePrice: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('close_position', {
      p_position_id: positionId,
      p_close_price: closePrice,
    });
    if (error) throw error;
    invalidateDayStats();
    return data;
  },

  /** Close a fraction (0–1) of an open position; >= 1 delegates to a full
   *  close server-side. Closing is never gated by protection rules. */
  async partialClosePosition(positionId: string, closePrice: number, fraction: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('partial_close_position', {
      p_position_id: positionId,
      p_close_price: closePrice,
      p_fraction: fraction,
    });
    if (error) throw error;
    invalidateDayStats();
    return data;
  },

  async modifyPosition(positionId: string, sl?: number, tp?: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('modify_position', {
      p_position_id: positionId,
      p_sl: sl ?? null,
      p_tp: tp ?? null,
    });
    if (error) throw error;
    return data;
  },

  async placePendingOrder(params: {
    accountId: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    orderType: 'limit' | 'stop';
    size: number;
    price: number;
    sl?: number;
    tp?: number;
    comment?: string;
  }) {
    await protectionCheck({
      accountId: params.accountId, symbol: params.symbol, direction: params.direction,
      size: params.size, sl: params.sl ?? null, entryPrice: params.price,
    });
    await guardianCheck({ symbol: params.symbol, direction: params.direction, size: params.size, sl: params.sl ?? null, comment: params.comment });
    const supabase = createClient();
    const { data, error } = await supabase.rpc('place_pending_order', {
      p_account_id: params.accountId,
      p_symbol: params.symbol,
      p_direction: params.direction,
      p_order_type: params.orderType,
      p_size: params.size,
      p_price: params.price,
      p_sl: params.sl ?? null,
      p_tp: params.tp ?? null,
      p_comment: params.comment ?? null,
    });
    if (error) throw error;
    announceOrder(params.symbol, params.direction, params.size);
    return data;
  },

  async cancelOrder(orderId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: orderId,
    });
    if (error) throw error;
    return data;
  },

  async getAccountSummary(accountId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_account_summary', {
      p_account_id: accountId,
    });
    if (error) throw error;
    return data;
  },

  async getOpenPositions(accountId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPendingOrders(accountId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'pending_validation')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getTradeHistory(accountId: string, limit = 50) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
