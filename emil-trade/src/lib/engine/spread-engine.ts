// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Dynamic Spread Engine
//
// Calculates the final spread to show traders based on:
//   Base spread + Risk premium + Volatility adj + Client adj
//
// FinalSpread = Base(symbol)
//   + k1 × |NetExposure| / ExposureLimit     (risk premium)
//   + k2 × ATR / AvgATR                       (volatility)
//   + k3 × (1 - LossRatio)                    (client adj)
// Capped at max_spread per symbol.
// ═══════════════════════════════════════════════════════════════

export interface SpreadConfig {
  baseSpread: number;       // pips (e.g., 1.2)
  maxSpread: number;        // pips cap (e.g., 5.0)
  exposureLimit: number;    // lots at which max risk premium kicks in
  k1: number;               // risk premium weight (default 0.5)
  k2: number;               // volatility weight (default 0.3)
  k3: number;               // client adjustment weight (default 0.2)
}

export interface SpreadInputs {
  netExposure: number;      // current net lots for this symbol
  currentATR: number;       // current ATR (in price units)
  averageATR: number;       // 30-day average ATR
  clientLossRatio: number;  // 0-1 (1 = loses 100% of trades — low spread incentive)
}

const DEFAULT_CONFIG: SpreadConfig = {
  baseSpread: 1.0,       // 1.0 pip base
  maxSpread: 5.0,        // 5.0 pip max
  exposureLimit: 50,     // 50 lots
  k1: 0.5,
  k2: 0.3,
  k3: 0.2,
};

/**
 * Calculate the dynamic spread for a symbol.
 * Returns spread in pips.
 */
export function calculateDynamicSpread(
  inputs: SpreadInputs,
  config: SpreadConfig = DEFAULT_CONFIG,
): number {
  const { baseSpread, maxSpread, exposureLimit, k1, k2, k3 } = config;

  // Risk premium: higher when broker has large directional exposure
  const riskPremium = k1 * Math.min(Math.abs(inputs.netExposure) / Math.max(exposureLimit, 1), 1) * baseSpread;

  // Volatility adjustment: wider spread during high volatility
  const volRatio = inputs.averageATR > 0 ? inputs.currentATR / inputs.averageATR : 1;
  const volatilityAdj = k2 * Math.max(volRatio - 1, 0) * baseSpread;

  // Client adjustment: losing traders get tighter spreads (incentive to trade more)
  // Profitable traders get slightly wider (they cost the B-Book money)
  const clientAdj = k3 * (1 - inputs.clientLossRatio) * baseSpread;

  const finalSpread = baseSpread + riskPremium + volatilityAdj + clientAdj;

  // Cap at max spread
  return Math.min(Math.round(finalSpread * 10) / 10, maxSpread);
}

/**
 * Calculate bid/ask from mid price and spread.
 */
export function applySpread(
  midPrice: number,
  spreadPips: number,
  pipSize: number = 0.0001,
): { bid: number; ask: number; spread: number } {
  const halfSpread = (spreadPips * pipSize) / 2;
  return {
    bid: midPrice - halfSpread,
    ask: midPrice + halfSpread,
    spread: spreadPips,
  };
}

/**
 * Get spread config for common forex pairs.
 * Returns default for unknown symbols.
 */
export function getSymbolSpreadConfig(symbol: string): SpreadConfig {
  const configs: Record<string, Partial<SpreadConfig>> = {
    'EURUSD': { baseSpread: 0.8, maxSpread: 3.0 },
    'GBPUSD': { baseSpread: 1.0, maxSpread: 4.0 },
    'USDJPY': { baseSpread: 0.9, maxSpread: 3.5 },
    'USDCHF': { baseSpread: 1.2, maxSpread: 4.0 },
    'AUDUSD': { baseSpread: 1.1, maxSpread: 4.0 },
    'NZDUSD': { baseSpread: 1.3, maxSpread: 4.5 },
    'USDCAD': { baseSpread: 1.2, maxSpread: 4.0 },
    'EURGBP': { baseSpread: 1.1, maxSpread: 4.0 },
    'EURJPY': { baseSpread: 1.3, maxSpread: 4.5 },
    'GBPJPY': { baseSpread: 1.8, maxSpread: 6.0 },
    'XAUUSD': { baseSpread: 25, maxSpread: 80, exposureLimit: 10 },
    'XAGUSD': { baseSpread: 2.5, maxSpread: 8.0, exposureLimit: 20 },
    'USOIL':  { baseSpread: 3.0, maxSpread: 10.0, exposureLimit: 15 },
    'UKOIL':  { baseSpread: 3.0, maxSpread: 10.0, exposureLimit: 15 },
    'BTCUSD': { baseSpread: 50, maxSpread: 200, exposureLimit: 5 },
    'ETHUSD': { baseSpread: 3.0, maxSpread: 15, exposureLimit: 10 },
    'US30':   { baseSpread: 2.0, maxSpread: 8.0, exposureLimit: 20 },
    'SPX500': { baseSpread: 0.5, maxSpread: 3.0, exposureLimit: 20 },
    'NAS100': { baseSpread: 1.5, maxSpread: 6.0, exposureLimit: 20 },
    'NATGAS': { baseSpread: 4.0, maxSpread: 15.0, exposureLimit: 10 },
  };

  const specific = configs[symbol] || {};
  return { ...DEFAULT_CONFIG, ...specific };
}
