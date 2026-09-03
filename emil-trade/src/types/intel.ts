// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 15: RAPTOR INTEL Types
// Indigenous BI & Analytics platform
// ═══════════════════════════════════════════════════════════

// ─── Executive Dashboard (B2B) ──────────────────────────────

export interface ExecutiveKpis {
  revenueToday: number;
  revenueTrend: number[];
  clientsToday: number;
  clientsTrend: number[];
  depositsToday: number;
  depositsTrend: number[];
  volumeToday: number;
  volumeTrend: number[];
  conversionFunnel: FunnelStage[];
  geoRevenue: { country: string; code: string; revenue: number; clients: number }[];
  assetBreakdown: { assetClass: string; revenue: number; volume: number; pct: number }[];
  topClients: { name: string; revenue: number; volume: number }[];
  bottomClients: { name: string; loss: number; volume: number }[];
}

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

// ─── Revenue Analytics ──────────────────────────────────────

export interface RevenueAnalytics {
  waterfall: { type: string; amount: number; pct: number }[];
  perClient: { percentile: number; revenue: number; cumPct: number }[];
  byIb: { ibName: string; revenue: number; commission: number; roi: number }[];
  byAsset: { symbol: string; revenue: number; volume: number; tradeCount: number }[];
  seasonality: { period: string; avgRevenue: number; current: number }[];
  forecast: { date: string; predicted: number; lowerBound: number; upperBound: number }[];
}

// ─── Client Analytics ───────────────────────────────────────

export interface ClientAnalytics {
  cohorts: { cohort: string; day30: number; day60: number; day90: number; day180: number }[];
  churnFactors: { factor: string; impact: number; direction: 'positive' | 'negative' }[];
  activation: FunnelStage[];
  healthDistribution: { bracket: string; count: number; pct: number; color: string }[];
  dormancy: { period: string; count: number; recoverable: number }[];
  geoPerformance: { country: string; cac: number; ltv: number; ratio: number }[];
}

// ─── Trading Analytics ──────────────────────────────────────

export interface TradingAnalytics {
  volumeByDay: { date: string; lots: number; trades: number }[];
  instrumentRanking: { symbol: string; volume: number; revenue: number; tradeCount: number; avgSpread: number }[];
  orderTypeBreakdown: { type: string; count: number; pct: number }[];
  sessionVolume: { session: string; volume: number; pct: number; avgSpread: number }[];
  spreadAnalysis: { symbol: string; effectiveSpread: number; lpSpread: number; markup: number }[];
  executionQuality: { metric: string; value: number; benchmark: number; status: 'good' | 'fair' | 'poor' }[];
}

// ─── Trader Analytics (B2C) ─────────────────────────────────

export interface TraderInsights {
  fomoScore: number;
  disciplineScore: number;
  overtradingScore: number;
  riskConsistency: number;
  strengths: { area: string; score: number; detail: string }[];
  weaknesses: { area: string; score: number; suggestion: string }[];
  bestInstruments: string[];
  bestSessions: string[];
  bestSetups: string[];
}

export interface PnlDistribution {
  bucketLabel: string;
  count: number;
  isWin: boolean;
}

export interface HoldingTimeAnalysis {
  avgWinHoldMinutes: number;
  avgLossHoldMinutes: number;
  optimalHoldMinutes: number;
  holdTimeVsPnl: { holdMinutes: number; avgPnl: number }[];
}
