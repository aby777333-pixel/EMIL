/**
 * Shared account-type constants used by the wizard and the accounts
 * list. Keep this list in lockstep with the trading_accounts.account_type
 * enum + the dealing-desk side of the system; both surfaces depend on
 * matching values.
 */

export type AccountTypeId = 'standard' | 'ecn' | 'raw_spread' | 'cent' | 'demo';

export interface AccountTypeSpec {
  id: AccountTypeId;
  label: string;
  /** spread floor in pips, indicative */
  spreadFromPips: string;
  /** commission per round-turn lot, in account ccy */
  commissionPerLot: string;
  /** minimum funded deposit, in USD */
  minDepositUsd: number;
  /** allowed leverage tiers (key in LEVERAGE_TIERS) */
  maxLeverage: number;
  /** one-line description shown on the type card */
  blurb: string;
  /** if true, balances are virtual */
  isDemo?: boolean;
}

export const ACCOUNT_TYPES: AccountTypeSpec[] = [
  {
    id: 'standard',
    label: 'Standard',
    spreadFromPips: '1.0',
    commissionPerLot: '0',
    minDepositUsd: 50,
    maxLeverage: 500,
    blurb: 'No commission. Spread baked into the quote. Best for casual sizing.',
  },
  {
    id: 'ecn',
    label: 'ECN',
    spreadFromPips: '0.0',
    commissionPerLot: '7',
    minDepositUsd: 200,
    maxLeverage: 500,
    blurb: 'Direct interbank pricing with razor-thin spreads. Commission per lot.',
  },
  {
    id: 'raw_spread',
    label: 'Raw Spread',
    spreadFromPips: '0.0',
    commissionPerLot: '3.5',
    minDepositUsd: 1_000,
    maxLeverage: 200,
    blurb: 'Lower commission, raw liquidity. For active intraday sizes.',
  },
  {
    id: 'cent',
    label: 'Cent',
    spreadFromPips: '1.5',
    commissionPerLot: '0',
    minDepositUsd: 10,
    maxLeverage: 100,
    blurb: 'Balances + lot sizes denominated in cents. Ideal for strategy testing live.',
  },
  {
    id: 'demo',
    label: 'Demo',
    spreadFromPips: '1.0',
    commissionPerLot: '0',
    minDepositUsd: 0,
    maxLeverage: 100,
    blurb: 'Virtual balance. Indistinguishable from live except no real funds move.',
    isDemo: true,
  },
];

export type PlatformId = 'mt5' | 'mt4' | 'web' | 'native';

export const PLATFORMS: { id: PlatformId; label: string; tag?: string; description: string }[] = [
  { id: 'mt5',    label: 'MetaTrader 5',          tag: 'recommended', description: 'Industry standard. Native client + mobile + web.' },
  { id: 'native', label: 'EMIL Trade terminal',   tag: 'in-house',    description: 'Built for this platform. Sub-millisecond execution.' },
  { id: 'web',    label: 'Web trader',            description: 'Trade in any browser, no install required.' },
  { id: 'mt4',    label: 'MetaTrader 4',          tag: 'legacy',      description: 'For existing EAs that haven\'t been ported.' },
];

export const SUPPORTED_BASE_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'USDT'] as const;
export type BaseCurrency = (typeof SUPPORTED_BASE_CURRENCIES)[number];

export const LEVERAGE_TIERS = [30, 100, 200, 500, 1000] as const;
export type LeverageTier = (typeof LEVERAGE_TIERS)[number];

/**
 * Pretty label for the account type, falling back to the raw enum if
 * we don't know the value (legacy rows).
 */
export function prettyAccountType(t: string): string {
  const found = ACCOUNT_TYPES.find((s) => s.id === t);
  if (found) return found.label;
  return t.split(/[_\s]/).map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
