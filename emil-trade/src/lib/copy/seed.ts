import type { StrategyProvider } from './types';
import { deriveRisk } from './types';

/**
 * Static strategy seed list. Replaces the empty leaderboard until a
 * real `strategies` table is provisioned. Curve points are deterministic
 * so the chart is stable across server renders.
 */
const SEED: Omit<StrategyProvider, 'risk' | 'equity_curve'>[] = [
  {
    id: 'alpha-fx-conservative',
    name: 'AlphaFX Conservative',
    tagline: 'Risk-first multi-pair grid with hard daily DD cap.',
    avatar_initials: 'AF',
    country: 'GB',
    aum_usd: '1240000.00',
    followers: 240,
    age_days: 612,
    trades_total: 2148,
    win_rate: 0.71,
    roi_30d: 4.2,
    roi_90d: 11.8,
    roi_all: 38.4,
    max_drawdown: 6.1,
    sharpe: 1.92,
    profit_factor: 2.31,
  },
  {
    id: 'titan-momentum',
    name: 'TitanTrade Momentum',
    tagline: 'Breakout-driven. Higher variance, higher upside.',
    avatar_initials: 'TT',
    country: 'AE',
    aum_usd: '3420000.00',
    followers: 982,
    age_days: 421,
    trades_total: 4912,
    win_rate: 0.58,
    roi_30d: 12.8,
    roi_90d: 31.4,
    roi_all: 144.2,
    max_drawdown: 18.4,
    sharpe: 1.51,
    profit_factor: 1.84,
  },
  {
    id: 'hedged-yield',
    name: 'Hedged Yield',
    tagline: 'Carry trades on G10 pairs. Slow and steady.',
    avatar_initials: 'HY',
    country: 'JP',
    aum_usd: '820000.00',
    followers: 102,
    age_days: 998,
    trades_total: 642,
    win_rate: 0.79,
    roi_30d: 1.4,
    roi_90d: 4.1,
    roi_all: 22.3,
    max_drawdown: 3.8,
    sharpe: 2.14,
    profit_factor: 3.02,
  },
  {
    id: 'gold-pulse',
    name: 'Gold Pulse',
    tagline: 'XAU-only intraday momentum. London + NY sessions only.',
    avatar_initials: 'GP',
    country: 'IN',
    aum_usd: '1620000.00',
    followers: 412,
    age_days: 314,
    trades_total: 1842,
    win_rate: 0.62,
    roi_30d: 8.4,
    roi_90d: 22.8,
    roi_all: 78.6,
    max_drawdown: 12.2,
    sharpe: 1.78,
    profit_factor: 2.04,
  },
  {
    id: 'crypto-tactical',
    name: 'Crypto Tactical',
    tagline: 'BTC + ETH directional bias with strict stops.',
    avatar_initials: 'CT',
    country: 'SG',
    aum_usd: '2240000.00',
    followers: 1240,
    age_days: 218,
    trades_total: 3120,
    win_rate: 0.54,
    roi_30d: 18.2,
    roi_90d: 41.7,
    roi_all: 162.8,
    max_drawdown: 22.6,
    sharpe: 1.42,
    profit_factor: 1.69,
  },
  {
    id: 'leverage-edge',
    name: 'Leverage Edge',
    tagline: 'Aggressive martingale on majors. High DD by design.',
    avatar_initials: 'LE',
    country: 'CY',
    aum_usd: '420000.00',
    followers: 88,
    age_days: 162,
    trades_total: 982,
    win_rate: 0.49,
    roi_30d: 24.6,
    roi_90d: 58.2,
    roi_all: 91.4,
    max_drawdown: 34.1,
    sharpe: 0.98,
    profit_factor: 1.31,
  },
];

/**
 * Build a 90-point equity curve that ends at the strategy's all-time
 * ROI level. Deterministic per strategy id so server + client render
 * the same shape (no hydration mismatch).
 */
function buildEquityCurve(seed: string, allTimeRoi: number, drawdown: number): number[] {
  // Hash the id to a stable phase offset so each strategy has a
  // distinguishable shape without needing per-strategy hardcoded data.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const phase = (hash % 360) * (Math.PI / 180);

  const out: number[] = [];
  for (let i = 0; i < 90; i++) {
    const t = i / 89;
    const drift = allTimeRoi * t;
    // Two superposed sines + a single drawdown dip somewhere mid-series.
    const wobble =
      Math.sin(i * 0.21 + phase) * 1.6
      + Math.sin(i * 0.07 + phase * 1.3) * 0.9
      - (i > 30 && i < 50 ? Math.exp(-Math.abs(i - 40) / 3) * (drawdown * 0.6) : 0);
    out.push(Number((100 + drift + wobble).toFixed(2)));
  }
  return out;
}

export function getSeedStrategies(): StrategyProvider[] {
  return SEED.map((s) => ({
    ...s,
    risk: deriveRisk(s.max_drawdown),
    equity_curve: buildEquityCurve(s.id, s.roi_all, s.max_drawdown),
  }));
}

export function getSeedStrategy(id: string): StrategyProvider | null {
  const found = getSeedStrategies().find((s) => s.id === id);
  return found ?? null;
}
