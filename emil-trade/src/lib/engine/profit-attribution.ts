// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Profit Attribution Engine
//
// Per-trade breakdown of where broker revenue comes from:
//   SpreadRevenue = (ClientPrice - ReferenceMid) × Volume × ContractSize
//   BBookPnL = Client loss when internalized (position P&L flipped)
//   LP_Cost = (LPFillPrice - ExpectedPrice) × Volume
//   SlippageCost = adverse execution delta
//   IB_Cost = commission paid to introducing broker
//   Net = SpreadRevenue + BBookPnL - LP_Cost - SlippageCost - IB_Cost
// ═══════════════════════════════════════════════════════════════

export interface TradeForAttribution {
  tradeId: string;
  orderId: string;
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  contractSize: number;
  executionPrice: number;    // price client got
  referencePrice: number;    // mid-market at execution time
  lpFillPrice?: number;      // actual LP fill (A-Book only)
  commission: number;        // commission charged to client
  routingMode: 'A' | 'B' | 'hybrid';
  aBookRatio: number;        // 0-1 (% sent to LP)
  ibCommission?: number;     // IB payout for this trade
  clientPnl?: number;        // client's realized P&L (for closed trades)
  segment?: string;          // client segment
}

export interface AttributionResult {
  tradeId: string;
  spreadRevenue: number;
  commissionRevenue: number;
  bBookPnl: number;
  lpCost: number;
  slippageCost: number;
  ibCommissionCost: number;
  netPnl: number;
  routingMode: string;
  segment?: string;
}

/**
 * Calculate full profit attribution for a single trade.
 */
export function attributeTrade(trade: TradeForAttribution): AttributionResult {
  const contractValue = trade.volume * trade.contractSize;
  const dirSign = trade.direction === 'BUY' ? 1 : -1;

  // Spread revenue: difference between client execution price and mid-market
  const spreadRevenue = round8(
    dirSign * (trade.executionPrice - trade.referencePrice) * contractValue
  );

  // Commission revenue (what the client paid in commissions)
  const commissionRevenue = round8(Math.abs(trade.commission));

  // B-Book P&L: when we internalize, our P&L is the inverse of client's P&L
  // For open trades, this is 0 until closed
  let bBookPnl = 0;
  if (trade.clientPnl !== undefined) {
    // B-Book portion: the part we kept internally
    bBookPnl = round8(-trade.clientPnl * (1 - trade.aBookRatio));
  }

  // LP cost: slippage between what we expected and what LP actually filled
  let lpCost = 0;
  if (trade.lpFillPrice && trade.aBookRatio > 0) {
    lpCost = round8(
      Math.abs(trade.lpFillPrice - trade.referencePrice) * contractValue * trade.aBookRatio
    );
  }

  // Slippage cost: adverse execution vs what client requested
  const slippageCost = round8(
    Math.max(0, Math.abs(trade.executionPrice - trade.referencePrice) * contractValue * 0.1) // 10% attribution
  );

  // IB commission cost
  const ibCommissionCost = round8(Math.abs(trade.ibCommission || 0));

  // Net P&L
  const netPnl = round8(
    spreadRevenue + commissionRevenue + bBookPnl - lpCost - slippageCost - ibCommissionCost
  );

  return {
    tradeId: trade.tradeId,
    spreadRevenue,
    commissionRevenue,
    bBookPnl,
    lpCost,
    slippageCost,
    ibCommissionCost,
    netPnl,
    routingMode: trade.routingMode,
    segment: trade.segment,
  };
}

/**
 * Aggregate attribution results into a summary.
 */
export function aggregateAttributions(results: AttributionResult[]): {
  totalSpreadRevenue: number;
  totalCommission: number;
  totalBBookPnl: number;
  totalLpCost: number;
  totalSlippageCost: number;
  totalIbCost: number;
  totalNetPnl: number;
  aBookCount: number;
  bBookCount: number;
  hybridCount: number;
} {
  let spread = 0, comm = 0, bbook = 0, lp = 0, slip = 0, ib = 0, net = 0;
  let aCount = 0, bCount = 0, hCount = 0;

  for (const r of results) {
    spread += r.spreadRevenue;
    comm += r.commissionRevenue;
    bbook += r.bBookPnl;
    lp += r.lpCost;
    slip += r.slippageCost;
    ib += r.ibCommissionCost;
    net += r.netPnl;
    if (r.routingMode === 'A') aCount++;
    else if (r.routingMode === 'B') bCount++;
    else hCount++;
  }

  return {
    totalSpreadRevenue: round8(spread),
    totalCommission: round8(comm),
    totalBBookPnl: round8(bbook),
    totalLpCost: round8(lp),
    totalSlippageCost: round8(slip),
    totalIbCost: round8(ib),
    totalNetPnl: round8(net),
    aBookCount: aCount,
    bBookCount: bCount,
    hybridCount: hCount,
  };
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}
