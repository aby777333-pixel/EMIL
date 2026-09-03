import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import QRCode from 'qrcode'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { generateTotpSecret, otpauthUrl, verifyTotp } from '@/lib/totp'

export const dynamic = 'force-dynamic'

// Two-factor authentication (TOTP). The secret is generated server-side,
// stored encrypted, shown once as a QR + text key, and only becomes ACTIVE
// after the user proves their authenticator with a valid code.

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true, totpSecret: true } })
  return NextResponse.json({ totpEnabled: !!u?.totpEnabled, pending: !!u?.totpSecret && !u?.totpEnabled })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, totpEnabled: true, totpSecret: true } })
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (body?.type === 'totp_begin') {
      if (u.totpEnabled) return NextResponse.json({ error: '2FA is already enabled. Disable it first to re-enrol.' }, { status: 409 })
      const secret = generateTotpSecret()
      await prisma.user.update({ where: { id: userId }, data: { totpSecret: encryptSecret(secret), totpEnabled: false } })
      const url = otpauthUrl(secret, u.email)
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 })
      return NextResponse.json({ ok: true, secret, otpauth: url, qr })
    }
    if (body?.type === 'totp_confirm') {
      const secret = decryptSecret(u.totpSecret)
      if (!secret) return NextResponse.json({ error: 'Start enrolment first.' }, { status: 400 })
      if (!verifyTotp(secret, String(body?.code ?? ''))) return NextResponse.json({ error: 'That code is not valid — check the authenticator clock and try again.' }, { status: 400 })
      await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: '2FA ENABLED', category: 'security', detail: 'TOTP two-factor authentication enabled on the account.' } })
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'totp_disable') {
      const secret = decryptSecret(u.totpSecret)
      if (!u.totpEnabled || !secret) return NextResponse.json({ error: '2FA is not enabled.' }, { status: 400 })
      if (!verifyTotp(secret, String(body?.code ?? ''))) return NextResponse.json({ error: 'A valid current code is required to disable 2FA.' }, { status: 400 })
      await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: '2FA DISABLED', category: 'security', detail: 'TOTP two-factor authentication disabled on the account.' } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Security update failed' }, { status: 500 })
  }
}
