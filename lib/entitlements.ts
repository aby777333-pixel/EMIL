// Plan entitlements for the platform layer (developer portal, API quotas,
// webhooks, streaming, organizations, bring-your-own data). Plans are tracked
// in billing_plans; the enforceable limits live here so every endpoint reads
// one deterministic table. Admins bypass all limits.

export const SCOPES = {
  read: 'Account, EMIL state, strategies, knowledge graph',
  market_data: 'Quotes, candles, market board, FX, crypto, correlation',
  news: 'News headlines with impact scoring',
  calendar: 'Economic calendar and central-bank monitor',
  research: 'Instrument research reports and the morning brief (uses AI credits)',
  alerts: 'Create, list and delete price alerts',
  journal: 'Read and write trade-journal entries',
  portfolio: 'Consolidated portfolio and exposure across linked venues',
  paper_trade: 'Place and cancel PAPER orders on sandbox venues (never live)',
  broker_link: 'Link broker accounts to the caller',
  webhooks: 'Manage outbound webhook endpoints',
  ingest: 'Push your own live data (quotes, orders, P&L) into EMIL',
  stream: 'Server-sent-events stream of quotes and EMIL state',
} as const

export type Scope = keyof typeof SCOPES
export const ALL_SCOPES = Object.keys(SCOPES) as Scope[]

export type PlanLimits = {
  apiPerMinute: number
  apiPerDay: number
  maxKeys: number
  maxWebhooks: number
  maxIngestRowsPerDay: number
  streaming: boolean
  sandboxOnly: boolean // trial keys never touch even paper venues via the API
  organizations: boolean
  members: number
  label: string
  /** Metered billing: API calls included per month and the overage price per 1,000 calls (USD). */
  includedCallsPerMonth: number
  overagePer1k: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: { label: 'Trial', apiPerMinute: 30, apiPerDay: 2_000, maxKeys: 2, maxWebhooks: 1, maxIngestRowsPerDay: 5_000, streaming: false, sandboxOnly: true, organizations: false, members: 1, includedCallsPerMonth: 20_000, overagePer1k: 0 },
  starter: { label: 'Starter', apiPerMinute: 120, apiPerDay: 20_000, maxKeys: 5, maxWebhooks: 3, maxIngestRowsPerDay: 50_000, streaming: false, sandboxOnly: false, organizations: false, members: 1, includedCallsPerMonth: 300_000, overagePer1k: 0.5 },
  pro: { label: 'Pro', apiPerMinute: 600, apiPerDay: 200_000, maxKeys: 20, maxWebhooks: 10, maxIngestRowsPerDay: 500_000, streaming: true, sandboxOnly: false, organizations: true, members: 5, includedCallsPerMonth: 3_000_000, overagePer1k: 0.25 },
  institutional: { label: 'Institutional', apiPerMinute: 3_000, apiPerDay: 2_000_000, maxKeys: 100, maxWebhooks: 50, maxIngestRowsPerDay: 5_000_000, streaming: true, sandboxOnly: false, organizations: true, members: 100, includedCallsPerMonth: 30_000_000, overagePer1k: 0.1 },
}

const ADMIN_LIMITS: PlanLimits = { label: 'Admin', apiPerMinute: 10_000, apiPerDay: 10_000_000, maxKeys: 1_000, maxWebhooks: 1_000, maxIngestRowsPerDay: 50_000_000, streaming: true, sandboxOnly: false, organizations: true, members: 10_000, includedCallsPerMonth: 1_000_000_000, overagePer1k: 0 }

export function planLimits(planKey: string | null | undefined, isAdmin = false): PlanLimits {
  if (isAdmin) return ADMIN_LIMITS
  return PLAN_LIMITS[planKey ?? 'trial'] ?? PLAN_LIMITS.trial
}

export function parseScopes(csv: string | null | undefined): Scope[] {
  const set = new Set<Scope>()
  for (const s of String(csv ?? '').split(',')) {
    const k = s.trim() as Scope
    if (k in SCOPES) set.add(k)
  }
  if (set.size === 0) set.add('read')
  return Array.from(set)
}
