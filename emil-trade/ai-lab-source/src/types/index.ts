export type TradingMode = 'demo' | 'paper' | 'live';

export type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

export interface AgentState {
  name: string;
  status: AgentStatus;
  last_result?: unknown;
  message?: string;
  updated_at?: string;
}

export interface MarketTick {
  symbol: string;
  price: number;
  prev_close: number;
  change_pct: number;
  group: string;
  time: string;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  [key: string]: number | string | boolean | null | undefined;
}

export interface StrategyConfig {
  symbol?: string;
  timeframe?: string;
  markets?: string[];
  entry_logic?: string;
  exit_logic?: string;
  risk_pct?: number;
  sl_atr?: number;
  tp_atr?: number;
  best_regime?: string;
  worst_regime?: string;
  risk_level?: string;
  explanation?: string;
  expected_return?: number;
  [key: string]: unknown;
}

export type StrategyStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAPER'
  | 'LIVE';

export interface BacktestMetrics {
  total_return_pct?: number;
  cagr_pct?: number;
  max_drawdown_pct?: number;
  sharpe?: number;
  sortino?: number;
  calmar?: number;
  win_rate_pct?: number;
  profit_factor?: number;
  avg_trade?: number;
  num_trades?: number;
  max_consecutive_losses?: number;
  final_equity?: number;
  initial_capital?: number;
  [key: string]: number | undefined;
}

export interface EquityPoint {
  time?: string;
  equity: number;
  benchmark?: number;
  drawdown?: number;
  [key: string]: unknown;
}

export interface Trade {
  entry_time?: string;
  exit_time?: string;
  side?: string;
  entry?: number;
  exit?: number;
  pnl: number;
  return_pct?: number;
  [key: string]: unknown;
}

export interface AgentVote {
  agent: string;
  vote: string; // "yes" | "no" | "abstain" or 👍/👎/🤷
  confidence: number;
  reasoning?: string;
}

export interface Strategy {
  id: number;
  name: string;
  description: string;
  status: StrategyStatus | string;
  mode: string;
  config: StrategyConfig;
  created_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  backtest?: {
    metrics: BacktestMetrics;
    equity_curve: EquityPoint[];
    trades: Trade[];
  } | null;
  votes?: AgentVote[];
}

export interface Position {
  id: number;
  strategy_id?: number | null;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  status: string;
  opened_at?: string | null;
}

export interface AuditEvent {
  id?: number;
  event_type: string;
  strategy_id?: number | null;
  message: string;
  data?: unknown;
  created_at?: string | null;
}

export interface ResearchPaper {
  id: number;
  title: string;
  authors?: string;
  abstract?: string;
  insights: string[];
  relevance_score?: number;
  created_at?: string | null;
}

export interface Regime {
  regime?: string;
  confidence?: number;
  description?: string;
  [key: string]: unknown;
}

export interface DashboardData {
  summary: {
    total_strategies: number;
    pending_approval: number;
    paper_trading: number;
    open_positions: number;
    total_pnl: number;
  };
  regime?: Regime | null;
  recent_strategies: Strategy[];
  open_positions: Position[];
  market_ticks: MarketTick[];
  recent_events: AuditEvent[];
  agents: { name: string; status: string }[];
}

export interface WsMessage {
  type: string;
  payload: any;
  ts: string;
}
