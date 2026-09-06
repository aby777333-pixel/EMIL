import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { flagEnabled } from '@/lib/flags'
import { FACTORS, PRESETS, runScenario } from '@/lib/scenario'

export const dynamic = 'force-dynamic'

// Scenario & hedge simulator (spec §30, §96–§115).
//   GET  /api/scenario                       → factors, presets, a default risk-off run
//   POST { preset?, shocks?, overrides?, hedgeRatio?, includePaper?, save?: string }
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await flagEnabled('scenario_simulator', true))) return NextResponse.json({ disabled: true, error: 'The scenario simulator is switched off by the administrator.' }, { status: 403 })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    const result = await runScenario(userId, isAdmin, { preset: 'risk_off', hedgeRatio: 0.5 })
    return NextResponse.json({ ok: true, factors: FACTORS, presets: PRESETS, result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Scenario unavailable' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await flagEnabled('scenario_simulator', true))) return NextResponse.json({ error: 'The scenario simulator is switched off by the administrator.' }, { status: 403 })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    const body = await req.json().catch(() => ({}))
    const result = await runScenario(userId, isAdmin, { preset: body?.preset, shocks: body?.shocks, overrides: body?.overrides, hedgeRatio: body?.hedgeRatio, includePaper: body?.includePaper })
    let noteId: string | null = null
    if (typeof body?.save === 'string' && body.save.trim()) {
      const name = body.save.trim().slice(0, 80)
      const shockLine = FACTORS.map((f) => `${f.label}: ${result.shocks[f.key] ?? 0}${f.unit}`).join(' · ')
      const md = [
        `# Scenario — ${name}`, '', `_${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · factor model, linear P&L, research view · not advice_`, '',
        `**Shocks:** ${shockLine}`, `**Equity (approx USD):** ${Math.round(result.equity).toLocaleString('en-US')}`, `**Scenario P&L:** ${Math.round(result.total.pnl).toLocaleString('en-US')} USD (${result.total.pctOfEquity === null ? 'n/a' : result.total.pctOfEquity.toFixed(2) + '% of equity'})`,
        `**After proposed hedges (${Math.round(result.hedgeRatio * 100)}% ratio):** ${Math.round(result.afterHedge.pnl).toLocaleString('en-US')} USD`, '',
        '## Factor exposures', ...result.factorExposures.map((f) => `- ${f.label}: ${Math.round(f.exposure).toLocaleString('en-US')} USD-eq → P&L ${Math.round(f.pnl).toLocaleString('en-US')}`), '',
        '## Positions', ...result.positions.map((p) => `- ${p.venue}${p.paper ? ' (paper)' : ''} ${p.side} ${p.symbol}: move ${p.move.toFixed(2)}% → ${Math.round(p.pnl).toLocaleString('en-US')} USD`), '',
        '## Hedge proposals', ...(result.hedges.length ? result.hedges.map((h) => `- ${h.note}`) : ['- none material']), '',
        '## Notes', ...result.notes.map((n) => `- ${n}`),
      ].join('\n')
      const note = await prisma.researchNote.create({ data: { title: `Scenario — ${name}`, studied: `Scenario simulation over ${result.positions.length} priced positions`, learned: `P&L ${Math.round(result.total.pnl)} USD; after hedges ${Math.round(result.afterHedge.pnl)} USD`, stats: JSON.stringify({ shocks: result.shocks, hedgeRatio: result.hedgeRatio, total: result.total.pnl, afterHedge: result.afterHedge.pnl }), content: md } }).catch(() => null)
      noteId = note?.id ?? null
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'SCENARIO SAVED', category: 'research', detail: `Scenario "${name}" saved to the notebook (P&L ${Math.round(result.total.pnl)} USD, after hedges ${Math.round(result.afterHedge.pnl)} USD).` } }).catch(() => {})
    }
    return NextResponse.json({ ok: true, result, noteId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Scenario failed' }, { status: 500 })
  }
}
