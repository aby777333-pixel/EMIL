// EMIL Platform API — minimal JavaScript SDK (Node 18+ / browsers with fetch).
// Usage:
//   import { EmilClient } from 'https://<your-emil-host>/sdk/emil.js'
//   const emil = new EmilClient({ apiKey: 'emil_test_…', baseUrl: 'https://<your-emil-host>' })
//   const { state } = await emil.state()
// Every method returns the parsed JSON body; non-2xx responses throw EmilError
// with .status and .retryAfterSec (honour it on 429).
export class EmilError extends Error {
  constructor(message, status, retryAfterSec) { super(message); this.name = 'EmilError'; this.status = status; this.retryAfterSec = retryAfterSec }
}
export class EmilClient {
  constructor({ apiKey, baseUrl = '', fetchImpl } = {}) {
    if (!apiKey) throw new Error('apiKey is required')
    this.apiKey = apiKey
    this.baseUrl = String(baseUrl).replace(/\/$/, '') + '/api/v1'
    this.fetch = fetchImpl || globalThis.fetch
  }
  async request(method, path, { query, body } = {}) {
    const url = new URL(this.baseUrl + path)
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    const res = await this.fetch(url, { method, headers: { 'x-api-key': this.apiKey, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const text = await res.text()
    let json
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) throw new EmilError(json.error || json.message || ('HTTP ' + res.status), res.status, json.retryAfterSec ?? Number(res.headers.get('retry-after') || 0))
    return json
  }
  get(path, query) { return this.request('GET', path, { query }) }
  post(path, body) { return this.request('POST', path, { body }) }
  del(path, query) { return this.request('DELETE', path, { query }) }
  // Account
  ping() { return this.get('/ping') }
  me() { return this.get('/me') }
  usage() { return this.get('/usage') }
  // EMIL
  state() { return this.get('/state') }
  strategies() { return this.get('/strategies') }
  // Market data
  board() { return this.get('/market/board') }
  quotes(symbols) { return this.get('/market/quotes', { symbols: Array.isArray(symbols) ? symbols.join(',') : symbols }) }
  candles(symbol, interval = '1day', outputsize = 90) { return this.get('/market/candles', { symbol, interval, outputsize }) }
  correlation(a, b, days = 365) { return this.get('/market/correlation', { a, b, days }) }
  news(category = 'markets', score = true) { return this.get('/news', { category, score: score ? 1 : 0 }) }
  calendar() { return this.get('/calendar') }
  centralBanks() { return this.get('/calendar/central-banks') }
  report(symbol) { return this.get('/research/report', { symbol }) }
  brief() { return this.get('/research/brief') }
  // Alerts & watchlist
  watchlist() { return this.get('/watchlist') }
  track(symbol) { return this.post('/watchlist', { symbol }) }
  untrack(symbol) { return this.del('/watchlist/' + encodeURIComponent(symbol)) }
  alerts() { return this.get('/alerts') }
  createAlert(symbol, condition, threshold, note) { return this.post('/alerts', { symbol, condition, threshold, note }) }
  deleteAlert(id) { return this.del('/alerts/' + encodeURIComponent(id)) }
  notifications() { return this.get('/notifications') }
  // Journal & portfolio
  journal() { return this.get('/journal') }
  journalWrite(entry) { return this.post('/journal', entry) }
  portfolio() { return this.get('/portfolio') }
  // Paper trading (never live)
  paperVenues() { return this.get('/paper/venues') }
  paperOrders(venue) { return this.get('/paper/orders', { venue }) }
  paperPlace(order) { return this.post('/paper/orders', order) }
  paperCancel(id, venue, symbol) { return this.del('/paper/orders/' + encodeURIComponent(id), { venue, symbol }) }
  // Webhooks
  webhooks() { return this.get('/webhooks') }
  createWebhook(url, events = ['*'], description) { return this.post('/webhooks', { url, events, description }) }
  deleteWebhook(id) { return this.del('/webhooks/' + encodeURIComponent(id)) }
  testWebhook(id) { return this.post('/webhooks/' + encodeURIComponent(id) + '/test') }
  // Bring-your-own data
  ingestQuotes(rows) { return this.post('/ingest/quotes', { rows }) }
  ingestOrders(rows) { return this.post('/ingest/orders', { rows }) }
  ingestPnl(rows) { return this.post('/ingest/pnl', { rows }) }
  ingestSummary() { return this.get('/ingest/summary') }
  // Streaming: browsers' EventSource cannot set headers, so the stream accepts ?key= as well.
  streamUrl(symbols = []) { return this.baseUrl + '/stream?symbols=' + encodeURIComponent(symbols.join(',')) + '&key=' + encodeURIComponent(this.apiKey) }
}
// Verify an incoming EMIL webhook (Node): await verifyWebhook(rawBody, req.headers['x-emil-signature'], secret)
export async function verifyWebhook(rawBody, signatureHeader, secret, toleranceSec = 300) {
  const parts = Object.fromEntries(String(signatureHeader || '').split(',').map((p) => p.split('=')))
  const t = Number(parts.t)
  const v1 = parts.v1
  if (!t || !v1 || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const expected = createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex')
  return expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}
