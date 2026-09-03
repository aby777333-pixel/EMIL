// Shared credential-form metadata for the API Hub cards and the Connect wizard.

export const CRED_FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  api_key: [{ key: 'apiKey', label: 'API key', secret: true }],
  api_key_secret: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'apiSecret', label: 'API secret', secret: true },
    { key: 'clientCode', label: 'Passphrase / client id (if required)' },
  ],
  mt_account: [
    { key: 'clientCode', label: 'Account number' },
    { key: 'apiSecret', label: 'Account password', secret: true },
    { key: 'apiKey', label: 'Server name (e.g. ICMarketsSC-Live04)' },
  ],
  api_key_secret_daily_token: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'apiSecret', label: 'API secret', secret: true },
    { key: 'accessToken', label: 'Daily access / session token', secret: true },
  ],
  oauth2: [
    { key: 'apiKey', label: 'App ID / API key', secret: true },
    { key: 'apiSecret', label: 'App secret', secret: true },
    { key: 'accessToken', label: 'Access token (from the OAuth login)', secret: true },
  ],
  totp_login: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'clientCode', label: 'Client code / user id' },
    { key: 'apiSecret', label: 'PIN / password', secret: true },
    { key: 'accessToken', label: 'Session / JWT token (after TOTP login)', secret: true },
  ],
  static_token: [{ key: 'accessToken', label: 'Access token', secret: true }],
}

// Broker permission tiers (spec §6–7). The tier is stored with the link and
// enforced server-side: only TRADING links can reach the order router.
export type PermissionTier = 'read_only' | 'analysis' | 'trading'

export const TIERS: { key: PermissionTier; label: string; short: string; summary: string; allows: string[]; never: string[]; tone: string }[] = [
  {
    key: 'read_only',
    label: 'Read-only',
    short: 'READ',
    summary: 'EMIL reads balances, positions and open orders to show them in the cockpit.',
    allows: ['Balances and equity', 'Open positions and orders', 'Connection health checks'],
    never: ['Placing, changing or cancelling orders', 'Using the data for agent analysis'],
    tone: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  },
  {
    key: 'analysis',
    label: 'Analysis',
    short: 'ANALYSIS',
    summary: 'Read-only, plus EMIL may use the account data for exposure maps, risk checks and paper simulations.',
    allows: ['Everything in Read-only', 'Portfolio, exposure and risk analytics', 'Paper simulations that mirror the account'],
    never: ['Placing, changing or cancelling orders on this account'],
    tone: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  },
  {
    key: 'trading',
    label: 'Trading',
    short: 'TRADING',
    summary: 'EMIL may place, change and cancel orders on this account — within your risk limits and only while ARMED (testnet rows work anytime).',
    allows: ['Everything in Analysis', 'Order placement and cancellation through the guarded router', 'Paper Trading Desk on testnet/sandbox rows'],
    never: ['Withdrawals or transfers — disable them on the key at the venue', 'Trading past the per-order notional cap or with EMIL DISARMED (live rows)'],
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
]

export const CONSENT_VERSION = 'broker-api-v1'

export function disclaimerItems(tier: PermissionTier, vendor: string): { key: string; text: string }[] {
  const base = [
    { key: 'own_key', text: `I created this API key myself in my own ${vendor} account and I understand it grants EMIL access to that account.` },
    { key: 'no_withdrawals', text: 'I have disabled withdrawal / transfer permissions on this key at the venue (or the venue does not offer them on API keys).' },
    { key: 'storage', text: 'I understand EMIL stores this credential encrypted on its server, never in my browser, and that I can revoke it here or at the venue at any time.' },
    { key: 'risk', text: 'I understand API-connected trading carries risk of loss, that testnet / paper results do not predict live results, and that EMIL is software, not a licensed adviser.' },
  ]
  if (tier === 'trading') {
    base.push({ key: 'authorise_orders', text: 'I authorise EMIL to place, change and cancel orders on this account within my configured risk limits — live only while EMIL is ARMED, testnet at any time.' })
  }
  return base
}
