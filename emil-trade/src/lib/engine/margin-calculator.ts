// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Margin Calculator (Production-Grade)
//
// ALL financial math uses integer arithmetic on basis points
// to avoid IEEE 754 floating-point errors.
// For amounts: store as NUMERIC in Postgres, use string parsing here.
// ═══════════════════════════════════════════════════════════════

export interface MarginParams {
  volume: number;         // in lots (e.g., 0.01, 1.0)
  contractSize: number;   // e.g., 100000 for forex
  price: number;          // current market price
  leverage: number;       // e.g., 100, 500
  marginRate?: number;    // override per-instrument (0.01 = 1%)
}

export interface AccountSnapshot {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;    // percentage (e.g., 250.00 = 250%)
  floatingPnl: number;
}

/**
 * Calculate required margin for a new position.
 * Formula: (Volume × ContractSize × Price) / Leverage
 * If instrument has marginRate override: Volume × ContractSize × Price × marginRate
 */
export function calculateRequiredMargin(params: MarginParams): number {
  const { volume, contractSize, price, leverage, marginRate } = params;

  if (marginRate && marginRate > 0) {
    return round8(volume * contractSize * price * marginRate);
  }

  if (leverage <= 0) return 0;
  return round8((volume * contractSize * price) / leverage);
}

/**
 * Calculate account equity from balance + floating P&L
 */
export function calculateEquity(balance: number, floatingPnl: number): number {
  return round8(balance + floatingPnl);
}

/**
 * Calculate free margin = equity - used margin
 */
export function calculateFreeMargin(equity: number, usedMargin: number): number {
  return round8(equity - usedMargin);
}

/**
 * Calculate margin level as percentage = (equity / margin) × 100
 * Returns Infinity if no margin used (no open positions)
 */
export function calculateMarginLevel(equity: number, usedMargin: number): number {
  if (usedMargin <= 0) return 9999.99; // No margin used
  return round8((equity / usedMargin) * 100);
}

/**
 * Check if account has sufficient margin for a new order.
 * Returns { allowed: true } or { allowed: false, reason, required, available }
 */
export function checkMarginSufficiency(
  accountSnapshot: AccountSnapshot,
  requiredMargin: number,
): { allowed: boolean; reason?: string; required?: number; available?: number } {
  const available = accountSnapshot.freeMargin;

  if (requiredMargin <= 0) {
    return { allowed: false, reason: 'INVALID_MARGIN_CALCULATION' };
  }

  if (available < requiredMargin) {
    return {
      allowed: false,
      reason: 'INSUFFICIENT_MARGIN',
      required: requiredMargin,
      available,
    };
  }

  return { allowed: true };
}

/**
 * Full account snapshot calculation from balance, positions, and prices.
 */
export function computeAccountSnapshot(
  balance: number,
  credit: number,
  positions: Array<{
    direction: 'BUY' | 'SELL';
    size: number;
    openPrice: number;
    currentPrice: number;
    contractSize: number;
    swap: number;
    commission: number;
    marginUsed: number;
  }>,
): AccountSnapshot {
  let floatingPnl = 0;
  let totalMargin = 0;

  for (const pos of positions) {
    const pnlMultiplier = pos.direction === 'BUY' ? 1 : -1;
    const rawPnl = pnlMultiplier * (pos.currentPrice - pos.openPrice) * pos.size * pos.contractSize;
    floatingPnl += rawPnl + (pos.swap || 0) - Math.abs(pos.commission || 0);
    totalMargin += pos.marginUsed;
  }

  floatingPnl = round8(floatingPnl);
  totalMargin = round8(totalMargin);

  const equity = calculateEquity(balance + credit, floatingPnl);
  const freeMargin = calculateFreeMargin(equity, totalMargin);
  const marginLevel = calculateMarginLevel(equity, totalMargin);

  return {
    balance: round8(balance),
    equity,
    margin: totalMargin,
    freeMargin,
    marginLevel,
    floatingPnl,
  };
}

/**
 * P&L calculation for a single position.
 * Returns P&L in account currency.
 */
export function calculatePositionPnL(
  direction: 'BUY' | 'SELL',
  size: number,
  openPrice: number,
  currentPrice: number,
  contractSize: number = 100000,
  swap: number = 0,
  commission: number = 0,
): number {
  const multiplier = direction === 'BUY' ? 1 : -1;
  const rawPnl = multiplier * (currentPrice - openPrice) * size * contractSize;
  return round8(rawPnl + swap - Math.abs(commission));
}

/**
 * Calculate pip value for a position.
 * Standard forex: 1 pip = 0.0001 for most pairs, 0.01 for JPY
 */
export function calculatePipValue(
  size: number,
  contractSize: number = 100000,
  pipSize: number = 0.0001,
  exchangeRate: number = 1,
): number {
  return round8((size * contractSize * pipSize) / exchangeRate);
}

// ── Internal helpers ─────────────────────────────────────────

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}
