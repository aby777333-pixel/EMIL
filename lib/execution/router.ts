// Guarded order router.
//
// Every order EMIL sends to a venue passes through placeGuarded():
//   1. the venue row must hold credentials linked at the TRADING permission tier;
//   2. paper venues (testnet/sandbox rows) are always allowed;
//      live venues additionally need the `live_crypto_execution` flag, EMIL
//      ARMED, and the platform owner;
//   3. a per-order notional cap (paper and live have separate caps);
//   4. the order is journaled in venue_orders before and after the venue call,
//      and an audit-log line is written either way.
// No other code path talks to a venue's order endpoints.

import { prisma } from '@/lib/db'
import { flagEnabled } from '@/lib/flags'
import { decryptRow } from '@/lib/secrets'
import { deribitAdapter } from './deribit'
import { geminiAdapter } from './gemini'
import { deltaAdapter } from './delta'
import type { OrderRequest, VenueAdapter, VenueCreds, VenueInstrument } from './types'

export const EXECUTION_VENUE_KEYS = ['deribit_testnet', 'gemini_sandbox', 'delta_exchange_testnet', 'deribit', 'gemini', 'delta_exchange'] as const
export type ExecutionVenueKey = (typeof EXECUTION_VENUE_KEYS)[number]

export const PAPER_MAX_NOTIONAL_USD = Number(process.env.EMIL_PAPER_MAX_NOTIONAL_USD ?? 25_000)
export const LIVE_MAX_NOTIONAL_USD = Number(process.env.EMIL_LIVE_MAX_NOTIONAL_USD ?? 1_000)

export const isPaperVenue = (key: string) => /_(testnet|sandbox)$/.test(key)
export const isExecutionVenue = (key: string): key is ExecutionVenueKey => (EXECUTION_VENUE_KEYS as readonly string[]).includes(key)

export class ExecError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function buildAdapter(creds: VenueCreds): VenueAdapter {
  const paper = isPaperVenue(creds.key)
  if (creds.key.startsWith('deribit')) return deribitAdapter(creds, paper)
  if (creds.key.startsWith('gemini')) return geminiAdapter(creds, paper)
  if (creds.key.startsWith('delta_exchange')) return deltaAdapter(creds, paper)
  throw new ExecError(400, `No execution adapter for ${creds.key}.`)
}

export type VenueSummary = {
  key: string
  name: string
  vendor: string
  paper: boolean
  connected: boolean
  tier: string | null
  status: string
  eligible: boolean
  reason: string | null
}

// Credentials for a venue: the house row for the owner, the customer's own
// link otherwise. Secrets are decrypted here and nowhere else in this module.
async function credentialRow(userId: string, isAdmin: boolean, providerKey: string) {
  const provider = await prisma.indiaApiProvider.findUnique({ where: { key: providerKey } })
  if (!provider) return { provider: null, creds: null }
  const row = isAdmin ? provider : await prisma.userBrokerConnection.findUnique({ where: { userId_providerKey: { userId, providerKey } } })
  return { provider, creds: row ? decryptRow(row as any) : null }
}

function eligibility(creds: any): { eligible: boolean; reason: string | null } {
  if (!creds?.apiKey || !creds?.apiSecret) return { eligible: false, reason: 'No API key + secret linked yet.' }
  if (creds.permissionTier !== 'trading') return { eligible: false, reason: `Linked at the ${creds.permissionTier ? creds.permissionTier.replace('_', '-') : 'unset'} tier — re-run Connect and choose Trading to enable orders.` }
  return { eligible: true, reason: null }
}

export async function listExecutionVenues(userId: string, isAdmin: boolean): Promise<VenueSummary[]> {
  const rows = await prisma.indiaApiProvider.findMany({ where: { key: { in: [...EXECUTION_VENUE_KEYS] } } })
  const links = isAdmin ? [] : await prisma.userBrokerConnection.findMany({ where: { userId, providerKey: { in: [...EXECUTION_VENUE_KEYS] } } })
  const linkByKey = new Map(links.map((l) => [l.providerKey, l]))
  const out: VenueSummary[] = []
  for (const key of EXECUTION_VENUE_KEYS) {
    const provider = rows.find((r) => r.key === key)
    if (!provider) continue
    const creds: any = isAdmin ? provider : linkByKey.get(key) ?? null
    const e = eligibility(creds)
    out.push({
      key, name: provider.name, vendor: provider.vendor, paper: isPaperVenue(key),
      connected: !!(creds?.apiKey && creds?.apiSecret),
      tier: creds?.permissionTier ?? null,
      status: creds?.status ?? 'not_configured',
      eligible: e.eligible, reason: e.reason,
    })
  }
  return out
}

export async function resolveVenue(userId: string, isAdmin: boolean, providerKey: string) {
  if (!isExecutionVenue(providerKey)) throw new ExecError(400, `${providerKey} is not an execution venue.`)
  const { provider, creds } = await credentialRow(userId, isAdmin, providerKey)
  if (!provider) throw new ExecError(404, 'Venue not found in the API Hub.')
  const e = eligibility(creds)
  if (!e.eligible) throw new ExecError(403, e.reason ?? 'Venue not eligible.')
  const adapter = buildAdapter({ key: providerKey, baseUrl: provider.baseUrl, apiKey: creds!.apiKey, apiSecret: creds!.apiSecret, clientCode: creds!.clientCode })
  return { adapter, provider, paper: adapter.paper }
}

// Read-only access (balances, positions): any linked key + secret qualifies —
// the trading tier is only required to place or cancel orders.
export async function resolveVenueForRead(userId: string, isAdmin: boolean, providerKey: string) {
  if (!isExecutionVenue(providerKey)) throw new ExecError(400, `${providerKey} is not an execution venue.`)
  const { provider, creds } = await credentialRow(userId, isAdmin, providerKey)
  if (!provider) throw new ExecError(404, 'Venue not found in the API Hub.')
  if (!creds?.apiKey || !creds?.apiSecret) throw new ExecError(403, 'No API key + secret linked yet.')
  const adapter = buildAdapter({ key: providerKey, baseUrl: provider.baseUrl, apiKey: creds.apiKey, apiSecret: creds.apiSecret, clientCode: creds.clientCode })
  return { adapter, provider, paper: adapter.paper }
}

const instrumentCache = new Map<string, { at: number; list: VenueInstrument[] }>()
async function cachedInstruments(adapter: VenueAdapter): Promise<VenueInstrument[]> {
  const hit = instrumentCache.get(adapter.key)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.list
  const list = await adapter.instruments()
  instrumentCache.set(adapter.key, { at: Date.now(), list })
  return list
}

// USD notional of an order, in the venue's own quantity semantics.
export function estimateNotionalUsd(venueKey: string, qty: number, refPrice: number | undefined, inst?: VenueInstrument): number | null {
  if (!refPrice || !Number.isFinite(refPrice)) return null
  if (venueKey.startsWith('deribit')) return qty // inverse contracts: amount is already USD
  if (venueKey.startsWith('delta_exchange')) return qty * (inst?.contractSize ?? 0.001) * refPrice
  return qty * refPrice // spot
}

function validate(req: OrderRequest) {
  if (!req.symbol || typeof req.symbol !== 'string') throw new ExecError(400, 'Instrument is required.')
  if (req.side !== 'buy' && req.side !== 'sell') throw new ExecError(400, 'Side must be buy or sell.')
  if (req.type !== 'market' && req.type !== 'limit') throw new ExecError(400, 'Order type must be market or limit.')
  if (!Number.isFinite(req.qty) || req.qty <= 0) throw new ExecError(400, 'Quantity must be a positive number.')
  if (req.type === 'limit' && (!Number.isFinite(req.price ?? NaN) || (req.price as number) <= 0)) throw new ExecError(400, 'Limit orders need a positive price.')
}

export async function placeGuarded(args: { userId: string; isAdmin: boolean; venueKey: string; req: OrderRequest }) {
  const { userId, isAdmin, venueKey, req } = args
  validate(req)
  const { adapter, provider, paper } = await resolveVenue(userId, isAdmin, venueKey)

  if (!paper) {
    if (!(await flagEnabled('live_crypto_execution', false))) throw new ExecError(403, 'Live execution is switched OFF (feature flag live_crypto_execution). Paper venues remain available.')
    if (!isAdmin) throw new ExecError(403, 'Only the platform owner can send live orders today.')
    const state = await prisma.emilState.findFirst()
    if (!state?.armed) throw new ExecError(403, 'EMIL is DISARMED — arm EMIL on the ARM / DISARM page before any live order.')
  }

  const instruments = await cachedInstruments(adapter).catch(() => [] as VenueInstrument[])
  const inst = instruments.find((i) => i.symbol === req.symbol)
  if (instruments.length && !inst) throw new ExecError(400, `${req.symbol} is not in the tradable list for ${adapter.label}.`)
  if (inst?.minQty && req.qty < inst.minQty) throw new ExecError(400, `Minimum quantity on ${req.symbol} is ${inst.minQty} ${inst.qtyUnit}.`)

  const ticker = await adapter.ticker(req.symbol).catch(() => null)
  const ref = req.type === 'limit' ? req.price : (ticker?.mark ?? ticker?.last ?? (req.side === 'buy' ? ticker?.ask : ticker?.bid))
  const notional = estimateNotionalUsd(venueKey, req.qty, ref, inst)
  const cap = paper ? PAPER_MAX_NOTIONAL_USD : LIVE_MAX_NOTIONAL_USD
  if (notional !== null && notional > cap) throw new ExecError(400, `Order notional ≈ $${Math.round(notional).toLocaleString()} exceeds the ${paper ? 'paper' : 'LIVE'} per-order cap of $${cap.toLocaleString()}.`)

  const record = await prisma.venueOrder.create({
    data: {
      userId, providerKey: venueKey, paper, symbol: req.symbol, side: req.side, orderType: req.type,
      qty: req.qty, price: req.type === 'limit' ? req.price : null, notionalUsd: notional, status: 'submitted',
    },
  })
  try {
    const order = await adapter.placeOrder({ ...req, clientId: record.clientOrderId })
    const updated = await prisma.venueOrder.update({
      where: { id: record.id },
      data: {
        venueOrderId: order.id || null, status: order.status, filledQty: order.filledQty, avgFillPrice: order.avgFillPrice ?? null,
        price: order.price ?? record.price, raw: JSON.stringify(order.raw ?? null).slice(0, 4000),
      },
    })
    await prisma.auditLog.create({
      data: {
        userId, actor: 'user', action: paper ? 'PAPER ORDER SENT' : 'LIVE ORDER SENT', category: 'execution',
        detail: `${adapter.label}: ${req.side.toUpperCase()} ${req.qty} ${req.symbol} ${req.type}${req.type === 'limit' ? ` @ ${req.price}` : ''} → ${order.status}${order.filledQty ? ` (filled ${order.filledQty}${order.avgFillPrice ? ` @ ${order.avgFillPrice}` : ''})` : ''}. Venue id ${order.id || 'n/a'}.`,
      },
    })
    return { order, record: updated, provider: provider.name }
  } catch (e: any) {
    const message = e?.message ?? 'Venue rejected the order.'
    await prisma.venueOrder.update({ where: { id: record.id }, data: { status: 'error', message: String(message).slice(0, 500) } })
    await prisma.auditLog.create({
      data: { userId, actor: 'user', action: paper ? 'PAPER ORDER FAILED' : 'LIVE ORDER FAILED', category: 'execution', detail: `${adapter.label}: ${req.side.toUpperCase()} ${req.qty} ${req.symbol} — ${message}` },
    })
    throw new ExecError(502, message)
  }
}

export async function cancelGuarded(args: { userId: string; isAdmin: boolean; venueKey: string; orderId: string; symbol?: string }) {
  const { userId, isAdmin, venueKey, orderId, symbol } = args
  if (!orderId) throw new ExecError(400, 'orderId is required.')
  const { adapter, paper } = await resolveVenue(userId, isAdmin, venueKey)
  try {
    await adapter.cancelOrder(orderId, symbol)
  } catch (e: any) {
    throw new ExecError(502, e?.message ?? 'Cancel failed.')
  }
  await prisma.venueOrder.updateMany({ where: { userId, providerKey: venueKey, venueOrderId: orderId }, data: { status: 'cancelled' } })
  await prisma.auditLog.create({
    data: { userId, actor: 'user', action: paper ? 'PAPER ORDER CANCELLED' : 'LIVE ORDER CANCELLED', category: 'execution', detail: `${adapter.label}: cancelled venue order ${orderId}${symbol ? ` on ${symbol}` : ''}.` },
  })
  return true
}
