// ═══════════════════════════════════════════════════════════════
// EMIL — Evolving Market Intelligence Lab · Agent Council core.
// EMIL is an ADDITIVE orchestration layer: it does not replace any engine
// and owns no execution. The council collects live reads from the
// platform's REAL specialist engines (the same code that powers the
// signal beacon, scanner, hedge engine, Shield, news radar and trader
// metrics — several of them NEXUS engines) and produces one explainable
// consensus. Prime directive order: preserve capital → control risk →
// seek quality. EMIL never promises profit.
//
// v1 operates in OBSERVE mode only: it watches and explains. Execution
// modes (Assist/Confirm/Semi/Autonomous/Away) belong to later phases
// behind typed consent + feature flags, per the EMIL build plan.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { computeEntryZone } from '@/lib/nexus/entry-exit';
import { assessOpportunity, SCAN_TFS } from '@/lib/trading/scanner-engine';
import { findHedges } from '@/lib/trading/hedge-engine';
import { loadProtectionSettings, getLock, symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';
import { todayTrades, tiltScore, edgeMeter, type ClosedTrade } from '@/lib/trading/trader-metrics';
import type { InstrumentSpec } from '@/lib/insights/risk';
import { currencyExposureMap } from '@/lib/trading/hedge-engine';
import { EA_STRATEGY_LIBRARY, strategyLibraryRead } from '@/lib/trading/emil-ea-knowledge';
import { relevantWisdom } from '@/lib/trading/emil-trading-wisdom';

export type CouncilStance = 'bull' | 'bear' | 'neutral';

export interface AgentVote {
  agent: string;
  icon: string;
  stance: CouncilStance;
  confidence: number;     // 0–100
  note: string;
}

export interface EmilConsensus {
  symbol: string;
  votes: AgentVote[];
  bulls: number; bears: number; neutrals: number;
  stance: 'BULLISH LEAN' | 'BEARISH LEAN' | 'NO EDGE' | 'STAND ASIDE';
  confidence: number;
  protectionState: 'NORMAL' | 'LOCKED';
  headline: string;       // one-line read for the Scan/Hedge strips
  explanation: string[];  // plain language, why + what could go wrong
  bestOpp: ReturnType<typeof assessOpportunity>; // scanner's best setup (null when none)
  computedAt: number;
}

export function buildCouncil(params: {
  builder: OHLCVBuilder;
  symbol: string;
  ticks: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[];
  positions: { symbol: string; direction: string; size: number; open_price: number; status: string; sl?: number | null }[];
  history: ClosedTrade[];
  specs: Record<string, InstrumentSpec> | null;
  accountId: string | null;
  balance: number;
  isLiveData: boolean;
}): EmilConsensus {
  const { builder, symbol, ticks, calendar, positions, history, specs, accountId, balance, isLiveData } = params;
  const votes: AgentVote[] = [];

  // 1 · Regime agent (NEXUS market-state, H1)
  const bars = builder.getAllBars(symbol, '60');
  const state = classifyMarketState(bars);
  if (state) {
    votes.push({
      agent: 'Market Regime', icon: '🌐',
      stance: state.state.includes('Uptrend') ? 'bull' : state.state.includes('Downtrend') ? 'bear' : 'neutral',
      confidence: state.confidence,
      note: `${state.state} · ${state.volatility}`,
    });
  } else {
    votes.push({ agent: 'Market Regime', icon: '🌐', stance: 'neutral', confidence: 0, note: 'collecting bar history' });
  }

  // 2 · Entry-zone agent (NEXUS entry-exit)
  if (state && bars.length) {
    const zone = computeEntryZone(symbol, bars, state, bars[bars.length - 1].close);
    if ('direction' in zone) {
      votes.push({
        agent: 'Entry Zones', icon: '🎯',
        stance: zone.direction === 'LONG' ? 'bull' : 'bear',
        confidence: zone.confidence,
        note: `${zone.direction} plan: entry ${zone.preferred}, stop ${zone.stop}, ${zone.riskReward1}R`,
      });
    } else {
      votes.push({ agent: 'Entry Zones', icon: '🎯', stance: 'neutral', confidence: 40, note: 'no high-quality setup — honest no-trade' });
    }
  }

  // 3 · Scanner agent (best scored opportunity for this symbol)
  let best = null as ReturnType<typeof assessOpportunity> | null;
  for (const tf of SCAN_TFS) {
    const o = assessOpportunity({ builder, symbol, tf, tick: ticks[symbol], calendar, openPositionCurrencies: [], balance, isLiveData });
    if (o && (!best || o.score > best.score)) best = o;
  }
  votes.push(best
    ? { agent: 'Trade Scanner', icon: '📡', stance: best.direction === 'BUY' ? 'bull' : 'bear', confidence: best.score, note: `${best.label} · ${best.tfLabel} · score ${best.score} (${best.scoreLabel})` }
    : { agent: 'Trade Scanner', icon: '📡', stance: 'neutral', confidence: 30, note: 'no scanner setup passes on any timeframe' });

  // 4 · Hedge agent
  if (specs) {
    const universe = Object.keys(ticks).filter((s) => ticks[s]?.bid != null);
    const { viable } = findHedges(builder, { primary: symbol, direction: 'BUY', lots: 0.1, hedgePct: 0.5 }, universe, specs, ticks);
    votes.push(viable.length
      ? { agent: 'Hedge Engine', icon: '⇄', stance: 'neutral', confidence: viable[0].corr.confidence, note: `hedge available: ${viable[0].hedgeDirection} ${viable[0].symbol} (~${viable[0].reductionPct.toFixed(0)}% est. risk reduction)` }
      : { agent: 'Hedge Engine', icon: '⇄', stance: 'neutral', confidence: 35, note: 'no reliable hedge on the current correlations' });
  }

  // 5 · News agent
  const news = upcomingHighImpact(symbolCurrencies(symbol), calendar, 4)[0] ?? null;
  votes.push(news
    ? { agent: 'News Radar', icon: '📅', stance: 'neutral', confidence: 80, note: `${news.currency} "${news.title}" ahead — volatility risk window` }
    : { agent: 'News Radar', icon: '📅', stance: 'neutral', confidence: 60, note: 'no red-flag event inside 4h' });

  // 6 · Shield agent (capital protection — can veto everything)
  const shield = loadProtectionSettings(accountId);
  const lock = getLock(accountId);
  const rulesOn = Object.values(shield).filter((r) => (r as { on: boolean }).on).length;
  votes.push({
    agent: 'Shield / Capital', icon: '🛡',
    stance: 'neutral',
    confidence: lock ? 100 : rulesOn >= 4 ? 85 : 50,
    note: lock ? 'CAPITAL LOCK ACTIVE — no new trades' : `${rulesOn} protection rule(s) armed`,
  });

  // 7 + 8 · Behaviour agents (tilt + personal edge, from the trader's real closes)
  const today = todayTrades(history);
  const tilt = today.length ? tiltScore(today) : null;
  votes.push(tilt
    ? { agent: 'Tilt Monitor', icon: '🌡', stance: tilt.level === 'HIGH' ? 'bear' : 'neutral', confidence: tilt.level === 'HIGH' ? 90 : tilt.level === 'ELEVATED' ? 65 : 45, note: `behavioural read: ${tilt.level}` }
    : { agent: 'Tilt Monitor', icon: '🌡', stance: 'neutral', confidence: 40, note: 'no closed trades today — clean slate' });
  const edge = edgeMeter(history);
  votes.push(edge
    ? { agent: 'Personal Edge', icon: '⚡', stance: edge.avgPnl >= 0 ? 'neutral' : 'bear', confidence: Math.min(90, Math.abs(edge.avgPnl)), note: `${edge.avgPnl >= 0 ? '+' : ''}$${edge.avgPnl.toFixed(2)}/trade · ${edge.winRate.toFixed(0)}% win (last ${edge.n})` }
    : { agent: 'Personal Edge', icon: '⚡', stance: 'neutral', confidence: 30, note: 'needs ≥5 closed trades to measure your edge' });

  // 9 · Exposure agent
  if (specs) {
    const exp = currencyExposureMap(positions, specs);
    const top = exp[0];
    const shared = top ? symbolCurrencies(symbol).includes(top.ccy) : false;
    votes.push(top
      ? { agent: 'Exposure Map', icon: '🧭', stance: 'neutral', confidence: shared ? 75 : 45, note: shared ? `largest exposure ${top.ccy} (${top.net >= 0 ? 'long' : 'short'} $${Math.abs(top.net).toFixed(0)}) — ${symbol} adds to it` : `largest exposure: ${top.ccy}` }
      : { agent: 'Exposure Map', icon: '🧭', stance: 'neutral', confidence: 40, note: 'no open positions — no concentration risk' });
  }

  // 10 · Strategy Library agent (bundled EA knowledge — cites the closest
  // playbook for the live regime; observe-only, no execution path)
  if (EA_STRATEGY_LIBRARY.length) {
    const lib = strategyLibraryRead(state?.state ?? null, '1H');
    votes.push({ agent: 'Strategy Library', icon: '📚', stance: lib.stance, confidence: lib.confidence, note: lib.note });
  }

  // ── Consensus ──
  const bulls = votes.filter((v) => v.stance === 'bull').length;
  const bears = votes.filter((v) => v.stance === 'bear').length;
  const neutrals = votes.filter((v) => v.stance === 'neutral').length;
  const protectionState: EmilConsensus['protectionState'] = lock ? 'LOCKED' : 'NORMAL';

  let stance: EmilConsensus['stance'];
  if (lock || (tilt && tilt.level === 'HIGH')) stance = 'STAND ASIDE';
  else if (bulls >= bears + 2) stance = 'BULLISH LEAN';
  else if (bears >= bulls + 2) stance = 'BEARISH LEAN';
  else stance = 'NO EDGE';

  const dirVotes = votes.filter((v) => v.stance !== 'neutral');
  const confidence = dirVotes.length
    ? Math.round(dirVotes.reduce((a, v) => a + v.confidence, 0) / dirVotes.length * (stance === 'NO EDGE' ? 0.6 : 1))
    : 30;

  const headline = `EMIL · ${symbol}: ${bulls}🐂 ${bears}🐻 ${neutrals}◽ → ${stance}${stance !== 'STAND ASIDE' && stance !== 'NO EDGE' ? ` (${confidence}%)` : ''} · protection ${protectionState}`;

  const explanation: string[] = [
    `Council of ${votes.length} live engines on ${symbol}: ${bulls} bullish, ${bears} bearish, ${neutrals} neutral. Verdict: ${stance}.`,
    stance === 'STAND ASIDE'
      ? (lock ? 'Capital protection has vetoed all new risk — the Shield lock overrides every other signal, by design.' : 'Behavioural risk (tilt HIGH) vetoes new trades: the best expectancy right now is a pause, not a position.')
      : stance === 'NO EDGE'
        ? 'The engines disagree or sit neutral — pressing without an edge is how spreads and noise eat accounts. Waiting is a position.'
        : `Directional engines lean ${stance === 'BULLISH LEAN' ? 'long' : 'short'} with average confidence ${confidence}%. That is a lean, not a certainty.`,
    'What could go wrong: the regime can flip on one candle, news can gap through stops, correlations can break, and every engine here is an estimate computed from ' + (isLiveData ? 'live' : 'simulated platform') + ' data. Capital first, always.',
  ];

  // Trading Wisdom advisory — distilled method principles from studying the
  // worldwide EA ecosystem. Adds caution/context only; never raises risk.
  const wise = relevantWisdom([
    stance, state?.state ?? '', news ? 'news' : '', lock ? 'lock' : '',
    tilt?.level === 'HIGH' ? 'tilt' : '', best?.label ?? '', symbol,
  ], 1)[0];
  if (wise) explanation.push(`Wisdom (${wise.topic}): ${wise.application} Caution: ${wise.caution}`);

  return { symbol, votes, bulls, bears, neutrals, stance, confidence, protectionState, headline, explanation, bestOpp: best, computedAt: Date.now() };
}

// ── EMIL automation envelope (Confirm / Autonomous Pilot) ───────

export interface EmilAutoParams {
  selectAll: boolean;       // EMIL selects instruments himself (whole universe)
  symbols: string[];        // optional restriction list (used when selectAll off)
  minScore: number;         // scanner score floor
  minCouncilConf: number;   // council confidence floor
  maxPerDay: number;        // max EMIL entries per day
  stopAfterLosses: number;  // consecutive EMIL losses → pause
  dailyLossStop: number;    // $ realized EMIL loss → pause for the day
  dailyProfitLock: number;  // $ realized EMIL profit → bank & pause (0 = off)
  riskPct: number;          // % balance risked per entry (sizing)
  baseLot: number;          // default/floor lot (0.01 by default)
  autoHedge: boolean;       // may hedge adverse positions when the council is uncertain
  smallSteady: boolean;     // Small & Steady: base lot only, stricter quality bar
  profitOnly: boolean;      // capital never risked once armed: trade from profits only
  protectedCapital: number; // $ balance line EMIL must never draw below with new risk
  tradableProfitPct: number;// % of the profit cushion available to risk per trade
  // Trade Mode Engine (§modes): who controls the mode, and which are allowed.
  setupChoice: 'mine' | 'emil' | 'hybrid';   // Use My Parameters / Let EMIL Handle All / Guide EMIL
  modeControl: 'trader' | 'shared' | 'emil'; // trader picks · EMIL picks from approved list · EMIL fully managed
  enabledModes: string[];                    // allowed style labels (matched to ScanTF.style)
  // Governance layer: profit-decay protection + autonomous permission expiry.
  maxGiveback: number;                       // $ of the day's peak EMIL P&L allowed to be given back (0 = off)
  expiryMode: 'session' | 'day' | 'week' | 'manual'; // when autonomous permission lapses to Prepare
  allowedSessions: string[];                 // pilot may open NEW entries only while one of these is open (all 4 = always)
}

export const DEFAULT_EMIL_AUTOPARAMS: EmilAutoParams = {
  selectAll: true,
  symbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
  minScore: 70,
  minCouncilConf: 55,
  maxPerDay: 6,
  stopAfterLosses: 2,
  dailyLossStop: 300,
  dailyProfitLock: 0,
  riskPct: 1,
  baseLot: 0.01,
  autoHedge: true,
  smallSteady: false,
  profitOnly: false,
  protectedCapital: 0,
  tradableProfitPct: 20,
  setupChoice: 'emil',
  modeControl: 'emil',
  enabledModes: SCAN_TFS.map((t) => t.style),
  maxGiveback: 0,
  expiryMode: 'session',
  allowedSessions: ['SYD', 'TYO', 'LON', 'NYC'],
};

/** When the current autonomous consent was recorded (null if never). */
export function emilConsentAcceptedAt(): number | null {
  try {
    const raw = localStorage.getItem(EMIL_AUTO_CONSENT_KEY);
    if (!raw) return null;
    const t = new Date((JSON.parse(raw) as { acceptedAt?: string }).acceptedAt ?? '').getTime();
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
}

const EMIL_PARAMS_KEY = 'raptor_emil_autoparams_v1';
const EMIL_AUTO_CONSENT_KEY = 'raptor_emil_auto_consent_v1';
const EMIL_LOG_KEY = 'raptor_emil_log_v1';

export function loadEmilAutoParams(): EmilAutoParams {
  try { return { ...DEFAULT_EMIL_AUTOPARAMS, ...(JSON.parse(localStorage.getItem(EMIL_PARAMS_KEY) || '{}')) }; } catch { return { ...DEFAULT_EMIL_AUTOPARAMS }; }
}

export function saveEmilAutoParams(p: EmilAutoParams): void {
  try { localStorage.setItem(EMIL_PARAMS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function isEmilAutoConsented(): boolean {
  try { return !!localStorage.getItem(EMIL_AUTO_CONSENT_KEY); } catch { return false; }
}

export function recordEmilAutoConsent(typed: string, params: EmilAutoParams): void {
  try {
    localStorage.setItem(EMIL_AUTO_CONSENT_KEY, JSON.stringify({
      version: 1, typed, params, acceptedAt: new Date().toISOString(),
    }));
  } catch { /* ignore */ }
}

export interface EmilLogEntry { ts: number; kind: 'entry' | 'exit' | 'breakeven' | 'blocked' | 'mode' | 'lock'; text: string }

export function emilLog(kind: EmilLogEntry['kind'], text: string): void {
  try {
    const log = JSON.parse(localStorage.getItem(EMIL_LOG_KEY) || '[]') as EmilLogEntry[];
    log.push({ ts: Date.now(), kind, text });
    localStorage.setItem(EMIL_LOG_KEY, JSON.stringify(log.slice(-300)));
  } catch { /* ignore */ }
}

export function loadEmilLog(): EmilLogEntry[] {
  try { return JSON.parse(localStorage.getItem(EMIL_LOG_KEY) || '[]'); } catch { return []; }
}

// ── EMIL continuous learning (transparent, risk-reducing only) ──
// EMIL tracks his OWN closed results per symbol × timeframe bucket and stops
// trading buckets that keep losing. This only ever REDUCES risk (avoidance),
// never raises it — so it applies automatically and is fully logged. The
// broader approval-gated preference learning belongs to a later phase.

const EMIL_LEARN_KEY = 'raptor_emil_learn_v1';

interface LearnBucket { n: number; wins: number }
type LearnStore = Record<string, LearnBucket>;

function loadLearn(): LearnStore {
  try { return JSON.parse(localStorage.getItem(EMIL_LEARN_KEY) || '{}'); } catch { return {}; }
}

export function recordEmilOutcome(symbol: string, tf: string, win: boolean): { avoided: boolean; bucket: LearnBucket } {
  const store = loadLearn();
  const key = `${symbol}|${tf}`;
  const b = (store[key] ??= { n: 0, wins: 0 });
  b.n += 1;
  if (win) b.wins += 1;
  try { localStorage.setItem(EMIL_LEARN_KEY, JSON.stringify(store)); } catch { /* ignore */ }
  return { avoided: b.n >= 3 && b.wins / b.n < 0.34, bucket: b };
}

export function emilShouldAvoid(symbol: string, tf: string): boolean {
  const b = loadLearn()[`${symbol}|${tf}`];
  return !!b && b.n >= 3 && b.wins / b.n < 0.34;
}

/** Safe-learning ranking bonus: buckets with a proven edge get preferred,
 *  weak ones deprioritised (selection preference only — never a risk change). */
export function emilLearnBonus(symbol: string, tf: string): number {
  const b = loadLearn()[`${symbol}|${tf}`];
  if (!b || b.n < 3) return 0;
  return Math.round((b.wins / b.n - 0.5) * 20); // ±10 points max
}

export function loadEmilLearning(): { key: string; n: number; wins: number; avoided: boolean }[] {
  const store = loadLearn();
  return Object.entries(store).map(([key, b]) => ({ key, n: b.n, wins: b.wins, avoided: b.n >= 3 && b.wins / b.n < 0.34 }));
}

// ── EMIL onboarding / consent (v1: observe-only) ────────────────

export const EMIL_DISCLAIMER =
  'Trading leveraged financial instruments involves substantial risk and may result in the loss of part or all of the trader’s capital. EMIL is a decision-support and automation tool and does not guarantee profits, prevent losses, or replace the trader’s judgement. All trading instructions, permissions, risk settings, and automated actions remain the trader’s responsibility. The broker, platform provider, technology provider, liquidity provider, and their affiliates are not responsible for losses arising from market movement, execution, connectivity, configuration, automation, or use of EMIL.';

const EMIL_CONSENT_KEY = 'raptor_emil_consent_v1';

export function isEmilOnboarded(): boolean {
  try { return !!localStorage.getItem(EMIL_CONSENT_KEY); } catch { return false; }
}

export function recordEmilOnboarding(): void {
  try {
    localStorage.setItem(EMIL_CONSENT_KEY, JSON.stringify({ version: 1, mode: 'observe', acceptedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}
