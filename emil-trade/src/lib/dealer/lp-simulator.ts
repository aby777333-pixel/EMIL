// ===============================================================
// EMIL TRADE -- LP Execution Simulator
// Simulates liquidity provider order execution with realistic
// latency, rejection rates, and slippage
// ===============================================================

import type { Trade, Symbol, LPResult } from './types';

// -- Configuration ----------------------------------------------

const LP_CONFIG = {
  /** Minimum simulated latency in ms */
  MIN_LATENCY_MS: 50,
  /** Maximum simulated latency in ms */
  MAX_LATENCY_MS: 200,
  /** Probability of LP rejection (0-1) */
  REJECTION_RATE: 0.05,
  /** Maximum slippage in pips */
  MAX_SLIPPAGE_PIPS: 0.3,
  /** Available LP names for simulation */
  LP_NAMES: [
    'LMAX',
    'Currenex',
    'Integral',
    'FastMatch',
    'Hotspot',
  ] as readonly string[],
} as const;

// -- Rejection reasons ------------------------------------------

const REJECTION_REASONS = [
  'Insufficient liquidity at requested price',
  'Price moved beyond tolerance during execution',
  'Maximum position size exceeded for this instrument',
  'LP session limit reached',
  'Quote expired during processing',
] as const;

// -- Main simulation function -----------------------------------

/**
 * Simulate LP execution for a trade.
 *
 * Characteristics:
 *   - Random latency between 50-200ms
 *   - 5% rejection rate with realistic reasons
 *   - Small slippage 0-0.3 pips on successful fills
 *   - Slippage direction: adverse to the trader
 *
 * Returns an LPResult after the simulated latency delay.
 */
export async function simulateLPExecution(
  trade: Trade,
  symbol: Symbol,
): Promise<LPResult> {
  const latencyMs = randomInt(LP_CONFIG.MIN_LATENCY_MS, LP_CONFIG.MAX_LATENCY_MS);
  const lpName = LP_CONFIG.LP_NAMES[randomInt(0, LP_CONFIG.LP_NAMES.length - 1)];
  const lpOrderId = generateLPOrderId(lpName);

  // Simulate network latency
  await delay(latencyMs);

  // -- Check for rejection --------------------------------------

  if (Math.random() < LP_CONFIG.REJECTION_RATE) {
    const reason = REJECTION_REASONS[randomInt(0, REJECTION_REASONS.length - 1)];

    return {
      success: false,
      fill_price: null,
      latency_ms: latencyMs,
      slippage_pips: 0,
      reason,
      lp_name: lpName,
      lp_order_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  // -- Simulate fill with slippage ------------------------------

  const basePrice = trade.requested_price ?? trade.fill_price ?? 0;
  if (basePrice <= 0) {
    return {
      success: false,
      fill_price: null,
      latency_ms: latencyMs,
      slippage_pips: 0,
      reason: 'No valid price available for execution',
      lp_name: lpName,
      lp_order_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  const slippagePips = Math.random() * LP_CONFIG.MAX_SLIPPAGE_PIPS;
  const pipSize = symbol.pip_size || 0.0001;

  // Slippage is adverse: buys get worse (higher), sells get worse (lower)
  const slippageDirection = trade.direction === 'buy' ? 1 : -1;
  const slippageAmount = slippagePips * pipSize * slippageDirection;
  const fillPrice = roundToDigits(basePrice + slippageAmount, symbol.digits || 5);

  return {
    success: true,
    fill_price: fillPrice,
    latency_ms: latencyMs,
    slippage_pips: Math.round(slippagePips * 10) / 10,
    reason: null,
    lp_name: lpName,
    lp_order_id: lpOrderId,
    timestamp: new Date().toISOString(),
  };
}

// -- Helpers ----------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateLPOrderId(lpName: string): string {
  const prefix = lpName.slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function roundToDigits(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
