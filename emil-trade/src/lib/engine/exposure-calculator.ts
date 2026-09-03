// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Exposure Calculator
//
// Aggregates all open positions per symbol to calculate
// broker-level net exposure and risk.
// ═══════════════════════════════════════════════════════════════

export interface PositionInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  floatingPnl: number;
}

export interface ExposureEntry {
  symbol: string;
  netPosition: number;     // positive = net long, negative = net short
  totalBuy: number;
  totalSell: number;
  unrealizedPnl: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  clientCount: number;
}

export interface ExposureThresholds {
  medium: number;  // lots above which = medium risk
  high: number;    // lots above which = high risk
  extreme: number; // lots above which = extreme risk
}

const DEFAULT_THRESHOLDS: ExposureThresholds = {
  medium: 5,    // 5 lots net
  high: 20,     // 20 lots net
  extreme: 50,  // 50 lots net
};

/**
 * Aggregate positions into per-symbol exposure entries.
 */
export function calculateExposure(
  positions: PositionInput[],
  thresholds: ExposureThresholds = DEFAULT_THRESHOLDS,
): ExposureEntry[] {
  const bySymbol = new Map<string, {
    totalBuy: number;
    totalSell: number;
    pnl: number;
    clients: Set<string>;
  }>();

  for (const pos of positions) {
    const existing = bySymbol.get(pos.symbol) || {
      totalBuy: 0,
      totalSell: 0,
      pnl: 0,
      clients: new Set<string>(),
    };

    if (pos.direction === 'BUY') {
      existing.totalBuy += pos.size;
    } else {
      existing.totalSell += pos.size;
    }
    existing.pnl += pos.floatingPnl;
    bySymbol.set(pos.symbol, existing);
  }

  const entries: ExposureEntry[] = [];

  for (const [symbol, data] of bySymbol) {
    const net = data.totalBuy - data.totalSell;
    const absNet = Math.abs(net);

    let riskLevel: ExposureEntry['riskLevel'] = 'low';
    if (absNet >= thresholds.extreme) riskLevel = 'extreme';
    else if (absNet >= thresholds.high) riskLevel = 'high';
    else if (absNet >= thresholds.medium) riskLevel = 'medium';

    entries.push({
      symbol,
      netPosition: round8(net),
      totalBuy: round8(data.totalBuy),
      totalSell: round8(data.totalSell),
      unrealizedPnl: round8(data.pnl),
      riskLevel,
      clientCount: data.clients.size || 1,
    });
  }

  // Sort by absolute net exposure descending
  entries.sort((a, b) => Math.abs(b.netPosition) - Math.abs(a.netPosition));

  return entries;
}

/**
 * Calculate total broker exposure summary.
 */
export function calculateTotalExposure(entries: ExposureEntry[]): {
  totalNetLots: number;
  totalPnl: number;
  symbolCount: number;
  highRiskSymbols: string[];
} {
  let totalNet = 0;
  let totalPnl = 0;
  const highRisk: string[] = [];

  for (const entry of entries) {
    totalNet += Math.abs(entry.netPosition);
    totalPnl += entry.unrealizedPnl;
    if (entry.riskLevel === 'high' || entry.riskLevel === 'extreme') {
      highRisk.push(entry.symbol);
    }
  }

  return {
    totalNetLots: round8(totalNet),
    totalPnl: round8(totalPnl),
    symbolCount: entries.length,
    highRiskSymbols: highRisk,
  };
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}
