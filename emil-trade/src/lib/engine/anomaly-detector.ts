// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Anomaly Detection Engine
//
// Detects suspicious patterns in real-time trading activity:
//   - Client-level: latency arbitrage, toxic scalping, slippage exploit
//   - Symbol-level: spread explosion, price divergence
//   - LP-level: reject spike, latency jump, slippage drift
//
// Uses rolling z-score windows for statistical anomaly detection.
// ═══════════════════════════════════════════════════════════════

export type AnomalyType =
  | 'latency_arbitrage'
  | 'toxic_scalping'
  | 'slippage_exploit'
  | 'spread_explosion'
  | 'price_divergence'
  | 'lp_reject_spike'
  | 'lp_latency_jump'
  | 'lp_slippage_drift'
  | 'volume_spike'
  | 'rapid_profit';

export type AnomalyLevel = 'info' | 'warning' | 'critical';
export type AnomalyEntity = 'client' | 'symbol' | 'lp';

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  entity: AnomalyEntity;
  entityId: string;        // userId, symbol, or lpId
  level: AnomalyLevel;
  score: number;           // 0-1 composite anomaly score
  zScore: number;          // raw z-score that triggered detection
  feature: string;         // which feature triggered it
  value: number;           // observed value
  mean: number;            // rolling mean
  stdDev: number;          // rolling std dev
  timestamp: number;
  suggestedActions: string[];
}

export interface RollingWindow {
  values: number[];
  maxSize: number;
  sum: number;
  sumSq: number;
}

// ── Thresholds ───────────────────────────────────────────────
const Z_THRESHOLD_WARNING = 2.5;
const Z_THRESHOLD_CRITICAL = 3.5;
const DEFAULT_WINDOW_SIZE = 100;

// ── Feature weights for composite anomaly score ──────────────
const FEATURE_WEIGHTS: Record<string, number> = {
  profit_within_2s: 0.25,
  slippage_bias: 0.20,
  ultra_short_hold: 0.15,
  spread_spike: 0.15,
  lp_reject_rate: 0.15,
  price_divergence: 0.10,
};

/**
 * Create a new rolling statistics window.
 */
export function createWindow(maxSize: number = DEFAULT_WINDOW_SIZE): RollingWindow {
  return { values: [], maxSize, sum: 0, sumSq: 0 };
}

/**
 * Add a value to the rolling window and compute z-score.
 */
export function pushAndScore(window: RollingWindow, value: number): {
  zScore: number;
  mean: number;
  stdDev: number;
  isAnomaly: boolean;
  level: AnomalyLevel;
} {
  // Add value
  window.values.push(value);
  window.sum += value;
  window.sumSq += value * value;

  // Remove oldest if window is full
  if (window.values.length > window.maxSize) {
    const removed = window.values.shift()!;
    window.sum -= removed;
    window.sumSq -= removed * removed;
  }

  const n = window.values.length;
  if (n < 10) {
    // Not enough data for meaningful statistics
    return { zScore: 0, mean: value, stdDev: 0, isAnomaly: false, level: 'info' };
  }

  const mean = window.sum / n;
  const variance = Math.max(0, (window.sumSq / n) - (mean * mean));
  const stdDev = Math.sqrt(variance);

  if (stdDev < 1e-10) {
    return { zScore: 0, mean, stdDev: 0, isAnomaly: false, level: 'info' };
  }

  const zScore = (value - mean) / stdDev;
  const absZ = Math.abs(zScore);

  let level: AnomalyLevel = 'info';
  let isAnomaly = false;

  if (absZ >= Z_THRESHOLD_CRITICAL) {
    level = 'critical';
    isAnomaly = true;
  } else if (absZ >= Z_THRESHOLD_WARNING) {
    level = 'warning';
    isAnomaly = true;
  }

  return { zScore, mean, stdDev, isAnomaly, level };
}

/**
 * Detect client-level anomalies from a trade event.
 */
export function detectClientAnomaly(params: {
  userId: string;
  profitWithin2s: number;      // profit made within 2 seconds of open
  slippageBias: number;        // positive slippage frequency
  holdingSeconds: number;      // how long position was held
  windows: Map<string, RollingWindow>;
}): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];
  const { userId, windows } = params;

  // Feature 1: Rapid profit (latency arbitrage indicator)
  const profitKey = `${userId}:profit_2s`;
  if (!windows.has(profitKey)) windows.set(profitKey, createWindow());
  const profitResult = pushAndScore(windows.get(profitKey)!, params.profitWithin2s);
  if (profitResult.isAnomaly && params.profitWithin2s > 0) {
    events.push({
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'latency_arbitrage',
      entity: 'client',
      entityId: userId,
      level: profitResult.level,
      score: Math.min(Math.abs(profitResult.zScore) / 5, 1),
      zScore: profitResult.zScore,
      feature: 'profit_within_2s',
      value: params.profitWithin2s,
      mean: profitResult.mean,
      stdDev: profitResult.stdDev,
      timestamp: Date.now(),
      suggestedActions: ['ROUTE_TO_A_BOOK', 'INCREASE_LES_SCORE', 'FLAG_FOR_REVIEW'],
    });
  }

  // Feature 2: Ultra-short holds (scalping)
  const holdKey = `${userId}:hold_time`;
  if (!windows.has(holdKey)) windows.set(holdKey, createWindow());
  const holdResult = pushAndScore(windows.get(holdKey)!, params.holdingSeconds);
  if (holdResult.isAnomaly && params.holdingSeconds < 10) {
    events.push({
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'toxic_scalping',
      entity: 'client',
      entityId: userId,
      level: holdResult.level,
      score: Math.min(Math.abs(holdResult.zScore) / 5, 1),
      zScore: holdResult.zScore,
      feature: 'ultra_short_hold',
      value: params.holdingSeconds,
      mean: holdResult.mean,
      stdDev: holdResult.stdDev,
      timestamp: Date.now(),
      suggestedActions: ['WIDEN_SPREADS', 'THROTTLE_ORDER_RATE', 'ROUTE_TO_A_BOOK'],
    });
  }

  // Feature 3: Positive slippage exploitation
  const slipKey = `${userId}:slippage`;
  if (!windows.has(slipKey)) windows.set(slipKey, createWindow());
  const slipResult = pushAndScore(windows.get(slipKey)!, params.slippageBias);
  if (slipResult.isAnomaly && params.slippageBias > 0.5) {
    events.push({
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'slippage_exploit',
      entity: 'client',
      entityId: userId,
      level: slipResult.level,
      score: Math.min(Math.abs(slipResult.zScore) / 5, 1),
      zScore: slipResult.zScore,
      feature: 'slippage_bias',
      value: params.slippageBias,
      mean: slipResult.mean,
      stdDev: slipResult.stdDev,
      timestamp: Date.now(),
      suggestedActions: ['TIGHTEN_SLIPPAGE_BAND', 'FLAG_FOR_REVIEW'],
    });
  }

  return events;
}

/**
 * Detect LP-level anomalies.
 */
export function detectLPAnomaly(params: {
  lpId: string;
  rejectRate: number;
  latencyMs: number;
  slippagePips: number;
  windows: Map<string, RollingWindow>;
}): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];
  const { lpId, windows } = params;

  // Reject rate spike
  const rejectKey = `lp:${lpId}:rejects`;
  if (!windows.has(rejectKey)) windows.set(rejectKey, createWindow(50));
  const rejectResult = pushAndScore(windows.get(rejectKey)!, params.rejectRate);
  if (rejectResult.isAnomaly) {
    events.push({
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'lp_reject_spike',
      entity: 'lp',
      entityId: lpId,
      level: rejectResult.level,
      score: Math.min(Math.abs(rejectResult.zScore) / 5, 1),
      zScore: rejectResult.zScore,
      feature: 'lp_reject_rate',
      value: params.rejectRate,
      mean: rejectResult.mean,
      stdDev: rejectResult.stdDev,
      timestamp: Date.now(),
      suggestedActions: ['REDUCE_LP_WEIGHT', 'REROUTE_FLOW', 'ALERT_DEALER'],
    });
  }

  // Latency spike
  const latKey = `lp:${lpId}:latency`;
  if (!windows.has(latKey)) windows.set(latKey, createWindow(50));
  const latResult = pushAndScore(windows.get(latKey)!, params.latencyMs);
  if (latResult.isAnomaly) {
    events.push({
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'lp_latency_jump',
      entity: 'lp',
      entityId: lpId,
      level: latResult.level,
      score: Math.min(Math.abs(latResult.zScore) / 5, 1),
      zScore: latResult.zScore,
      feature: 'lp_latency',
      value: params.latencyMs,
      mean: latResult.mean,
      stdDev: latResult.stdDev,
      timestamp: Date.now(),
      suggestedActions: ['REDUCE_LP_PRIORITY', 'FAILOVER_TO_BACKUP'],
    });
  }

  return events;
}

/**
 * Compute composite anomaly score across multiple features.
 */
export function computeCompositeScore(events: AnomalyEvent[]): number {
  if (events.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const event of events) {
    const weight = FEATURE_WEIGHTS[event.feature] || 0.1;
    weightedSum += event.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0;
}
