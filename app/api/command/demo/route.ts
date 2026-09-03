import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Command Center → Demo Environment (spec §50–51). A dedicated demo TRADER
// login (never the admin) whose password the admin can rotate and whose
// simulated portfolio the admin can reset to a clean baseline. Paper ≠ live
// ≠ demo: this account is wired to nothing real.

const BASELINE = {
  currency: 'USD',
  balance: 10000, equity: 10000, marginUsed: 0, freeMargin: 10000,
  protectedCapital: 8000, profitCapital: 0, workingCapital: 2000,
  highWaterMark: 10000, profitFloor: 9000, floatingPL: 0,
  dailyPL: 0, weeklyPL: 0, monthlyPL: 0, profitCapitalMode: false,
}
const DEMO_ACCOUNT_NUMBER = 'DEMO-000001'

function randomPassword(len = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#$%&*'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[randomInt(alphabet.length)]
  return out
}

async function getState() {
  let row = await prisma.demoEnvironment.findUnique({ where: { id: 'default' } })
  if (!row) row = await prisma.demoEnvironment.create({ data: { id: 'default', demoEmail: 'demo@emil.local' } })
  return row
}

async function resolveDemoUser(row: { demoEmail: string; demoUserId: string | null }) {
  if (row.demoUserId) {
    const byId = await prisma.user.findUnique({ where: { id: row.demoUserId } })
    if (byId) return byId
  }
  return prisma.user.findUnique({ where: { email: row.demoEmail } })
}

async function ensureDemoUser(row: { demoEmail: string; demoUserId: string | null }) {
  const existing = await resolveDemoUser(row)
  if (existing) {
    if (existing.role === 'admin') throw new Error('The demo login must be a trader account, not an admin. Pick a different demo email.')
    return existing
  }
  const password = await bcrypt.hash(randomPassword(24), 10) // unusable until the admin sets one
  return prisma.user.create({ data: { email: row.demoEmail, name: 'EMIL Demo', role: 'trader', password } })
}

async function ensureDemoAccount(userId: string) {
  const existing = await prisma.tradingAccount.findFirst({ where: { userId } })
  if (existing) return existing
  let broker = await prisma.broker.findFirst({ where: { platform: 'DEMO' } }) ?? (await prisma.broker.findFirst())
  if (!broker) broker = await prisma.broker.create({ data: { name: 'EMIL Demo Feed', platform: 'DEMO', serverName: 'demo' } })
  return prisma.tradingAccount.create({ data: { userId, brokerId: broker.id, accountNumber: DEMO_ACCOUNT_NUMBER, ...BASELINE } })
}

async function summary() {
  const row = await getState()
  const user = await resolveDemoUser(row)
  const account = user ? await prisma.tradingAccount.findFirst({ where: { userId: user.id } }) : null
  const [openPositions, closedPositions] = account
    ? await Promise.all([
        prisma.position.count({ where: { accountId: account.id, status: { in: ['open', 'pending'] } } }),
        prisma.position.count({ where: { accountId: account.id, status: 'closed' } }),
      ])
    : [0, 0]
  return {
    demoEmail: row.demoEmail,
    userExists: !!user,
    userId: user?.id ?? null,
    passwordSetAt: row.passwordSetAt,
    lastResetAt: row.lastResetAt,
    lastResetBy: row.lastResetBy,
    resetCount: row.resetCount,
    note: row.note,
    account: account ? { accountNumber: account.accountNumber, currency: account.currency, balance: account.balance, equity: account.equity, floatingPL: account.floatingPL, openPositions, closedPositions } : null,
    baseline: { ...BASELINE, accountNumber: DEMO_ACCOUNT_NUMBER },
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    return NextResponse.json(await summary())
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the demo environment' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminId = (session.user as any).id as string
  const admin = await requireAdmin(adminId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  const audit = (action: string, detail: string) =>
    prisma.auditLog.create({ data: { userId: adminId, actor: 'user', action, category: 'demo', detail: `${detail} (by ${admin.email})`.slice(0, 1500) } })
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')
    const row = await getState()

    if (type === 'set_email') {
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
      const clash = await prisma.user.findUnique({ where: { email } })
      if (clash && clash.role === 'admin') return NextResponse.json({ error: 'That email belongs to an admin — the demo login must be a trader.' }, { status: 409 })
      const current = await resolveDemoUser(row)
      if (current && !clash) {
        await prisma.user.update({ where: { id: current.id }, data: { email } })
      }
      await prisma.demoEnvironment.update({ where: { id: 'default' }, data: { demoEmail: email, demoUserId: (clash ?? current)?.id ?? null } })
      await audit('DEMO EMAIL SET', `Demo login email set to ${email}`)
      return NextResponse.json({ ok: true, ...(await summary()) })
    }

    if (type === 'set_password') {
      const user = await ensureDemoUser(row)
      await ensureDemoAccount(user.id)
      const custom = String(body?.password ?? '')
      if (custom && custom.length < 10) return NextResponse.json({ error: 'Password must be at least 10 characters' }, { status: 400 })
      const password = custom || randomPassword()
      await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } })
      await prisma.demoEnvironment.update({ where: { id: 'default' }, data: { demoUserId: user.id, passwordSetAt: new Date() } })
      await audit('DEMO PASSWORD SET', `Demo login ${user.email} password ${custom ? 'set by admin' : 'regenerated'}. Shown once, only the hash is stored.`)
      // The plaintext is returned exactly once and never persisted.
      return NextResponse.json({ ok: true, password, email: user.email, ...(await summary()) })
    }

    if (type === 'reset_portfolio') {
      const user = await ensureDemoUser(row)
      const account = await ensureDemoAccount(user.id)
      const closed = await prisma.position.updateMany({
        where: { accountId: account.id, status: { in: ['open', 'pending'] } },
        data: { status: 'closed', closedAt: new Date(), closedPL: 0 },
      })
      await prisma.tradingAccount.update({ where: { id: account.id }, data: { ...BASELINE } })
      await prisma.demoEnvironment.update({ where: { id: 'default' }, data: { demoUserId: user.id, lastResetAt: new Date(), lastResetBy: admin.email, resetCount: { increment: 1 } } })
      await audit('DEMO PORTFOLIO RESET', `Demo account ${account.accountNumber} reset to baseline (balance ${BASELINE.balance} ${BASELINE.currency}); ${closed.count} open/pending position(s) closed.`)
      return NextResponse.json({ ok: true, closed: closed.count, ...(await summary()) })
    }

    if (type === 'set_note') {
      const note = String(body?.note ?? '').slice(0, 500)
      await prisma.demoEnvironment.update({ where: { id: 'default' }, data: { note } })
      return NextResponse.json({ ok: true, ...(await summary()) })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Demo environment action failed' }, { status: 500 })
  }
}
