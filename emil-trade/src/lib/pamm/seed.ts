import type { PammManager } from './types';
import { deriveRisk } from '@/lib/copy/types';

/**
 * Static PAMM manager seed. Replaces the empty list until a real
 * `pamm_managers` table is provisioned. Curve points + monthly
 * returns are deterministic so server + client renders match (no
 * hydration mismatch).
 */
const SEED: Omit<PammManager, 'risk' | 'equity_curve' | 'monthly_returns_12m'>[] = [
  {
    id: 'prime-capital-fx',
    name: 'Prime Capital FX',
    manager_name: 'K. Iyer',
    manager_credentials: 'CFTe · CMT',
    bio: 'Discretionary macro strategy across G10 + emerging-market crosses. 14 years on bank desks. Drawdown discipline first, returns second.',
    country: 'IN',
    avatar_initials: 'PC',
    aum_usd: '2140000.00',
    investor_count: 80,
    manager_age_months: 38,
    roi_ytd: 31.4,
    roi_30d: 4.6,
    roi_all: 142.8,
    max_drawdown: 8.2,
    sharpe: 1.84,
    best_month_pct: 8.4,
    worst_month_pct: -3.1,
    profit_share_pct: 25,
    management_fee_pct: 1.5,
    high_water_mark: true,
    lockup_days: 30,
    min_investment_usd: 5_000,
    redemption_window: '1st of each month',
    strategy_doc_url: '/marketing/pamm/prime-capital-strategy.pdf',
  },
  {
    id: 'meridian-systematic',
    name: 'Meridian Systematic',
    manager_name: 'L. Müller',
    manager_credentials: 'CFA · 12y systematic',
    bio: 'Quantitative trend-following with volatility-targeting overlay. Algorithmic execution, no human override during risk-on regimes.',
    country: 'CH',
    avatar_initials: 'MS',
    aum_usd: '6840000.00',
    investor_count: 312,
    manager_age_months: 52,
    roi_ytd: 18.6,
    roi_30d: 2.1,
    roi_all: 218.4,
    max_drawdown: 12.4,
    sharpe: 1.62,
    best_month_pct: 6.8,
    worst_month_pct: -4.6,
    profit_share_pct: 20,
    management_fee_pct: 2.0,
    high_water_mark: true,
    lockup_days: 90,
    min_investment_usd: 25_000,
    redemption_window: 'Quarterly · 30-day notice',
    strategy_doc_url: '/marketing/pamm/meridian-strategy.pdf',
  },
  {
    id: 'helios-gold',
    name: 'Helios Gold',
    manager_name: 'A. Hassan',
    manager_credentials: 'Ex-LBMA market maker',
    bio: 'XAU-only intraday strategy, London + NY sessions. Heavy use of session-bias models. No held positions across weekends.',
    country: 'AE',
    avatar_initials: 'HG',
    aum_usd: '1240000.00',
    investor_count: 42,
    manager_age_months: 18,
    roi_ytd: 26.2,
    roi_30d: 5.4,
    roi_all: 64.8,
    max_drawdown: 14.6,
    sharpe: 1.48,
    best_month_pct: 9.2,
    worst_month_pct: -6.4,
    profit_share_pct: 30,
    management_fee_pct: 1.0,
    high_water_mark: true,
    lockup_days: 14,
    min_investment_usd: 2_500,
    redemption_window: '1st & 15th of each month',
    strategy_doc_url: '/marketing/pamm/helios-strategy.pdf',
  },
  {
    id: 'aurora-arb',
    name: 'Aurora Arbitrage',
    manager_name: 'S. Park',
    manager_credentials: 'Ex-prop · 8y latency arb',
    bio: 'Stat-arb across correlated FX crosses with intraday-only exposure. Long horizon, low realised volatility, capacity-constrained.',
    country: 'SG',
    avatar_initials: 'AA',
    aum_usd: '3680000.00',
    investor_count: 124,
    manager_age_months: 28,
    roi_ytd: 11.4,
    roi_30d: 1.2,
    roi_all: 48.6,
    max_drawdown: 4.1,
    sharpe: 2.34,
    best_month_pct: 3.8,
    worst_month_pct: -1.4,
    profit_share_pct: 20,
    management_fee_pct: 1.5,
    high_water_mark: true,
    lockup_days: 60,
    min_investment_usd: 10_000,
    redemption_window: 'Monthly · 14-day notice',
    strategy_doc_url: '/marketing/pamm/aurora-strategy.pdf',
  },
];

/**
 * Build a deterministic 24-month equity curve ending at the manager's
 * all-time ROI level. Same hash technique as the copy-trading seed.
 */
function buildEquityCurve(seed: string, allTimeRoi: number, drawdown: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const phase = (hash % 360) * (Math.PI / 180);

  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const drift = allTimeRoi * t;
    const wobble =
      Math.sin(i * 0.32 + phase) * 1.4
      + Math.cos(i * 0.11 + phase * 1.7) * 0.7
      - (i > 8 && i < 13 ? Math.exp(-Math.abs(i - 10) / 2) * (drawdown * 0.55) : 0);
    out.push(Number((100 + drift + wobble).toFixed(2)));
  }
  return out;
}

/** Build 12 months of returns derived from the curve so they're consistent. */
function buildMonthlyReturns(curve: number[]): number[] {
  const tail = curve.slice(-13); // 13 points → 12 deltas
  const out: number[] = [];
  for (let i = 1; i < tail.length; i++) {
    const ret = ((tail[i] - tail[i - 1]) / tail[i - 1]) * 100;
    out.push(Number(ret.toFixed(2)));
  }
  return out;
}

export function getSeedManagers(): PammManager[] {
  return SEED.map((m) => {
    const equity_curve = buildEquityCurve(m.id, m.roi_all, m.max_drawdown);
    return {
      ...m,
      risk: deriveRisk(m.max_drawdown),
      equity_curve,
      monthly_returns_12m: buildMonthlyReturns(equity_curve),
    };
  });
}

export function getSeedManager(id: string): PammManager | null {
  return getSeedManagers().find((m) => m.id === id) ?? null;
}
