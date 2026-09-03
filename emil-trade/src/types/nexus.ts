// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 14: NEXUS (AI Soul) Types
// Not a chatbot — the unified AI consciousness of RAPTOR
// ═══════════════════════════════════════════════════════════

// ─── Personality & Persona ──────────────────────────────────

export type TraderLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'distressed';
export type NexusTone = 'formal' | 'professional' | 'friendly' | 'motivational';
export type NexusSentiment = 'informational' | 'warning' | 'urgent' | 'supportive' | 'celebratory';

export interface NexusPersona {
  id: string;
  brokerId: string;
  name: string;
  avatarUrl: string | null;
  voiceId: string | null;
  tone: NexusTone;
  primaryLanguage: string;
  fallbackLanguage: string;
  disclaimerText: string;
  customKnowledge: string[];
  featureToggles: NexusFeatureToggles;
}

export interface NexusFeatureToggles {
  tradeCoPilot: boolean;
  liveTradeMonitor: boolean;
  entrySignals: boolean;
  exitSignals: boolean;
  trendDetection: boolean;
  psychologyCoach: boolean;
  educationMode: boolean;
  weeklyReport: boolean;
  voiceEnabled: boolean;
}

// ─── Trade Co-Pilot ─────────────────────────────────────────

export interface PreTradeBrief {
  chartAnalysis: string;
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  keyLevels: { type: 'support' | 'resistance'; price: number; strength: number }[];
  existingPositions: { symbol: string; direction: string; count: number }[];
  marginImpact: { freeMarginAfter: number; marginLevelAfter: number };
  marketContext: string[];
  suggestedSl: number | null;
  suggestedTp: number | null;
  rrRatio: number | null;
  riskPct: number;
  historicalPerformance: { setupType: string; winRate: number; avgRr: number; sampleSize: number } | null;
  verdict: 'proceed' | 'consider_waiting' | 'strong_caution';
  verdictReason: string;
  confidence: number;
}

// ─── Live Trade Monitor ─────────────────────────────────────

export interface TradeAlert {
  id: string;
  positionId: string;
  type: 'sl_approach' | 'tp_approach' | 'divergence' | 'long_hold' | 'sentiment_shift' | 'profit_target' | 'losing_streak' | 'checkin';
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  timestamp: string;
}

// ─── Signals ────────────────────────────────────────────────

export interface NexusSignal {
  id: string;
  symbol: string;
  timeframe: string;
  setupName: string;
  direction: 'buy' | 'sell';
  confidence: number;
  supportingFactors: string[];
  riskFactors: string[];
  suggestedEntry: number;
  suggestedSl: number;
  suggestedTp: number[];
  historicalWinRate: number;
  historicalSampleSize: number;
  status: 'active' | 'triggered' | 'expired' | 'invalidated';
  createdAt: string;
  expiresAt: string;
}

// ─── Psychology & Coaching ──────────────────────────────────

export type PsychologyPattern =
  | 'overtrading' | 'revenge_trading' | 'loss_aversion' | 'early_profit_taking'
  | 'fomo' | 'sl_moving' | 'position_sizing_increase' | 'session_fatigue';

export interface PsychologyAlert {
  id: string;
  pattern: PsychologyPattern;
  severity: 'gentle' | 'firm' | 'urgent' | 'crisis';
  message: string;
  suggestion: string;
  dataPoints: { metric: string; value: string; normal: string }[];
  timestamp: string;
}

export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  pnl: number;
  trades: number;
  winRate: number;
  avgRr: number;
  bestTrade: { symbol: string; pnl: number; lesson: string };
  worstTrade: { symbol: string; pnl: number; lesson: string };
  psychologyInsight: string;
  marketOutlook: string;
  weeklyGoal: string;
  motivationalMessage: string;
  comparedToAverage: { metric: string; thisWeek: number; average: number; trend: 'up' | 'down' | 'stable' }[];
}

// ─── NEXUS API Response ─────────────────────────────────────

export interface NexusResponse {
  response: string;
  confidence: number;
  sources: string[];
  disclaimer: string;
  actions: NexusAction[];
  sentiment: NexusSentiment;
}

export interface NexusAction {
  label: string;
  type: 'navigate' | 'execute' | 'dismiss' | 'learn_more';
  target: string;
}

// ─── Broker NEXUS (B2B) ─────────────────────────────────────

export interface NexusBrokerBriefing {
  greeting: string;
  priorityAlerts: { title: string; severity: NexusSentiment; detail: string }[];
  opportunities: string[];
  risks: string[];
  revenueInsight: string;
  marketContext: string;
  actionItems: { action: string; priority: 'high' | 'medium' | 'low'; target: string }[];
}

export interface NexusRiskAdvice {
  symbol: string;
  exposurePct: number;
  recommendation: string;
  suggestedAction: 'hedge' | 'reduce' | 'monitor' | 'route_change';
  confidence: number;
}

// ─── Superprompt: Execution Decision (Section 2.3) ─────────

export interface ExecutionDecision {
  tradeId: string;
  route: 'A_BOOK' | 'B_BOOK' | 'HYBRID';
  hybridSplit?: number; // 0-100, percentage to A-book
  reason: string;
  confidence: number; // 0-100
  simulatedBrokerPnL: number;
  hedgeCost: number;
  timestamp: Date;
}

// ─── Superprompt: Dealer Override (Section 3.6) ────────────

export interface DealerOverride {
  dealerId: string;
  tradeId: string;
  originalDecision: ExecutionDecision;
  overriddenRoute: 'A_BOOK' | 'B_BOOK' | 'HYBRID' | 'REJECT';
  reason: string;
  timestamp: Date;
  outcome?: 'PROFIT' | 'LOSS'; // filled post-trade close
}

// ─── Superprompt: Trade Prediction (Section 4.3) ──────────

export interface TradePrediction {
  tradeId: string;
  winProbability: number;
  brokerPnLIfBBook: number;
  hedgeCostIfABook: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  volatilityFlag: boolean;
}

// ─── Superprompt: Auto-Trade Consent (Section 6.3) ────────

export type AutoTradeStyle = 'scalping' | 'intraday' | 'swing';
export type AutoTradeControlLevel = 'assistive' | 'balanced' | 'aggressive';

export interface AutoTradeParameters {
  maxRiskPerTrade: number; // percentage (e.g. 1 = 1%)
  maxDailyLoss: number;   // percentage
  style: AutoTradeStyle;
  sessions: ('london' | 'new_york' | 'asia')[];
  allowedSymbols: string[];
  controlLevel: AutoTradeControlLevel;
  pauseAfterConsecutiveLosses: number;
  volatilityGuard: boolean;
  newsFilter: boolean;
}

export interface AutoTradeConsent {
  id: string;
  traderId: string;
  acceptedAt: string;
  ipAddress: string | null;
  parameters: AutoTradeParameters;
  revokedAt: string | null;
  isActive: boolean;
}

// ─── Superprompt: NEXUS Voice Layer (Section 7) ────────────

export type NexusVoiceMode = 'silent' | 'assistive' | 'active_guidance' | 'full_voice';
export type NexusVoicePersonality = 'calm_analyst' | 'sharp_trader' | 'minimal';
export type NexusVoicePriority = 'P1' | 'P2' | 'P3';

export interface NexusVoiceConfig {
  mode: NexusVoiceMode;
  personality: NexusVoicePersonality;
  language: string;
  volume: number; // 0-1
}

export interface NexusVoiceMessage {
  text: string;
  priority: NexusVoicePriority;
  category: 'idle' | 'entry_good' | 'entry_late' | 'entry_risky' | 'running_neutral'
    | 'profit_zone' | 'loss_danger' | 'critical_event' | 'auto_trade' | 'behavioral';
  cooldownMs: number;
}

// ─── Superprompt: Scenario Simulation (Section 3.7) ───────

export interface ScenarioSimulationRequest {
  symbol: string;
  priceChangePct: number;
  timeframeSeconds: number;
}

export interface ScenarioSimulationResult {
  brokerPnlImpact: number;
  marginCascadeRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedClients: number;
  stopOutsTriggered: number;
  hedgeCoverage: number;
  recommendation: string;
}
