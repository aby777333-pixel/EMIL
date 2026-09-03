// ===============================================================
// EMIL TRADE -- Dealer Margin Calculator (Decimal.js)
// Precision margin calculations for the dealing desk
// ===============================================================

import Decimal from 'decimal.js';
import type { Trade, TradingAccount, Symbol, MarginCheckResult } from './types';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// -- Core margin calculation ------------------------------------

/**
 * Calculate required margin for a position.
 *
 * Formula: (price * lots * contractSize) / leverage
 * If symbol has a margin_rate override: price * lots * contractSize * marginRate
 */
export function calculateMargin(
  price: number | Decimal,
  lots: number | Decimal,
  symbol: Symbol,
  leverage: number,
): Decimal {
  const p = new Decimal(price);
  const l = new Decimal(lots);
  const contractSize = new Decimal(symbol.contract_size);

  if (symbol.margin_rate > 0) {
    const rate = new Decimal(symbol.margin_rate);
    return p.mul(l).mul(contractSize).mul(rate);
  }

  if (leverage <= 0) return new Decimal(0);

  const lev = new Decimal(leverage);
  return p.mul(l).mul(contractSize).div(lev);
}

// -- Max lots calculation ---------------------------------------

/**
 * Calculate maximum lot size a client can open given free margin.
 *
 * Solves: maxLots = (freeMargin * leverage) / (price * contractSize)
 * If symbol has margin_rate: maxLots = freeMargin / (price * contractSize * marginRate)
 *
 * Result is floored to the nearest lot_step.
 */
export function calculateMaxLots(
  freeMargin: number | Decimal,
  price: number | Decimal,
  symbol: Symbol,
  leverage: number,
): Decimal {
  const fm = new Decimal(freeMargin);
  const p = new Decimal(price);
  const contractSize = new Decimal(symbol.contract_size);
  const lotStep = new Decimal(symbol.lot_step);
  const minLot = new Decimal(symbol.min_lot);
  const maxLot = new Decimal(symbol.max_lot);

  if (p.isZero() || contractSize.isZero()) return new Decimal(0);

  let rawMax: Decimal;

  if (symbol.margin_rate > 0) {
    const rate = new Decimal(symbol.margin_rate);
    const denominator = p.mul(contractSize).mul(rate);
    if (denominator.isZero()) return new Decimal(0);
    rawMax = fm.div(denominator);
  } else {
    if (leverage <= 0) return new Decimal(0);
    const lev = new Decimal(leverage);
    const denominator = p.mul(contractSize);
    if (denominator.isZero()) return new Decimal(0);
    rawMax = fm.mul(lev).div(denominator);
  }

  // Floor to lot step
  const stepped = rawMax.div(lotStep).floor().mul(lotStep);

  // Clamp to min/max lot boundaries
  if (stepped.lessThan(minLot)) return new Decimal(0);
  return Decimal.min(stepped, maxLot);
}

// -- Margin validation with slippage ----------------------------

/**
 * Validate that a trade passes margin requirements, accounting for
 * potential adverse slippage.
 *
 * Returns a MarginCheckResult with validity, amounts, and max lots.
 */
export function validateMarginWithSlippage(
  trade: Trade,
  slippagePips: number,
  account: TradingAccount,
  symbol: Symbol,
): MarginCheckResult {
  const basePrice = new Decimal(
    trade.requested_price ?? trade.fill_price ?? 0,
  );

  if (basePrice.isZero()) {
    return {
      valid: false,
      required: 0,
      available: account.free_margin,
      max_lots: 0,
      margin_level_after: account.margin_level,
      reason: 'No valid price for margin calculation',
    };
  }

  // Apply worst-case slippage to the price
  const worstPrice = applySlippage(
    basePrice,
    slippagePips,
    trade.direction,
    new Decimal(symbol.pip_size),
  );

  // Calculate required margin at worst-case price
  const required = calculateMargin(
    worstPrice,
    trade.requested_size,
    symbol,
    account.leverage,
  );

  const available = new Decimal(account.free_margin);
  const valid = available.greaterThanOrEqualTo(required);

  // Calculate max lots at this price
  const maxLots = calculateMaxLots(
    available,
    worstPrice,
    symbol,
    account.leverage,
  );

  // Estimate margin level after this trade
  const currentMargin = new Decimal(account.margin_used);
  const equity = new Decimal(account.equity);
  const newTotalMargin = currentMargin.plus(required);
  const marginLevelAfter = newTotalMargin.isZero()
    ? new Decimal(9999.99)
    : equity.div(newTotalMargin).mul(100);

  return {
    valid,
    required: parseFloat(required.toFixed(2)),
    available: parseFloat(available.toFixed(2)),
    max_lots: parseFloat(maxLots.toFixed(2)),
    margin_level_after: parseFloat(marginLevelAfter.toFixed(2)),
    reason: valid ? null : `Insufficient margin: need ${required.toFixed(2)}, have ${available.toFixed(2)}`,
  };
}

// -- Slippage application ---------------------------------------

/**
 * Apply slippage to a price in the adverse direction.
 *
 * For buy orders: slippage increases price (worse fill)
 * For sell orders: slippage decreases price (worse fill)
 */
export function applySlippage(
  price: number | Decimal,
  pips: number,
  direction: 'buy' | 'sell',
  pipSize: number | Decimal,
): Decimal {
  const p = new Decimal(price);
  const ps = new Decimal(pipSize);
  const slippageAmount = new Decimal(pips).mul(ps);

  if (direction === 'buy') {
    return p.plus(slippageAmount);
  } else {
    return p.minus(slippageAmount);
  }
}
