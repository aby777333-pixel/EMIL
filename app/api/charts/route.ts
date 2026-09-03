import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toTwelveData } from '@/lib/instruments/catalog'

export const dynamic = 'force-dynamic'

// Charting persistence (spec §14, §253): saved layouts (symbol, interval, type,
// indicators, compare symbol) and horizontal price levels per symbol. All per
// user; nothing here is advice or an order — levels are the trader's own marks.
const LAYOUT_CAP = 12
const LEVEL_CAP = 20

const normSym = (s: unknown) => toTwelveData(String(s ?? '').trim().slice(0, 24)).symbol.toUpperCase()

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const url = new URL(req.url)
    const symbol = normSym(url.searchParams.get('symbol'))
    const [layouts, levels] = await Promise.all([
      prisma.chartLayout.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] }),
      symbol ? prisma.chartLevel.findMany({ where: { userId, symbol }, orderBy: { price: 'desc' } }) : Promise.resolve([]),
    ])
    return NextResponse.json({
      layouts: layouts.map((l) => ({ id: l.id, name: l.name, isDefault: l.isDefault, updatedAt: l.updatedAt, config: safeJson(l.config) })),
      levels, symbol, layoutCap: LAYOUT_CAP, levelCap: LEVEL_CAP,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load chart settings' }, { status: 500 })
  }
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return {} } }

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')

    if (type === 'save_layout') {
      const name = String(body?.name ?? '').trim().slice(0, 40)
      if (!name) return NextResponse.json({ error: 'Layout name required' }, { status: 400 })
      const cfg = body?.config && typeof body.config === 'object' ? body.config : {}
      const config = JSON.stringify({
        symbol: normSym(cfg.symbol), interval: String(cfg.interval ?? '1h').slice(0, 8), chartType: String(cfg.chartType ?? 'Candles').slice(0, 10),
        sma: !!cfg.sma, ema: !!cfg.ema, rsi: !!cfg.rsi, bb: !!cfg.bb, compare: cfg.compare ? normSym(cfg.compare) : null,
      })
      const existing = body?.id ? await prisma.chartLayout.findFirst({ where: { id: String(body.id), userId } }) : await prisma.chartLayout.findFirst({ where: { userId, name } })
      if (existing) {
        await prisma.chartLayout.update({ where: { id: existing.id }, data: { name, config } })
        return NextResponse.json({ ok: true, id: existing.id })
      }
      const count = await prisma.chartLayout.count({ where: { userId } })
      if (count >= LAYOUT_CAP) return NextResponse.json({ error: `Up to ${LAYOUT_CAP} saved layouts.` }, { status: 409 })
      const created = await prisma.chartLayout.create({ data: { userId, name, config, isDefault: count === 0 } })
      return NextResponse.json({ ok: true, id: created.id })
    }

    if (type === 'delete_layout') {
      await prisma.chartLayout.deleteMany({ where: { id: String(body?.id ?? ''), userId } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'set_default') {
      const row = await prisma.chartLayout.findFirst({ where: { id: String(body?.id ?? ''), userId } })
      if (!row) return NextResponse.json({ error: 'Layout not found' }, { status: 404 })
      await prisma.$transaction([
        prisma.chartLayout.updateMany({ where: { userId }, data: { isDefault: false } }),
        prisma.chartLayout.update({ where: { id: row.id }, data: { isDefault: true } }),
      ])
      return NextResponse.json({ ok: true })
    }

    if (type === 'add_level') {
      const symbol = normSym(body?.symbol)
      const price = Number(body?.price)
      if (!symbol || !isFinite(price) || price <= 0) return NextResponse.json({ error: 'Symbol and a positive price are required' }, { status: 400 })
      const count = await prisma.chartLevel.count({ where: { userId, symbol } })
      if (count >= LEVEL_CAP) return NextResponse.json({ error: `Up to ${LEVEL_CAP} levels per symbol.` }, { status: 409 })
      const color = /^#[0-9a-fA-F]{6}$/.test(String(body?.color ?? '')) ? String(body.color) : '#f59e0b'
      const created = await prisma.chartLevel.create({ data: { userId, symbol, price, label: String(body?.label ?? '').trim().slice(0, 40) || null, color } })
      return NextResponse.json({ ok: true, level: created })
    }

    if (type === 'delete_level') {
      await prisma.chartLevel.deleteMany({ where: { id: String(body?.id ?? ''), userId } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'clear_levels') {
      const symbol = normSym(body?.symbol)
      await prisma.chartLevel.deleteMany({ where: { userId, symbol } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Chart settings action failed' }, { status: 500 })
  }
}
