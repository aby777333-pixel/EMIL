// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 10: RAPTOR DESK (Dealing Desk) Types
// Strictly B2B — Traders never see this
// ═══════════════════════════════════════════════════════════

// ─── Dealer Workstation ─────────────────────────────────────

export interface DealerPosition {
  id: string;
  clientName: string;
  accountNumber: string;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  unrealizedPnl: number;
  swap: number;
  commission: number;
  marginUsed: number;
  openTime: string;
  riskBand: string;
  ibName: string | null;
  country: string;
  accountGroup: string;
  isHedged: boolean;
  hedgeLpName: string | null;
  dealerNotes: string | null;
}

export interface LiveOrder {
  id: string;
  clientName: string;
  accountNumber: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  direction: 'buy' | 'sell';
  volume: number;
  requestedPrice: number;
  currentPrice: number;
  slippage: number;
  status: 'pending' | 'filled' | 'partial' | 'rejected' | 'requoted' | 'cancelled';
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  routingDecision: 'a_book' | 'b_book' | 'hybrid' | 'pending';
  receivedAt: string;
  filledAt: string | null;
  dealerAction: string | null;
}

export interface DealerAction {
  id: string;
  dealerName: string;
  action: 'force_close' | 'modify_sl' | 'modify_tp' | 'reject_order' | 'requote' | 'partial_fill' | 'mass_cancel' | 'override_routing' | 'margin_extension' | 'spread_override';
  targetType: 'position' | 'order' | 'symbol' | 'account';
  targetId: string;
  details: Record<string, unknown>;
  reason: string;
  timestamp: string;
}

// ─── Price Engine ───────────────────────────────────────────

export interface SpreadProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  markupType: 'fixed_points' | 'percentage';
  defaultMarkup: number;
  symbolOverrides: { symbol: string; markup: number }[];
  appliedToGroups: string[];
  appliedToTiers: string[];
}

export interface SpreadOverride {
  id: string;
  symbol: string;
  profile: string | null;
  clientId: string | null;
  overrideMarkup: number;
  reason: string;
  setBy: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ScheduledSpreadEvent {
  id: string;
  name: string;
  symbols: string[];
  spreadMultiplier: number;
  startAt: string;
  endAt: string;
  autoRevert: boolean;
  linkedEventId: string | null;
  isActive: boolean;
}

export interface PriceLatencyMetric {
  symbol: string;
  lpToEngine: number;
  engineToClient: number;
  totalLatency: number;
  staleQuoteAge: number;
  isStale: boolean;
  lastUpdate: string;
}

// ─── Risk Desk ──────────────────────────────────────────────

export interface ExposureLimit {
  id: string;
  symbol: string;
  maxNetExposureUsd: number;
  currentExposureUsd: number;
  utilizationPct: number;
  isBreached: boolean;
  autoHedgeThreshold: number;
  autoHedgeEnabled: boolean;
}

export interface MarginCallEntry {
  id: string;
  clientName: string;
  accountNumber: string;
  equity: number;
  margin: number;
  marginLevel: number;
  freeMargin: number;
  urgency: 'warning' | 'critical' | 'stop_out';
  largestPosition: { symbol: string; pnl: number };
  emailSent: boolean;
  smsSent: boolean;
  callTaskCreated: boolean;
  marginExtended: boolean;
  extensionExpiry: string | null;
}

export interface BridgePnlEntry {
  symbol: string;
  clientExecutionPrice: number;
  lpFillPrice: number;
  slippage: number;
  volume: number;
  bridgePnl: number;
  direction: 'positive' | 'negative';
  lpName: string;
  timestamp: string;
}

// ─── Back-Office ────────────────────────────────────────────

export interface SettlementReport {
  id: string;
  date: string;
  totalTrades: number;
  totalVolumeLots: number;
  realizedPnl: number;
  totalSwaps: number;
  totalCommissions: number;
  netSettlement: number;
  currencies: { currency: string; amount: number }[];
  status: 'pending' | 'reconciled' | 'discrepancy';
}

export interface ReconciliationItem {
  id: string;
  source: 'platform' | 'psp' | 'bank';
  reference: string;
  amount: number;
  currency: string;
  matchStatus: 'matched' | 'unmatched' | 'partial' | 'disputed';
  matchedWith: string | null;
  variance: number;
  date: string;
}

export interface CorporateAction {
  id: string;
  symbol: string;
  type: 'dividend' | 'split' | 'rebalance';
  description: string;
  effectiveDate: string;
  adjustmentValue: number;
  affectedPositions: number;
  status: 'scheduled' | 'applied' | 'cancelled';
}

export interface SwapConfig {
  symbol: string;
  swapLong: number;
  swapShort: number;
  tripleSwapDay: 'wednesday' | 'friday';
  isIslamicOverride: boolean;
  islamicFee: number;
  customOverrides: { accountGroup: string; swapLong: number; swapShort: number }[];
}
