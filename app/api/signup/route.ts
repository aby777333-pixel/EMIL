import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body?.email ?? '').toLowerCase().trim()
    const password = body?.password ?? ''
    const name = body?.name ?? ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, password: hashed, name } })

    // Every signup becomes a CRM customer on a 14-day trial.
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    await prisma.customerProfile.create({
      data: { userId: user.id, status: 'trial', planKey: 'trial', trialEndsAt },
    }).catch(() => {})
    await prisma.auditLog.create({
      data: { userId: user.id, actor: 'system', action: 'CUSTOMER SIGNUP', category: 'crm', detail: `New customer ${email} signed up — 14-day trial started (ends ${trialEndsAt.toISOString().slice(0, 10)}).` },
    }).catch(() => {})

    // Provision a demo trading account for the new user
    const broker = await prisma.broker.findFirst()
    if (broker) {
      await prisma.tradingAccount.create({
        data: {
          userId: user.id, brokerId: broker.id,
          accountNumber: String(50000000 + Math.floor(Math.random() * 9999999)),
          currency: 'USD', balance: 12840.5, equity: 12927.3, marginUsed: 412.6, freeMargin: 12514.7,
          protectedCapital: 10000, profitCapital: 2840.5, workingCapital: 1420.25,
          highWaterMark: 13105.8, profitFloor: 11400, floatingPL: 86.8,
          dailyPL: 124.4, weeklyPL: 386.2, monthlyPL: 912.7,
        },
      })
    }
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error('signup error', e)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
