// Venue execution layer — shared shapes.
//
// One adapter per exchange environment (live and testnet are separate rows in
// the API Hub, so they are separate adapters with separate credentials). Every
// adapter normalises the venue's own vocabulary into these types so the order
// router, the API and the Paper Trading Desk never branch on venue names.

export type VenueInstrument = {
  symbol: string
  base: string
  quote: string
  kind: 'spot' | 'perpetual' | 'future' | 'option'
  /** Price increment. */
  tickSize?: number
  /** Smallest order quantity in the venue's quantity unit. */
  minQty?: number
  /** Quantity increment. */
  qtyStep?: number
  /** Value of one quantity unit in the base asset (Delta) or in USD (Deribit inverse). */
  contractSize?: number
  /** What the quantity field means on this venue — shown to the trader verbatim. */
  qtyUnit: string
  /** Venue-internal id when orders need it (Delta product_id). */
  venueId?: string | number
}

export type VenueTicker = {
  symbol: string
  bid?: number
  ask?: number
  last?: number
  mark?: number
  ts: number
}

export type OrderRequest = {
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  qty: number
  price?: number
  reduceOnly?: boolean
  /** EMIL's own id, forwarded as the venue label / client order id. */
  clientId?: string
}

export type VenueOrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected'

export type VenueOrder = {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  qty: number
  price?: number
  filledQty: number
  avgFillPrice?: number
  status: VenueOrderStatus
  ts: number
  raw?: unknown
}

export type VenuePosition = {
  symbol: string
  /** Signed: positive long, negative short, in the venue's quantity unit. */
  qty: number
  entryPrice?: number
  markPrice?: number
  unrealizedPnl?: number
}

export type VenueBalance = {
  asset: string
  total: number
  available: number
}

export type VenueCreds = {
  key: string
  baseUrl: string
  apiKey: string
  apiSecret: string
  clientCode?: string | null
}

export interface VenueAdapter {
  key: string
  label: string
  paper: boolean
  instruments(): Promise<VenueInstrument[]>
  ticker(symbol: string): Promise<VenueTicker>
  placeOrder(req: OrderRequest): Promise<VenueOrder>
  cancelOrder(orderId: string, symbol?: string): Promise<boolean>
  openOrders(): Promise<VenueOrder[]>
  positions(): Promise<VenuePosition[]>
  balances(): Promise<VenueBalance[]>
}

export const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

export const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 10000): Promise<Response> => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}
