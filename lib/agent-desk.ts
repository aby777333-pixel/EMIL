// Agent Paper Desk — agent-driven order flow on PAPER venues only (spec
// §61–62, autonomous_trading stays OFF for live).
//
// Flow: convene the council (the DB agents, one structured LLM call grounded
// in venue ticker, free venue candles, live context, portfolio, breakers,
// calendar) → deterministic GUARDIAN checks + risk-based sizing in code →
// proposal row. Execution goes through the same guarded router every manual
// order uses (all pre-trade guards apply again), and only after the user
// clicks — or, when the `agent_paper_autopilot` flag is ON and EMIL is ARMED
// in a semi-autonomous/autonomous mode, from a watch. Live venue keys are
// refused before anything else happens.

import { prisma } from '@/lib/db'
import { flagEnabled } from '@/lib/flags'
import { ExecError, PAPER_MAX_NOTIONAL_USD, estimateNotionalUsd, isPaperVenue, listExecutionVenues, placeGuarded, resolveVenue } from '@/lib/execution/router'
import { EXECUTION_GUARDS } from '@/lib/execution/guards'
import type { VenueInstrument, VenueTicker } from '@/lib/execution/types'
import { evaluateBreakers } from '@/lib/breakers'
import { economicCalendar } from '@/lib/data/calendar'
import { cryptoMarkets } from '@/lib/data/hub'
import { liveContext } from '@/lib/live-context'
import { consolidatedPortfolio } from '@/lib/portfolio'
import { loadCandles } from '@/lib/backtest/candles'
import { resolveInstrument } from '@/lib/instruments/catalog'
import { llmJson } from '@/lib/teach/llm'
import { deliverNotification } from '@/lib/notify'
import { emitEvent } from '@/lib/webhooks'
import { requireAdmin } from '@/lib/auth'

export const AGENT_DESK = {
  riskPct: Number(process.env.EMIL_AGENT_RISK_PCT ?? 0.5),          // % of venue equity risked to the stop
  maxEquityPct: Number(process.env.EMIL_AGENT_MAX_EQUITY_PCT ?? 25), // notional cap as % of venue equity
  minAgreement: 0.6,
  minConsensus: 0.5,
  minConfidence: 0.55,
  maxConcentration: 0.6,
  newsWindowMin: 30,
  proposalTtlMin: 15,
  maxExecutionsPerDay: Number(process.env.EMIL_AGENT_MAX_EXECUTIONS_PER_DAY ?? 10),
  councilSize: 10,
}

export type Vote = { agent: string; category: string; vote: 'BUY' | 'SELL' | 'WAIT'; confidence: number; for: string; against: string }
export type GuardianCheck = { key: string; label: string; ok: boolean; required: boolean; detail: string }
export type Guardian = { approved: boolean; checks: GuardianCheck[] }

const STABLE = new Set(['USD', 'USDC', 'USDT', 'USDE', 'DAI', 'BUSD'])

// ---- compact statistics from the venue's own free candle history ----
function hourlyStats(c: { time: number; open: number; high: number; low: number; close: number }[]) {
  const closes = c.map((x) => x.close)
  const n = closes.length
  const last = closes[n - 1]
  const ret = (k: number) => (n > k && closes[n - 1 - k] ? ((last - closes[n - 1 - k]) / closes[n - 1 - k]) * 100 : null)
  const sma = (k: number) => (n >= k ? closes.slice(-k).reduce((s, x) => s + x, 0) / k : null)
  const lr: number[] = []
  for (let i = Math.max(1, n - 168); i < n; i++) lr.push(Math.log(closes[i] / closes[i - 1]))
  const m = lr.reduce((s, x) => s + x, 0) / Math.max(1, lr.length)
  const sd = Math.sqrt(lr.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, lr.length - 1))
  let g = 0, l = 0
  for (let i = Math.max(1, n - 14); i < n; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d }
  const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / Math.max(l, 1e-12))
  const day = c.slice(-24)
  const trs: number[] = []
  for (let i = Math.max(1, n - 24); i < n; i++) trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)))
  const atr = trs.length ? trs.reduce((s, x) => s + x, 0) / trs.length : null
  return {
    bars: n, last, ret1h: ret(1), ret4h: ret(4), ret24h: ret(24), ret7d: ret(168),
    volHourlyAnnPct: sd * Math.sqrt(24 * 365) * 100, rsi14h: rsi,
    sma20: sma(20), sma50: sma(50), sma200: sma(200),
    hi24: day.length ? Math.max(...day.map((x) => x.high)) : null, lo24: day.length ? Math.min(...day.map((x) => x.low)) : null,
    atrPct: atr && last ? (atr / last) * 100 : null,
  }
}

function candleSource(venueKey: string, symbol: string): { source: 'deribit' | 'gemini'; symbol: string; proxy: boolean } {
  if (venueKey.startsWith('deribit')) return { source: 'deribit', symbol, proxy: false }
  if (venueKey.startsWith('gemini')) return { source: 'gemini', symbol: symbol.toLowerCase(), proxy: false }
  // Delta: no free history path in the hub — Deribit's perpetual on the same base is the proxy.
  const base = resolveInstrument(symbol)?.base ?? symbol.replace(/USD[T]?$/i, '').toUpperCase()
  return { source: 'deribit', symbol: `${base}-PERPETUAL`, proxy: true }
}

async function venueEquityUsd(adapter: { balances(): Promise<{ asset: string; total: number }[]> }): Promise<{ equity: number | null; detail: string }> {
  const bals = await adapter.balances().catch(() => [])
  const prices: Record<string, number> = {}
  try { for (const r of ((await cryptoMarkets(25)) as any)?.data ?? []) if (r.symbol && r.price) prices[String(r.symbol).toUpperCase()] = r.price } catch { /* best effort */ }
  let usd = 0, any = false
  const parts: string[] = []
  for (const b of bals) {
    if (!b.total) continue
    const a = b.asset.toUpperCase()
    const px = STABLE.has(a) ? 1 : prices[a]
    if (px) { usd += b.total * px; any = true; parts.push(`${b.total} ${a}`) }
  }
  return { equity: any ? usd : null, detail: any ? `≈ ${Math.round(usd).toLocaleString('en-US')} USD (${parts.slice(0, 4).join(', ')})` : 'no USD-valued balance found' }
}

function sizeOrder(venueKey: string, inst: VenueInstrument | undefined, ref: number, notionalWanted: number): { qty: number; qtyUnit: string; notionalUsd: number } | null {
  if (!ref || notionalWanted <= 0) return null
  if (venueKey.startsWith('deribit')) {
    const step = inst?.minQty ?? 10
    const qty = Math.floor(notionalWanted / step) * step
    return qty >= step ? { qty, qtyUnit: inst?.qtyUnit ?? 'USD', notionalUsd: qty } : null
  }
  if (venueKey.startsWith('delta_exchange')) {
    const cs = inst?.contractSize ?? 0.001
    const qty = Math.floor(notionalWanted / (cs * ref))
    return qty >= (inst?.minQty ?? 1) ? { qty, qtyUnit: inst?.qtyUnit ?? 'contracts', notionalUsd: qty * cs * ref } : null
  }
  const step = inst?.qtyStep ?? 1e-6
  const raw = notionalWanted / ref
  const qty = Math.floor(raw / step) * step
  const rounded = Number(qty.toFixed(8))
  return rounded >= (inst?.minQty ?? step) ? { qty: rounded, qtyUnit: inst?.qtyUnit ?? 'coins', notionalUsd: rounded * ref } : null
}

const SYSTEM = `You are the EMIL AGENT COUNCIL: a set of named specialist agents inside a multi-asset trading cockpit, deliberating ONE paper (testnet) trade on ONE crypto instrument.
Rules: reason ONLY from the data given; every number you cite must appear in it; do not invent news or levels. Each agent votes independently from its own specialism (market analysis, strategy, risk, execution, learning, knowledge, guardian). Risk and guardian agents are sceptical by design. WAIT is a normal, frequent outcome. Stops must respect the measured volatility (ATR); targets should be at least 1.5× the stop.
Return JSON:
{"direction":"BUY|SELL|WAIT","confidence":0.0-1.0,"stopPct":number (0.3-6, % from entry),"targetPct":number,
 "thesis":"<= 60 words, plain language, the balance of the council",
 "risks":["2-4 bullets <= 18 words"],
 "votes":[{"agent":"<exact agent name from the list>","vote":"BUY|SELL|WAIT","confidence":0.0-1.0,"for":"<= 20 words","against":"<= 20 words"}]}
Provide one vote per listed agent, in the order listed.`

export type CouncilOutcome = { direction: 'BUY' | 'SELL' | 'WAIT'; confidence: number; stopPct: number; targetPct: number; thesis: string; risks: string[]; votes: Vote[]; consensusScore: number; agreement: number }

export async function convene(userId: string, isAdmin: boolean, venueKey: string, symbol: string, source: 'manual' | 'autopilot' = 'manual') {
  if (!isPaperVenue(venueKey)) throw new ExecError(403, 'The Agent Paper Desk reaches PAPER venues only (deribit_testnet, gemini_sandbox, delta_exchange_testnet). Live venues are refused by design.')
  if (!(await flagEnabled('agent_paper_desk', true))) throw new ExecError(403, 'The Agent Paper Desk is switched off (feature flag agent_paper_desk).')
  const sym = symbol.trim()
  if (!sym) throw new ExecError(400, 'Instrument is required.')
  const { adapter } = await resolveVenue(userId, isAdmin, venueKey)

  // ---- gather (parallel, best effort) ----
  const cs = candleSource(venueKey, sym)
  const [instruments, ticker, candles, positions, equity, ctx, pf, breakers, cal, agents] = await Promise.all([
    adapter.instruments().catch(() => [] as VenueInstrument[]),
    adapter.ticker(sym).catch(() => null as VenueTicker | null),
    loadCandles(cs.source, cs.symbol, '1h', 300).then((r: any) => (r?.data ?? []) as { time: number; open: number; high: number; low: number; close: number }[]).catch(() => [] as { time: number; open: number; high: number; low: number; close: number }[]),
    adapter.positions().catch(() => []),
    venueEquityUsd(adapter),
    liveContext(userId, isAdmin).catch(() => null),
    consolidatedPortfolio(userId, isAdmin).catch(() => null),
    evaluateBreakers({ enforce: false }).catch(() => null),
    economicCalendar().catch(() => null),
    prisma.agent.findMany({ orderBy: { number: 'asc' } }).catch(() => []),
  ])
  const inst = instruments.find((i) => i.symbol === sym)
  if (instruments.length && !inst) throw new ExecError(400, `${sym} is not in the tradable list for ${adapter.label}.`)
  const ref = ticker?.mark ?? ticker?.last ?? (ticker?.bid && ticker?.ask ? (ticker.bid + ticker.ask) / 2 : undefined)
  const stats = candles.length >= 30 ? hourlyStats(candles) : null
  const canonical = resolveInstrument(sym)?.key ?? sym.toUpperCase()

  // Pick the council: spread across categories, cap the size.
  const byCat = new Map<string, any[]>()
  for (const a of agents as any[]) { const l = byCat.get(a.category) ?? []; l.push(a); byCat.set(a.category, l) }
  const council: any[] = []
  const order = ['market_analysis', 'strategy', 'risk', 'execution', 'guardian', 'learning', 'knowledge']
  let round = 0
  while (council.length < AGENT_DESK.councilSize && round < 6) { for (const c of order) { const l = byCat.get(c) ?? []; if (l[round] && council.length < AGENT_DESK.councilSize) council.push(l[round]) } round++ }
  if (council.length === 0) council.push({ name: 'Market Analyst', category: 'market_analysis' }, { name: 'Risk Engine', category: 'risk' }, { name: 'Guardian', category: 'guardian' })

  const now = Date.now()
  const spreadBps = ticker?.bid && ticker?.ask ? ((ticker.ask - ticker.bid) / ((ticker.ask + ticker.bid) / 2)) * 1e4 : null
  const calRows = (((cal as any)?.data ?? []) as any[]).filter((e) => e.impact === 'High' && Date.parse(e.date) >= now - 3600e3 && Date.parse(e.date) <= now + 12 * 3600e3).slice(0, 6).map((e) => `${new Date(e.date).toISOString().slice(11, 16)}Z ${e.country} ${e.title}`)
  const exposure = (pf as any)?.exposure?.bySymbol?.find((r: any) => r.key === canonical)
  const openHere = (positions as any[]).filter((p) => p.symbol === sym && p.qty)
  const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'n/a' : v.toFixed(d))

  const user = [
    `VENUE: ${adapter.label} (PAPER / testnet). INSTRUMENT: ${sym} (${canonical}). Quantity unit: ${inst?.qtyUnit ?? 'venue units'}.`,
    `TICKER (venue, now): bid ${f(ticker?.bid)} ask ${f(ticker?.ask)} last ${f(ticker?.last)} mark ${f(ticker?.mark)} spread ${f(spreadBps, 1)} bps.`,
    stats ? `CALCULATED HOURLY STATISTICS (${stats.bars} × 1h bars${cs.proxy ? `, Deribit ${cs.symbol} as history proxy` : ''}): last ${f(stats.last)}; returns 1h ${f(stats.ret1h)}% · 4h ${f(stats.ret4h)}% · 24h ${f(stats.ret24h)}% · 7d ${f(stats.ret7d)}%; realised vol (7d of hourly, annualised) ${f(stats.volHourlyAnnPct, 0)}%; RSI14 (1h) ${f(stats.rsi14h, 0)}; SMA20 ${f(stats.sma20)} / SMA50 ${f(stats.sma50)} / SMA200 ${f(stats.sma200)} (price ${stats.sma200 ? (stats.last > stats.sma200 ? 'above' : 'below') : 'n/a'} SMA200); 24h range ${f(stats.lo24)} – ${f(stats.hi24)}; ATR(24h of 1h) ${f(stats.atrPct)}% of price.` : 'CALCULATED STATISTICS: unavailable (no candle history).',
    `VENUE POSITIONS IN THIS INSTRUMENT: ${openHere.length ? openHere.map((p) => `${p.qty > 0 ? 'long' : 'short'} ${Math.abs(p.qty)} @ ${p.entryPrice ?? 'n/a'}`).join('; ') : 'none'}. Venue equity: ${equity.detail}.`,
    `PORTFOLIO EXPOSURE TO ${canonical} (all accounts): ${exposure ? `gross ${Math.round(exposure.gross)} / net ${Math.round(exposure.net)} USD` : 'none'}.`,
    `CIRCUIT BREAKERS: ${breakers ? (breakers.tripped.length ? `TRIPPED ${breakers.tripped.join(', ')}` : 'all clear') : 'unavailable'}; warnings: ${breakers?.breakers.filter((b) => b.state === 'warn').map((b) => b.label).join(', ') || 'none'}.`,
    `HIGH-IMPACT CALENDAR (next 12h): ${calRows.join('; ') || 'none'}.`,
    ctx ? ctx.text.slice(0, 3500) : 'LIVE CONTEXT: unavailable.',
    `COUNCIL (vote in this order): ${council.map((a) => `${a.name} [${a.category}]`).join('; ')}.`,
  ].join('\n\n')

  const out = await llmJson<any>(SYSTEM, user, 2200, userId)
  const dir: 'BUY' | 'SELL' | 'WAIT' = ['BUY', 'SELL'].includes(String(out?.direction).toUpperCase()) ? (String(out.direction).toUpperCase() as any) : 'WAIT'
  const clamp = (v: any, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d }
  const votes: Vote[] = (Array.isArray(out?.votes) ? out.votes : []).slice(0, AGENT_DESK.councilSize).map((v: any, i: number) => ({
    agent: String(v?.agent ?? council[i]?.name ?? `Agent ${i + 1}`).slice(0, 60), category: String(council.find((a) => a.name === v?.agent)?.category ?? council[i]?.category ?? 'agent'),
    vote: ['BUY', 'SELL'].includes(String(v?.vote).toUpperCase()) ? (String(v.vote).toUpperCase() as any) : 'WAIT', confidence: clamp(v?.confidence, 0, 1, 0.5), for: String(v?.for ?? '').slice(0, 160), against: String(v?.against ?? '').slice(0, 160),
  }))
  const totalConf = votes.reduce((s, v) => s + v.confidence, 0) || 1
  const forDir = votes.filter((v) => v.vote === dir).reduce((s, v) => s + v.confidence, 0)
  const against = votes.filter((v) => v.vote !== dir && v.vote !== 'WAIT').reduce((s, v) => s + v.confidence, 0)
  const consensusScore = dir === 'WAIT' ? 0 : (forDir - against) / totalConf
  const agreement = votes.length ? votes.filter((v) => v.vote === dir).length / votes.length : 0
  const council_: CouncilOutcome = {
    direction: dir, confidence: clamp(out?.confidence, 0, 1, 0), stopPct: clamp(out?.stopPct, 0.3, 6, 1.5), targetPct: clamp(out?.targetPct, 0.3, 20, 3),
    thesis: String(out?.thesis ?? '').slice(0, 500), risks: (Array.isArray(out?.risks) ? out.risks : []).slice(0, 4).map((r: any) => String(r).slice(0, 160)), votes, consensusScore, agreement,
  }

  // ---- GUARDIAN (deterministic) ----
  const checks: GuardianCheck[] = []
  const add = (key: string, label: string, ok: boolean, detail: string, required = true) => checks.push({ key, label, ok, required, detail })
  add('paper', 'Paper venue', true, `${adapter.label} is a testnet/sandbox venue.`)
  add('direction', 'Council reached a direction', dir !== 'WAIT', dir === 'WAIT' ? 'The council voted WAIT.' : `Council direction ${dir}.`)
  add('agreement', `Agreement ≥ ${Math.round(AGENT_DESK.minAgreement * 100)}%`, agreement >= AGENT_DESK.minAgreement, `${Math.round(agreement * 100)}% of ${votes.length} agents voted ${dir}.`)
  add('consensus', `Consensus score ≥ ${AGENT_DESK.minConsensus}`, consensusScore >= AGENT_DESK.minConsensus, `Confidence-weighted score ${consensusScore.toFixed(2)}.`)
  add('confidence', `Council confidence ≥ ${AGENT_DESK.minConfidence}`, council_.confidence >= AGENT_DESK.minConfidence, `Confidence ${council_.confidence.toFixed(2)}.`)
  const trippedDisarm = breakers?.breakers.filter((b) => b.state === 'tripped' && b.action === 'disarm') ?? []
  add('breakers', 'No disarm-class circuit breaker tripped', trippedDisarm.length === 0, trippedDisarm.length ? `Tripped: ${trippedDisarm.map((b) => b.label).join(', ')}.` : 'All clear.')
  const nearNews = (((cal as any)?.data ?? []) as any[]).filter((e) => e.impact === 'High' && ['USD', 'All'].includes(e.country) && Math.abs(Date.parse(e.date) - now) <= AGENT_DESK.newsWindowMin * 60e3)
  add('news', `No high-impact USD event within ±${AGENT_DESK.newsWindowMin} min`, nearNews.length === 0, nearNews.length ? nearNews.map((e) => e.title).join('; ') : 'Calendar clear.')
  add('quote', 'Live quote available', !!ref, ref ? `Reference ${ref}.` : 'No ticker from the venue.')
  add('spread', `Spread ≤ ${EXECUTION_GUARDS.maxSpreadBps} bps`, spreadBps === null || spreadBps <= EXECUTION_GUARDS.maxSpreadBps, spreadBps === null ? 'No two-sided quote — router will re-check.' : `${spreadBps.toFixed(1)} bps.`)
  const sameSide = openHere.find((p) => (dir === 'BUY' ? p.qty > 0 : p.qty < 0))
  add('position', 'Not already positioned this way', !sameSide, sameSide ? `Already ${sameSide.qty > 0 ? 'long' : 'short'} ${Math.abs(sameSide.qty)} on the venue.` : 'No same-direction position.')
  add('equity', 'Venue equity known', equity.equity !== null && equity.equity > 0, equity.detail)
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
  const executedToday = await prisma.agentDeskProposal.count({ where: { userId, status: 'executed', executedAt: { gte: dayStart } } })
  add('budget', `Agent executions today < ${AGENT_DESK.maxExecutionsPerDay}`, executedToday < AGENT_DESK.maxExecutionsPerDay, `${executedToday} executed today.`)

  // ---- sizing (risk-based) ----
  let sized: { qty: number; qtyUnit: string; notionalUsd: number } | null = null
  let riskUsd: number | null = null
  if (equity.equity && ref && dir !== 'WAIT') {
    riskUsd = equity.equity * (AGENT_DESK.riskPct / 100)
    const wanted = Math.min(riskUsd / (council_.stopPct / 100), PAPER_MAX_NOTIONAL_USD, equity.equity * (AGENT_DESK.maxEquityPct / 100))
    sized = sizeOrder(venueKey, inst, ref, wanted)
    add('size', 'Order size within caps and above the venue minimum', !!sized, sized ? `${sized.qty} ${sized.qtyUnit} ≈ ${Math.round(sized.notionalUsd).toLocaleString('en-US')} USD (risk ${Math.round(riskUsd)} USD = ${AGENT_DESK.riskPct}% of equity to a ${council_.stopPct}% stop; caps: paper ${PAPER_MAX_NOTIONAL_USD.toLocaleString('en-US')} USD, ${AGENT_DESK.maxEquityPct}% of equity).` : `Wanted ≈ ${Math.round(wanted)} USD, below the venue minimum or unpriceable.`)
    if (sized && pf) {
      const grossTotal = (pf as any).exposure.grossTotal as number
      const own = exposure?.gross ?? 0
      const conc = grossTotal + sized.notionalUsd > 0 ? (own + sized.notionalUsd) / (grossTotal + sized.notionalUsd) : 0
      add('concentration', `Concentration after trade ≤ ${Math.round(AGENT_DESK.maxConcentration * 100)}%`, grossTotal === 0 || conc <= AGENT_DESK.maxConcentration, grossTotal === 0 ? 'No other priced positions.' : `${Math.round(conc * 100)}% of gross would sit in ${canonical}.`, grossTotal > 0)
    }
  } else if (dir !== 'WAIT') add('size', 'Order size', false, 'Cannot size without venue equity and a reference price.')
  const approved = checks.every((c) => c.ok || !c.required)
  const guardian: Guardian = { approved, checks }

  const proposal = await prisma.agentDeskProposal.create({
    data: {
      userId, providerKey: venueKey, symbol: sym, canonical, direction: dir, consensusScore, agreement, confidence: council_.confidence,
      refPrice: ref ?? null, stopPct: council_.stopPct, targetPct: council_.targetPct, qty: sized?.qty ?? null, qtyUnit: sized?.qtyUnit ?? null, notionalUsd: sized?.notionalUsd ?? null, riskUsd,
      thesis: council_.thesis, votes: JSON.stringify(votes), guardian: JSON.stringify(guardian), risks: JSON.stringify(council_.risks),
      status: approved ? 'proposed' : 'rejected', source, message: approved ? null : `Guardian: ${checks.filter((c) => !c.ok && c.required).map((c) => c.label).join('; ')}`,
      expiresAt: new Date(now + AGENT_DESK.proposalTtlMin * 60e3),
    },
  })
  await prisma.auditLog.create({ data: { userId, actor: 'emil', action: approved ? 'AGENT PROPOSAL' : 'AGENT PROPOSAL REJECTED', category: 'agent_desk', detail: `${adapter.label} ${sym}: council ${dir} (agreement ${Math.round(agreement * 100)}%, score ${consensusScore.toFixed(2)})${sized ? `, size ${sized.qty} ${sized.qtyUnit}` : ''} — guardian ${approved ? 'APPROVED (awaiting execution)' : `rejected: ${proposal.message}`}. Source ${source}.` } }).catch(() => {})
  return { proposal, council: council_, guardian, stats, ticker, inst: inst ?? null, venueLabel: adapter.label }
}

export async function executeProposal(userId: string, isAdmin: boolean, id: string, source: 'manual' | 'autopilot' = 'manual') {
  const p = await prisma.agentDeskProposal.findFirst({ where: { id, userId } })
  if (!p) throw new ExecError(404, 'Proposal not found.')
  if (!isPaperVenue(p.providerKey)) throw new ExecError(403, 'Refused: not a paper venue.')
  if (!(await flagEnabled('agent_paper_desk', true))) throw new ExecError(403, 'The Agent Paper Desk is switched off (feature flag agent_paper_desk).')
  if (p.status !== 'proposed') throw new ExecError(409, `Proposal is ${p.status}.`)
  if (p.expiresAt.getTime() < Date.now()) { await prisma.agentDeskProposal.update({ where: { id }, data: { status: 'expired' } }); throw new ExecError(410, 'Proposal expired — convene the council again for a fresh read.') }
  if (p.direction === 'WAIT' || !p.qty) throw new ExecError(400, 'Nothing to execute.')
  try {
    const result = await placeGuarded({ userId, isAdmin, venueKey: p.providerKey, req: { symbol: p.symbol, side: p.direction === 'BUY' ? 'buy' : 'sell', type: 'market', qty: p.qty } })
    const updated = await prisma.agentDeskProposal.update({ where: { id }, data: { status: 'executed', executedAt: new Date(), venueOrderId: result.record.id, message: `${result.order.status}${result.order.filledQty ? ` · filled ${result.order.filledQty}${result.order.avgFillPrice ? ` @ ${result.order.avgFillPrice}` : ''}` : ''}`, source } })
    await prisma.auditLog.create({ data: { userId, actor: source === 'autopilot' ? 'emil' : 'user', action: 'AGENT PAPER ORDER', category: 'agent_desk', detail: `${p.providerKey}: ${p.direction} ${p.qty} ${p.symbol} (paper) from council proposal ${p.id} → ${result.order.status}. ${source === 'autopilot' ? 'Autopilot' : 'User-confirmed'}.` } }).catch(() => {})
    const n = { title: `Agent desk ${source === 'autopilot' ? 'autopilot' : ''} paper order — ${p.direction} ${p.symbol}`.replace(/\s+/g, ' '), body: `${result.provider}: ${p.qty} ${p.qtyUnit ?? ''} → ${result.order.status}. Paper/testnet funds only.`, href: '/agent-desk' }
    prisma.notification.create({ data: { userId, kind: 'system', ...n } }).catch(() => {})
    if (source === 'autopilot') deliverNotification(userId, n).catch(() => {})
    emitEvent(userId, 'paper.order.placed', { venue: p.providerKey, order: result.order, recordId: result.record.id, via: `agent_desk_${source}` }).catch(() => {})
    return { proposal: updated, order: result.order }
  } catch (e: any) {
    const msg = String(e?.message ?? 'Execution failed').slice(0, 400)
    await prisma.agentDeskProposal.update({ where: { id }, data: { status: 'error', message: msg } }).catch(() => {})
    throw e instanceof ExecError ? e : new ExecError(502, msg)
  }
}

export async function expireStale(userId?: string) {
  await prisma.agentDeskProposal.updateMany({ where: { ...(userId ? { userId } : {}), status: 'proposed', expiresAt: { lt: new Date() } }, data: { status: 'expired' } }).catch(() => {})
}

// ---- autopilot -----------------------------------------------------------
export async function autopilotGates(): Promise<{ ok: boolean; reasons: string[]; armed: boolean; mode: string }> {
  const [flag, desk, state] = await Promise.all([flagEnabled('agent_paper_autopilot', false), flagEnabled('agent_paper_desk', true), prisma.emilState.findFirst()])
  const reasons: string[] = []
  if (!desk) reasons.push('feature flag agent_paper_desk is OFF')
  if (!flag) reasons.push('feature flag agent_paper_autopilot is OFF')
  if (!state?.armed) reasons.push('EMIL is DISARMED')
  const mode = state?.mode ?? 'observation'
  if (!['semi_autonomous', 'autonomous'].includes(mode)) reasons.push(`mode is ${mode} (needs semi_autonomous or autonomous)`)
  return { ok: reasons.length === 0, reasons, armed: !!state?.armed, mode }
}

export async function runDueWatches(limit = 3): Promise<{ ran: { id: string; symbol: string; outcome: string }[]; gates: Awaited<ReturnType<typeof autopilotGates>> }> {
  const gates = await autopilotGates()
  const ran: { id: string; symbol: string; outcome: string }[] = []
  if (!gates.ok) return { ran, gates }
  const now = Date.now()
  const watches = await prisma.agentDeskWatch.findMany({ where: { enabled: true }, orderBy: { lastRunAt: 'asc' } })
  for (const w of watches) {
    if (ran.length >= limit) break
    if (w.lastRunAt && now - w.lastRunAt.getTime() < w.intervalMin * 60e3) continue
    if (!isPaperVenue(w.providerKey)) { await prisma.agentDeskWatch.update({ where: { id: w.id }, data: { enabled: false, lastOutcome: 'disabled: not a paper venue' } }); continue }
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
    const today = await prisma.agentDeskProposal.count({ where: { userId: w.userId, providerKey: w.providerKey, symbol: w.symbol, source: 'autopilot', status: 'executed', executedAt: { gte: dayStart } } })
    let outcome = ''
    try {
      if (today >= w.maxPerDay) outcome = `skipped: ${today}/${w.maxPerDay} executions today`
      else {
        const isAdmin = !!(await requireAdmin(w.userId))
        const c = await convene(w.userId, isAdmin, w.providerKey, w.symbol, 'autopilot')
        if (c.guardian.approved) { const ex = await executeProposal(w.userId, isAdmin, c.proposal.id, 'autopilot'); outcome = `executed ${c.council.direction} ${c.proposal.qty} ${c.proposal.qtyUnit} → ${ex.order.status}` }
        else outcome = `council ${c.council.direction}; guardian: ${c.proposal.message ?? 'not approved'}`
      }
    } catch (e: any) { outcome = `error: ${String(e?.message ?? e).slice(0, 160)}` }
    await prisma.agentDeskWatch.update({ where: { id: w.id }, data: { lastRunAt: new Date(), lastOutcome: outcome.slice(0, 300) } }).catch(() => {})
    ran.push({ id: w.id, symbol: w.symbol, outcome })
  }
  return { ran, gates }
}

export async function deskOverview(userId: string, isAdmin: boolean) {
  await expireStale(userId)
  const [venues, proposals, watches, gates, deskFlag] = await Promise.all([
    listExecutionVenues(userId, isAdmin),
    prisma.agentDeskProposal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.agentDeskWatch.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    autopilotGates(),
    flagEnabled('agent_paper_desk', true),
  ])
  return {
    enabled: deskFlag,
    venues: venues.filter((v) => v.paper),
    proposals: proposals.map((p) => ({ ...p, votes: JSON.parse(p.votes || '[]'), guardian: JSON.parse(p.guardian || '{}'), risks: JSON.parse(p.risks || '[]') })),
    watches, autopilot: gates, config: AGENT_DESK, caps: { paper: PAPER_MAX_NOTIONAL_USD },
  }
}
