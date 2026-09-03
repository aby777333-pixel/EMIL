// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — LP Router
//
// Routes orders to the best liquidity provider based on
// Fill Quality Score (FQS). Lower FQS = better LP.
//
// FQS = w1×ExpectedSlippage + w2×RejectProbability
//     + w3×Latency_normalized + w4×RejectRate_recent
// ═══════════════════════════════════════════════════════════════

export interface LPProfile {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'offline';
  avgLatencyMs: number;
  fillRate: number;        // 0-1 (e.g., 0.992)
  avgSlippage: number;     // in pips (e.g., 0.08)
  rejectRate: number;      // 0-1 recent reject rate
  uptimePct: number;       // 99.99
  symbols: number;         // how many symbols supported
  priority: number;        // manual priority override (lower = higher priority)
}

export interface LPSelection {
  lpId: string;
  lpName: string;
  fqsScore: number;
  reason: string;
}

// FQS weights
const W = {
  slippage: 0.30,
  rejectProb: 0.25,
  latency: 0.25,
  rejectRecent: 0.20,
};

// Normalization constants
const MAX_LATENCY_MS = 50;    // 50ms is the worst we accept
const MAX_SLIPPAGE = 2.0;     // 2 pips max expected

/**
 * Calculate Fill Quality Score for a single LP.
 * Lower = better.
 */
export function calculateFQS(lp: LPProfile): number {
  const slippageNorm = Math.min(lp.avgSlippage / MAX_SLIPPAGE, 1);
  const rejectProb = 1 - lp.fillRate; // probability of rejection
  const latencyNorm = Math.min(lp.avgLatencyMs / MAX_LATENCY_MS, 1);

  const fqs =
    W.slippage * slippageNorm +
    W.rejectProb * rejectProb +
    W.latency * latencyNorm +
    W.rejectRecent * lp.rejectRate;

  return Math.round(fqs * 10000) / 10000;
}

/**
 * Select the best LP for an order from available providers.
 * Filters out offline LPs, then picks lowest FQS.
 */
export function selectBestLP(providers: LPProfile[]): LPSelection | null {
  const active = providers.filter(lp => lp.status !== 'offline');

  if (active.length === 0) {
    return null;
  }

  // Score all active LPs
  const scored = active.map(lp => ({
    lp,
    fqs: calculateFQS(lp),
  }));

  // Sort by FQS ascending (lower = better), then by manual priority
  scored.sort((a, b) => {
    const fqsDiff = a.fqs - b.fqs;
    if (Math.abs(fqsDiff) < 0.001) {
      return a.lp.priority - b.lp.priority; // tie-break by priority
    }
    return fqsDiff;
  });

  const best = scored[0];
  const runner = scored[1];

  return {
    lpId: best.lp.id,
    lpName: best.lp.name,
    fqsScore: best.fqs,
    reason: runner
      ? `Best FQS: ${best.fqs.toFixed(4)} (${best.lp.name}) vs ${runner.fqs.toFixed(4)} (${runner.lp.name})`
      : `Only available LP: ${best.lp.name} (FQS: ${best.fqs.toFixed(4)})`,
  };
}

/**
 * Get LP health status summary for dealer dashboard.
 */
export function getLPHealthSummary(providers: LPProfile[]): {
  totalActive: number;
  totalDegraded: number;
  totalOffline: number;
  avgLatency: number;
  avgFillRate: number;
  worstLP: string | null;
} {
  let active = 0, degraded = 0, offline = 0;
  let totalLatency = 0, totalFillRate = 0;
  let worstFqs = -1;
  let worstName: string | null = null;

  for (const lp of providers) {
    if (lp.status === 'active') active++;
    else if (lp.status === 'degraded') degraded++;
    else offline++;

    totalLatency += lp.avgLatencyMs;
    totalFillRate += lp.fillRate;

    const fqs = calculateFQS(lp);
    if (fqs > worstFqs) {
      worstFqs = fqs;
      worstName = lp.name;
    }
  }

  const n = providers.length || 1;

  return {
    totalActive: active,
    totalDegraded: degraded,
    totalOffline: offline,
    avgLatency: Math.round((totalLatency / n) * 10) / 10,
    avgFillRate: Math.round((totalFillRate / n) * 10000) / 10000,
    worstLP: worstName,
  };
}
