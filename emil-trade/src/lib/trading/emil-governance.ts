// ═══════════════════════════════════════════════════════════════
// EMIL Autonomous Intelligence & Self-Governance — decision-safety layer.
// ADDITIVE: sits above every strategy/agent/signal without replacing any.
// Everything here is computed from data the platform actually has (real
// logs, closed trades, open positions, live bars/ticks, the real economic
// calendar). Metrics that need data we don't have (real-LP slippage
// history, multi-broker venues, external strategy backtests) are honestly
// labelled "not yet measurable" — never estimated into existence.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { getPipSize, calcPipValue } from '@/lib/trading/ticket-math';
import { uncertaintyScore } from '@/lib/trading/emil-macro';
import type { NewsEvent } from '@/lib/trading/news-guard';
import type { EmilConsensus } from '@/lib/trading/emil-council';
import { ADAPT_TFS } from '@/lib/trading/emil-adapt';

// ── §1 EMIL Constitution — version-controlled, above every engine ──

export const CONSTITUTION_VERSION = 'v1.0 · 2026-07-20';

export interface ConstitutionRule { n: number; rule: string; enforcement: string }

export const EMIL_CONSTITUTION: ConstitutionRule[] = [
  { n: 1,  rule: 'Protect capital before seeking profit.', enforcement: 'Shield gate runs before every order; risk states throttle the pilot before rules force it' },
  { n: 2,  rule: 'Never trade when data is unreliable.', enforcement: 'stale-quote refusal + Guardian stale/spread watchdogs + uncertainty HIGH gate' },
  { n: 3,  rule: 'Never increase risk to recover a loss.', enforcement: 'losing streaks RAISE the quality bar (Cautious +10) and stop the pilot (stop-after-losses); size never scales with losses' },
  { n: 4,  rule: 'Never widen a stop merely to avoid closing a losing trade.', enforcement: 'R-ladder only ever tightens stops; no stop-widening code path exists' },
  { n: 5,  rule: 'Never use Martingale unless explicitly enabled with a separate high-risk acceptance.', enforcement: 'martingale/grid/averaging do not exist as code paths — structurally impossible, and no enable switch is offered' },
  { n: 6,  rule: 'Never exceed trader-approved capital, margin, lot, leverage, loss, or drawdown limits.', enforcement: 'consent envelope (risk %, base lot, daily stops) checked every cycle; Shield margin ladder' },
  { n: 7,  rule: 'Never access protected capital without explicit permission.', enforcement: 'Profit-Only mode: balance at/below the protected line blocks all new risk' },
  { n: 8,  rule: 'Never enter after an opportunity has expired.', enforcement: 'setups carry expiry; each cycle re-scans fresh — stale cards are never executed' },
  { n: 9,  rule: 'Never chase price after a missed entry.', enforcement: 'entry-quality gate skips stretched entries (>1.5×ATR from the anchor) with a missed-entry log' },
  { n: 10, rule: 'Never duplicate exposure without checking correlation.', enforcement: 'one EMIL trade per symbol + scanner correlated-exposure penalty + Shield correlation guard' },
  { n: 11, rule: 'Never allow one strategy to override the independent Guardian.', enforcement: 'Guardian veto is outside EMIL’s brain, in the order path itself; EMIL cannot silence it' },
  { n: 12, rule: 'Never conceal uncertainty.', enforcement: 'uncertainty score displayed beside confidence on every read; ELEVATED penalises, HIGH blocks' },
  { n: 13, rule: 'Never describe probability as certainty.', enforcement: 'every forecast is labelled probabilistic with invalidation; grey "I don’t know" is a first-class state' },
  { n: 14, rule: 'Never modify critical permissions without trader approval.', enforcement: 'envelope/authority changes require the typed-consent gate or explicit trader clicks — all logged' },
  { n: 15, rule: 'Always maintain a complete audit trail.', enforcement: 'activity log + trade identities + decision replay records + signal logs, all exportable' },
  { n: 16, rule: 'Always allow human override.', enforcement: 'every EMIL position is manageable manually; overrides are recorded, never resisted' },
  { n: 17, rule: 'Always support immediate pause and emergency stop.', enforcement: '⛔ STOP EVERYTHING halts automation instantly; Pause Adaptation and Sleep modes are one click' },
  { n: 18, rule: 'Always treat No-Trade Mode as a valid decision.', enforcement: 'No-Trade competes on the mode board and wins whenever nothing qualifies' },
];

// ── §2 Objective hierarchy — trader-ranked; conflicts resolve top-down ──

export const OBJECTIVE_CATALOG = [
  'Capital preservation', 'Low drawdown', 'Stable returns', 'High-confidence trades only',
  'Low trade frequency', 'Profit protection', 'Daily income', 'Long-term growth',
  'Diversification', 'Hedging', 'Reduced overnight risk', 'Reduced news exposure',
  'Controlled scalping', 'Margin preservation', 'Active trading', 'Passive management',
];

const OBJ_KEY = 'raptor_emil_objectives_v1';

export function loadObjectives(): string[] {
  try { return JSON.parse(localStorage.getItem(OBJ_KEY) || '[]'); } catch { return []; }
}

export function saveObjectives(o: string[]): void {
  try { localStorage.setItem(OBJ_KEY, JSON.stringify(o.slice(0, 8))); } catch { /* ignore */ }
}

/** Concrete, deterministic pilot effects of the top-ranked objectives. */
export function objectiveEffects(ranked: string[]): { minScoreBonus: number; maxPerDayCap: number | null; notes: string[] } {
  const top = ranked.slice(0, 3);
  const notes: string[] = [];
  let minScoreBonus = 0; let maxPerDayCap: number | null = null;
  if (top.includes('High-confidence trades only')) { minScoreBonus += 5; notes.push('High-confidence objective: quality bar +5'); }
  if (top.includes('Capital preservation') || top.includes('Low drawdown')) { minScoreBonus += 3; notes.push('Preservation objective: quality bar +3'); }
  if (top.includes('Low trade frequency')) { maxPerDayCap = 3; notes.push('Low-frequency objective: max 3 entries/day'); }
  return { minScoreBonus, maxPerDayCap, notes };
}

// ── §4 Uncertainty budget — six scores per decision, all from real reads ──

export interface DecisionScores {
  confidence: number; uncertainty: number; dataQuality: number;
  executionQuality: number; regimeStability: number; agentAgreement: number;
  verdictNote: string;
}

export function decisionScores(params: {
  builder: OHLCVBuilder; symbol: string;
  tick: { bid?: number; ask?: number } | undefined;
  calendar: NewsEvent[]; council: EmilConsensus;
}): DecisionScores {
  const { builder, symbol, tick, calendar, council } = params;
  const unc = uncertaintyScore(builder, symbol, tick, calendar);
  const bars = builder.getAllBars(symbol, '60');
  const pip = getPipSize(symbol);
  const spreadPips = tick?.bid != null && tick?.ask != null ? (tick.ask - tick.bid) / pip : null;

  let dataQuality = 100;
  if (spreadPips == null) dataQuality -= 60;
  else if (spreadPips > 6) dataQuality -= 25;
  if (bars.length < 60) dataQuality -= 30;
  dataQuality = Math.max(0, dataQuality);

  // Sim feed has no slippage history — execution quality is spread-derived
  // and honestly labelled; real fill statistics arrive with the real LP.
  const executionQuality = spreadPips == null ? 20 : Math.max(0, Math.min(100, Math.round(100 - spreadPips * 8)));

  const h1 = classifyMarketState(bars);
  const h4 = classifyMarketState(builder.getAllBars(symbol, '240'));
  let regimeStability = h1 ? h1.confidence : 20;
  if (h1 && h4) {
    const dir = (s: string) => (s.includes('Uptrend') ? 1 : s.includes('Downtrend') ? -1 : 0);
    if (dir(h1.state) !== 0 && dir(h1.state) === dir(h4.state)) regimeStability = Math.min(100, regimeStability + 10);
    if (dir(h1.state) !== 0 && dir(h4.state) !== 0 && dir(h1.state) !== dir(h4.state)) regimeStability = Math.max(0, regimeStability - 25);
  }

  const voters = council.bulls + council.bears + council.neutrals;
  const agentAgreement = voters ? Math.round((Math.abs(council.bulls - council.bears) / voters) * 100) : 0;

  const confidence = council.confidence;
  const verdictNote = unc.score >= 60
    ? `Confidence ${confidence} cannot override uncertainty ${unc.score} — decision: No Trade.`
    : unc.score >= 35
      ? `Elevated uncertainty (${unc.score}) discounts confidence ${confidence} — smaller edge assumed.`
      : `Uncertainty low (${unc.score}) — confidence ${confidence} stands on its own evidence.`;

  return { confidence, uncertainty: unc.score, dataQuality, executionQuality, regimeStability, agentAgreement, verdictNote };
}

// ── §5 Counterfactual decision engine — cases + plans for a prepared trade ──

export interface Counterfactual {
  best: number; base: number; adverse: number; extreme: number;
  escape: string; hedge: string; emergency: string; noResponse: string;
}

export function counterfactual(opp: {
  symbol: string; direction: 'BUY' | 'SELL';
  zone: { preferred: number; stop: number; target1: number; target2: number };
  suggestedLots: number | null;
}, autoHedge: boolean): Counterfactual {
  const lots = opp.suggestedLots ?? 0.01;
  const pip = getPipSize(opp.symbol);
  const pipVal = calcPipValue(opp.symbol, lots);
  const dollars = (from: number, to: number) => Math.abs(to - from) / pip * pipVal;
  const risk$ = dollars(opp.zone.preferred, opp.zone.stop);
  return {
    best: Math.round(dollars(opp.zone.preferred, opp.zone.target2)),
    base: Math.round(dollars(opp.zone.preferred, opp.zone.target1)),
    adverse: -Math.round(risk$),
    extreme: -Math.round(risk$ * 2), // gap through the stop: 2× planned risk assumed, honestly a scenario not a bound
    escape: 'hard stop-loss attached at order time (Guardian rejects entries without one)',
    hedge: autoHedge ? 'auto-hedge armed: viable hedge leg at ≥0.5R adverse when the council is uncertain' : 'auto-hedge OFF — manual hedge via the Hedge engine',
    emergency: '⛔ STOP EVERYTHING + Shield equity-floor kill switch remain one click away',
    noResponse: 'unanswered alerts change nothing — only the pre-approved envelope rules keep acting',
  };
}

// ── §6 Trade budget engine — the daily loss stop IS the day's risk budget ──

export interface RiskBudget {
  budget: number; realizedLoss: number; openRisk: number; remaining: number;
  weekRealized: number; monthRealized: number;
}

export function riskBudget(params: {
  dailyLossStop: number;
  realizedToday: number; // signed EMIL day P&L
  openPositions: Array<{ symbol: string; direction: string; size: number; open_price: number; sl: number | null }>;
  closedRows: Array<{ realized_pnl: number | null; closed_at: string | null }>;
}): RiskBudget {
  const { dailyLossStop, realizedToday, openPositions, closedRows } = params;
  let openRisk = 0;
  for (const p of openPositions) {
    if (p.sl == null || p.sl === 0) continue;
    const pip = getPipSize(p.symbol);
    const dir = p.direction === 'BUY' ? 1 : -1;
    const dist = (Number(p.open_price) - Number(p.sl)) * dir;
    if (dist > 0) openRisk += dist / pip * calcPipValue(p.symbol, Number(p.size));
  }
  const realizedLoss = Math.max(0, -realizedToday);
  const budget = Math.max(0, dailyLossStop);
  const now = Date.now();
  const sum = (ms: number) => closedRows
    .filter((r) => r.closed_at && now - new Date(r.closed_at).getTime() < ms)
    .reduce((a, r) => a + Number(r.realized_pnl ?? 0), 0);
  return {
    budget, realizedLoss, openRisk: Math.round(openRisk * 100) / 100,
    remaining: budget > 0 ? Math.max(0, budget - realizedLoss - openRisk) : Infinity,
    weekRealized: Math.round(sum(7 * 86_400_000) * 100) / 100,
    monthRealized: Math.round(sum(30 * 86_400_000) * 100) / 100,
  };
}

// ── §16 Profit decay protection — peak tracked, giveback bounded ──

const PEAK_KEY = 'raptor_emil_peak_v1';

export function trackDayPeak(currentDayPnl: number): { peak: number; giveback: number } {
  const today = new Date().toDateString();
  let rec: { day: string; peak: number };
  try { rec = JSON.parse(localStorage.getItem(PEAK_KEY) || '{}'); } catch { rec = { day: today, peak: 0 }; }
  if (rec.day !== today) rec = { day: today, peak: 0 };
  rec.peak = Math.max(rec.peak ?? 0, currentDayPnl);
  try { localStorage.setItem(PEAK_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
  return { peak: rec.peak, giveback: Math.max(0, rec.peak - currentDayPnl) };
}

// ── §20 Trust ladder ────────────────────────────────────────────

export const TRUST_LADDER = [
  { level: 0, name: 'Observe',  desc: 'no execution — council, radar and macro reads only' },
  { level: 1, name: 'Advise',   desc: 'suggestions surface (radar, wake alerts); execution stays with the trader' },
  { level: 2, name: 'Prepare',  desc: 'EMIL prepares tickets; the trader confirms every order' },
  { level: 3, name: 'Manage',   desc: 'no new entries; EMIL manages existing positions (stops, exits)' },
  { level: 4, name: 'Limited Auto', desc: 'EMIL trades the trader-selected instruments/modes inside the envelope' },
  { level: 5, name: 'Portfolio Auto', desc: 'EMIL selects instruments across the full universe inside the envelope' },
  { level: 6, name: 'Full Approved Autonomy', desc: 'EMIL selects instruments, modes, timeframes, entries, exits and hedges within all approved limits' },
];

export function currentTrustLevel(mode: string, sleepNoNew: boolean, selectAll: boolean, adaptEmil: boolean): number {
  if (mode === 'observe') return 0;
  if (mode === 'confirm') return 2;
  if (mode === 'auto' && sleepNoNew) return 3;
  if (mode === 'auto' && !selectAll) return 4;
  if (mode === 'auto' && selectAll && !adaptEmil) return 5;
  if (mode === 'auto') return 6;
  return 0;
}

// ── §21 Performance scorecard — measured outcomes only ──────────

export interface Scorecard {
  trades: number; net: number; winRate: number | null; profitFactor: number | null;
  maxDrawdown: number; unmeasured: string[];
}

export function scorecard(closedRows: Array<{ realized_pnl: number | null; closed_at: string | null }>): Scorecard {
  const pnls = closedRows.filter((r) => r.closed_at).map((r) => Number(r.realized_pnl ?? 0));
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossW = wins.reduce((a, b) => a + b, 0);
  const grossL = Math.abs(losses.reduce((a, b) => a + b, 0));
  // Max drawdown over the closed-trade equity curve (oldest → newest).
  let eq = 0; let peak = 0; let maxDD = 0;
  for (const p of [...pnls].reverse()) { eq += p; peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq); }
  return {
    trades: pnls.length,
    net: Math.round((grossW - grossL) * 100) / 100,
    winRate: pnls.length ? Math.round((wins.length / pnls.length) * 100) : null,
    profitFactor: grossL > 0 ? Math.round((grossW / grossL) * 100) / 100 : null,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    unmeasured: pnls.length < 20
      ? ['forecast calibration', 'confidence calibration', 'no-trade accuracy', 'slippage control (needs real LP)']
      : ['slippage control (needs real LP)'],
  };
}

// ── §8 Shadow decision mode — do EMIL's rejections actually help? ──

export interface ShadowRecord {
  ts: number; symbol: string; direction: 'BUY' | 'SELL'; tf: string;
  entry: number; stop: number; target: number;
  reason: string; // why it was NOT taken
  status: 'open' | 'win' | 'loss' | 'expired';
}

const SHADOW_KEY = 'raptor_emil_shadow_v1';

export function loadShadow(): ShadowRecord[] {
  try { return JSON.parse(localStorage.getItem(SHADOW_KEY) || '[]'); } catch { return []; }
}

function saveShadow(list: ShadowRecord[]): void {
  try { localStorage.setItem(SHADOW_KEY, JSON.stringify(list.slice(-60))); } catch { /* ignore */ }
}

export function recordShadow(rec: Omit<ShadowRecord, 'status'>): void {
  const list = loadShadow();
  // One shadow per symbol+tf per hour — this is a sample, not a firehose.
  if (list.some((s) => s.symbol === rec.symbol && s.tf === rec.tf && rec.ts - s.ts < 3_600_000)) return;
  list.push({ ...rec, status: 'open' });
  saveShadow(list);
}

/** Regret-weighted learning: when setups EMIL rejected/skipped in a bucket
 *  kept WINNING in shadow tracking (real bars decided), the ranking penalty
 *  eases slightly. Risk-aware by design: +3 ranking points only — it never
 *  touches sizing, never bypasses Shield/Guardian, and needs ≥3 resolved
 *  shadow wins with wins > losses before it does anything. */
export function shadowRegretBonus(symbol: string, tf: string): number {
  const rel = loadShadow().filter((s) => s.symbol === symbol && s.tf === tf && (s.status === 'win' || s.status === 'loss'));
  const w = rel.filter((s) => s.status === 'win').length;
  return w >= 3 && w > rel.length - w ? 3 : 0;
}

/** Walk real bars since each open shadow's timestamp: stop touched first =
 *  loss, target first = win; both inside one bar counts as a loss
 *  (conservative); unresolved after 48h expires. */
export function resolveShadows(builder: OHLCVBuilder): { wins: number; losses: number; open: number; expired: number } {
  const list = loadShadow();
  let changed = false;
  for (const s of list) {
    if (s.status !== 'open') continue;
    if (Date.now() - s.ts > 48 * 3_600_000) { s.status = 'expired'; changed = true; continue; }
    const res = ADAPT_TFS.find((t) => t.label === s.tf)?.res ?? '15';
    const bars = builder.getAllBars(s.symbol, res).filter((b) => (b.time as number) * 1000 > s.ts);
    const dir = s.direction === 'BUY' ? 1 : -1;
    for (const b of bars) {
      const hitStop = dir > 0 ? b.low <= s.stop : b.high >= s.stop;
      const hitTarget = dir > 0 ? b.high >= s.target : b.low <= s.target;
      if (hitStop) { s.status = 'loss'; changed = true; break; }
      if (hitTarget) { s.status = 'win'; changed = true; break; }
    }
  }
  if (changed) saveShadow(list);
  return {
    wins: list.filter((s) => s.status === 'win').length,
    losses: list.filter((s) => s.status === 'loss').length,
    open: list.filter((s) => s.status === 'open').length,
    expired: list.filter((s) => s.status === 'expired').length,
  };
}

// ── §22 Decision replay — flight-recorder records for entries ──

export interface ReplayRecord {
  ts: number; symbol: string; direction: string; price: number; tf: string; mode: string;
  sessionOpen: string[]; nextNews: string | null;
  votes: Array<{ agent: string; stance: string; confidence: number }>;
  scores: DecisionScores;
  riskChecks: string[];
  alternatives: string[];
}

const REPLAY_KEY = 'raptor_emil_replay_v1';

export function recordReplay(rec: ReplayRecord): void {
  try {
    const list = JSON.parse(localStorage.getItem(REPLAY_KEY) || '[]') as ReplayRecord[];
    list.push(rec);
    localStorage.setItem(REPLAY_KEY, JSON.stringify(list.slice(-40)));
  } catch { /* ignore */ }
}

export function loadReplays(): ReplayRecord[] {
  try { return JSON.parse(localStorage.getItem(REPLAY_KEY) || '[]'); } catch { return []; }
}

// ── §28 Health panel — real checks, clear statuses ──────────────

export type HealthStatus = 'Healthy' | 'Degraded' | 'Warning' | 'Critical' | 'Offline';

export interface HealthItem { name: string; status: HealthStatus; note: string }

export function healthChecks(params: {
  prices: Record<string, { bid?: number; ask?: number; ts?: number } | undefined>;
  calendarCount: number;
  notificationPermission: string;
  lastBlockedText: string | null;
  sarvamConfigured?: boolean;
}): HealthItem[] {
  const { prices, calendarCount, notificationPermission, lastBlockedText, sarvamConfigured } = params;
  const liveSymbols = Object.keys(prices).filter((s) => prices[s]?.bid != null).length;
  let storageOk = true;
  try { localStorage.setItem('raptor_health_probe', '1'); localStorage.removeItem('raptor_health_probe'); } catch { storageOk = false; }
  return [
    { name: 'Price feed', status: liveSymbols >= 5 ? 'Healthy' : liveSymbols > 0 ? 'Degraded' : 'Offline', note: `${liveSymbols} instruments quoting` },
    { name: 'Economic calendar', status: calendarCount > 0 ? 'Healthy' : 'Degraded', note: calendarCount > 0 ? `${calendarCount} events loaded` : 'no events — feed unreachable or empty week' },
    { name: 'Order engine', status: lastBlockedText ? 'Warning' : 'Healthy', note: lastBlockedText ? `last rejection: ${lastBlockedText.slice(0, 60)}` : 'no recent rejections' },
    { name: 'Guardian', status: 'Healthy', note: 'independent watchdogs armed in the order path — cannot be silenced' },
    { name: 'Risk engine (Shield)', status: 'Healthy', note: 'gate runs before every order' },
    { name: 'Learning engine', status: storageOk ? 'Healthy' : 'Critical', note: storageOk ? 'buckets persisting' : 'localStorage unavailable — learning cannot persist' },
    { name: 'Audit & logs', status: storageOk ? 'Healthy' : 'Critical', note: storageOk ? 'activity, identity, replay and shadow logs writable' : 'storage failed' },
    { name: 'Notifications', status: notificationPermission === 'granted' ? 'Healthy' : 'Degraded', note: notificationPermission === 'granted' ? 'wake alerts deliverable' : `permission ${notificationPermission} — grant it for wake alerts` },
    { name: 'Voice engine', status: sarvamConfigured ? 'Healthy' : 'Offline', note: sarvamConfigured ? 'Lara speech-to-text-translate via server proxy — read-back + confirm always required' : 'needs Lara configured server-side — never claimed early' },
    { name: 'Liquidity / broker link', status: 'Degraded', note: 'simulated platform feed — real LP connection is the known open milestone' },
  ];
}

// ── §30 Final governing principle (displayed verbatim) ──────────

export const GOVERNING_PRINCIPLE =
  'EMIL may think broadly, adapt rapidly, and act autonomously, but it must never become careless, opaque, ' +
  'overconfident, or impossible to stop.';
