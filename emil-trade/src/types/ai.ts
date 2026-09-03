// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 3: AI Intelligence Ecosystem Types
// ═══════════════════════════════════════════════════════════

// ─── RAPTOR BRAIN (Core Orchestration) ──────────────────────

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'internal' | 'custom';
  modelId: string;
  feature: string;
  isPrimary: boolean;
  status: 'active' | 'standby' | 'disabled';
  avgLatencyMs: number;
  costPer1kTokens: number;
  totalTokensUsed: number;
  totalCost: number;
  successRate: number;
}

export interface AIInferenceLog {
  id: string;
  modelId: string;
  feature: string;
  userId: string | null;
  brokerId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;
  status: 'success' | 'error' | 'filtered';
  createdAt: string;
}

export interface AIUsageStats {
  totalInferences: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  successRate: number;
  byFeature: { feature: string; count: number; cost: number; avgLatency: number }[];
  byDay: { date: string; count: number; cost: number }[];
}

// ─── RAPTOR SENTINEL (Market Intelligence) ──────────────────

export interface SentimentData {
  symbol: string;
  score: number; // -100 to +100
  momentum: number; // rate of change
  sources: { name: string; score: number; weight: number }[];
  retailSentiment: number;
  institutionalSentiment: number;
  putCallRatio: number | null;
  updatedAt: string;
}

export interface PatternDetection {
  id: string;
  symbol: string;
  timeframe: string;
  patternType: string;
  category: 'classical' | 'candlestick' | 'harmonic' | 'elliott' | 'volume' | 'structural';
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  priceTarget: number | null;
  invalidationLevel: number | null;
  detectedAt: string;
  status: 'forming' | 'confirmed' | 'completed' | 'invalidated';
}

export type MarketRegime = 'strong_uptrend' | 'uptrend' | 'ranging' | 'downtrend' | 'strong_downtrend' | 'volatile' | 'low_volatility';

export interface RegimeAnalysis {
  symbol: string;
  currentRegime: MarketRegime;
  regimeProbabilities: { regime: MarketRegime; probability: number }[];
  regimeChangeProbability: number;
  riskEnvironment: 'risk_on' | 'risk_off' | 'neutral';
  liquidityRegime: 'pre_market' | 'regular' | 'post_market' | 'extended';
  updatedAt: string;
}

export interface PriceForcast {
  id: string;
  symbol: string;
  horizon: '1h' | '4h' | '1d';
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  targetPrice: number;
  currentPrice: number;
  expectedMove: number;
  expectedMovePct: number;
  supportLevels: { price: number; strength: number }[];
  resistanceLevels: { price: number; strength: number }[];
  breakoutProbability: number;
  volatilityForecast: number;
  modelVersion: string;
  generatedAt: string;
}

export interface EventImpactPrediction {
  eventId: string;
  eventName: string;
  currency: string;
  impact: 'low' | 'medium' | 'high';
  scheduledAt: string;
  previousValue: string;
  forecastValue: string;
  predictedImpact: { symbol: string; direction: 'up' | 'down'; magnitude: number; confidence: number }[];
  historicalReactions: { date: string; deviation: number; reaction: number }[];
  briefing: string;
}

// ─── RAPTOR ASSIST (Trading Copilot) ────────────────────────

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context: CopilotContext | null;
  createdAt: string;
}

export interface CopilotContext {
  openPositions: { symbol: string; direction: string; pnl: number }[];
  watchlist: string[];
  recentTrades: { symbol: string; pnl: number; closeTime: string }[];
  accountEquity: number;
  currentSymbol: string | null;
}

export interface TraderProfile {
  id: string;
  userId: string;
  tradingStyle: 'scalper' | 'day_trader' | 'swing' | 'position' | 'mixed';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredInstruments: string[];
  preferredSessions: string[];
  tradingRules: string[];
  customInstructions: string;
  updatedAt: string;
}

export interface PersonalizedInsight {
  id: string;
  type: 'performance' | 'psychology' | 'timing' | 'instrument' | 'risk' | 'pattern';
  title: string;
  body: string;
  severity: 'info' | 'suggestion' | 'warning' | 'critical';
  metric: string | null;
  metricValue: number | null;
  createdAt: string;
}

// ─── RAPTOR GUARDIAN (Risk Intelligence) ─────────────────────

export interface ClientRiskScore {
  clientId: string;
  clientName: string;
  overallScore: number;
  band: 'conservative' | 'moderate' | 'aggressive' | 'erratic' | 'abusive';
  dimensions: {
    volatilityTolerance: number;
    positionSizing: number;
    lossReaction: number;
    drawdownBehavior: number;
    overnightRisk: number;
    newsTrading: number;
  };
  trajectory: 'improving' | 'stable' | 'deteriorating';
  cohortPercentile: number;
  recommendedActions: string[];
  updatedAt: string;
}

export interface PredictiveRiskAlert {
  id: string;
  clientId: string;
  clientName: string;
  alertType: 'margin_call_prediction' | 'stop_out_prediction' | 'drawdown_acceleration' | 'revenge_trading' | 'over_leverage';
  probability: number;
  timeHorizon: string;
  confidence: number;
  description: string;
  recommendedAction: string;
  createdAt: string;
}

export interface FraudAlert {
  id: string;
  clientId: string;
  clientName: string;
  fraudType: 'bonus_abuse' | 'multi_accounting' | 'wash_trading' | 'payment_fraud' | 'identity_fraud' | 'social_engineering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, unknown>;
  status: 'open' | 'investigating' | 'confirmed' | 'dismissed';
  createdAt: string;
}

// ─── RAPTOR GROWTH (CRM Intelligence) ───────────────────────

export interface ChurnPrediction {
  clientId: string;
  clientName: string;
  churnProbability: number;
  predictedChurnDate: string;
  signals: { signal: string; weight: number; trend: 'increasing' | 'decreasing' | 'stable' }[];
  churnReason: 'price' | 'service' | 'competitor' | 'life_event' | 'performance' | 'unknown';
  recommendedAction: string;
  ltv: number;
  ltvTrajectory: 'growing' | 'stable' | 'declining';
}

export interface LeadScore {
  leadId: string;
  name: string;
  conversionProbability: number;
  predictedLtv: number;
  signals: { signal: string; score: number }[];
  nextBestAction: string;
  optimalContactTime: string;
}

export interface CampaignPrediction {
  campaignId: string;
  predictedOpenRate: number;
  predictedClickRate: number;
  predictedConversionRate: number;
  suggestedSubjectLines: string[];
  optimalSendTime: string;
  estimatedReach: number;
}

// ─── RAPTOR COMPLY (Compliance AI) ──────────────────────────

export interface RegulatoryUpdate {
  id: string;
  regulator: string;
  title: string;
  summary: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedAreas: string[];
  actionRequired: string | null;
  deadline: string | null;
  sourceUrl: string;
  publishedAt: string;
}

export interface TransactionRiskScore {
  transactionId: string;
  clientId: string;
  amount: number;
  currency: string;
  direction: 'deposit' | 'withdrawal';
  riskScore: number;
  flags: string[];
  typology: string | null;
  requiresReview: boolean;
  autoDecision: 'approve' | 'flag' | 'block' | null;
}

// ─── RAPTOR CARE (Support AI) ───────────────────────────────

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  channel: 'web' | 'whatsapp' | 'telegram' | 'mobile';
  status: 'active' | 'waiting' | 'resolved' | 'escalated';
  messages: SupportMessage[];
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry';
  category: string;
  resolvedWithoutHuman: boolean;
  csatScore: number | null;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  role: 'user' | 'bot' | 'agent';
  content: string;
  confidence: number | null;
  createdAt: string;
}

// ─── Content Engine ─────────────────────────────────────────

export interface GeneratedContent {
  id: string;
  type: 'daily_briefing' | 'weekly_outlook' | 'post_event' | 'educational' | 'signal' | 'notification';
  title: string;
  body: string;
  instruments: string[];
  language: string;
  brandVoice: string;
  generatedAt: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskRating: 1 | 2 | 3 | 4 | 5;
  analysis: string;
  historicalWinRate: number;
  status: 'active' | 'hit_tp' | 'hit_sl' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
}
