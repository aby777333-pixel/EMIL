import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { llmJson } from '@/lib/teach/llm'
import { emitEvent } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Trade journal (spec §35–36): entries from executed venue orders, agent
// trade orders, or manual notes; tags, setup, mistakes, and an AI post-trade
// review that grades process, not outcome.

const csv = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split(',')).map((s: any) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 12).join(',')

function stats(entries: any[]) {
  const withPnl = entries.filter((e) => typeof e.pnl === 'number')
  const wins = withPnl.filter((e) => e.pnl > 0)
  const byTag: Record<string, { n: number; wins: number; pnl: number }> = {}
  for (const e of withPnl) {
    for (const t of String(e.tags ?? '').split(',').filter(Boolean)) {
      byTag[t] = byTag[t] ?? { n: 0, wins: 0, pnl: 0 }
      byTag[t].n++
      if (e.pnl > 0) byTag[t].wins++
      byTag[t].pnl += e.pnl
    }
  }
  const mistakes: Record<string, number> = {}
  for (const e of entries) for (const m of String(e.mistakes ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) mistakes[m] = (mistakes[m] ?? 0) + 1
  return {
    entries: entries.length, graded: withPnl.length, winRate: withPnl.length ? (wins.length / withPnl.length) * 100 : null,
    totalPnl: withPnl.reduce((a, e) => a + e.pnl, 0), reviewed: entries.filter((e) => e.aiReview).length,
    byTag: Object.entries(byTag).map(([tag, v]) => ({ tag, ...v, winRate: (v.wins / v.n) * 100 })).sort((a, b) => b.n - a.n).slice(0, 10),
    mistakes: Object.entries(mistakes).map(([m, n]) => ({ mistake: m, n })).sort((a, b) => b.n - a.n).slice(0, 8),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const entries = await prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 })
    const linked = new Set(entries.filter((e) => e.sourceId).map((e) => `${e.sourceType}:${e.sourceId}`))
    const [venueOrders, tradeOrders] = await Promise.all([
      prisma.venueOrder.findMany({ where: { userId, status: { in: ['filled', 'partially_filled'] } }, orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.tradeOrder.findMany({ where: { status: 'filled' }, orderBy: { createdAt: 'desc' }, take: 20, include: { executions: true } }),
    ])
    const candidates = [
      ...venueOrders.filter((o) => !linked.has(`venue_order:${o.id}`)).map((o) => ({
        sourceType: 'venue_order', sourceId: o.id, label: `${o.paper ? 'PAPER' : 'LIVE'} · ${o.providerKey}`, symbol: o.symbol, side: o.side, qty: o.filledQty || o.qty, price: o.avgFillPrice ?? o.price ?? null, at: o.createdAt,
      })),
      ...tradeOrders.filter((o) => !linked.has(`trade_order:${o.id}`)).map((o) => ({
        sourceType: 'trade_order', sourceId: o.id, label: 'EMIL agent pipeline', symbol: o.symbol, side: o.direction, qty: o.lots, price: o.executions?.[0]?.fillPrice ?? o.price, at: o.createdAt,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 30)
    return NextResponse.json({ entries, candidates, stats: stats(entries), aiConfigured: !!process.env.ABACUSAI_API_KEY })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the journal' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const numOrNull = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null)

    if (body?.type === 'create') {
      const symbol = String(body?.symbol ?? '').trim().toUpperCase()
      if (!symbol) return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 })
      const sourceType = ['venue_order', 'trade_order', 'manual'].includes(body?.sourceType) ? body.sourceType : 'manual'
      const sourceId = sourceType !== 'manual' && typeof body?.sourceId === 'string' ? body.sourceId : null
      if (sourceId) {
        const dup = await prisma.journalEntry.findFirst({ where: { userId, sourceType, sourceId } })
        if (dup) return NextResponse.json({ error: 'That order is already in your journal.' }, { status: 409 })
      }
      const entry = await prisma.journalEntry.create({
        data: {
          userId, sourceType, sourceId, symbol,
          side: body?.side === 'sell' || body?.side === 'short' ? 'sell' : body?.side === 'buy' || body?.side === 'long' ? 'buy' : null,
          qty: numOrNull(body?.qty), entryPrice: numOrNull(body?.entryPrice), exitPrice: numOrNull(body?.exitPrice), pnl: numOrNull(body?.pnl),
          notes: String(body?.notes ?? '').slice(0, 4000), tags: csv(body?.tags), setup: String(body?.setup ?? '').slice(0, 400), mistakes: csv(body?.mistakes),
          tradedAt: body?.tradedAt ? new Date(body.tradedAt) : new Date(),
        },
      })
      emitEvent(userId, 'journal.created', { id: entry.id, symbol: entry.symbol, side: entry.side, pnl: entry.pnl, tradedAt: entry.tradedAt, via: 'app' }).catch(() => {})
      return NextResponse.json({ ok: true, entry })
    }

    const entry = body?.id ? await prisma.journalEntry.findFirst({ where: { id: String(body.id), userId } }) : null
    if (body?.type === 'update') {
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      const data: any = {}
      if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 4000)
      if (body.tags !== undefined) data.tags = csv(body.tags)
      if (body.setup !== undefined) data.setup = String(body.setup).slice(0, 400)
      if (body.mistakes !== undefined) data.mistakes = csv(body.mistakes)
      for (const f of ['qty', 'entryPrice', 'exitPrice', 'pnl'] as const) if (body[f] !== undefined) data[f] = numOrNull(body[f])
      const updated = await prisma.journalEntry.update({ where: { id: entry.id }, data })
      return NextResponse.json({ ok: true, entry: updated })
    }
    if (body?.type === 'delete') {
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      await prisma.journalEntry.delete({ where: { id: entry.id } })
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'ai_review') {
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      if (!process.env.ABACUSAI_API_KEY) return NextResponse.json({ error: 'AI engine not configured — set ABACUSAI_API_KEY in the server environment.' }, { status: 503 })
      const recent = await prisma.journalEntry.findMany({ where: { userId, id: { not: entry.id } }, orderBy: { createdAt: 'desc' }, take: 15 })
      const history = recent.map((e) => `${e.tradedAt.toISOString().slice(0, 10)} ${e.symbol} ${e.side ?? ''} pnl=${e.pnl ?? 'n/a'} tags=${e.tags || '-'} mistakes=${e.mistakes || '-'} setup=${e.setup || '-'}`).join('\n')
      const review = await llmJson<any>(
        `You are EMIL's post-trade review coach — an experienced, direct desk head. Grade the PROCESS (setup quality, entry/exit discipline, sizing, adherence to plan, emotional errors), not the outcome: a winning trade can be a bad process and vice-versa. Use the trader's recent journal history to spot repeated patterns. Be specific, concise and actionable. Never invent facts that are not in the entry.
Respond with JSON: {"processGrade":"A|B|C|D|F","summary":"2 sentences","whatWentRight":[str],"whatWentWrong":[str],"patterns":[str — recurring behaviours seen across the history, or empty],"nextTime":[str — 2-4 concrete rules],"riskFlag":"none|sizing|revenge|fomo|plan_deviation|overtrading"}`,
        `TRADE UNDER REVIEW:\nsymbol=${entry.symbol} side=${entry.side ?? 'n/a'} qty=${entry.qty ?? 'n/a'} entry=${entry.entryPrice ?? 'n/a'} exit=${entry.exitPrice ?? 'n/a'} pnl=${entry.pnl ?? 'n/a'} date=${entry.tradedAt.toISOString()}\nsetup=${entry.setup || 'n/a'}\ntags=${entry.tags || 'n/a'}\nself-reported mistakes=${entry.mistakes || 'none'}\nnotes=${entry.notes || '(none)'}\n\nRECENT HISTORY (newest first):\n${history || '(no prior entries)'}`,
        1200,
      )
      const updated = await prisma.journalEntry.update({ where: { id: entry.id }, data: { aiReview: JSON.stringify(review).slice(0, 8000), aiReviewedAt: new Date() } })
      await prisma.learningEvent.create({ data: { eventType: 'post_trade_review', title: `Journal review — ${entry.symbol} graded ${review?.processGrade ?? '?'}`, detail: String(review?.summary ?? '').slice(0, 900), agentName: 'Post-Trade Review' } }).catch(() => {})
      return NextResponse.json({ ok: true, entry: updated, review })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Journal update failed' }, { status: 500 })
  }
}
