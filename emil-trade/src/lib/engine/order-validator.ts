// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Order Validator
//
// Pre-flight checks before any order is accepted into the OMS.
// Validates: symbol, account, volume, price, margin, risk limits.
// ═══════════════════════════════════════════════════════════════

import { calculateRequiredMargin, type MarginParams } from './margin-calculator';

export interface OrderInput {
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  volume: number;
  price?: number;
  sl?: number;
  tp?: number;
}

export interface InstrumentConfig {
  symbol: string;
  isActive: boolean;
  minLot: number;
  maxLot: number;
  lotStep: number;
  contractSize: number;
  marginRate?: number;
  pricescale: number;
}

export interface AccountConfig {
  id: string;
  isActive: boolean;
  leverage: number;
  balance: number;
  equity: number;
  freeMargin: number;
  maxOpenTrades?: number;
  dailyLossLimit?: number;
  currentOpenTrades?: number;
  dailyLoss?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiredMargin?: number;
}

/**
 * Full pre-flight validation for an order.
 */
export function validateOrder(
  order: OrderInput,
  instrument: InstrumentConfig,
  account: AccountConfig,
  currentPrice?: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Symbol validation ──
  if (!instrument.isActive) {
    errors.push(`Symbol ${order.symbol} is not available for trading`);
  }

  // ── Account validation ──
  if (!account.isActive) {
    errors.push('Trading account is suspended or inactive');
  }

  // ── Direction validation ──
  if (!['BUY', 'SELL'].includes(order.direction)) {
    errors.push('Direction must be BUY or SELL');
  }

  // ── Order type validation ──
  if (!['market', 'limit', 'stop', 'stop_limit'].includes(order.orderType)) {
    errors.push('Invalid order type');
  }

  // ── Volume validation ──
  if (order.volume <= 0) {
    errors.push('Volume must be positive');
  } else {
    if (order.volume < instrument.minLot) {
      errors.push(`Minimum volume is ${instrument.minLot} lots`);
    }
    if (order.volume > instrument.maxLot) {
      errors.push(`Maximum volume is ${instrument.maxLot} lots`);
    }
    // Check lot step compliance
    if (instrument.lotStep > 0) {
      const remainder = Math.round((order.volume % instrument.lotStep) * 1e8) / 1e8;
      if (remainder > 0.00000001) {
        errors.push(`Volume must be in steps of ${instrument.lotStep}`);
      }
    }
  }

  // ── Price validation for limit/stop orders ──
  if (['limit', 'stop', 'stop_limit'].includes(order.orderType)) {
    if (!order.price || order.price <= 0) {
      errors.push('Price is required for limit/stop orders');
    }
  }

  // ── SL/TP validation ──
  if (order.sl !== undefined && order.sl <= 0) {
    errors.push('Stop loss must be a positive price');
  }
  if (order.tp !== undefined && order.tp <= 0) {
    errors.push('Take profit must be a positive price');
  }

  // Logical SL/TP validation
  if (currentPrice && order.sl && order.tp) {
    if (order.direction === 'BUY') {
      if (order.sl >= currentPrice) warnings.push('Stop loss is above current price for a BUY order');
      if (order.tp <= currentPrice) warnings.push('Take profit is below current price for a BUY order');
    } else {
      if (order.sl <= currentPrice) warnings.push('Stop loss is below current price for a SELL order');
      if (order.tp >= currentPrice) warnings.push('Take profit is above current price for a SELL order');
    }
  }

  // ── Max open trades check ──
  if (account.maxOpenTrades && account.currentOpenTrades !== undefined) {
    if (account.currentOpenTrades >= account.maxOpenTrades) {
      errors.push(`Maximum open trades limit reached (${account.maxOpenTrades})`);
    }
  }

  // ── Daily loss limit check ──
  if (account.dailyLossLimit && account.dailyLoss !== undefined) {
    if (account.dailyLoss >= account.dailyLossLimit) {
      errors.push('Daily loss limit reached. Trading suspended until next day.');
    }
  }

  // ── Margin sufficiency check ──
  let requiredMargin = 0;
  if (errors.length === 0) {
    const executionPrice = order.price || currentPrice || 1;
    const params: MarginParams = {
      volume: order.volume,
      contractSize: instrument.contractSize,
      price: executionPrice,
      leverage: account.leverage,
      marginRate: instrument.marginRate,
    };
    requiredMargin = calculateRequiredMargin(params);

    if (requiredMargin > account.freeMargin) {
      errors.push(
        `Insufficient margin. Required: $${requiredMargin.toFixed(2)}, Available: $${account.freeMargin.toFixed(2)}`
      );
    } else if (requiredMargin > account.freeMargin * 0.8) {
      warnings.push('This order will use more than 80% of your free margin');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredMargin: requiredMargin > 0 ? requiredMargin : undefined,
  };
}
