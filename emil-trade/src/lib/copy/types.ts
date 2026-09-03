/**
 * Strategy provider taxonomy. Until a `strategies` table exists, the
 * leaderboard reads from a static seed (lib/copy/seed.ts). The shapes
 * here are exactly what a future server-side query would return, so
 * swapping in real data is a single import change.
 */

export type RiskScore = 'low' | 'medium' | 'high' | 'aggressive';

export interface StrategyProvider {
  id: string;
  /** display name, e.g. "AlphaFX Conservative" */
  name: string;
  /** short tagline shown under the name on the card */
  tagline: string;
  /** initials (or null) used for the avatar fallback */
  avatar_initials: string;
  /** ISO country code, e.g. "GB" */
  country: string;
  /** total assets under copy, in USD, decimal-formatted */
  aum_usd: string;
  /** number of currently active copiers */
  followers: number;
  /** age of the strategy in days */
  age_days: number;
  /** total trades placed, lifetime */
  trades_total: number;
  /** win rate as a 0..1 fraction */
  win_rate: number;
  /** ROI metrics (percent) */
  roi_30d: number;
  roi_90d: number;
  roi_all: number;
  /** maximum historical drawdown as a percent (positive value) */
  max_drawdown: number;
  /** annualized Sharpe */
  sharpe: number;
  /** profit factor (gross profit / gross loss) */
  profit_factor: number;
  /** computed risk bucket */
  risk: RiskScore;
  /** equity curve, length 90 — values normalised to start at 100 */
  equity_curve: number[];
}

/**
 * Settings the user can choose when copying a strategy. Defaults are
 * intentionally conservative — proportional sizing, 25% max DD stop,
 * 5 max concurrent trades.
 */
export interface CopySettings {
  /** allocation in account currency, decimal string */
  allocation: string;
  /** copy ratio mode */
  ratio_mode: 'proportional' | 'fixed_lot';
  /** when ratio_mode = 'fixed_lot', the lot size to use per copy */
  fixed_lot: string;
  /** max drawdown stop as a percent (positive) — pause copying if breached */
  max_drawdown_stop: number;
  /** max simultaneously-open copied trades */
  max_open_trades: number;
  /** mirror provider's SL / TP onto the copied trade */
  copy_sl_tp: boolean;
  /** invert direction on every copied trade */
  reverse_copy: boolean;
}

export const DEFAULT_COPY_SETTINGS: CopySettings = {
  allocation: '500.00',
  ratio_mode: 'proportional',
  fixed_lot: '0.10',
  max_drawdown_stop: 25,
  max_open_trades: 5,
  copy_sl_tp: true,
  reverse_copy: false,
};

export const RISK_LABELS: Record<RiskScore, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  aggressive: 'Aggressive',
};

/**
 * Derive a risk bucket from drawdown + leverage proxies. We don't have
 * leverage in the strategy shape yet, so this is purely DD-driven for
 * the seed. Real implementation will fold in average position sizing.
 */
export function deriveRisk(maxDrawdownPct: number): RiskScore {
  if (maxDrawdownPct <= 8)  return 'low';
  if (maxDrawdownPct <= 15) return 'medium';
  if (maxDrawdownPct <= 25) return 'high';
  return 'aggressive';
}
