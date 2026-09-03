// Delta Exchange adapter (India live + India demo/testnet). Private requests
// are signed HMAC-SHA256 over method + timestamp + path + query + body and
// sent in the api-key / timestamp / signature headers. Orders are sized in
// contracts; one contract = contract_value of the underlying (e.g. 0.001 BTC).

import { createHmac } from 'node:crypto'
import { num, timeoutFetch } from './types'
import type { OrderRequest, VenueAdapter, VenueBalance, VenueCreds, VenueInstrument, VenueOrder, VenuePosition, VenueTicker } from './types'

type Product = { id: number; symbol: string; tickSize?: number; contractValue?: number; base: string; quote: string }
const productCache = new Map<string, { at: number; list: Product[] }>()

async function call(creds: VenueCreds, method: 'GET' | 'POST' | 'DELETE', path: string, opts: { query?: string; body?: unknown } = {}): Promise<any> {
  const query = opts.query ?? ''
  const payload = opts.body !== undefined ? JSON.stringify(opts.body) : ''
  const ts = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', creds.apiSecret).update(`${method}${ts}${path}${query}${payload}`).digest('hex')
  const res = await timeoutFetch(`${creds.baseUrl}${path}${query}`, {
    method,
    headers: {
      'api-key': creds.apiKey,
      timestamp: ts,
      signature,
      'User-Agent': 'emil-cockpit/1.0',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload || undefined,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    const code = json?.error?.code ?? `HTTP ${res.status}`
    const ip = json?.error?.context?.client_ip
    throw new Error(`Delta ${path}: ${code}${ip ? ` (client_ip ${ip} — whitelist it on the key)` : ''}`)
  }
  return json.result
}

async function pub(baseUrl: string, path: string): Promise<any> {
  const res = await timeoutFetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json', 'User-Agent': 'emil-cockpit/1.0' } })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) throw new Error(`Delta ${path}: ${json?.error?.code ?? `HTTP ${res.status}`}`)
  return json.result
}

async function products(baseUrl: string): Promise<Product[]> {
  const hit = productCache.get(baseUrl)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.list
  const result = await pub(baseUrl, '/v2/products?contract_types=perpetual_futures&states=live')
  const list: Product[] = (Array.isArray(result) ? result : []).map((p: any) => ({
    id: Number(p.id),
    symbol: String(p.symbol),
    tickSize: num(p.tick_size),
    contractValue: num(p.contract_value),
    base: String(p.underlying_asset?.symbol ?? p.contract_unit_currency ?? ''),
    quote: String(p.quoting_asset?.symbol ?? p.settling_asset?.symbol ?? 'USD'),
  }))
  productCache.set(baseUrl, { at: Date.now(), list })
  return list
}

function mapOrder(o: any, bySymbolId: Map<number, string>): VenueOrder {
  const size = num(o?.size) ?? 0
  const unfilled = num(o?.unfilled_size) ?? 0
  const filled = Math.max(0, size - unfilled)
  let status: VenueOrder['status']
  switch (o?.state) {
    case 'closed': status = unfilled === 0 ? 'filled' : filled > 0 ? 'partially_filled' : 'cancelled'; break
    case 'cancelled': status = filled > 0 ? 'partially_filled' : 'cancelled'; break
    case 'open':
    case 'pending': status = filled > 0 ? 'partially_filled' : 'open'; break
    default: status = 'rejected'
  }
  return {
    id: String(o?.id ?? ''),
    symbol: String(o?.product_symbol ?? bySymbolId.get(Number(o?.product_id)) ?? ''),
    side: o?.side === 'sell' ? 'sell' : 'buy',
    type: o?.order_type === 'market_order' ? 'market' : 'limit',
    qty: size,
    price: num(o?.limit_price),
    filledQty: filled,
    avgFillPrice: num(o?.average_fill_price),
    status,
    ts: o?.created_at ? Date.parse(o.created_at) || Date.now() : Date.now(),
    raw: o,
  }
}

export function deltaAdapter(creds: VenueCreds, paper: boolean): VenueAdapter {
  const idMap = async () => new Map((await products(creds.baseUrl)).map((p) => [p.id, p.symbol] as [number, string]))
  const product = async (symbol: string) => {
    const p = (await products(creds.baseUrl)).find((x) => x.symbol === symbol)
    if (!p) throw new Error(`Delta: unknown perpetual "${symbol}".`)
    return p
  }
  return {
    key: creds.key,
    label: paper ? 'Delta Exchange Demo' : 'Delta Exchange India',
    paper,
    async instruments() {
      const list = await products(creds.baseUrl)
      const majors = list.filter((p) => /^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA|AVAX|LINK|MATIC|LTC)USD$/.test(p.symbol))
      return (majors.length ? majors : list.slice(0, 30)).map((p) => ({
        symbol: p.symbol,
        base: p.base,
        quote: p.quote,
        kind: 'perpetual',
        tickSize: p.tickSize,
        minQty: 1,
        qtyStep: 1,
        contractSize: p.contractValue,
        qtyUnit: `contracts (1 = ${p.contractValue ?? '?'} ${p.base})`,
        venueId: p.id,
      })) as VenueInstrument[]
    },
    async ticker(symbol) {
      const t = await pub(creds.baseUrl, `/v2/tickers/${encodeURIComponent(symbol)}`)
      return { symbol, bid: num(t?.quotes?.best_bid), ask: num(t?.quotes?.best_ask), last: num(t?.close), mark: num(t?.mark_price), ts: Date.now() } as VenueTicker
    },
    async placeOrder(req: OrderRequest) {
      const p = await product(req.symbol)
      const body: Record<string, unknown> = {
        product_id: p.id,
        size: Math.max(1, Math.round(req.qty)),
        side: req.side,
        order_type: req.type === 'market' ? 'market_order' : 'limit_order',
        reduce_only: req.reduceOnly ? 'true' : 'false',
      }
      if (req.type === 'limit') body.limit_price = String(req.price)
      if (req.clientId) body.client_order_id = req.clientId.slice(0, 32)
      const o = await call(creds, 'POST', '/v2/orders', { body })
      return mapOrder(o, await idMap())
    },
    async cancelOrder(orderId, symbol) {
      const p = symbol ? await product(symbol) : null
      await call(creds, 'DELETE', '/v2/orders', { body: { id: Number(orderId), ...(p ? { product_id: p.id } : {}) } })
      return true
    },
    async openOrders() {
      const result = await call(creds, 'GET', '/v2/orders', { query: '?states=open' })
      const map = await idMap()
      return (Array.isArray(result) ? result : []).map((o: any) => mapOrder(o, map))
    },
    async positions() {
      const result = await call(creds, 'GET', '/v2/positions/margined')
      const map = await idMap()
      return (Array.isArray(result) ? result : [])
        .map((p: any) => ({
          symbol: String(p.product_symbol ?? map.get(Number(p.product_id)) ?? ''),
          qty: num(p.size) ?? 0,
          entryPrice: num(p.entry_price),
          markPrice: num(p.mark_price),
          unrealizedPnl: num(p.unrealized_pnl),
        }))
        .filter((p: VenuePosition) => p.qty !== 0)
    },
    async balances() {
      const result = await call(creds, 'GET', '/v2/wallet/balances')
      return (Array.isArray(result) ? result : [])
        .map((b: any) => ({ asset: String(b.asset_symbol ?? b.asset?.symbol ?? '?'), total: num(b.balance) ?? 0, available: num(b.available_balance) ?? 0 }))
        .filter((b: VenueBalance) => b.total > 0 || b.available > 0)
    },
  }
}
