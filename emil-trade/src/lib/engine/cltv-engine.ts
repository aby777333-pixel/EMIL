// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Client Lifetime Value (CLTV) Engine
//
// Predicts revenue potential per trader and classifies into
// actionable segments for routing, spread, and retention decisions.
//
// CLTV = f(DepositVelocity, TradingFrequency, LossRate,
//          RetentionProbability, IBSourceQuality)
// ═══════════════════════════════════════════════════════════════

export interface ClientBehavior {
  userId: string;
  totalDeposits: number;
  depositCount: number;
  daysSinceFirstDeposit: number;
  daysSinceLastDeposit: number;
  totalVolumeLots: number;
  tradeCount: number;
  daysSinceLastTrade: number;
  winRate: number;             // 0-1
  totalPnl: number;            // realized + floating
  avgTradeHoldingMinutes: number;
  ibSourceId?: string;
  ibSourceQuality?: number;    // 0-1
}

export type ClientSegment = 'high_value' | 'growth' | 'standard' | 'burnout_risk' | 'toxic' | 'dormant';

export interface CLTVResult {
  userId: string;
  cltvEstimate: number;        // predicted lifetime revenue in USD
  segment: ClientSegment;
  depositVelocity: number;     // $/day
  tradingFrequency: number;    // trades/day
  lossRate: number;            // 0-1
  retentionProbability: number;// 0-1
  churnRisk: number;           // 0-1
  actions: string[];           // recommended actions
}

// ── Segment thresholds ───────────────────────────────────────
const SEGMENTS = {
  high_value:   { minCLTV: 5000, minDeposits: 10000 },
  growth:       { minCLTV: 1000, minDeposits: 2000 },
  standard:     { minCLTV: 200,  minDeposits: 100 },
  burnout_risk: { maxWinRate: 0.25, maxPnlRatio: -0.5 },
  toxic:        { minWinRate: 0.65, minAvgProfit: 50 },
  dormant:      { minInactiveDays: 30 },
};

/**
 * Calculate CLTV and segment for a single client.
 */
export function calculateCLTV(behavior: ClientBehavior): CLTVResult {
  const {
    totalDeposits, depositCount, daysSinceFirstDeposit, daysSinceLastDeposit,
    totalVolumeLots, tradeCount, daysSinceLastTrade, winRate, totalPnl,
    avgTradeHoldingMinutes, ibSourceQuality,
  } = behavior;

  // ── Deposit velocity ($/day) ──
  const activeDays = Math.max(daysSinceFirstDeposit, 1);
  const depositVelocity = totalDeposits / activeDays;

  // ── Trading frequency (trades/day) ──
  const tradingFrequency = tradeCount / Math.max(activeDays, 1);

  // ── Loss rate ──
  const lossRate = 1 - winRate;

  // ── Retention probability (logistic model) ──
  const recencyFactor = Math.exp(-daysSinceLastTrade / 30); // decays over 30 days
  const depositMomentum = depositCount > 1 ? Math.min(depositCount / 10, 1) : 0.2;
  const activityFactor = Math.min(tradingFrequency / 2, 1); // active up to 2 trades/day

  const retentionProbability = clamp01(
    0.3 * recencyFactor +
    0.3 * depositMomentum +
    0.2 * activityFactor +
    0.2 * (1 - Math.min(daysSinceLastDeposit / 90, 1))
  );

  // ── Churn risk ──
  const churnRisk = clamp01(1 - retentionProbability);

  // ── CLTV estimate ──
  // Revenue per trade ≈ spread revenue + commission
  // Estimate: $2-5 per lot traded (varies by spread config)
  const revenuePerLot = 3.0;
  const projectedMonths = retentionProbability * 12; // expected remaining months
  const monthlyVolume = (totalVolumeLots / Math.max(activeDays / 30, 1));
  const ibQualityMultiplier = ibSourceQuality !== undefined ? (0.5 + ibSourceQuality * 0.5) : 1.0;

  let cltvEstimate = monthlyVolume * revenuePerLot * projectedMonths * ibQualityMultiplier;

  // B-book bonus: losing clients are more valuable (their losses = broker revenue)
  if (lossRate > 0.6) {
    const bBookMultiplier = 1 + (lossRate - 0.6) * 2; // up to 1.8x
    cltvEstimate *= bBookMultiplier;
  }

  cltvEstimate = Math.round(cltvEstimate * 100) / 100;

  // ── Segment classification ──
  let segment: ClientSegment;
  const actions: string[] = [];

  // Check dormant first
  if (daysSinceLastTrade >= SEGMENTS.dormant.minInactiveDays) {
    segment = 'dormant';
    actions.push('TRIGGER_REACTIVATION_CAMPAIGN');
    actions.push('OFFER_DEPOSIT_BONUS');
  }
  // Check toxic (profitable scalpers)
  else if (winRate >= SEGMENTS.toxic.minWinRate && avgTradeHoldingMinutes < 5) {
    segment = 'toxic';
    actions.push('ROUTE_TO_A_BOOK');
    actions.push('WIDEN_SPREADS');
    actions.push('INCREASE_MONITORING');
  }
  // Check burnout risk
  else if (winRate <= SEGMENTS.burnout_risk.maxWinRate && totalPnl < totalDeposits * SEGMENTS.burnout_risk.maxPnlRatio!) {
    segment = 'burnout_risk';
    actions.push('REDUCE_LEVERAGE_SUGGESTION');
    actions.push('SEND_EDUCATIONAL_CONTENT');
    actions.push('OFFER_DEMO_RESET');
  }
  // Check high value
  else if (cltvEstimate >= SEGMENTS.high_value.minCLTV && totalDeposits >= SEGMENTS.high_value.minDeposits) {
    segment = 'high_value';
    actions.push('ASSIGN_VIP_MANAGER');
    actions.push('TIGHTEN_SPREADS');
    actions.push('FASTER_WITHDRAWALS');
  }
  // Check growth
  else if (cltvEstimate >= SEGMENTS.growth.minCLTV) {
    segment = 'growth';
    actions.push('NURTURE_SEQUENCE');
    actions.push('UPSELL_ECN_ACCOUNT');
  }
  // Default
  else {
    segment = 'standard';
    actions.push('STANDARD_ENGAGEMENT');
  }

  return {
    userId: behavior.userId,
    cltvEstimate,
    segment,
    depositVelocity: round2(depositVelocity),
    tradingFrequency: round2(tradingFrequency),
    lossRate: round4(lossRate),
    retentionProbability: round4(retentionProbability),
    churnRisk: round4(churnRisk),
    actions,
  };
}

/**
 * Batch CLTV calculation for multiple clients.
 * Returns sorted by CLTV descending.
 */
export function batchCalculateCLTV(clients: ClientBehavior[]): CLTVResult[] {
  return clients
    .map(calculateCLTV)
    .sort((a, b) => b.cltvEstimate - a.cltvEstimate);
}

/**
 * Get segment-level summary for broker dashboard.
 */
export function getSegmentSummary(results: CLTVResult[]): Record<ClientSegment, {
  count: number;
  totalCLTV: number;
  avgCLTV: number;
}> {
  const summary: Record<string, { count: number; totalCLTV: number; avgCLTV: number }> = {};
  const segments: ClientSegment[] = ['high_value', 'growth', 'standard', 'burnout_risk', 'toxic', 'dormant'];

  for (const seg of segments) {
    const matching = results.filter(r => r.segment === seg);
    const total = matching.reduce((s, r) => s + r.cltvEstimate, 0);
    summary[seg] = {
      count: matching.length,
      totalCLTV: round2(total),
      avgCLTV: matching.length > 0 ? round2(total / matching.length) : 0,
    };
  }

  return summary as Record<ClientSegment, { count: number; totalCLTV: number; avgCLTV: number }>;
}

// ── Helpers ──────────────────────────────────────────────────
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
