// Single source of truth for the EMIL Platform API v1 surface: the endpoint
// table drives the OpenAPI document, the Postman collection and the in-app
// reference (/developers/docs). Keep it in step with app/api/v1.

import type { Scope } from '@/lib/entitlements'

export type EndpointDef = {
  method: 'GET' | 'POST' | 'DELETE'
  path: string // relative to /api/v1
  summary: string
  scope: Scope | 'public'
  group: string
  params?: { name: string; in: 'query' | 'path'; required?: boolean; description: string; example?: string }[]
  body?: Record<string, string> // field → description
  notes?: string
}

export const API_VERSION = '1.2'

export const ENDPOINTS: EndpointDef[] = [
  { method: 'GET', path: '/openapi.json', summary: 'This OpenAPI 3.0 document', scope: 'public', group: 'Meta' },
  { method: 'GET', path: '/postman.json', summary: 'Postman collection generated from the OpenAPI document', scope: 'public', group: 'Meta' },
  { method: 'GET', path: '/ping', summary: 'Key and account check', scope: 'read', group: 'Account' },
  { method: 'GET', path: '/me', summary: 'Account, plan, quota and key scopes', scope: 'read', group: 'Account' },
  { method: 'GET', path: '/usage', summary: 'Your API usage for the last 14 days (per key, per endpoint)', scope: 'read', group: 'Account' },
  { method: 'GET', path: '/state', summary: 'EMIL system state (armed, mode, guardian, trust)', scope: 'read', group: 'EMIL' },
  { method: 'GET', path: '/strategies', summary: 'Current strategy blueprints (research output, not advice)', scope: 'read', group: 'EMIL' },
  { method: 'GET', path: '/knowledge/concepts', summary: 'Knowledge-graph concepts', scope: 'read', group: 'EMIL' },
  { method: 'GET', path: '/knowledge/claims', summary: 'Recent attributed claims', scope: 'read', group: 'EMIL' },
  { method: 'GET', path: '/market/board', summary: 'Indices, metals and energy board (delayed research data)', scope: 'market_data', group: 'Market data' },
  { method: 'GET', path: '/market/quotes', summary: 'Delayed quotes for up to 10 symbols', scope: 'market_data', group: 'Market data', params: [{ name: 'symbols', in: 'query', required: true, description: 'Comma-separated symbols, any spelling (EURUSD, gold, SPX…)', example: 'EUR/USD,XAU/USD' }] },
  { method: 'GET', path: '/market/candles', summary: 'OHLCV time series', scope: 'market_data', group: 'Market data', params: [{ name: 'symbol', in: 'query', required: true, description: 'Instrument', example: 'XAU/USD' }, { name: 'interval', in: 'query', description: '1min…1month (default 1day)', example: '1day' }, { name: 'outputsize', in: 'query', description: 'Bars, max 500 (default 90)' }] },
  { method: 'GET', path: '/market/correlation', summary: 'Pearson, rolling correlation, beta and relative volatility for a pair', scope: 'market_data', group: 'Market data', params: [{ name: 'a', in: 'query', required: true, description: 'Symbol A', example: 'XAU/USD' }, { name: 'b', in: 'query', required: true, description: 'Symbol B', example: 'EUR/USD' }, { name: 'days', in: 'query', description: 'Calendar-day window (90, 180, 365, 730)', example: '365' }] },
  { method: 'GET', path: '/market/fx', summary: 'ECB reference FX rates', scope: 'market_data', group: 'Market data', params: [{ name: 'base', in: 'query', description: 'Base currency (default USD)' }] },
  { method: 'GET', path: '/market/crypto', summary: 'Top crypto assets by market cap', scope: 'market_data', group: 'Market data' },
  { method: 'GET', path: '/news', summary: 'Headlines from the open news index with model impact scores', scope: 'news', group: 'News & calendar', params: [{ name: 'category', in: 'query', description: 'markets | central_banks | economy | forex | commodities | earnings | crypto | geopolitics' }, { name: 'score', in: 'query', description: '1 to include impact scoring' }] },
  { method: 'GET', path: '/calendar', summary: 'Economic calendar for the week', scope: 'calendar', group: 'News & calendar' },
  { method: 'GET', path: '/calendar/central-banks', summary: 'Central-bank policy monitor', scope: 'calendar', group: 'News & calendar' },
  { method: 'GET', path: '/research/report', summary: 'Structured instrument research report (calculated statistics + live context)', scope: 'research', group: 'Research', params: [{ name: 'symbol', in: 'query', required: true, description: 'Instrument', example: 'EUR/USD' }], notes: 'One AI call per uncached report; cached per symbol.' },
  { method: 'GET', path: '/research/brief', summary: 'The morning brief for the caller', scope: 'research', group: 'Research' },
  { method: 'GET', path: '/watchlist', summary: 'Your tracked symbols', scope: 'alerts', group: 'Alerts & watchlist' },
  { method: 'POST', path: '/watchlist', summary: 'Track a symbol', scope: 'alerts', group: 'Alerts & watchlist', body: { symbol: 'Any spelling; resolved through the instrument master' } },
  { method: 'DELETE', path: '/watchlist/{symbol}', summary: 'Stop tracking a symbol', scope: 'alerts', group: 'Alerts & watchlist', params: [{ name: 'symbol', in: 'path', required: true, description: 'Symbol' }] },
  { method: 'GET', path: '/alerts', summary: 'List price alerts', scope: 'alerts', group: 'Alerts & watchlist' },
  { method: 'POST', path: '/alerts', summary: 'Create a price alert (the symbol is added to your watchlist so it evaluates)', scope: 'alerts', group: 'Alerts & watchlist', body: { symbol: 'Instrument', condition: 'above | below', threshold: 'Price level', note: 'Optional note' } },
  { method: 'DELETE', path: '/alerts/{id}', summary: 'Delete a price alert', scope: 'alerts', group: 'Alerts & watchlist', params: [{ name: 'id', in: 'path', required: true, description: 'Alert id' }] },
  { method: 'GET', path: '/notifications', summary: 'Recent in-app notifications', scope: 'alerts', group: 'Alerts & watchlist' },
  { method: 'GET', path: '/journal', summary: 'Trade-journal entries (newest first)', scope: 'journal', group: 'Journal' },
  { method: 'POST', path: '/journal', summary: 'Write a journal entry', scope: 'journal', group: 'Journal', body: { symbol: 'Instrument', side: 'buy | sell', qty: 'Quantity', entryPrice: 'Entry', exitPrice: 'Exit', pnl: 'Realised P&L', notes: 'Free text', tags: 'csv', tradedAt: 'ISO timestamp' } },
  { method: 'GET', path: '/portfolio', summary: 'Consolidated portfolio & exposure across your linked venues and bridged platform accounts', scope: 'portfolio', group: 'Portfolio' },
  { method: 'GET', path: '/org', summary: 'Your organizations: role, recommendations, pending approvals, signal channels with calculated track records', scope: 'read', group: 'Organizations' },
  { method: 'GET', path: '/bridge', summary: 'Your bridged platforms (MT5/MT4 mirror state, TradingView signal log)', scope: 'portfolio', group: 'Portfolio', notes: 'Bridges are created in EMIL → Connect Your Platform; the EA and webhook URLs are shown there.' },
  { method: 'GET', path: '/paper/venues', summary: 'Sandbox venues available to the caller', scope: 'paper_trade', group: 'Paper trading', notes: 'The API only ever reaches paper venues — live execution is not exposed.' },
  { method: 'GET', path: '/paper/orders', summary: 'Your recent paper orders', scope: 'paper_trade', group: 'Paper trading', params: [{ name: 'venue', in: 'query', description: 'Filter by venue key' }] },
  { method: 'POST', path: '/paper/orders', summary: 'Place a guarded PAPER order', scope: 'paper_trade', group: 'Paper trading', body: { venue: 'deribit_testnet | gemini_sandbox | delta_exchange_testnet', symbol: 'Venue symbol', side: 'buy | sell', orderType: 'market | limit', qty: 'Quantity', price: 'Limit price (limit orders)' } },
  { method: 'DELETE', path: '/paper/orders/{id}', summary: 'Cancel a paper order', scope: 'paper_trade', group: 'Paper trading', params: [{ name: 'id', in: 'path', required: true, description: 'Venue order id' }, { name: 'venue', in: 'query', required: true, description: 'Venue key' }, { name: 'symbol', in: 'query', description: 'Symbol (some venues require it)' }] },
  { method: 'GET', path: '/broker-connections', summary: 'Your linked broker accounts (masked)', scope: 'broker_link', group: 'Brokers' },
  { method: 'POST', path: '/broker-connections', summary: 'Link or update a broker account', scope: 'broker_link', group: 'Brokers', body: { providerKey: 'Provider key from the API Hub', apiKey: 'optional', apiSecret: 'optional', accessToken: 'optional', clientCode: 'optional' } },
  { method: 'GET', path: '/webhooks', summary: 'Your webhook endpoints', scope: 'webhooks', group: 'Webhooks' },
  { method: 'POST', path: '/webhooks', summary: 'Create a webhook endpoint (secret returned once)', scope: 'webhooks', group: 'Webhooks', body: { url: 'https endpoint', events: 'array of event names or ["*"]', description: 'optional' } },
  { method: 'DELETE', path: '/webhooks/{id}', summary: 'Delete a webhook endpoint', scope: 'webhooks', group: 'Webhooks', params: [{ name: 'id', in: 'path', required: true, description: 'Endpoint id' }] },
  { method: 'POST', path: '/webhooks/{id}/test', summary: 'Send a signed test.ping to the endpoint', scope: 'webhooks', group: 'Webhooks', params: [{ name: 'id', in: 'path', required: true, description: 'Endpoint id' }] },
  { method: 'GET', path: '/webhooks/{id}/deliveries', summary: 'Delivery log for an endpoint', scope: 'webhooks', group: 'Webhooks', params: [{ name: 'id', in: 'path', required: true, description: 'Endpoint id' }] },
  { method: 'GET', path: '/webhooks/events', summary: 'Event catalog', scope: 'webhooks', group: 'Webhooks' },
  { method: 'POST', path: '/ingest/quotes', summary: 'Push your own quotes (bring-your-own data)', scope: 'ingest', group: 'Ingest', body: { rows: '[{ symbol, bid?, ask?, last?, ts? }]' }, notes: 'Stored in your isolated customer feed, labelled CUSTOMER FEED everywhere it is shown.' },
  { method: 'POST', path: '/ingest/orders', summary: 'Push your own orders / fills', scope: 'ingest', group: 'Ingest', body: { rows: '[{ externalId, symbol, side, qty, price?, status?, ts? }]' } },
  { method: 'POST', path: '/ingest/pnl', summary: 'Push your own P&L / equity points', scope: 'ingest', group: 'Ingest', body: { rows: '[{ account?, equity?, balance?, realized?, unrealized?, ts }]' } },
  { method: 'GET', path: '/ingest/summary', summary: 'What EMIL holds from your feed', scope: 'ingest', group: 'Ingest' },
  { method: 'GET', path: '/stream', summary: 'Server-sent events: EMIL state + quotes for ?symbols= (25 s windows, reconnect with Last-Event-ID)', scope: 'stream', group: 'Streaming', params: [{ name: 'symbols', in: 'query', description: 'Up to 5 symbols' }], notes: 'Pro and Institutional plans.' },
]

export function buildOpenApi(baseUrl: string) {
  const paths: Record<string, any> = {}
  for (const e of ENDPOINTS) {
    const p = e.path.replace(/\{(\w+)\}/g, '{$1}')
    paths[p] = paths[p] ?? {}
    paths[p][e.method.toLowerCase()] = {
      summary: e.summary,
      tags: [e.group],
      description: [e.notes, e.scope === 'public' ? 'No authentication required.' : `Requires scope \`${e.scope}\`.`].filter(Boolean).join(' '),
      security: e.scope === 'public' ? [] : [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
      parameters: (e.params ?? []).map((q) => ({ name: q.name, in: q.in, required: !!q.required || q.in === 'path', description: q.description, schema: { type: 'string' }, ...(q.example ? { example: q.example } : {}) })),
      ...(e.body ? { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: Object.fromEntries(Object.entries(e.body).map(([k, d]) => [k, { description: d }])) } } } } } : {}),
      responses: {
        '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
        '401': { description: 'Missing, invalid, expired or revoked key' },
        '403': { description: 'Scope, IP allow-list or plan restriction' },
        '429': { description: 'Plan quota reached — honour Retry-After' },
      },
    }
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'EMIL Platform API',
      version: API_VERSION,
      description: 'Programmatic access to EMIL — research data, alerts, journal, portfolio, PAPER trading, webhooks and bring-your-own data. Research data is delayed and never an execution trigger; the API never places live orders.',
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    tags: Array.from(new Set(ENDPOINTS.map((e) => e.group))).map((g) => ({ name: g })),
    paths,
  }
}

export function buildPostman(baseUrl: string) {
  const folders = new Map<string, any[]>()
  for (const e of ENDPOINTS) {
    const url = `{{baseUrl}}${e.path.replace(/\{(\w+)\}/g, ':$1')}`
    const item: any = {
      name: `${e.method} ${e.path}`,
      request: {
        method: e.method,
        header: e.scope === 'public' ? [] : [{ key: 'x-api-key', value: '{{apiKey}}' }],
        url: { raw: url, host: ['{{baseUrl}}'], path: e.path.replace(/^\//, '').split('/'), query: (e.params ?? []).filter((p) => p.in === 'query').map((p) => ({ key: p.name, value: p.example ?? '', description: p.description })) },
        description: e.summary,
        ...(e.body ? { body: { mode: 'raw', raw: JSON.stringify(Object.fromEntries(Object.keys(e.body).map((k) => [k, ''])), null, 2), options: { raw: { language: 'json' } } } } : {}),
      },
    }
    folders.set(e.group, [...(folders.get(e.group) ?? []), item])
  }
  return {
    info: { name: 'EMIL Platform API v1', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Generated from the EMIL OpenAPI document.' },
    variable: [{ key: 'baseUrl', value: `${baseUrl}/api/v1` }, { key: 'apiKey', value: 'emil_test_…' }],
    item: Array.from(folders.entries()).map(([name, item]) => ({ name, item })),
  }
}
