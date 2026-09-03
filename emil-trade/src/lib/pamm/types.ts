/**
 * PAMM manager + subscription shapes. Until a `pamm_managers` table
 * exists, the list reads from a static seed (lib/pamm/seed.ts). The
 * shape here is what a future server-side query will return so the
 * UI surface doesn't change when the data layer ships.
 */

import type { RiskScore } from '@/lib/copy/types';

export interface PammManager {
  id: string;
  name: string;
  manager_name: string;
  manager_credentials: string;
  bio: string;
  country: string;
  avatar_initials: string;

  /** AUM in USD, decimal-formatted */
  aum_usd: string;
  investor_count: number;
  manager_age_months: number;

  /** Performance — percent figures */
  roi_ytd: number;
  roi_30d: number;
  roi_all: number;
  max_drawdown: number;
  sharpe: number;
  best_month_pct: number;
  worst_month_pct: number;

  risk: RiskScore;

  /** Fees */
  profit_share_pct: number;
  management_fee_pct: number;
  high_water_mark: boolean;
  lockup_days: number;
  min_investment_usd: number;
  redemption_window: string;

  /** 12 months of percent returns, oldest → newest */
  monthly_returns_12m: number[];
  /** 24-month equity curve, normalised to start at 100 */
  equity_curve: number[];
  strategy_doc_url: string;
}

export type SubscriptionStatus = 'active' | 'pending_redemption' | 'redeeming' | 'redeemed';

export interface PammSubscription {
  id: string;
  manager_id: string;
  /** Decimal-formatted */
  invested: string;
  /** Decimal-formatted, current NAV-adjusted equity */
  current_equity: string;
  /** Decimal-formatted, all-time profit share + management fees accrued so far */
  fees_accrued: string;
  status: SubscriptionStatus;
  invested_at: string;
  /** Most recent monthly statement date, or null */
  last_statement_at: string | null;
}

export interface InvestmentSettings {
  /** Decimal-formatted USD amount */
  amount: string;
  /** Did the user explicitly tick the lockup acknowledgement */
  acknowledged_lockup: boolean;
  /** Did the user agree to the profit-share schedule */
  acknowledged_profit_share: boolean;
  /** Typed full name, used as the e-signature */
  signature_name: string;
}

export interface RedemptionRequest {
  /** Either a partial amount (Decimal-formatted) or 'full' */
  amount: string;
  full: boolean;
}
