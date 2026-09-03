// ===============================================================
// EMIL TRADE -- Dealer Engine Types
// Core type definitions for the dealing desk system
// ===============================================================

// -- Trade (matches DB schema) ----------------------------------

export type TradeStatus =
  | 'pending_new'
  | 'pending_validation'
  | 'margin_check'
  | 'risk_check'
  | 'routing'
  | 'pending_lp'
  | 'lp_accepted'
  | 'lp_rejected'
  | 'partially_filled'
  | 'filled'
  | 'pending_close'
  | 'closed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'error';

export type TradeDirection = 'buy' | 'sell';

export type TradeType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'trailing_stop';

export type RoutingMode = 'a_book' | 'b_book' | 'hybrid';

export interface Trade {
  id: string;
  account_id: string;
  client_id: string;
  symbol: string;
  direction: TradeDirection;
  type: TradeType;
  status: TradeStatus;
  requested_price: number | null;
  fill_price: number | null;
  requested_size: number;
  filled_size: number;
  remaining_size: number;
  sl: number | null;
  tp: number | null;
  trailing_stop_pips: number | null;
  time_in_force: 'GTC' | 'GTD' | 'IOC' | 'FOK' | 'DAY';
  commission: number;
  swap: number;
  floating_pnl: number;
  realized_pnl: number | null;
  routing_mode: RoutingMode | null;
  lp_order_id: string | null;
  lp_fill_price: number | null;
  lp_name: string | null;
  slippage: number;
  latency_ms: number | null;
  source: string;
  comment: string;
  dealer_id: string | null;
  dealer_action: string | null;
  risk_score: number | null;
  toxic_score: number | null;
  margin_used: number;
  created_at: string;
  updated_at: string;
  filled_at: string | null;
  closed_at: string | null;
  expired_at: string | null;
}

// -- Trading Account --------------------------------------------

export type AccountType =
  | 'standard'
  | 'raw_spread'
  | 'ecn'
  | 'islamic'
  | 'demo'
  | 'prop_challenge'
  | 'funded'
  | 'pamm_master'
  | 'pamm_investor';

export interface TradingAccount {
  id: string;
  user_id: string;
  client_id: string;
  account_number: string;
  account_type: AccountType;
  currency: string;
  leverage: number;
  balance: number;
  credit: number;
  equity: number;
  margin_used: number;
  free_margin: number;
  margin_level: number;
  floating_pnl: number;
  is_demo: boolean;
  is_active: boolean;
  is_islamic: boolean;
  max_daily_loss: number | null;
  max_total_loss: number | null;
  group_name: string;
  created_at: string;
  updated_at: string;
}

// -- Symbol -----------------------------------------------------

export type InstrumentType =
  | 'forex'
  | 'metal'
  | 'crypto'
  | 'index'
  | 'energy'
  | 'commodity'
  | 'stock'
  | 'bond';

export interface Symbol {
  symbol: string;
  description: string;
  type: InstrumentType;
  base_currency: string;
  quote_currency: string;
  profit_currency: string;
  pip_size: number;
  pip_value: number;
  pricescale: number;
  digits: number;
  min_lot: number;
  max_lot: number;
  lot_step: number;
  contract_size: number;
  margin_rate: number;
  swap_long: number;
  swap_short: number;
  spread_markup: number;
  max_exposure_lots: number;
  is_active: boolean;
  trading_hours: string;
}

// -- Client -----------------------------------------------------

export type ClientTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
export type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  country: string;
  phone: string | null;
  kyc_status: KycStatus;
  tier: ClientTier;
  ib_id: string | null;
  ib_name: string | null;
  risk_score: number;
  toxic_score: number;
  total_deposits: number;
  total_withdrawals: number;
  total_volume_lots: number;
  total_trades: number;
  win_rate: number;
  avg_hold_time_seconds: number;
  is_active: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

// -- Client Score History ---------------------------------------

export interface ClientScoreHistory {
  id: string;
  client_id: string;
  score_type: 'risk' | 'toxic' | 'routing';
  score_value: number;
  factors: Record<string, number>;
  computed_at: string;
  computed_by: 'system' | 'dealer' | 'ai';
}

// -- Symbol Exposure --------------------------------------------

export interface SymbolExposure {
  symbol: string;
  net_position: number;
  total_buy: number;
  total_sell: number;
  unrealized_pnl: number;
  client_count: number;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  max_exposure_lots: number;
  utilization_pct: number;
  is_breached: boolean;
}

// -- Dealer Action ----------------------------------------------

export type DealerActionType =
  | 'force_close'
  | 'modify_sl'
  | 'modify_tp'
  | 'reject_order'
  | 'requote'
  | 'partial_fill'
  | 'mass_cancel'
  | 'override_routing'
  | 'margin_extension'
  | 'spread_override'
  | 'flag_client'
  | 'unflag_client'
  | 'approve_withdrawal'
  | 'suspend_account';

export interface DealerAction {
  id: string;
  dealer_id: string;
  dealer_name: string;
  action: DealerActionType;
  target_type: 'trade' | 'order' | 'position' | 'symbol' | 'account' | 'client';
  target_id: string;
  details: Record<string, unknown>;
  reason: string;
  approved_by: string | null;
  timestamp: string;
}

// -- System Alert -----------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertCategory =
  | 'exposure_breach'
  | 'margin_call'
  | 'stop_out'
  | 'toxic_flow'
  | 'lp_disconnect'
  | 'price_gap'
  | 'spread_anomaly'
  | 'volume_spike'
  | 'system_error'
  | 'kyc_expiry'
  | 'suspicious_activity';

export interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  source: string;
  target_type: string | null;
  target_id: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  auto_resolved: boolean;
  created_at: string;
}

// -- Price Tick -------------------------------------------------

export interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  volume: number;
  timestamp: number;
  source: string;
}

// -- News Event -------------------------------------------------

export type NewsImpact = 'low' | 'medium' | 'high' | 'critical';

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: NewsImpact;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  scheduled_at: string;
  published_at: string | null;
  symbols_affected: string[];
  is_active: boolean;
}

// -- Wallet Transaction -----------------------------------------

export type WalletTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'internal_transfer'
  | 'commission'
  | 'swap'
  | 'credit'
  | 'bonus'
  | 'adjustment'
  | 'ib_rebate';

export type WalletTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface WalletTransaction {
  id: string;
  client_id: string;
  account_id: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  status: WalletTransactionStatus;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  approved_by: string | null;
  created_at: string;
  completed_at: string | null;
}

// -- KYC Document -----------------------------------------------

export type KycDocumentType =
  | 'passport'
  | 'national_id'
  | 'drivers_license'
  | 'proof_of_address'
  | 'bank_statement'
  | 'selfie'
  | 'other';

export type KycDocumentStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface KycDocument {
  id: string;
  client_id: string;
  document_type: KycDocumentType;
  file_url: string;
  file_name: string;
  status: KycDocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

// -- Routing Decision -------------------------------------------

export interface RoutingDecision {
  recommended: RoutingMode;
  confidence: number;
  split_ratio: { a_book: number; b_book: number };
  reasons: RoutingReason[];
  risk_flags: RiskFlag[];
  override_allowed: boolean;
  hard_rule_triggered: boolean;
  hard_rule_name: string | null;
  computed_at: string;
}

export interface RoutingReason {
  factor: string;
  weight: number;
  direction: 'a_book' | 'b_book' | 'neutral';
  score: number;
  description: string;
}

// -- Risk Flag --------------------------------------------------

export type RiskFlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskFlagType =
  | 'exposure_breach'
  | 'toxic_client'
  | 'high_win_rate'
  | 'scalping'
  | 'news_trading'
  | 'latency_arbitrage'
  | 'large_position'
  | 'margin_warning'
  | 'consecutive_wins'
  | 'volume_anomaly';

export interface RiskFlag {
  type: RiskFlagType;
  severity: RiskFlagSeverity;
  message: string;
}

// -- Toxic Flow -------------------------------------------------

export type ToxicAction = 'flag' | 'watch' | 'clear';

export interface ToxicFlowResult {
  score: number;
  signals: ToxicSignal[];
  action: ToxicAction;
  recommended_routing: RoutingMode;
}

export type ToxicSignalType =
  | 'high_frequency'
  | 'scalping'
  | 'consistent_winner'
  | 'news_trading'
  | 'consecutive_profitable_days';

export type ToxicSignalSeverity = 'info' | 'warning' | 'critical';

export interface ToxicSignal {
  type: ToxicSignalType;
  severity: ToxicSignalSeverity;
  value: number;
  threshold: number;
  description: string;
}

// -- LP Execution -----------------------------------------------

export interface LPResult {
  success: boolean;
  fill_price: number | null;
  latency_ms: number;
  slippage_pips: number;
  reason: string | null;
  lp_name: string;
  lp_order_id: string | null;
  timestamp: string;
}

// -- Margin Check -----------------------------------------------

export interface MarginCheckResult {
  valid: boolean;
  required: number;
  available: number;
  max_lots: number;
  margin_level_after: number;
  reason: string | null;
}

// -- Transition Context -----------------------------------------

export interface TransitionContext {
  trade_id: string;
  from_status: TradeStatus;
  to_status: TradeStatus;
  triggered_by: 'system' | 'dealer' | 'client' | 'lp' | 'risk_engine';
  reason: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// -- Dealer Session Stats ---------------------------------------

export interface DealerSessionStats {
  dealer_id: string;
  session_start: string;
  trades_processed: number;
  trades_approved: number;
  trades_rejected: number;
  trades_requoted: number;
  avg_processing_ms: number;
  a_book_count: number;
  b_book_count: number;
  hybrid_count: number;
  total_volume_lots: number;
  total_pnl: number;
  alerts_acknowledged: number;
  manual_overrides: number;
}

// -- Execution Result -------------------------------------------

export interface ExecutionResult {
  success: boolean;
  trade_id: string;
  status: TradeStatus;
  fill_price: number | null;
  filled_size: number;
  slippage_pips: number;
  latency_ms: number;
  routing_mode: RoutingMode | null;
  lp_result: LPResult | null;
  margin_check: MarginCheckResult | null;
  routing_decision: RoutingDecision | null;
  errors: string[];
  timestamp: string;
}
