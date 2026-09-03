import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'node:crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { emailConfigured, emailSend, telegramBotName, telegramConfigured, telegramFindChatByCode, telegramSend } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Alert delivery preferences: Telegram (link by one-time code) + email.

const codeKey = (userId: string) => `tg_link_${userId}`

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const [u, botName, pending] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, telegramChatId: true, notifyTelegram: true, notifyEmail: true } }),
      telegramBotName(),
      prisma.cacheEntry.findUnique({ where: { key: codeKey(userId) } }).catch(() => null),
    ])
    return NextResponse.json({
      telegramConfigured: telegramConfigured(), emailConfigured: emailConfigured(), botName,
      telegramLinked: !!u?.telegramChatId, notifyTelegram: !!u?.notifyTelegram, notifyEmail: !!u?.notifyEmail, email: u?.email ?? null,
      pendingCode: pending && Date.now() - pending.fetchedAt.getTime() < 30 * 60_000 ? pending.payload : null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load delivery settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const audit = (action: string, detail: string) => prisma.auditLog.create({ data: { userId, actor: 'user', action, category: 'alerts', detail } }).catch(() => {})

    if (body?.type === 'telegram_code') {
      if (!telegramConfigured()) return NextResponse.json({ error: 'Telegram is not configured on the server (TELEGRAM_BOT_TOKEN).' }, { status: 503 })
      const code = `EMIL-${randomBytes(3).toString('hex').toUpperCase()}`
      await prisma.cacheEntry.upsert({ where: { key: codeKey(userId) }, update: { payload: code, fetchedAt: new Date() }, create: { key: codeKey(userId), payload: code } })
      return NextResponse.json({ ok: true, code, botName: await telegramBotName() })
    }
    if (body?.type === 'telegram_verify') {
      const pending = await prisma.cacheEntry.findUnique({ where: { key: codeKey(userId) } })
      if (!pending || Date.now() - pending.fetchedAt.getTime() > 30 * 60_000) return NextResponse.json({ error: 'No active link code — generate a new one.' }, { status: 400 })
      const chatId = await telegramFindChatByCode(pending.payload)
      if (!chatId) return NextResponse.json({ error: `Code not seen yet. Send "${pending.payload}" to the bot, then press Verify again.` }, { status: 404 })
      await prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId, notifyTelegram: true } })
      await prisma.cacheEntry.delete({ where: { key: codeKey(userId) } }).catch(() => {})
      await telegramSend(chatId, '<b>EMIL linked.</b> Price alerts and notifications will arrive here. Manage delivery in EMIL → Settings.')
      await audit('TELEGRAM LINKED', 'Telegram chat linked for alert delivery.')
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'telegram_unlink') {
      await prisma.user.update({ where: { id: userId }, data: { telegramChatId: null, notifyTelegram: false } })
      await audit('TELEGRAM UNLINKED', 'Telegram alert delivery removed.')
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'telegram_test') {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } })
      if (!u?.telegramChatId) return NextResponse.json({ error: 'Telegram is not linked yet.' }, { status: 400 })
      const r = await telegramSend(u.telegramChatId, '<b>EMIL test</b> — alert delivery is working.')
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 })
    }
    if (body?.type === 'set_prefs') {
      const data: any = {}
      if (typeof body.notifyTelegram === 'boolean') data.notifyTelegram = body.notifyTelegram
      if (typeof body.notifyEmail === 'boolean') data.notifyEmail = body.notifyEmail
      const u = await prisma.user.update({ where: { id: userId }, data, select: { notifyTelegram: true, notifyEmail: true } })
      await audit('ALERT DELIVERY PREFS', `Telegram ${u.notifyTelegram ? 'on' : 'off'}, email ${u.notifyEmail ? 'on' : 'off'}.`)
      return NextResponse.json({ ok: true, ...u })
    }
    if (body?.type === 'email_test') {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      const r = await emailSend(u!.email, 'EMIL test — alert delivery', '<p><strong>EMIL test</strong> — email alert delivery is working.</p>')
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Update failed' }, { status: 500 })
  }
}
