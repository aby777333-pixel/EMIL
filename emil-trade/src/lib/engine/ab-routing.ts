// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — A/B Book Routing Engine
//
// Scores each trader and determines whether to:
//   A-Book (pass to LP) — profitable/toxic traders
//   B-Book (internalize) — consistently losing traders
//   Hybrid (split) — mixed/moderate traders
//
// Score formula follows the institutional model:
//   High score = dangerous to B-Book → route to A-Book (LP)
//   Low score  = safe to internalize  → keep in B-Book
// ═══════════════════════════════════════════════════════════════

export interface TraderMetrics {
  winRate: number;           // 0-1 (e.g., 0.65 = 65%)
  avgProfitPerTrade: number; // in account currency
  tradeFrequencyDaily: number;
  avgHoldingSeconds: number;
  drawdownStability: number; // 0-1 (1 = very stable profits)
  latencyArbitrage: number;  // 0-1 flag (1 = detected)
  newsTrading: number;       // 0-1 flag
  slippageExploit: number;   // 0-1 flag
}

export interface RoutingDecision {
  traderScore: number;       // 0-1 composite
  toxicityScore: number;     // 0-1 composite
  finalScore: number;        // 0-1 combined
  routingType: 'A' | 'B' | 'hybrid';
  aBookRatio: number;        // 0-1 (what % to A-Book)
  bBookRatio: number;        // 0-1 (what % to B-Book)
  reason: string;
}

// ── Scoring weights ──────────────────────────────────────────
const W_TRADER = {
  winRate: 0.25,
  avgProfit: 0.20,
  frequency: 0.15,
  holdingTime: 0.20,
  drawdownStability: 0.20,
};

const W_TOXICITY = {
  latencyArbitrage: 0.40,
  newsTrading: 0.30,
  slippageExploit: 0.30,
};

// ── Thresholds ───────────────────────────────────────────────
const THRESHOLD_A_BOOK = 0.70;   // >= this → full A-Book
const THRESHOLD_B_BOOK = 0.40;   // < this  → full B-Book
// Between = Hybrid

/**
 * Calculate the routing decision for a trader based on their metrics.
 */
export function calculateRoutingDecision(metrics: TraderMetrics): RoutingDecision {
  // ── Normalize metrics to 0-1 ──
  const normFrequency = Math.min(metrics.tradeFrequencyDaily / 50, 1); // 50+ trades/day = max
  const normProfit = sigmoid(metrics.avgProfitPerTrade / 100); // normalize around $100 avg profit
  const holdingTimeFactor = 1 - Math.min(metrics.avgHoldingSeconds / 3600, 1); // shorter = higher risk

  // ── Trader Score (how profitable/dangerous is this trader?) ──
  const traderScore = clamp01(
    W_TRADER.winRate * metrics.winRate +
    W_TRADER.avgProfit * normProfit +
    W_TRADER.frequency * normFrequency +
    W_TRADER.holdingTime * holdingTimeFactor +
    W_TRADER.drawdownStability * metrics.drawdownStability
  );

  // ── Toxicity Score (how manipulative is their behavior?) ──
  const toxicityScore = clamp01(
    W_TOXICITY.latencyArbitrage * metrics.latencyArbitrage +
    W_TOXICITY.newsTrading * metrics.newsTrading +
    W_TOXICITY.slippageExploit * metrics.slippageExploit
  );

  // ── Final combined score (capped 0-1) ──
  const finalScore = clamp01(traderScore + toxicityScore);

  // ── Routing decision ──
  let routingType: 'A' | 'B' | 'hybrid';
  let aBookRatio: number;
  let reason: string;

  if (finalScore >= THRESHOLD_A_BOOK) {
    routingType = 'A';
    aBookRatio = 1.0;
    reason = `Score ${finalScore.toFixed(3)} ≥ ${THRESHOLD_A_BOOK} → Full A-Book (LP hedge)`;
  } else if (finalScore < THRESHOLD_B_BOOK) {
    routingType = 'B';
    aBookRatio = 0.0;
    reason = `Score ${finalScore.toFixed(3)} < ${THRESHOLD_B_BOOK} → Full B-Book (internalize)`;
  } else {
    routingType = 'hybrid';
    // Linear interpolation between thresholds
    aBookRatio = (finalScore - THRESHOLD_B_BOOK) / (THRESHOLD_A_BOOK - THRESHOLD_B_BOOK);
    reason = `Score ${finalScore.toFixed(3)} → Hybrid: ${(aBookRatio * 100).toFixed(0)}% A-Book, ${((1 - aBookRatio) * 100).toFixed(0)}% B-Book`;
  }

  return {
    traderScore: round4(traderScore),
    toxicityScore: round4(toxicityScore),
    finalScore: round4(finalScore),
    routingType,
    aBookRatio: round4(aBookRatio),
    bBookRatio: round4(1 - aBookRatio),
    reason,
  };
}

/**
 * Quick check: should this specific order be A-Booked?
 * Uses the routing decision + random selection for hybrid.
 */
export function shouldABook(decision: RoutingDecision): boolean {
  if (decision.routingType === 'A') return true;
  if (decision.routingType === 'B') return false;
  // Hybrid: probabilistic selection
  return Math.random() < decision.aBookRatio;
}

// ── Helpers ──────────────────────────────────────────────────
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
