// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 11: RAPTOR CORE ENGINE Types
// Indigenous matching engine — MT5/cTrader are bridges only
// ═══════════════════════════════════════════════════════════

// ─── Order Management System ────────────────────────────────

export type OrderType =
  | 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  | 'oco' | 'oto' | 'oca' | 'basket' | 'iceberg'
  | 'twap' | 'vwap' | 'scale_in' | 'scale_out'
  | 'conditional' | 'time_order' | 'news_order' | 'range_order';

export type TimeInForce = 'FOK' | 'IOC' | 'GTC' | 'GTD' | 'DAY';

export type OrderLifecycle =
  | 'pending' | 'validating' | 'routing' | 'at_lp' | 'partial_fill' | 'filled'
  | 'rejected' | 'cancelled' | 'expired' | 'requoted' | 'modified' | 'closed';

export interface CoreOrder {
  id: string;
  accountId: string;
  symbol: string;
  type: OrderType;
  direction: 'buy' | 'sell';
  volume: number;
  filledVolume: number;
  price: number | null;
  stopPrice: number | null;
  limitPrice: number | null;
  trailingDistance: number | null;
  trailingType: 'points' | 'percentage' | null;
  stopLoss: number | null;
  takeProfit: number | null;
  timeInForce: TimeInForce;
  expireAt: string | null;
  slippageTolerance: number;
  lifecycle: OrderLifecycle;
  executionPrice: number | null;
  executionTime: string | null;
  rejectReason: string | null;
  linkedOrderIds: string[];
  icebergVisibleVolume: number | null;
  twapIntervalMs: number | null;
  conditionExpression: string | null;
  newsEventId: string | null;
  rangeHigh: number | null;
  rangeLow: number | null;
  strategyId: string | null;
  comment: string;
  routingDecision: 'a_book' | 'b_book' | 'hybrid' | null;
  lpFillPrice: number | null;
  slippage: number;
  priceImprovement: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Position Management System ─────────────────────────────

export type PositionMode = 'netting' | 'hedging' | 'portfolio';

export type PositionOperation =
  | 'open' | 'partial_close' | 'add' | 'modify' | 'flip'
  | 'transfer' | 'split' | 'merge' | 'close';

export interface CorePosition {
  id: string;
  accountId: string;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  trailingStop: number | null;
  unrealizedPnl: number;
  realizedPnl: number;
  swap: number;
  commission: number;
  marginUsed: number;
  openTime: string;
  lastModified: string;
  strategyId: string | null;
  positionMode: PositionMode;
  linkedPositionId: string | null;
  isHedged: boolean;
}

export interface PnlSummary {
  accountId: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  openPositions: number;
}

export interface PositionEvent {
  id: string;
  positionId: string;
  operation: PositionOperation;
  volumeBefore: number;
  volumeAfter: number;
  priceBefore: number | null;
  priceAfter: number | null;
  pnlRealized: number;
  reason: string;
  executedBy: 'client' | 'dealer' | 'system' | 'ea';
  timestamp: string;
}

// ─── Execution Engine ───────────────────────────────────────

export interface ExecutionConfig {
  slippageToleranceDefault: number;
  requoteThresholdPips: number;
  priceImprovementEnabled: boolean;
  marketOrderDelay: number;
  maxConcurrentOrders: number;
  atomicOperations: boolean;
}

export interface ExecutionMetrics {
  ordersPerSecond: number;
  avgExecutionMs: number;
  p99ExecutionMs: number;
  fillRate: number;
  requoteRate: number;
  rejectionRate: number;
  avgSlippage: number;
  priceImprovementRate: number;
}

// ─── Migration Bridge ───────────────────────────────────────

export type MigrationPlatform = 'mt5' | 'ctrader';
export type MigrationStatus = 'not_started' | 'syncing' | 'partial' | 'complete' | 'error';

export interface MigrationBridge {
  id: string;
  platform: MigrationPlatform;
  serverHost: string;
  serverName: string;
  status: MigrationStatus;
  totalAccounts: number;
  migratedAccounts: number;
  totalPositions: number;
  migratedPositions: number;
  totalHistory: number;
  migratedHistory: number;
  trafficSplitPct: number;
  lastSyncAt: string | null;
  errors: { message: string; timestamp: string }[];
}

export interface MigrationConfig {
  syncInterval: number;
  syncPositions: boolean;
  syncOrders: boolean;
  syncHistory: boolean;
  syncBalances: boolean;
  trafficSplitPct: number;
  autoMigrate: boolean;
}
