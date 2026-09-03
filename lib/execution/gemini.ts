// Gemini REST adapter (live + sandbox). Private calls are POSTs whose JSON
// payload rides base64 in X-GEMINI-PAYLOAD with an HMAC-SHA384 signature.
// Gemini is spot-only and has no native market order: "market" here is an
// immediate-or-cancel limit priced 2% through the touch, which fills at the
// book like a market order but can never run away.

import { createHmac } from 'node:crypto'
import { num, timeoutFetch } from './types'
import type { OrderRequest, VenueAdapter, VenueBalance, VenueCreds, VenueInstrument, VenueOrder, VenuePosition, VenueTicker } from './types'

// A curated starter list — Gemini lists hundreds of pairs; the desk needs the
// liquid majors, not the long tail.
const SYMBOLS = ['btcusd', 'ethusd', 'solusd', 'ltcusd', 'linkusd', 'dogeusd', 'avaxusd', 'maticusd']
const detailCache = new Map<string, { at: number; d: any }>()

async function pub(baseUrl: string, path: string): Promise<any> {
  const res = await timeoutFetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Gemini ${path}: ${body?.message ?? body?.reason ?? `HTTP ${res.status}`}`)
  return body
}

// rawJson lets a caller hand-build the payload: Gemini order ids exceed
// Number.MAX_SAFE_INTEGER, so order_id must be emitted as a numeric literal
// straight from its string form, never through Number().
async function priv(creds: VenueCreds, request: string, params: Record<string, unknown> = {}, rawJson?: string): Promise<any> {
  const payload = Buffer.from(rawJson ?? JSON.stringify({ request, nonce: Date.now(), ...params })).toString('base64')
  const signature = createHmac('sha384', creds.apiSecret).update(payload).digest('hex')
  const res = await timeoutFetch(`${creds.baseUrl}${request}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': '0',
      'X-GEMINI-APIKEY': creds.apiKey,
      'X-GEMINI-PAYLOAD': payload,
      'X-GEMINI-SIGNATURE': signature,
      'Cache-Control': 'no-cache',
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Gemini ${request}: ${body?.message ?? body?.reason ?? `HTTP ${res.status}`}`)
  return body
}

async function details(baseUrl: string, symbol: string): Promise<any> {
  const k = `${baseUrl}|${symbol}`
  const hit = detailCache.get(k)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.d
  const d = await pub(baseUrl, `/v1/symbols/details/${symbol}`)
  detailCache.set(k, { at: Date.now(), d })
  return d
}

const decimalsOf = (step: number) => {
  const s = String(step)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.includes('.') ? s.split('.')[1].length : 0
}
const roundTo = (v: number, step: number) => (step > 0 ? Number((Math.round(v / step) * step).toFixed(decimalsOf(step))) : v)

function mapOrder(o: any): VenueOrder {
  const executed = num(o?.executed_amount) ?? 0
  const remaining = num(o?.remaining_amount) ?? 0
  let status: VenueOrder['status']
  if (o?.is_cancelled) status = executed > 0 ? 'partially_filled' : 'cancelled'
  else if (o?.is_live) status = executed > 0 ? 'partially_filled' : 'open'
  else if (executed > 0 && remaining === 0) status = 'filled'
  else if (executed > 0) status = 'partially_filled'
  else status = 'rejected'
  return {
    id: String(o?.order_id ?? ''),
    symbol: String(o?.symbol ?? ''),
    side: o?.side === 'sell' ? 'sell' : 'buy',
    type: 'limit',
    qty: num(o?.original_amount) ?? 0,
    price: num(o?.price),
    filledQty: executed,
    avgFillPrice: num(o?.avg_execution_price),
    status,
    ts: num(o?.timestampms) ?? Date.now(),
    raw: o,
  }
}

export function geminiAdapter(creds: VenueCreds, paper: boolean): VenueAdapter {
  return {
    key: creds.key,
    label: paper ? 'Gemini Sandbox' : 'Gemini',
    paper,
    async instruments() {
      const rows = await Promise.all(SYMBOLS.map(async (s) => {
        try {
          const d = await details(creds.baseUrl, s)
          if (d?.status && d.status !== 'open') return null
          return {
            symbol: s,
            base: String(d.base_currency ?? s.slice(0, -3).toUpperCase()),
            quote: String(d.quote_currency ?? 'USD'),
            kind: 'spot',
            tickSize: num(d.quote_increment),
            minQty: num(d.min_order_size),
            qtyStep: num(d.tick_size),
            qtyUnit: String(d.base_currency ?? 'base units'),
          } as VenueInstrument
        } catch {
          return null
        }
      }))
      return rows.filter(Boolean) as VenueInstrument[]
    },
    async ticker(symbol) {
      const t = await pub(creds.baseUrl, `/v1/pubticker/${symbol}`)
      return { symbol, bid: num(t?.bid), ask: num(t?.ask), last: num(t?.last), ts: num(t?.volume?.timestamp) ?? Date.now() } as VenueTicker
    },
    async placeOrder(req: OrderRequest) {
      const d = await details(creds.baseUrl, req.symbol)
      const qtyStep = num(d?.tick_size) ?? 0.00001
      const priceStep = num(d?.quote_increment) ?? 0.01
      const amount = roundTo(req.qty, qtyStep)
      let price = req.price ?? 0
      const options: string[] = []
      if (req.type === 'market') {
        // Walk the live book to the depth that covers the quantity and price
        // 1% beyond that level — a true "sweep to fill" that also survives
        // stale or crossed sandbox books. Falls back to the ticker touch.
        const book = await pub(creds.baseUrl, `/v1/book/${req.symbol}?limit_bids=50&limit_asks=50`).catch(() => null)
        const toLevels = (side: any[]) => (side ?? [])
          .map((l: any) => ({ price: num(l?.price) ?? 0, amount: num(l?.amount) ?? 0 }))
          .filter((l: { price: number; amount: number }) => l.price > 0 && l.amount > 0)
        const asks = toLevels(book?.asks)
        const bids = toLevels(book?.bids)
        const bestBid = bids.length ? Math.max(...bids.map((l) => l.price)) : 0
        const bestAsk = asks.length ? Math.min(...asks.map((l) => l.price)) : Infinity
        // A real ask can never sit below the best bid (nor a bid above the best
        // ask) — such levels are stale/crossed sandbox artefacts and never fill,
        // so they are skipped. On a sane book this filter removes nothing.
        const levels = req.side === 'buy' ? asks.filter((l) => l.price >= bestBid) : bids.filter((l) => l.price <= bestAsk)
        let ref: number | undefined
        let cum = 0
        for (const l of levels) {
          cum += l.amount
          ref = l.price
          if (cum >= amount) break
        }
        if (!ref) {
          const t = await pub(creds.baseUrl, `/v1/pubticker/${req.symbol}`)
          ref = req.side === 'buy' ? num(t?.ask) : num(t?.bid)
        }
        if (!ref) throw new Error('Gemini book and ticker unavailable — cannot price a market order.')
        price = req.side === 'buy' ? ref * 1.01 : ref * 0.99
        options.push('immediate-or-cancel')
      }
      price = roundTo(price, priceStep)
      const o = await priv(creds, '/v1/order/new', {
        symbol: req.symbol,
        amount: String(amount),
        price: String(price),
        side: req.side,
        type: 'exchange limit',
        options,
        client_order_id: req.clientId?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100),
      })
      const mapped = mapOrder(o)
      mapped.type = req.type
      return mapped
    },
    async cancelOrder(orderId) {
      if (!/^\d+$/.test(orderId)) throw new Error('Gemini order id must be numeric.')
      await priv(creds, '/v1/order/cancel', {}, `{"request":"/v1/order/cancel","nonce":${Date.now()},"order_id":${orderId}}`)
      return true
    },
    async openOrders() {
      const list = await priv(creds, '/v1/orders')
      return (Array.isArray(list) ? list : []).map(mapOrder)
    },
    async positions() {
      // Spot venue — holdings show under balances; no leveraged positions.
      return [] as VenuePosition[]
    },
    async balances() {
      const list = await priv(creds, '/v1/balances')
      return (Array.isArray(list) ? list : [])
        .map((b: any) => ({ asset: String(b.currency), total: num(b.amount) ?? 0, available: num(b.available) ?? 0 }))
        .filter((b: VenueBalance) => b.total > 0 || b.available > 0)
    },
  }
}
