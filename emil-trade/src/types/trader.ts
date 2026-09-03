// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 2: Trader Platform Types
// B2C — Traders see only their own data
// ═══════════════════════════════════════════════════════════

// ─── Trade Journal ──────────────────────────────────────────

export interface JournalEntry {
  id: string;
  tradeId: string;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPct: number;
  commission: number;
  swap: number;
  duration: string;
  openTime: string;
  closeTime: string;
  notes: string;
  tags: string[];
  screenshotUrl: string | null;
  ruleFollowed: boolean | null;
  selfAssessment: 'excellent' | 'good' | 'neutral' | 'poor' | null;
  setupType: string | null;
}

// ─── Performance Analytics ──────────────────────────────────

export interface PerformanceStats {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  maxDrawdownDuration: string;
  recoveryFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  avgHoldTime: string;
  bestTrade: number;
  worstTrade: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';
}

export interface MonthlyReturn {
  year: number;
  month: number;
  returnPct: number;
  trades: number;
  pnl: number;
}

export interface TradeDistribution {
  label: string;
  count: number;
  pnl: number;
  winRate: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  balance: number;
  drawdown: number;
}

// ─── Copy Trading ───────────────────────────────────────────

export interface CopyProvider {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  strategy: string;
  totalReturn: number;
  monthlyAvgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  followers: number;
  aum: number;
  riskRating: 1 | 2 | 3 | 4 | 5;
  isVerified: boolean;
  liveMonths: number;
  performanceFee: number;
  monthlyFee: number;
  instruments: string[];
  instrumentBreakdown: { symbol: string; pct: number }[];
  equityCurve: EquityPoint[];
  monthlyReturns: MonthlyReturn[];
  tradingStyle: 'scalping' | 'day_trading' | 'swing' | 'position' | 'mixed';
  createdAt: string;
}

export interface CopySubscription {
  id: string;
  providerId: string;
  providerName: string;
  allocationPct: number;
  allocationAmount: number;
  lotSizing: 'proportional' | 'fixed' | 'equity_based';
  fixedLotSize: number | null;
  maxDrawdown: number;
  instrumentFilter: string[];
  isActive: boolean;
  totalReturn: number;
  feesPaid: number;
  copiedTrades: number;
  startDate: string;
}

// ─── Social Feed ────────────────────────────────────────────

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  type: 'shared_trade' | 'market_opinion' | 'discussion';
  symbol: string | null;
  direction: 'buy' | 'sell' | null;
  pnl: number | null;
  body: string;
  screenshotUrl: string | null;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── Prop Trading ───────────────────────────────────────────

export interface PropChallenge {
  id: string;
  name: string;
  type: '1_phase' | '2_phase' | 'instant_funding';
  accountSize: number;
  price: number;
  profitTarget: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  minTradingDays: number;
  durationDays: number | null;
  profitSplit: number;
  instruments: string[];
  rules: string[];
  scalingPlan: ScalingStep[];
}

export interface ScalingStep {
  level: number;
  accountSize: number;
  profitTarget: number;
  requirement: string;
}

export interface PropEnrollment {
  id: string;
  challengeId: string;
  challengeName: string;
  phase: number;
  totalPhases: number;
  accountSize: number;
  status: 'active' | 'passed' | 'failed' | 'funded';
  currentPnl: number;
  currentPnlPct: number;
  profitTarget: number;
  dailyLossUsed: number;
  dailyLossLimit: number;
  maxDrawdownUsed: number;
  maxDrawdownLimit: number;
  tradingDays: number;
  minTradingDays: number;
  startDate: string;
  endDate: string | null;
  equityCurve: EquityPoint[];
  dailyPnl: { date: string; pnl: number }[];
  violationRisk: 'safe' | 'caution' | 'danger';
  violationMessage: string | null;
}

// ─── PAMM ───────────────────────────────────────────────────

export interface PammFund {
  id: string;
  managerName: string;
  managerBio: string;
  strategyDescription: string;
  instruments: string[];
  netReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  managementFee: number;
  performanceFee: number;
  highWaterMark: boolean;
  minInvestment: number;
  lockUpDays: number;
  investorCount: number;
  totalAum: number;
  liveMonths: number;
  isVerified: boolean;
  equityCurve: EquityPoint[];
  monthlyReturns: MonthlyReturn[];
}

export interface PammInvestment {
  id: string;
  fundId: string;
  fundName: string;
  investedAmount: number;
  currentValue: number;
  returnPct: number;
  feesPaid: number;
  investedAt: string;
  autoReinvest: boolean;
}

// ─── Algo Trading ───────────────────────────────────────────

export interface DeployedStrategy {
  id: string;
  scriptId: string;
  name: string;
  kind: 'ea' | 'indicator' | 'script';
  status: 'running' | 'paused' | 'stopped' | 'error';
  instrument: string;
  timeframe: string;
  parameters: Record<string, string | number | boolean>;
  equityCurve: EquityPoint[];
  totalTrades: number;
  winRate: number;
  pnl: number;
  startedAt: string;
  lastSignalAt: string | null;
  errorMessage: string | null;
  schedule: string | null;
  conflicts: string[];
}

export interface StrategyBacktest {
  id: string;
  scriptId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  parameters: Record<string, string | number | boolean>;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: EquityPoint[];
  trades: { openTime: string; closeTime: string; pnl: number; symbol: string }[];
  completedAt: string;
}

// ─── No-Code Builder ────────────────────────────────────────

export type BlockType = 'condition' | 'action' | 'indicator' | 'time_filter' | 'risk' | 'logic';

export interface StrategyBlock {
  id: string;
  type: BlockType;
  label: string;
  config: Record<string, unknown>;
  connections: { targetId: string; port: 'then' | 'else' | 'next' }[];
  position: { x: number; y: number };
}

export interface NoCodeStrategy {
  id: string;
  name: string;
  blocks: StrategyBlock[];
  isDeployed: boolean;
  lastBacktest: StrategyBacktest | null;
}

// ─── Finance Portal ─────────────────────────────────────────

export type PaymentMethod = 'card' | 'bank_wire' | 'crypto_btc' | 'crypto_eth' | 'crypto_usdt'
  | 'upi' | 'fpx' | 'promptpay' | 'ideal' | 'sofort';

export interface DepositRequest {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  bonusClaimed: number;
  reference: string;
  createdAt: string;
  completedAt: string | null;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  destination: string;
  status: 'pending' | 'processing' | 'approved' | 'completed' | 'rejected';
  estimatedProcessing: string;
  rejectionReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AccountStatement {
  id: string;
  type: 'trade' | 'deposit' | 'withdrawal' | 'swap' | 'commission' | 'bonus' | 'transfer' | 'fee';
  amount: number;
  balance: number;
  description: string;
  reference: string;
  createdAt: string;
}

// ─── Smart Alerts ───────────────────────────────────────────

export type AlertType = 'price' | 'indicator' | 'pattern' | 'calendar' | 'position' | 'news_sentiment';
export type AlertDelivery = 'in_app' | 'push' | 'email' | 'sms' | 'telegram' | 'discord' | 'webhook';

export interface SmartAlert {
  id: string;
  type: AlertType;
  symbol: string | null;
  condition: string;
  threshold: string;
  delivery: AlertDelivery[];
  isActive: boolean;
  triggeredCount: number;
  lastTriggered: string | null;
  createdAt: string;
}

// ─── Education ──────────────────────────────────────────────

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  lessonCount: number;
  completedLessons: number;
  duration: string;
  thumbnailUrl: string | null;
  xpReward: number;
  badge: string | null;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  streak: number;
  badges: string[];
  coursesCompleted: number;
  quizzesPassed: number;
}
