// Portfolio AI commentary (spec §28–29). One structured LLM read of the
// consolidated portfolio: concentration, factor exposures, what the default
// risk-off scenario does, what the circuit breakers say, what to research.
// Composed strictly from calculated data already on the page; cached per
// user for an hour. MODEL ASSESSMENT — never advice, never an order.

import { cachedFetch } from '@/lib/data/hub'
import { consolidatedPortfolio } from '@/lib/portfolio'
import { evaluateBreakers } from '@/lib/breakers'
import { runScenario } from '@/lib/scenario'
import { llmJson } from '@/lib/teach/llm'

export type PortfolioCommentary = {
  fetchedAt: string
  model: string
  headline: string
  summary: string
  concentration: string[]
  exposures: string[]
  scenario: string[]
  risks: string[]
  hedgingObservations: string[]
  researchQuestions: string[]
  inputs: { accounts: number; positions: number; equity: number; grossTotal: number; scenarioPnl: number; breakersTripped: number }
}

const MODEL = 'gpt-5.4-mini'

const SYSTEM = `You are EMIL, the portfolio analyst inside a multi-asset trading cockpit. Write PORTFOLIO COMMENTARY strictly from the calculated data provided.
Rules: every number must come from the data; describe what the portfolio IS (concentration, factor exposures, paper vs live), what the risk-off scenario implies, what the circuit breakers say; note what could change the picture and what to research. Never tell the reader to buy, sell, add, cut or hedge — you may describe what the hedge proposals would do, labelled as proposals. Plain language, specific, no hype.
Return JSON:
{"headline":"<= 12 words","summary":"<= 60 words",
 "concentration":["2-4 bullets on concentration by symbol / asset class / venue, <= 24 words each"],
 "exposures":["2-4 bullets on net factor exposures (USD, equities, crypto, gold, oil, rates), <= 24 words each"],
 "scenario":["2-3 bullets on the risk-off scenario P&L and which positions drive it, <= 24 words each"],
 "risks":["2-4 bullets on what could go wrong, <= 20 words each"],
 "hedgingObservations":["1-3 bullets describing the hedge proposals and residual exposure, <= 24 words each"],
 "researchQuestions":["2-4 questions to investigate next (not trades), <= 18 words each"]}`

const r0 = (n: number | null | undefined) => (n === null || n === undefined || !isFinite(n) ? 'n/a' : Math.round(n).toLocaleString('en-US'))

export async function portfolioCommentary(userId: string, isAdmin: boolean, force = false): Promise<PortfolioCommentary & { cached?: boolean; stale?: boolean }> {
  const key = `pf_commentary_${userId}_${isAdmin ? 'a' : 'u'}${force ? `_r${Math.floor(Date.now() / 60000)}` : ''}`
  return cachedFetch(key, 3600, async () => {
    const [pf, breakers, scenario] = await Promise.all([
      consolidatedPortfolio(userId, isAdmin),
      evaluateBreakers({ enforce: false }).catch(() => null),
      runScenario(userId, isAdmin, { preset: 'risk_off', hedgeRatio: 0.5 }).catch(() => null),
    ])
    const ex = pf.exposure
    const accounts = pf.accounts.map((a) => `${a.label} [${a.paper ? 'paper' : 'LIVE'}]: ${r0(a.equityUsd ?? a.balanceUsd)} USD, ${a.positions} positions${a.error ? ` (error: ${a.error})` : ''}`)
    const positions = pf.positions.slice(0, 25).map((p) => `${p.venue}${p.paper ? ' (paper)' : ''} ${p.side} ${p.symbol} [${p.assetClass}] notional ${r0(p.notionalUsd)} USD, unrealised ${r0(p.upnl)}`)
    const byClass = ex.byAssetClass.map((r) => `${r.key}: gross ${r0(r.gross)}, net ${r0(r.net)} (${r.count})`)
    const bySymbol = ex.bySymbol.slice(0, 8).map((r) => `${r.key}: gross ${r0(r.gross)}, net ${r0(r.net)}`)
    const byVenue = ex.byVenue.map((r) => `${r.key}: gross ${r0(r.gross)}`)
    const factors = scenario ? scenario.factorExposures.map((f) => `${f.label}: ${r0(f.exposure)} USD-eq (shock ${f.shock}${f.factor === 'rates' ? 'bp' : '%'} → P&L ${r0(f.pnl)})`) : []
    const worst = scenario ? scenario.positions.slice(0, 4).map((p) => `${p.symbol} ${p.side}: move ${p.move.toFixed(1)}% → ${r0(p.pnl)} USD`) : []
    const hedges = scenario ? scenario.hedges.map((h) => `${h.side.toUpperCase()} ≈ ${r0(h.notionalUsd)} USD ${h.instrument} (offsets ${Math.round(scenario.hedgeRatio * 100)}% of ${h.label}; scenario P&L ${r0(h.pnlInScenario)})`) : []
    const br = breakers ? breakers.breakers.map((b) => `${b.label}: ${b.state} (${b.value} vs ${b.threshold})`) : []

    const user = [
      `AS OF: ${pf.fetchedAt}`,
      `EQUITY (approx USD): ${r0(ex.equityTotal)}; gross ${r0(ex.grossTotal)}; net ${r0(ex.netTotal)}; gross/equity ${ex.leverage === null ? 'n/a' : ex.leverage.toFixed(2)}x; top-symbol concentration ${Math.round(ex.concentration * 100)}%; unpriced positions ${ex.unpriced}.`,
      `ACCOUNTS:\n${accounts.join('\n') || 'none'}`,
      `POSITIONS (${pf.positions.length}):\n${positions.join('\n') || 'none'}`,
      `EXPOSURE BY ASSET CLASS:\n${byClass.join('\n') || 'none'}`,
      `TOP SYMBOLS:\n${bySymbol.join('\n') || 'none'}`,
      `BY VENUE:\n${byVenue.join('\n') || 'none'}`,
      `NET FACTOR EXPOSURES + RISK-OFF SCENARIO (equities -8%, crypto -15%, USD +2%, gold +3%, oil -6%, rates -25bp):\n${factors.join('\n') || 'unavailable'}\nScenario total P&L: ${scenario ? `${r0(scenario.total.pnl)} USD (${scenario.total.pctOfEquity === null ? 'n/a' : scenario.total.pctOfEquity.toFixed(2)}% of equity)` : 'unavailable'}; worst positions: ${worst.join('; ') || 'n/a'}`,
      `HEDGE PROPOSALS (research, not sent): ${hedges.join('; ') || 'none material'}${scenario ? `. After hedges: ${r0(scenario.afterHedge.pnl)} USD.` : ''}`,
      `CIRCUIT BREAKERS: ${br.join('; ') || 'unavailable'}`,
    ].join('\n\n')

    const out = await llmJson<Partial<PortfolioCommentary>>(SYSTEM, user, 1600, userId)
    const str = (v: unknown, n: number) => String(v ?? '').slice(0, n)
    const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n).map((s) => str(s, 220)) : [])
    return {
      fetchedAt: new Date().toISOString(), model: MODEL,
      headline: str(out.headline, 120) || 'Portfolio commentary', summary: str(out.summary, 500),
      concentration: arr(out.concentration, 4), exposures: arr(out.exposures, 4), scenario: arr(out.scenario, 3), risks: arr(out.risks, 4), hedgingObservations: arr(out.hedgingObservations, 3), researchQuestions: arr(out.researchQuestions, 4),
      inputs: { accounts: pf.accounts.length, positions: pf.positions.length, equity: ex.equityTotal, grossTotal: ex.grossTotal, scenarioPnl: scenario?.total.pnl ?? 0, breakersTripped: breakers?.tripped.length ?? 0 },
    }
  })
}
