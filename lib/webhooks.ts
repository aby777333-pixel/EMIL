// Outbound webhooks (platform round A): EMIL → the customer's endpoint.
// Every delivery is journaled first (webhook_deliveries), signed with the
// endpoint's secret (X-EMIL-Signature: t=<unix>,v1=<hex hmac-sha256 of
// "<t>.<body>">) and retried with backoff. Serverless has no background
// worker, so retries run opportunistically (every emit and every /api/alerts
// poll drains due deliveries) and from GET /api/cron/webhooks for an external
// scheduler. Delivery is best-effort and never blocks the caller.

import { createHmac, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { timeoutFetch } from '@/lib/execution/types'

export const WEBHOOK_EVENTS = {
  'alert.triggered': 'A price alert crossed its threshold',
  'notification.created': 'Any in-app notification (risk, broker, system, admin)',
  'risk.override': 'A lot/exposure override was authorised',
  'paper.order.placed': 'A paper order was accepted by a sandbox venue',
  'paper.order.cancelled': 'A paper order was cancelled',
  'journal.created': 'A journal entry was written',
  'health.changed': 'A data provider or system component changed health state',
  'ingest.received': 'Your own pushed data batch was accepted',
  'org.member.changed': 'An organization member was added, removed or re-roled',
  'signal.published': 'A signal was published to a channel you subscribe to',
  'test.ping': 'Manual test from the developer portal',
} as const
export type WebhookEvent = keyof typeof WEBHOOK_EVENTS

const BACKOFF_SEC = [60, 300, 1800, 7200, 21600]
const MAX_ATTEMPTS = BACKOFF_SEC.length + 1
const FAILING_AFTER = 5

export function newWebhookSecret() {
  return `whsec_${randomBytes(24).toString('hex')}`
}

export function signPayload(secret: string, ts: number, body: string) {
  return createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
}

function subscribed(events: string, event: string) {
  const list = events.split(',').map((s) => s.trim()).filter(Boolean)
  return list.includes('*') || list.includes(event)
}

// Create pending deliveries for every subscribed endpoint, then try them now.
export async function emitEvent(userId: string | null, event: WebhookEvent, data: Record<string, unknown>) {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({ where: { ...(userId ? { userId } : {}), status: { in: ['active', 'failing'] } } })
    const targets = endpoints.filter((e) => subscribed(e.events, event))
    if (targets.length === 0) return
    const payload = JSON.stringify({ id: `evt_${randomBytes(8).toString('hex')}`, event, createdAt: new Date().toISOString(), data })
    await prisma.webhookDelivery.createMany({ data: targets.map((t) => ({ endpointId: t.id, userId: t.userId, event, payload })) })
    await dispatchDue(targets.length)
  } catch (e) {
    console.error('webhook emit failed', e)
  }
}

// Deliver up to `limit` due deliveries (oldest first). Safe to call often.
export async function dispatchDue(limit = 10): Promise<{ attempted: number; delivered: number }> {
  let attempted = 0
  let delivered = 0
  try {
    const due = await prisma.webhookDelivery.findMany({
      where: { status: { in: ['pending', 'failed'] }, nextAttemptAt: { lte: new Date() } },
      orderBy: { nextAttemptAt: 'asc' },
      take: Math.max(1, Math.min(50, limit)),
      include: { endpoint: true },
    })
    for (const d of due) {
      attempted += 1
      if (await deliverOne(d)) delivered += 1
    }
  } catch (e) {
    console.error('webhook dispatch failed', e)
  }
  return { attempted, delivered }
}

async function deliverOne(d: { id: string; attempt: number; payload: string; event: string; endpoint: { id: string; url: string; secret: string; failCount: number; status: string } }): Promise<boolean> {
  const attempt = d.attempt + 1
  const ts = Math.floor(Date.now() / 1000)
  const secret = decryptSecret(d.endpoint.secret) ?? ''
  let code: number | null = null
  let text = ''
  let ok = false
  try {
    const res = await timeoutFetch(d.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EMIL-Webhooks/1.0',
        'X-EMIL-Event': d.event,
        'X-EMIL-Delivery': d.id,
        'X-EMIL-Timestamp': String(ts),
        'X-EMIL-Signature': `t=${ts},v1=${signPayload(secret, ts, d.payload)}`,
      },
      body: d.payload,
    }, 8000)
    code = res.status
    text = (await res.text().catch(() => '')).slice(0, 500)
    ok = res.ok
  } catch (e: any) {
    text = String(e?.message ?? 'network error').slice(0, 500)
  }
  const dead = !ok && attempt >= MAX_ATTEMPTS
  const next = ok || dead ? new Date() : new Date(Date.now() + (BACKOFF_SEC[attempt - 1] ?? 21600) * 1000)
  await prisma.webhookDelivery.update({
    where: { id: d.id },
    data: { attempt, status: ok ? 'delivered' : dead ? 'dead' : 'failed', responseCode: code, responseBody: text, nextAttemptAt: next, deliveredAt: ok ? new Date() : null },
  })
  const failCount = ok ? 0 : d.endpoint.failCount + 1
  await prisma.webhookEndpoint.update({
    where: { id: d.endpoint.id },
    data: { failCount, lastDeliveryAt: new Date(), lastStatusCode: code, status: d.endpoint.status === 'paused' ? 'paused' : failCount >= FAILING_AFTER ? 'failing' : 'active' },
  }).catch(() => {})
  return ok
}

export async function createEndpoint(userId: string, url: string, events: string[], description?: string) {
  const secret = newWebhookSecret()
  const ep = await prisma.webhookEndpoint.create({
    data: { userId, url, secret: encryptSecret(secret) as string, events: events.length ? events.join(',') : '*', description: description?.slice(0, 200) ?? null },
  })
  return { endpoint: ep, secret }
}

export function validateWebhookUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && /^(localhost|127\.)/.test(u.hostname))) return 'Webhook URLs must use https:// (http:// is allowed only for localhost).'
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(u.hostname)) return 'Private-network addresses are not allowed.'
    return null
  } catch {
    return 'Enter a valid absolute URL.'
  }
}
