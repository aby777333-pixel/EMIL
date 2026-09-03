// ===============================================================
// EMIL TRADE -- Trade State Machine
// Defines valid state transitions for the trade lifecycle
// ===============================================================

import type { TradeStatus, TransitionContext } from './types';

// -- Valid transitions map --------------------------------------
// Key = current status, Value = array of valid next statuses

export const TRADE_TRANSITIONS: Record<TradeStatus, TradeStatus[]> = {
  pending_new: ['pending_validation', 'cancelled', 'rejected'],

  pending_validation: ['margin_check', 'rejected', 'cancelled'],

  margin_check: ['risk_check', 'rejected'],

  risk_check: ['routing', 'rejected'],

  routing: ['pending_lp', 'filled', 'rejected'],

  pending_lp: ['lp_accepted', 'lp_rejected', 'partially_filled', 'expired'],

  lp_accepted: ['filled', 'partially_filled', 'error'],

  lp_rejected: ['routing', 'rejected'],

  partially_filled: ['filled', 'cancelled', 'pending_lp', 'error'],

  filled: ['pending_close', 'closed'],

  pending_close: ['closed', 'error'],

  closed: [],

  cancelled: [],

  rejected: [],

  expired: [],

  error: ['pending_validation', 'cancelled', 'rejected'],
};

// -- Terminal states (no outgoing transitions) -------------------

export const TERMINAL_STATES: ReadonlySet<TradeStatus> = new Set<TradeStatus>([
  'closed',
  'cancelled',
  'rejected',
  'expired',
]);

// -- Validate a transition --------------------------------------

export class InvalidTransitionError extends Error {
  public readonly from: TradeStatus;
  public readonly to: TradeStatus;

  constructor(from: TradeStatus, to: TradeStatus) {
    super(
      `Invalid trade transition: "${from}" -> "${to}". ` +
      `Allowed from "${from}": [${TRADE_TRANSITIONS[from].join(', ')}]`
    );
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Validate that a state transition is allowed.
 * Throws InvalidTransitionError if the transition is not in the map.
 */
export function validateTransition(from: TradeStatus, to: TradeStatus): void {
  const allowed = TRADE_TRANSITIONS[from];

  if (!allowed) {
    throw new InvalidTransitionError(from, to);
  }

  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/**
 * Check if a transition is valid without throwing.
 */
export function isValidTransition(from: TradeStatus, to: TradeStatus): boolean {
  const allowed = TRADE_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

/**
 * Check if a status is terminal (no further transitions possible).
 */
export function isTerminalState(status: TradeStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/**
 * Get all valid next states from a given status.
 */
export function getValidNextStates(status: TradeStatus): TradeStatus[] {
  return TRADE_TRANSITIONS[status] ?? [];
}

/**
 * Build a transition context object for audit logging.
 */
export function buildTransitionContext(
  tradeId: string,
  from: TradeStatus,
  to: TradeStatus,
  triggeredBy: TransitionContext['triggered_by'],
  reason: string,
  metadata: Record<string, unknown> = {},
): TransitionContext {
  validateTransition(from, to);

  return {
    trade_id: tradeId,
    from_status: from,
    to_status: to,
    triggered_by: triggeredBy,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get the full transitions map for UI visualization.
 * Returns a flat array of { from, to } pairs.
 */
export function getTransitionEdges(): Array<{ from: TradeStatus; to: TradeStatus }> {
  const edges: Array<{ from: TradeStatus; to: TradeStatus }> = [];

  for (const [from, targets] of Object.entries(TRADE_TRANSITIONS)) {
    for (const to of targets) {
      edges.push({ from: from as TradeStatus, to });
    }
  }

  return edges;
}

/**
 * Get all unique states defined in the transitions map.
 */
export function getAllStates(): TradeStatus[] {
  return Object.keys(TRADE_TRANSITIONS) as TradeStatus[];
}
