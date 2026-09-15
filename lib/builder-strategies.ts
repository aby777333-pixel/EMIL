// Strategies sent by the EMIL Strategy Builder (777 Raptor site and EMIL
// Trade's /ai-lab) through POST /api/v1/strategies.
//
// They arrive as EMIL Strategy Specs, already validated with the shared kit
// (lib/emil-strategy-kit), and become StrategyBlueprints with origin
// "builder". Standing rules, same as extracted and EMIL-generated strategies:
//   - always LEARNED / rules stage, whatever the sender says;
//   - one blueprint per builder strategy, versioned in the changeLog — a re-send
//     of an identical version is a no-op, a changed one is a new version;
//   - it moves forward only through the Strategy Lab and a human approval, and
//     never trades by itself.

import { prisma } from '@/lib/db'
import { specChecksum, toBlueprintFields, type EmilStrategySpec } from '@/lib/emil-strategy-kit'

export const BUILDER_ORIGIN = 'builder'

const MARKET_CODE: Record<string, string> = {
  forex: 'FX', equities: 'EQ', indices: 'IX', commodities: 'CM', metals: 'MT', energy: 'EN', crypto: 'CR', multi: 'XA',
}

/** Builder strategies accepted per day across all keys: a brake on a flood, not a quota. */
const DAILY_LIMIT = 500

export type ReceiveResult =
  | { status: 'created' | 'new_version' | 'duplicate'; code: string; version: string; blueprintId: string }
  | { status: 'limit' }

type LogEntry = { builderChecksum?: string; builderName?: string }

/** Next free code for the market: one above the highest number in use. */
async function allocateCode(market: string): Promise<string> {
  const prefix = `EMIL-${MARKET_CODE[market] ?? 'XA'}-`
  const rows = await prisma.strategyBlueprint.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } })
  const highest = rows.reduce((max, row) => Math.max(max, parseInt(row.code.slice(prefix.length), 10) || 0), 0)
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}

const isUniqueViolation = (e: unknown) => typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'

export async function receiveBuilderStrategy(
  spec: EmilStrategySpec,
  context: { userId: string; channel: string },
): Promise<ReceiveResult> {
  const fields = toBlueprintFields(spec)
  const checksum = specChecksum(spec)
  const sourceId = `builder:${spec.id}`
  const now = new Date()
  const logEntry = {
    date: now.toISOString(),
    builderChecksum: checksum,
    builderName: spec.name,
    builderVersion: spec.version,
    channel: context.channel,
    engine: fields.engine,
    spec,
  }
  const blueprintData = {
    name: spec.name.slice(0, 200),
    origin: BUILDER_ORIGIN,
    sourceId,
    market: fields.market,
    instruments: fields.instruments,
    timeframe: fields.timeframe,
    indicators: JSON.stringify(fields.indicators),
    entryLong: fields.entryLong,
    entryShort: fields.entryShort,
    stopLoss: fields.stopLoss,
    takeProfit: fields.takeProfit,
    positionSizing: fields.positionSizing,
    filters: fields.filters,
    invalidConditions: fields.invalidConditions,
    completeness: 'complete',
    missingFields: null,
    state: 'LEARNED',
    labStage: 'rules',
    robustnessScore: 0,
    isCurrent: true,
  }

  const current = await prisma.strategyBlueprint.findFirst({ where: { sourceId, isCurrent: true } })

  if (current) {
    const log: (LogEntry & Record<string, unknown>)[] = (() => {
      try { return JSON.parse(current.changeLog ?? '[]') } catch { return [] }
    })()
    const last = log[log.length - 1]
    if (last?.builderChecksum === checksum && last?.builderName === spec.name) {
      return { status: 'duplicate', code: current.code, version: current.version, blueprintId: current.id }
    }
    const [maj, min] = current.version.split('.').map((n) => parseInt(n, 10) || 0)
    const version = `${maj}.${min + 1}`
    log.push({
      version,
      ...logEntry,
      change: `Updated in the EMIL Strategy Builder (strategy v${spec.version}). Validation restarts from rules.`,
      previousState: current.state,
      previousRobustness: current.robustnessScore,
    })
    const [, created] = await prisma.$transaction([
      prisma.strategyBlueprint.update({ where: { id: current.id }, data: { isCurrent: false } }),
      prisma.strategyBlueprint.create({ data: { ...blueprintData, code: current.code, version, changeLog: JSON.stringify(log) } }),
    ])
    await prisma.auditLog.create({
      data: { userId: context.userId, actor: 'user', action: 'BUILDER STRATEGY NEW VERSION', category: 'learning', detail: `${current.code} v${current.version} → v${version} "${spec.name}" from the EMIL Strategy Builder (${context.channel}). Validation restarts from rules.` },
    })
    return { status: 'new_version', code: created.code, version: created.version, blueprintId: created.id }
  }

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const today = await prisma.strategyBlueprint.count({ where: { origin: BUILDER_ORIGIN, createdAt: { gte: startOfDay } } })
  if (today >= DAILY_LIMIT) return { status: 'limit' }

  const changeLog = JSON.stringify([
    {
      version: '1.0',
      ...logEntry,
      change: `Received from the EMIL Strategy Builder (${context.channel}): ${fields.engine.label} engine. Research input — validate in the Strategy Lab before it goes further.`,
    },
  ])

  // Retry if a concurrent create took the same code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await allocateCode(fields.market)
    try {
      const created = await prisma.strategyBlueprint.create({ data: { ...blueprintData, code, version: '1.0', changeLog } })
      await prisma.researchHypothesis.create({
        data: {
          title: `Builder strategy: ${spec.name.slice(0, 120)}`,
          statement: `${fields.engine.label} on ${fields.instruments} (${fields.timeframe}). Long: ${fields.entryLong} Short: ${fields.entryShort}`.slice(0, 1500),
          originType: BUILDER_ORIGIN,
          testPlan: 'Full Strategy Lab pipeline: rule check → data validation → backtest → OOS → walk-forward → stress → regime → risk → score → paper.',
        },
      })
      await prisma.auditLog.create({
        data: { userId: context.userId, actor: 'user', action: 'BUILDER STRATEGY RECEIVED', category: 'learning', detail: `${created.code} "${spec.name}" received from the EMIL Strategy Builder (${context.channel}). Labelled LEARNED; requires full lab validation. Never auto-deploys.` },
      })
      return { status: 'created', code: created.code, version: created.version, blueprintId: created.id }
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 4) throw e
    }
  }
  throw new Error('Could not allocate a strategy code.')
}
