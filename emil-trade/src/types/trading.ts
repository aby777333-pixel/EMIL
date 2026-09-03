// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — Core Trading Types
// ═══════════════════════════════════════════════════════════════

export type OrderDirection = 'BUY' | 'SELL';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type OrderStatus = 'pending_validation' | 'margin_check' | 'risk_check' | 'pending_lp' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected' | 'expired';
export type PositionStatus = 'open' | 'closed' | 'partially_closed';
export type TimeInForce = 'GTC' | 'GTD' | 'IOC' | 'FOK' | 'DAY';
export type InstrumentType = 'forex' | 'metal' | 'crypto' | 'index' | 'energy' | 'commodity' | 'stock' | 'bond';
export type RoutingMode = 'a_book' | 'b_book' | 'hybrid';
export type AccountType = 'standard' | 'raw_spread' | 'ecn' | 'islamic' | 'demo' | 'prop_challenge' | 'funded' | 'pamm_master' | 'pamm_investor';

export interface Instrument {
  symbol: string;
  description: string;
  type: InstrumentType;
  base_currency: string;
  quote_currency: string;
  profit_currency: string;
  pricescale: number;
  min_lot: number;
  max_lot: number;
  lot_step: number;
  contract_size: number;
  point_value: number;
  margin_rate: number;
  swap_long: number;
  swap_short: number;
  spread_markup: number;
  is_active: boolean;
}

export interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  ts: number;
}

export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: AccountType;
  currency: string;
  leverage: number;
  balance: number;
  credit: number;
  is_demo: boolean;
  is_active: boolean;
}

export interface Order {
  id: string;
  account_id: string;
  symbol: string;
  order_type: OrderType;
  direction: OrderDirection;
  requested_size: number;
  filled_size: number;
  remaining_size: number;
  requested_price: number | null;
  fill_price: number | null;
  sl: number | null;
  tp: number | null;
  trailing_stop_pips: number | null;
  time_in_force: TimeInForce;
  status: OrderStatus;
  commission: number;
  source: string;
  comment: string;
  created_at: string;
  filled_at: string | null;
}

export interface Position {
  id: string;
  account_id: string;
  symbol: string;
  direction: OrderDirection;
  size: number;
  open_price: number;
  close_price: number | null;
  current_price: number;
  sl: number | null;
  tp: number | null;
  commission: number;
  swap_accrued: number;
  floating_pnl: number;
  realized_pnl: number | null;
  status: PositionStatus;
  opened_at: string;
  closed_at: string | null;
}

export interface AccountSummary {
  balance: number;
  equity: number;
  margin_used: number;
  free_margin: number;
  margin_level_pct: number;
  floating_pnl: number;
  open_positions_count: number;
}

export interface WatchlistItem {
  symbol: string;
  description: string;
  type: InstrumentType;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
}
