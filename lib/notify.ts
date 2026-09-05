// Notification delivery beyond the in-app bell (spec §37/§65): Telegram and
// email. Both are opt-in per user and need a server-side integration key
// (TELEGRAM_BOT_TOKEN / RESEND_API_KEY). Delivery is best-effort and never
// blocks the caller; the in-app notification is always written first.

import { prisma } from '@/lib/db'
import { timeoutFetch } from '@/lib/execution/types'
import { emitEvent } from '@/lib/webhooks'
import { decryptSecret } from '@/lib/secrets'

export const telegramConfigured = () => !!process.env.TELEGRAM_BOT_TOKEN
export const emailConfigured = () => !!process.env.RESEND_API_KEY

const tg = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`

export async function telegramSend(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!telegramConfigured()) return { ok: false, error: 'Telegram is not configured on the server (TELEGRAM_BOT_TOKEN).' }
  try {
    const res = await timeoutFetch(tg('sendMessage'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    }, 8000)
    const j = await res.json().catch(() => null)
    return j?.ok ? { ok: true } : { ok: false, error: j?.description ?? `Telegram responded ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network error' }
  }
}

export async function telegramBotName(): Promise<string | null> {
  if (!telegramConfigured()) return null
  try {
    const res = await timeoutFetch(tg('getMe'), {}, 6000)
    const j = await res.json().catch(() => null)
    return j?.result?.username ?? null
  } catch {
    return null
  }
}

// Linking without a webhook: the user sends the one-time code to the bot and
// EMIL scans recent bot updates for it (Telegram keeps ~24h of updates while
// no webhook is registered).
export async function telegramFindChatByCode(code: string): Promise<string | null> {
  if (!telegramConfigured()) return null
  try {
    const res = await timeoutFetch(tg('getUpdates?limit=100&allowed_updates=%5B%22message%22%5D'), {}, 8000)
    const j = await res.json().catch(() => null)
    const updates: any[] = Array.isArray(j?.result) ? j.result : []
    for (let i = updates.length - 1; i >= 0; i--) {
      const m = updates[i]?.message
      const text = String(m?.text ?? '')
      if (text.includes(code) && m?.chat?.id) return String(m.chat.id)
    }
    return null
  } catch {
    return null
  }
}

export async function emailSend(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: 'Email is not configured on the server (RESEND_API_KEY).' }
  try {
    const res = await timeoutFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'EMIL <onboarding@resend.dev>', to, subject, html }),
    }, 10000)
    const j = await res.json().catch(() => null)
    return res.ok ? { ok: true } : { ok: false, error: j?.message ?? `Resend responded ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network error' }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Format one notification for a chat platform's incoming webhook.
export function chatPayload(kind: string, n: { title: string; body?: string | null }, link: string) {
  const text = `*EMIL — ${n.title}*\n${n.body ?? ''}${link ? `\n${link}` : ''}`
  if (kind === 'slack') return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] }
  if (kind === 'discord') return { content: text.replace(/\*/g, '**'), username: 'EMIL' }
  if (kind === 'teams') return { '@type': 'MessageCard', '@context': 'https://schema.org/extensions', summary: n.title, themeColor: '0891B2', title: `EMIL — ${n.title}`, text: `${n.body ?? ''}${link ? `\n\n[Open in EMIL](${link})` : ''}` }
  return { source: 'emil', title: n.title, body: n.body ?? null, href: link || null, at: new Date().toISOString() }
}

export async function sendToChannel(ch: { id: string; kind: string; webhookUrl: string; failCount: number }, n: { title: string; body?: string | null }, link: string) {
  const url = decryptSecret(ch.webhookUrl) ?? ''
  let ok = false
  let err = ''
  try {
    const res = await timeoutFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chatPayload(ch.kind, n, link)) }, 8000)
    ok = res.ok
    if (!ok) err = `responded ${res.status}`
  } catch (e: any) {
    err = e?.message ?? 'network error'
  }
  const failCount = ok ? 0 : ch.failCount + 1
  await prisma.notificationChannel.update({ where: { id: ch.id }, data: { lastSentAt: new Date(), failCount, lastError: ok ? null : err.slice(0, 200), status: failCount >= 5 ? 'failing' : 'active' } }).catch(() => {})
  return { ok, error: err }
}

async function chatChannelsSend(userId: string, n: { title: string; body?: string | null }, link: string) {
  const channels = await prisma.notificationChannel.findMany({ where: { userId, status: { in: ['active', 'failing'] } } }).catch(() => [])
  await Promise.allSettled(channels.map((ch) => sendToChannel(ch, n, link)))
}

// Fan a notification out to every channel the user opted into. Fire-and-forget.
export async function deliverNotification(userId: string, n: { title: string; body?: string | null; href?: string | null }) {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, telegramChatId: true, notifyTelegram: true, notifyEmail: true } })
    if (!u) return
    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    const link = n.href ? `${base}${n.href}` : base
    const jobs: Promise<unknown>[] = []
    if (u.notifyTelegram && u.telegramChatId && telegramConfigured()) {
      jobs.push(telegramSend(u.telegramChatId, `<b>EMIL — ${esc(n.title)}</b>\n${esc(n.body ?? '')}${link ? `\n${link}` : ''}`))
    }
    if (u.notifyEmail && emailConfigured()) {
      jobs.push(emailSend(u.email, `EMIL — ${n.title}`, `<p><strong>${esc(n.title)}</strong></p><p>${esc(n.body ?? '')}</p>${link ? `<p><a href="${link}">Open in EMIL</a></p>` : ''}<p style="color:#888;font-size:12px">Research signal, not an execution trigger. Manage delivery in EMIL → Settings.</p>`))
    }
    // Slack / Discord / Teams / generic chat channels (round E).
    jobs.push(chatChannelsSend(userId, n, link))
    await Promise.allSettled(jobs)
    // Outbound webhooks (platform round A) — every notification is also an event.
    emitEvent(userId, 'notification.created', { title: n.title, body: n.body ?? null, href: link || null }).catch(() => {})
  } catch (e) {
    console.error('notification delivery failed', e)
  }
}
