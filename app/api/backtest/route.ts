import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { STRATEGIES, runBacktest, type BacktestConfig, type StrategyKey } from '@/lib/backtest/engine'
import { CANDLE_SOURCES, loadCandles, type CandleInterval, type CandleSource } from '@/lib/backtest/candles'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Real-history backtests. Results are facts about the past on the data
// served — never a forecast. When a blueprintId is supplied the run is
// journaled as a Strategy Lab run with dataMode "historical".

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [runs, blueprints] = await Promise.all([
      prisma.labRun.findMany({ where: { dataMode: 'historical' }, orderBy: { createdAt: 'desc' }, take: 20, include: { blueprint: { select: { code: true, version: true, name: true } } } }),
      prisma.strategyBlueprint.findMany({ where: { isCurrent: true, state: { not: 'REJECTED' } }, select: { id: true, code: true, version: true, name: true, instruments: true, timeframe: true, market: true }, orderBy: { updatedAt: 'desc' }, take: 50 }),
    ])
    return NextResponse.json({
      strategies: Object.entries(STRATEGIES).map(([key, s]) => ({ key, ...s })),
      sources: CANDLE_SOURCES,
      runs: runs.map((r) => ({ id: r.id, createdAt: r.createdAt, verdict: r.verdict, notes: r.notes, params: r.params, metrics: r.metrics, blueprint: r.blueprint })),
      blueprints,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the backtest engine' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const source = (['deribit', 'gemini', 'twelve_data'] as CandleSource[]).includes(body?.source) ? (body.source as CandleSource) : 'deribit'
    const interval = (['15m', '1h', '4h', '1d'] as CandleInterval[]).includes(body?.interval) ? (body.interval as CandleInterval) : '1h'
    const symbol = String(body?.symbol ?? '').trim()
    if (!symbol) return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 })
    const strategy = (Object.keys(STRATEGIES) as StrategyKey[]).includes(body?.strategy) ? (body.strategy as StrategyKey) : 'sma_cross'
    const def = STRATEGIES[strategy]
    const params: Record<string, number> = {}
    for (const p of def.params) {
      const v = Number(body?.params?.[p.key] ?? p.default)
      params[p.key] = Number.isFinite(v) ? Math.max(p.min, Math.min(p.max, v)) : p.default
    }
    const cfg: BacktestConfig = {
      strategy, params,
      allowShort: body?.allowShort !== false,
      stopLossPct: body?.stopLossPct ? Math.max(0, Math.min(50, Number(body.stopLossPct))) : null,
      takeProfitPct: body?.takeProfitPct ? Math.max(0, Math.min(200, Number(body.takeProfitPct))) : null,
      feeBps: Math.max(0, Math.min(100, Number(body?.feeBps ?? 5))),
      slippageBps: Math.max(0, Math.min(100, Number(body?.slippageBps ?? 2))),
      initialCapital: Math.max(100, Number(body?.initialCapital ?? 10_000)),
    }
    const bars = Number(body?.bars ?? 1000)
    const candles: any = await loadCandles(source, symbol, interval, bars)
    const result = runBacktest(candles.data, cfg)

    let labRun: any = null
    const blueprintId = typeof body?.blueprintId === 'string' && body.blueprintId ? body.blueprintId : null
    if (blueprintId) {
      const b = await prisma.strategyBlueprint.findUnique({ where: { id: blueprintId } })
      if (b) {
        const notes = `HISTORICAL backtest on ${source} ${candles.symbol} @ ${interval} (${result.metrics.bars} bars, ${new Date(result.metrics.from).toISOString().slice(0, 10)} → ${new Date(result.metrics.to).toISOString().slice(0, 10)}) with ${def.label}: ${result.verdictReason}`
        labRun = await prisma.labRun.create({
          data: {
            blueprintId: b.id, runType: 'backtest', dataMode: 'historical', status: 'completed',
            params: JSON.stringify({ source, symbol: candles.symbol, interval, bars: result.metrics.bars, ...cfg }),
            metrics: JSON.stringify({ ...result.metrics, dataMode: 'historical' }),
            verdict: result.verdict, notes: notes.slice(0, 3000),
          },
        })
        await prisma.strategyBlueprint.update({
          where: { id: b.id },
          data: {
            metrics: JSON.stringify({ trades: result.metrics.trades, winRate: result.metrics.winRate, profitFactor: result.metrics.profitFactor, expectancy: result.metrics.expectancyPct, maxDrawdownPct: result.metrics.maxDrawdownPct, sharpeLike: result.metrics.sharpeLike, sortinoLike: result.metrics.sortinoLike, avgHoldingHours: result.metrics.avgHoldingHours, returnPct: result.metrics.returnPct, buyHoldPct: result.metrics.buyHoldPct, dataMode: 'historical', source, symbol: candles.symbol, interval }),
            state: result.verdict === 'fail' ? b.state : b.state === 'LEARNED' || b.state === 'UNVERIFIED' || b.state === 'RESEARCHING' ? 'BACKTESTED' : b.state,
          },
        })
        await prisma.auditLog.create({
          data: { userId, actor: 'emil', action: 'HISTORICAL BACKTEST RUN', category: 'learning', detail: `${b.code} v${b.version} — ${def.label} on ${source} ${candles.symbol} @ ${interval}: ${result.verdict.toUpperCase()} (${result.metrics.trades} trades, PF ${result.metrics.profitFactor?.toFixed(2) ?? '∞'}, DD ${result.metrics.maxDrawdownPct.toFixed(1)}%).` },
        })
      }
    }
    return NextResponse.json({
      ok: true, source, symbol: candles.symbol, interval, strategy, params, cfg,
      dataFetchedAt: candles.fetchedAt, cached: !!candles.cached, stale: !!candles.stale,
      ...result, trades: result.trades.slice(-200), labRunId: labRun?.id ?? null,
    })
  } catch (e: any) {
    if (e?.rateLimited) return NextResponse.json({ error: 'Market-data budget reached — retry in a minute.' }, { status: 429 })
    return NextResponse.json({ error: e?.message ?? 'Backtest failed' }, { status: 400 })
  }
}
