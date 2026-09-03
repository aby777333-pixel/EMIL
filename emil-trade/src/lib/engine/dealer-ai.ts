// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Dealer AI (RACS: Raptor Autonomous Control System)
//
// The brain of the dealing desk. Continuously monitors system state,
// proposes actions, simulates outcomes, and executes within guardrails.
//
// Decision flow: observe → predict → simulate → decide → act → learn
// ═══════════════════════════════════════════════════════════════

import type { ExposureEntry } from './exposure-calculator';

export interface SystemState {
  timestamp: number;
  exposure: ExposureEntry[];
  totalPnlToday: number;
  pnlVelocity: number;         // $/minute rate of change
  volatilityIndex: number;     // 0-1 (current market vol vs baseline)
  toxicFlowRatio: number;      // 0-1 (% of flow classified as toxic)
  lpHealthAvg: number;         // 0-1 (average LP health score)
  activeTraders: number;
  openPositionCount: number;
  marginUtilization: number;   // average across all accounts
}

export type ActionType =
  | 'widen_spread'
  | 'tighten_spread'
  | 'hedge_exposure'
  | 'route_to_abook'
  | 'switch_lp_priority'
  | 'throttle_volume'
  | 'no_action';

export interface ProposedAction {
  type: ActionType;
  symbol?: string;
  magnitude: number;           // how much to adjust (pips, %, lots)
  reason: string;
  confidence: number;          // 0-1
  simulatedPnlImpact: number; // expected PnL change from action
  simulatedDrawdownImpact: number;
  riskReduction: number;       // 0-1 how much risk this reduces
}

export interface DealerDecision {
  timestamp: number;
  riskScore: number;           // 0-1 overall system risk
  actions: ProposedAction[];
  selectedAction: ProposedAction | null;
  executionStatus: 'pending' | 'executed' | 'rejected' | 'deferred';
  reasoning: string;
}

// ── Guardrails (hard limits the AI cannot exceed) ────────────
const GUARDRAILS = {
  maxSpreadChangePerMin: 1.5,   // pips
  maxHedgePerAction: 0.70,      // 70% of exposure
  maxActionsPerMinute: 3,
  noPauseWithoutHuman: true,
  minConfidenceToAct: 0.6,
  cooldownMs: 5000,             // minimum 5s between actions
};

// ── Risk score weights ───────────────────────────────────────
const RISK_WEIGHTS = {
  exposure: 0.25,
  pnlDrawdown: 0.20,
  volatility: 0.20,
  lpDegradation: 0.15,
  toxicFlow: 0.20,
};

/**
 * Calculate overall system risk score (0-1).
 * Uses sigmoid normalization.
 */
export function calculateRiskScore(state: SystemState): number {
  // Normalize each factor to 0-1
  const maxExposure = 100; // lots
  const totalExposure = state.exposure.reduce((s, e) => s + Math.abs(e.netPosition), 0);
  const exposureNorm = Math.min(totalExposure / maxExposure, 1);

  // PnL drawdown rate
  const pnlDrawdownNorm = state.pnlVelocity < 0
    ? Math.min(Math.abs(state.pnlVelocity) / 1000, 1) // $1000/min is max concern
    : 0;

  const raw =
    RISK_WEIGHTS.exposure * exposureNorm +
    RISK_WEIGHTS.pnlDrawdown * pnlDrawdownNorm +
    RISK_WEIGHTS.volatility * state.volatilityIndex +
    RISK_WEIGHTS.lpDegradation * (1 - state.lpHealthAvg) +
    RISK_WEIGHTS.toxicFlow * state.toxicFlowRatio;

  // Sigmoid normalization
  return sigmoid(raw * 6 - 3); // maps 0-1 linearly with slight S-curve
}

/**
 * Generate candidate actions based on current system state.
 */
export function generateCandidateActions(state: SystemState): ProposedAction[] {
  const actions: ProposedAction[] = [];
  const riskScore = calculateRiskScore(state);

  // Always include no_action as baseline
  actions.push({
    type: 'no_action',
    magnitude: 0,
    reason: 'Maintain current state',
    confidence: 1 - riskScore,
    simulatedPnlImpact: 0,
    simulatedDrawdownImpact: 0,
    riskReduction: 0,
  });

  // High exposure → hedge
  for (const exp of state.exposure) {
    if (Math.abs(exp.netPosition) > 5) {
      const hedgePct = Math.min(0.5 + riskScore * 0.3, GUARDRAILS.maxHedgePerAction);
      actions.push({
        type: 'hedge_exposure',
        symbol: exp.symbol,
        magnitude: hedgePct,
        reason: `${exp.symbol} net exposure ${exp.netPosition.toFixed(2)} lots exceeds threshold`,
        confidence: 0.7 + riskScore * 0.2,
        simulatedPnlImpact: -Math.abs(exp.netPosition) * 2, // hedge has a small cost
        simulatedDrawdownImpact: -Math.abs(exp.unrealizedPnl) * hedgePct * 0.8,
        riskReduction: hedgePct * 0.6,
      });
    }
  }

  // High volatility → widen spreads
  if (state.volatilityIndex > 0.6) {
    const widenAmount = Math.min(state.volatilityIndex * 1.0, GUARDRAILS.maxSpreadChangePerMin);
    actions.push({
      type: 'widen_spread',
      magnitude: widenAmount,
      reason: `Volatility index ${(state.volatilityIndex * 100).toFixed(0)}% — widening spreads for protection`,
      confidence: 0.8,
      simulatedPnlImpact: widenAmount * state.activeTraders * 0.5, // more revenue per trade
      simulatedDrawdownImpact: 0,
      riskReduction: 0.15,
    });
  }

  // High toxic flow → route to A-book
  if (state.toxicFlowRatio > 0.3) {
    actions.push({
      type: 'route_to_abook',
      magnitude: state.toxicFlowRatio,
      reason: `Toxic flow ratio ${(state.toxicFlowRatio * 100).toFixed(0)}% — routing to LP`,
      confidence: 0.85,
      simulatedPnlImpact: -state.toxicFlowRatio * 500, // lose B-book revenue on toxic flow
      simulatedDrawdownImpact: -state.toxicFlowRatio * 2000, // but avoid big losses
      riskReduction: state.toxicFlowRatio * 0.7,
    });
  }

  // LP degradation → switch priority
  if (state.lpHealthAvg < 0.7) {
    actions.push({
      type: 'switch_lp_priority',
      magnitude: 1,
      reason: `Average LP health ${(state.lpHealthAvg * 100).toFixed(0)}% — switching to backup`,
      confidence: 0.75,
      simulatedPnlImpact: 0,
      simulatedDrawdownImpact: 0,
      riskReduction: (1 - state.lpHealthAvg) * 0.4,
    });
  }

  return actions;
}

/**
 * Simulate and select the best action.
 * Objective: Score = PnL - λ×Drawdown - μ×Volatility
 */
export function selectBestAction(
  actions: ProposedAction[],
  riskScore: number,
): ProposedAction {
  const lambda = 0.5 + riskScore * 1.5; // risk-averse when riskScore is high
  const mu = 0.3;

  let bestAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    if (action.confidence < GUARDRAILS.minConfidenceToAct && action.type !== 'no_action') {
      continue; // skip low-confidence actions
    }

    const score =
      action.simulatedPnlImpact
      - lambda * Math.abs(action.simulatedDrawdownImpact)
      + action.riskReduction * 1000; // strongly prefer risk reduction

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

/**
 * Full dealer AI decision cycle.
 */
export function dealerDecisionCycle(state: SystemState): DealerDecision {
  const riskScore = calculateRiskScore(state);
  const candidates = generateCandidateActions(state);
  const selected = selectBestAction(candidates, riskScore);

  const shouldAct = selected.type !== 'no_action' && selected.confidence >= GUARDRAILS.minConfidenceToAct;

  return {
    timestamp: Date.now(),
    riskScore: Math.round(riskScore * 10000) / 10000,
    actions: candidates,
    selectedAction: shouldAct ? selected : null,
    executionStatus: shouldAct ? 'pending' : 'deferred',
    reasoning: shouldAct
      ? `Risk ${(riskScore * 100).toFixed(0)}% → ${selected.type}: ${selected.reason}`
      : `Risk ${(riskScore * 100).toFixed(0)}% — within acceptable range, no action needed`,
  };
}

// ── Helpers ──────────────────────────────────────────────────
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export { GUARDRAILS };
