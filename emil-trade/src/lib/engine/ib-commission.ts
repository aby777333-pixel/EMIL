// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — IB Commission Engine
//
// Calculates introducing broker commissions per trade.
// Supports: CPA (cost per acquisition), RevShare, Hybrid
// Applies flow_quality_score multiplier to penalize toxic flow.
//
// Multi-tier: walks up the IB hierarchy to pay all levels.
// ═══════════════════════════════════════════════════════════════

export interface IBProfile {
  id: string;
  userId: string;
  parentIbId: string | null;
  level: number;              // 1 = direct, 2 = sub-IB, etc.
  commissionModel: 'cpa' | 'revshare' | 'hybrid';
  commissionRate: number;     // for revshare: 0.30 = 30% of spread
  cpaAmount?: number;         // for CPA: flat $ per new funded client
  flowQualityScore: number;   // 0-1 (1 = clean flow, 0 = toxic)
}

export interface TradeForCommission {
  tradeId: string;
  accountId: string;
  volume: number;             // in lots
  spreadRevenue: number;      // broker's spread revenue for this trade
  commission: number;         // commission charged to client
  isFirstTrade: boolean;      // for CPA: triggers on first funded trade
}

export interface CommissionPayout {
  ibId: string;
  tradeId: string;
  amount: number;
  type: 'cpa' | 'revshare' | 'hybrid';
  level: number;
  qualityMultiplier: number;
  status: 'pending';
}

// Commission tiers — each level gets a reduced % of the parent
const TIER_MULTIPLIERS: Record<number, number> = {
  1: 1.00,   // Level 1 IB: full commission
  2: 0.30,   // Level 2 sub-IB: 30% of level 1
  3: 0.10,   // Level 3: 10%
  4: 0.05,   // Level 4: 5%
};

/**
 * Calculate commission for a single trade, walking the full IB hierarchy.
 */
export function calculateIBCommissions(
  trade: TradeForCommission,
  ibChain: IBProfile[], // ordered from direct IB → parent → grandparent
): CommissionPayout[] {
  const payouts: CommissionPayout[] = [];

  for (const ib of ibChain) {
    const tierMultiplier = TIER_MULTIPLIERS[ib.level] ?? 0;
    if (tierMultiplier <= 0) continue;

    let baseAmount = 0;

    switch (ib.commissionModel) {
      case 'revshare':
        // RevShare: percentage of spread revenue
        baseAmount = trade.spreadRevenue * ib.commissionRate;
        break;

      case 'cpa':
        // CPA: flat amount on first trade only
        if (trade.isFirstTrade && ib.cpaAmount) {
          baseAmount = ib.cpaAmount;
        }
        break;

      case 'hybrid':
        // Hybrid: RevShare on all trades + CPA on first
        baseAmount = trade.spreadRevenue * ib.commissionRate;
        if (trade.isFirstTrade && ib.cpaAmount) {
          baseAmount += ib.cpaAmount;
        }
        break;
    }

    // Apply tier multiplier for sub-IBs
    let amount = baseAmount * tierMultiplier;

    // Apply flow quality score (penalize IBs that send toxic flow)
    const qualityMult = Math.max(0.1, ib.flowQualityScore); // minimum 10%
    amount *= qualityMult;

    if (amount > 0.001) { // minimum $0.001 payout threshold
      payouts.push({
        ibId: ib.id,
        tradeId: trade.tradeId,
        amount: Math.round(amount * 100) / 100, // round to cents
        type: ib.commissionModel,
        level: ib.level,
        qualityMultiplier: qualityMult,
        status: 'pending',
      });
    }
  }

  return payouts;
}

/**
 * Calculate total IB cost for a trade (sum of all tier payouts).
 */
export function totalIBCost(payouts: CommissionPayout[]): number {
  return payouts.reduce((sum, p) => sum + p.amount, 0);
}
