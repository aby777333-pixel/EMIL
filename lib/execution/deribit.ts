// Deribit API v2 adapter (live + testnet). JSON-RPC over REST; private
// methods carry an OAuth2 bearer token obtained with the client_credentials
// grant. Quantity ("amount") on Deribit inverse perpetuals/futures is in USD
// and must be a multiple of the contract size (10 USD for BTC-PERPETUAL).

import { num, timeoutFetch } from './types'
import type { OrderRequest, VenueAdapter, VenueBalance, VenueCreds, VenueInstrument, VenueOrder, VenuePosition, VenueTicker } from './types'

const CURRENCIES = ['BTC', 'ETH']
const tokenCache = new Map<string, { token: string; exp: number }>()

async function rpc(baseUrl: string, method: string, params: Record<string, unknown> = {}, token?: string): Promise<any> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.set(k, String(v))
  const res = await timeoutFetch(`${baseUrl}/${method}${qs.size ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const body = await res.json().catch(() => null)
  if (body?.error) {
    const reason = body.error?.data?.reason ? ` (${body.error.data.reason})` : ''
    throw new Error(`Deribit ${method}: ${body.error.message}${reason}`)
  }
  if (!res.ok) throw new Error(`Deribit ${method}: HTTP ${res.status}`)
  return body?.result
}

async function accessToken(creds: VenueCreds): Promise<string> {
  const cacheKey = `${creds.baseUrl}|${creds.apiKey}`
  const hit = tokenCache.get(cacheKey)
  if (hit && hit.exp - Date.now() > 30_000) return hit.token
  const result = await rpc(creds.baseUrl, 'public/auth', {
    grant_type: 'client_credentials', client_id: creds.apiKey, client_secret: creds.apiSecret,
  })
  if (!result?.access_token) throw new Error('Deribit public/auth returned no access token.')
  tokenCache.set(cacheKey, { token: result.access_token, exp: Date.now() + (Number(result.expires_in ?? 900) * 1000) })
  return result.access_token
}

function mapOrder(o: any): VenueOrder {
  const filled = num(o?.filled_amount) ?? 0
  let status: VenueOrder['status'] = 'open'
  switch (o?.order_state) {
    case 'filled': status = 'filled'; break
    case 'cancelled': status = filled > 0 ? 'partially_filled' : 'cancelled'; break
    case 'rejected': status = 'rejected'; break
    default: status = filled > 0 ? 'partially_filled' : 'open'
  }
  return {
    id: String(o?.order_id ?? ''),
    symbol: String(o?.instrument_name ?? ''),
    side: o?.direction === 'sell' ? 'sell' : 'buy',
    type: o?.order_type === 'market' ? 'market' : 'limit',
    qty: num(o?.amount) ?? 0,
    price: typeof o?.price === 'number' ? o.price : undefined,
    filledQty: filled,
    avgFillPrice: num(o?.average_price),
    status,
    ts: num(o?.creation_timestamp) ?? Date.now(),
    raw: o,
  }
}

export function deribitAdapter(creds: VenueCreds, paper: boolean): VenueAdapter {
  const priv = async (method: string, params: Record<string, unknown> = {}) => rpc(creds.baseUrl, method, params, await accessToken(creds))
  return {
    key: creds.key,
    label: paper ? 'Deribit Testnet' : 'Deribit',
    paper,
    async instruments() {
      const lists = await Promise.all(CURRENCIES.map((currency) => rpc(creds.baseUrl, 'public/get_instruments', { currency, kind: 'future', expired: false }).catch(() => [])))
      const rows: VenueInstrument[] = []
      for (const list of lists) {
        for (const i of Array.isArray(list) ? list : []) {
          rows.push({
            symbol: i.instrument_name,
            base: i.base_currency,
            quote: i.quote_currency ?? 'USD',
            kind: i.settlement_period === 'perpetual' ? 'perpetual' : 'future',
            tickSize: num(i.tick_size),
            minQty: num(i.min_trade_amount),
            qtyStep: num(i.contract_size),
            contractSize: num(i.contract_size),
            qtyUnit: `USD (multiples of ${i.contract_size})`,
          })
        }
      }
      rows.sort((a, b) => (a.kind === b.kind ? a.symbol.localeCompare(b.symbol) : a.kind === 'perpetual' ? -1 : 1))
      return rows
    },
    async ticker(symbol) {
      const t = await rpc(creds.baseUrl, 'public/ticker', { instrument_name: symbol })
      return { symbol, bid: num(t?.best_bid_price), ask: num(t?.best_ask_price), last: num(t?.last_price), mark: num(t?.mark_price), ts: num(t?.timestamp) ?? Date.now() } as VenueTicker
    },
    async placeOrder(req: OrderRequest) {
      const result = await priv(req.side === 'buy' ? 'private/buy' : 'private/sell', {
        instrument_name: req.symbol,
        amount: req.qty,
        type: req.type,
        price: req.type === 'limit' ? req.price : undefined,
        reduce_only: req.reduceOnly ? true : undefined,
        label: req.clientId?.slice(0, 64),
      })
      if (!result?.order) throw new Error('Deribit returned no order object.')
      return mapOrder(result.order)
    },
    async cancelOrder(orderId) {
      await priv('private/cancel', { order_id: orderId })
      return true
    },
    async openOrders() {
      const lists = await Promise.all(CURRENCIES.map((currency) => priv('private/get_open_orders_by_currency', { currency }).catch(() => [])))
      return lists.flat().filter(Boolean).map(mapOrder)
    },
    async positions() {
      const lists = await Promise.all(CURRENCIES.map((currency) => priv('private/get_positions', { currency }).catch(() => [])))
      const out: VenuePosition[] = []
      for (const p of lists.flat()) {
        const size = num(p?.size) ?? 0
        if (!size) continue
        out.push({ symbol: p.instrument_name, qty: size, entryPrice: num(p.average_price), markPrice: num(p.mark_price), unrealizedPnl: num(p.floating_profit_loss) })
      }
      return out
    },
    async balances() {
      const result = await priv('private/get_account_summaries', {})
      const summaries: any[] = Array.isArray(result?.summaries) ? result.summaries : []
      return summaries
        .map((s) => ({ asset: String(s.currency), total: num(s.equity) ?? 0, available: num(s.available_funds) ?? 0 }))
        .filter((b) => b.asset) as VenueBalance[]
    },
  }
}
