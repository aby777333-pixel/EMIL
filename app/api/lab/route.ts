import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { llmJson } from '@/lib/teach/llm'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// EMIL STRATEGY LAB — every discovered or generated strategy passes through
// this pipeline before it can even be considered for human review. A backtest
// is never treated as proof of future profitability, and until a real
// historical-data engine is connected every run is dataMode="estimated":
// a structured quant-research ESTIMATE produced by the Knowledge Council,
// clearly labeled as such and pending re-validation on real data.

const LAB_STAGES = ['rules', 'data_validation', 'backtest', 'out_of_sample', 'walk_forward', 'stress', 'regime', 'risk', 'score', 'paper', 'human_review'] as const

const STAGE_AFTER: Record<string, string> = {
  idea: 'rules', rules: 'data_validation', data_validation: 'backtest', backtest: 'out_of_sample',
  out_of_sample: 'walk_forward', walk_forward: 'stress', stress: 'regime', regime: 'risk',
  risk: 'score', score: 'paper', paper: 'human_review', human_review: 'human_review',
}

const STATE_FOR_STAGE: Record<string, string> = {
  data_validation: 'RESEARCHING', backtest: 'RESEARCHING', out_of_sample: 'BACKTESTED',
  walk_forward: 'BACKTESTED', stress: 'BACKTESTED', regime: 'BACKTESTED', risk: 'BACKTESTED',
  score: 'BACKTESTED', paper: 'PAPER_TRADING', human_review: 'PAPER_TRADING',
}

function blueprintSummary(b: any): string {
  return [
    `Code: ${b.code} v${b.version} — "${b.name}" (origin: ${b.origin})`,
    `Market: ${b.market ?? 'n/a'} | Instruments: ${b.instruments ?? 'n/a'} | Timeframe: ${b.timeframe ?? 'n/a'}`,
    `Indicators: ${b.indicators ?? 'n/a'}`,
    `Entry long: ${b.entryLong ?? 'n/a'}`,
    `Entry short: ${b.entryShort ?? 'n/a'}`,
    `Stop loss: ${b.stopLoss ?? 'n/a'}`,
    `Take profit: ${b.takeProfit ?? 'n/a'}`,
    `Position sizing: ${b.positionSizing ?? 'n/a'}`,
    `Filters: ${b.filters ?? 'n/a'}`,
    `Invalid conditions: ${b.invalidConditions ?? 'n/a'}`,
    `Completeness: ${b.completeness}${b.missingFields ? ` (missing: ${b.missingFields})` : ''}`,
    b.metrics ? `Prior run metrics: ${b.metrics}` : '',
  ].filter(Boolean).join('\n')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [blueprints, history, runs] = await Promise.all([
      prisma.strategyBlueprint.findMany({ where: { isCurrent: true }, orderBy: { updatedAt: 'desc' }, include: { labRuns: { orderBy: { createdAt: 'desc' }, take: 12 } } }),
      prisma.strategyBlueprint.findMany({ where: { isCurrent: false }, orderBy: [{ code: 'asc' }, { version: 'desc' }], take: 100 }),
      prisma.labRun.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { blueprint: { select: { code: true, version: true, name: true } } } }),
    ])
    const isAdmin = !!(await requireAdmin((session.user as any).id))
    return NextResponse.json({ blueprints, history, runs, isAdmin, stages: LAB_STAGES })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the Strategy Lab' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))

    // ---- Advance a blueprint one pipeline stage ----
    if (body?.type === 'run_stage') {
      const b = await prisma.strategyBlueprint.findUnique({ where: { id: body?.blueprintId ?? '' } })
      if (!b) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
      if (b.state === 'REJECTED') return NextResponse.json({ error: 'This version was rejected. Create a new version to continue research.' }, { status: 409 })
      const stage = STAGE_AFTER[b.labStage] ?? 'data_validation'
      if (b.labStage === 'human_review') return NextResponse.json({ error: 'Already awaiting human review — approve or reject it from the Lab (admin).' }, { status: 409 })
      if (b.completeness === 'incomplete' && stage !== 'rules') {
        return NextResponse.json({ error: `Strategy is INCOMPLETE (missing: ${b.missingFields ?? 'unspecified rules'}). EMIL will not invent missing rules — supply them via a new version first.` }, { status: 409 })
      }

      const evalResult = await llmJson<any>(
        `You are the EMIL Strategy Lab evaluator — a skeptical institutional quant reviewer. You are running the "${stage}" stage for a candidate trading strategy. There is NO live historical-data engine connected yet, so produce a rigorous RESEARCH ESTIMATE of how this stage would likely turn out, based on the strategy's structure, known market behavior, transaction-cost reality (spread, commission, slippage, swap), overfitting risk and regime sensitivity. Be conservative: complexity is penalized, performance claims from sources count for nothing, and a plausible-sounding strategy can absolutely FAIL a stage. Roughly a third of ordinary retail strategies should fail or come out weak at each hurdle.
Respond with JSON: {"verdict":"pass|weak|fail","metrics":{"trades":int,"winRate":num,"profitFactor":num,"expectancy":num,"maxDrawdownPct":num,"sharpeLike":num,"sortinoLike":num,"recoveryFactor":num,"avgHoldingHours":num,"costSensitivity":"low|medium|high"},"robustnessScore":0-100,"regimeNotes":{"worksIn":[str],"failsIn":[str]},"notes":"2-4 sentence honest assessment, must mention this is an estimate pending real historical data","confidenceDelta":-20 to 15}`,
        `STAGE TO RUN: ${stage}\n\nSTRATEGY UNDER TEST:\n${blueprintSummary(b)}`,
        1600,
      )

      const verdict = ['pass', 'weak', 'fail'].includes(evalResult?.verdict) ? evalResult.verdict : 'weak'
      await prisma.labRun.create({
        data: {
          blueprintId: b.id, runType: stage, dataMode: 'estimated', status: 'completed',
          metrics: JSON.stringify(evalResult?.metrics ?? {}), verdict,
          notes: String(evalResult?.notes ?? '').slice(0, 3000),
        },
      })

      const failed = verdict === 'fail'
      const newStage = failed ? b.labStage : STAGE_AFTER[b.labStage] ?? b.labStage
      const newState = failed ? 'REJECTED' : STATE_FOR_STAGE[stage] ?? b.state
      const robustness = typeof evalResult?.robustnessScore === 'number' ? Math.max(0, Math.min(100, evalResult.robustnessScore)) : b.robustnessScore
      const updated = await prisma.strategyBlueprint.update({
        where: { id: b.id },
        data: {
          labStage: failed ? b.labStage : newStage === b.labStage ? b.labStage : stage === 'human_review' ? 'human_review' : stage,
          state: newState,
          robustnessScore: robustness,
          metrics: evalResult?.metrics ? JSON.stringify({ ...evalResult.metrics, dataMode: 'estimated' }) : b.metrics,
          regimeNotes: evalResult?.regimeNotes ? JSON.stringify(evalResult.regimeNotes) : b.regimeNotes,
        },
      })

      const delta = Math.max(-20, Math.min(15, Number(evalResult?.confidenceDelta ?? 0)))
      if (delta !== 0) {
        await prisma.confidenceEvent.create({
          data: {
            targetType: 'strategy', targetId: b.id, targetName: `${b.code} v${b.version}`,
            previous: b.robustnessScore, next: robustness,
            reason: `${stage} stage ${verdict} (estimated data): ${String(evalResult?.notes ?? '').slice(0, 400)}`,
            actor: 'emil',
          },
        })
      }
      await prisma.learningEvent.create({
        data: { eventType: failed ? 'bad_loss' : 'promotion', title: `Strategy Lab — ${b.code} ${stage} ${verdict.toUpperCase()}`, detail: String(evalResult?.notes ?? '').slice(0, 900), agentName: 'Strategy Lab' },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'emil', action: 'STRATEGY LAB STAGE RUN', category: 'learning', detail: `${b.code} v${b.version} — stage "${stage}" → ${verdict} (dataMode: estimated). State: ${newState}.` },
      })
      return NextResponse.json({ ok: true, verdict, blueprint: updated, evaluation: evalResult })
    }

    // ---- EMIL generates a new candidate strategy from validated knowledge ----
    if (body?.type === 'generate_strategy') {
      const [concepts, rules, existing] = await Promise.all([
        prisma.knowledgeConcept.findMany({ where: { validationStatus: { in: ['supported', 'testing', 'regime_dependent', 'untested'] } }, orderBy: [{ validationStatus: 'asc' }, { confidence: 'desc' }], take: 40 }),
        prisma.knowledgeClaim.findMany({ where: { claimType: 'trading_rule' }, orderBy: { confidence: 'desc' }, take: 40, include: { source: { select: { title: true } } } }),
        prisma.strategyBlueprint.findMany({ where: { isCurrent: true }, select: { code: true, name: true, market: true, robustnessScore: true, state: true }, take: 30 }),
      ])
      if (concepts.length === 0 && rules.length === 0) {
        return NextResponse.json({ error: 'EMIL has no learned knowledge to combine yet. Teach it some sources first.' }, { status: 409 })
      }
      const gen = await llmJson<any>(
        `You are EMIL's strategy-generation engine. Combine elements of the ACCUMULATED KNOWLEDGE below into ONE novel, testable candidate strategy (e.g. one idea's entry logic + another's regime filter + another's risk model). Rules: only use components that appear in the provided knowledge; produce precisely defined rules; if a required component is not available in the knowledge, list it in missingFields instead of inventing it; do not duplicate an existing strategy. This output is an EMIL-GENERATED HYPOTHESIS, not advice, and must go through the full Strategy Lab.
Respond with JSON: {"name":str,"market":"forex|equities|indices|commodities|metals|energy|bonds|etf|futures|multi","instruments":str,"timeframe":str,"indicators":[str],"entryLong":str,"entryShort":str,"stopLoss":str,"takeProfit":str,"positionSizing":str,"filters":str,"invalidConditions":str,"missingFields":str,"rationale":str,"componentsUsed":[str]}`,
        `ACCUMULATED CONCEPTS:\n${concepts.map((c) => `- ${c.name} [${c.category}, ${c.validationStatus}, conf ${Math.round(c.confidence)}]: ${(c.summary ?? '').slice(0, 200)}`).join('\n')}\n\nLEARNED TRADING RULES:\n${rules.map((r) => `- ${r.claimText.slice(0, 220)} (from "${r.source.title.slice(0, 60)}")`).join('\n')}\n\nEXISTING STRATEGIES (do not duplicate):\n${existing.map((s) => `- ${s.code} ${s.name} [${s.market}]`).join('\n') || '(none)'}`,
        2000,
      )
      if (!gen?.name) return NextResponse.json({ error: 'Generation failed — no strategy produced.' }, { status: 502 })

      const marketCode: Record<string, string> = { forex: 'FX', equities: 'EQ', indices: 'IX', commodities: 'CM', metals: 'MT', energy: 'EN', bonds: 'BD', etf: 'ET', futures: 'FU', multi: 'XA' }
      const mc = marketCode[(gen.market ?? 'multi').toLowerCase()] ?? 'XA'
      const count = await prisma.strategyBlueprint.count({ where: { code: { startsWith: `EMIL-${mc}-` } } })
      const code = `EMIL-${mc}-${String(count + 1).padStart(3, '0')}`
      const missing = String(gen.missingFields ?? '').trim()

      const created = await prisma.strategyBlueprint.create({
        data: {
          code, version: '1.0', name: String(gen.name).slice(0, 200), origin: 'emil_generated',
          market: gen.market ?? 'multi', instruments: gen.instruments ?? null, timeframe: gen.timeframe ?? null,
          indicators: gen.indicators ? JSON.stringify(gen.indicators) : null,
          entryLong: gen.entryLong ?? null, entryShort: gen.entryShort ?? null,
          stopLoss: gen.stopLoss ?? null, takeProfit: gen.takeProfit ?? null,
          positionSizing: gen.positionSizing ?? null, filters: gen.filters ?? null,
          invalidConditions: gen.invalidConditions ?? null,
          completeness: missing ? 'incomplete' : 'complete', missingFields: missing || null,
          state: 'LEARNED', labStage: 'rules',
          changeLog: JSON.stringify([{ version: '1.0', date: new Date().toISOString(), change: `EMIL-GENERATED HYPOTHESIS: ${String(gen.rationale ?? '').slice(0, 500)}`, components: gen.componentsUsed ?? [] }]),
        },
      })
      await prisma.researchHypothesis.create({
        data: {
          title: `EMIL-generated: ${String(gen.name).slice(0, 120)}`,
          statement: `Combining learned components (${(gen.componentsUsed ?? []).join(', ').slice(0, 400)}) may produce a viable strategy. ${String(gen.rationale ?? '').slice(0, 600)}`,
          originType: 'emil_generated',
          testPlan: 'Full Strategy Lab pipeline: rule check → data validation → backtest → OOS → walk-forward → stress → regime → risk → score → paper.',
        },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'emil', action: 'EMIL STRATEGY GENERATED', category: 'learning', detail: `${code} "${gen.name}" generated from accumulated knowledge. Labeled EMIL-GENERATED HYPOTHESIS; requires full lab validation. Never auto-deploys.` },
      })
      return NextResponse.json({ ok: true, blueprint: created, rationale: gen.rationale })
    }

    // ---- New version (never silently rewrite history) ----
    if (body?.type === 'new_version') {
      const b = await prisma.strategyBlueprint.findUnique({ where: { id: body?.blueprintId ?? '' } })
      if (!b) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
      const changes = String(body?.changes ?? '').slice(0, 1500)
      if (!changes.trim()) return NextResponse.json({ error: 'Describe what changed and why — required for the research lineage.' }, { status: 400 })
      const [maj, min] = b.version.split('.').map((n) => parseInt(n, 10) || 0)
      const nextVersion = `${maj}.${min + 1}`
      const allowed = ['entryLong', 'entryShort', 'stopLoss', 'takeProfit', 'positionSizing', 'filters', 'invalidConditions', 'timeframe', 'instruments', 'missingFields'] as const
      const overrides: Record<string, string | null> = {}
      for (const f of allowed) {
        if (typeof body?.fields?.[f] === 'string') overrides[f] = body.fields[f].slice(0, 1500) || null
      }
      const missingAfter = (overrides.missingFields !== undefined ? overrides.missingFields : b.missingFields) ?? ''
      const log = (() => { try { return JSON.parse(b.changeLog ?? '[]') } catch { return [] } })()
      log.push({
        version: nextVersion, date: new Date().toISOString(), change: changes,
        previousPerformance: b.metrics ? JSON.parse(b.metrics) : null, previousState: b.state, previousRobustness: b.robustnessScore,
      })
      await prisma.strategyBlueprint.update({ where: { id: b.id }, data: { isCurrent: false } })
      const created = await prisma.strategyBlueprint.create({
        data: {
          code: b.code, version: nextVersion, name: b.name, origin: b.origin, sourceId: b.sourceId,
          market: b.market, instruments: (overrides.instruments as string) ?? b.instruments, timeframe: (overrides.timeframe as string) ?? b.timeframe,
          indicators: b.indicators,
          entryLong: overrides.entryLong !== undefined ? overrides.entryLong : b.entryLong,
          entryShort: overrides.entryShort !== undefined ? overrides.entryShort : b.entryShort,
          stopLoss: overrides.stopLoss !== undefined ? overrides.stopLoss : b.stopLoss,
          takeProfit: overrides.takeProfit !== undefined ? overrides.takeProfit : b.takeProfit,
          positionSizing: overrides.positionSizing !== undefined ? overrides.positionSizing : b.positionSizing,
          filters: overrides.filters !== undefined ? overrides.filters : b.filters,
          invalidConditions: overrides.invalidConditions !== undefined ? overrides.invalidConditions : b.invalidConditions,
          completeness: missingAfter.trim() ? 'incomplete' : 'complete', missingFields: missingAfter.trim() || null,
          state: 'UNVERIFIED', labStage: 'rules', robustnessScore: 0,
          changeLog: JSON.stringify(log), isCurrent: true,
        },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'STRATEGY NEW VERSION', category: 'learning', detail: `${b.code} v${b.version} → v${nextVersion}. Change: ${changes.slice(0, 500)}. Validation restarts from rules.` },
      })
      return NextResponse.json({ ok: true, blueprint: created })
    }

    // ---- Human approval gates (admin only). Deployment stays separate:
    // HUMAN_APPROVED/LIVE_ELIGIBLE never auto-trade; live capital requires the
    // ARM/permissions/risk stack on top.
    if (body?.type === 'approve' || body?.type === 'reject' || body?.type === 'mark_live_eligible') {
      const admin = await requireAdmin(userId)
      if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
      const b = await prisma.strategyBlueprint.findUnique({ where: { id: body?.blueprintId ?? '' } })
      if (!b) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
      const state = body.type === 'reject' ? 'REJECTED' : body.type === 'approve' ? 'HUMAN_APPROVED' : 'LIVE_ELIGIBLE'
      if (state === 'LIVE_ELIGIBLE' && b.state !== 'HUMAN_APPROVED') {
        return NextResponse.json({ error: 'Only HUMAN_APPROVED strategies can be marked live-eligible.' }, { status: 409 })
      }
      const updated = await prisma.strategyBlueprint.update({ where: { id: b.id }, data: { state, approvedBy: state === 'REJECTED' ? null : admin.email } })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: `STRATEGY ${state}`, category: 'learning', detail: `${b.code} v${b.version} "${b.name}" set to ${state} by ${admin.email}. Live deployment still requires ARM, permissions and risk limits.` },
      })
      return NextResponse.json({ ok: true, blueprint: updated })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Strategy Lab action failed' }, { status: 500 })
  }
}
