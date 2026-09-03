// ═══════════════════════════════════════════════════════════════
// RAPTOR Global Trade Opportunity Scanner — analysis core.
// A modular intelligence layer over the platform's EXISTING engines:
// regime classification (nexus/market-state), entry/exit zones
// (nexus/entry-exit), news risk (news-guard), correlation/exposure
// (hedge-engine, protection) and ticket math. It produces ranked,
// transparent opportunity cards; it owns NO execution — orders go through
// the normal Shield-gated order service with a unique Scanner source tag.
//
// Honesty contract: only instruments the platform actually serves are
// scanned; every card names its data source; scores are a transparent
// weighted model with the components shown; weak/conflicting evidence is
// displayed, never hidden; no statistic is fabricated.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder, Resolution } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState, type MarketStateAssessment } from '@/lib/nexus/market-state';
import { computeEntryZone, type EntryZoneAssessment } from '@/lib/nexus/entry-exit';
import { atr } from '@/lib/trading/indicators';
import { getPipSize, calcPipValue, calcMarginRequired, lotsForRiskPct } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';

// ── Scan timeframes → trading styles ────────────────────────────

export interface ScanTF { label: string; res: Resolution; style: string; holding: string }

export const SCAN_TFS: ScanTF[] = [
  { label: 'M1',  res: '1',   style: 'Scalping',      holding: 'minutes' },
  { label: 'M5',  res: '5',   style: 'Fast Intraday', holding: 'minutes to an hour' },
  { label: 'M15', res: '15',  style: 'Intraday',   holding: 'minutes to one session' },
  { label: 'H1',  res: '60',  style: 'Intraday / Swing', holding: 'hours to a day' },
  { label: 'H4',  res: '240', style: 'Swing',      holding: 'a day to several weeks' },
  { label: 'D1',  res: '1D',  style: 'Positional', holding: 'weeks to months' },
];

export type AssetClass = 'forex' | 'metal' | 'energy' | 'index' | 'crypto';

export function assetClassOf(symbol: string): AssetClass {
  if (/^XA[UG]/.test(symbol)) return 'metal';
  if (['USOIL', 'UKOIL', 'NATGAS'].includes(symbol)) return 'energy';
  if (['US30', 'NAS100', 'SPX500'].includes(symbol)) return 'index';
  if (/^(BTC|ETH)/.test(symbol)) return 'crypto';
  return 'forex';
}

// ── Opportunity model ───────────────────────────────────────────

export interface ScoreComponent { name: string; score: number; weight: number; note: string }

export interface Opportunity {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  venue: string;
  direction: 'BUY' | 'SELL';
  label: string;              // Strong Buy … Watch for Sell / News Risk
  labelColor: string;
  opportunityType: string;    // trend-continuation pullback, etc.
  style: string;
  tfLabel: string;
  holding: string;
  expectedDurationNote: string;
  regime: MarketStateAssessment;
  htfState: string | null;    // one timeframe up — confluence check
  htfAligned: boolean | null;
  zone: EntryZoneAssessment;
  tp3: number;
  trailingNote: string;
  breakEvenTrigger: number;
  expectedPips: number;
  spreadPips: number | null;
  atrPct: number;
  score: number;
  scoreLabel: string;
  components: ScoreComponent[];
  reasonsFor: string[];
  reasonsAgainst: string[];
  invalidation: string;
  news: NewsEvent | null;
  suggestedLots: number | null;
  marginEstimate: number | null;
  maxLossEstimate: number | null;
  correlatedExposure: string | null;  // shared-currency warning vs open positions
  freshAt: number;
  expiresAt: number;
}

export const SCORE_LABELS = (s: number) =>
  s >= 90 ? 'Exceptional' : s >= 80 ? 'Strong' : s >= 70 ? 'Good' : s >= 60 ? 'Moderate' : 'Watchlist only';

function directionLabel(dir: 'BUY' | 'SELL', score: number, newsSoon: boolean): { label: string; color: string } {
  if (newsSoon) return { label: 'News Risk', color: '#FFB300' };
  if (score >= 80) return dir === 'BUY' ? { label: 'Strong Buy', color: '#00C27A' } : { label: 'Strong Sell', color: '#FF5252' };
  if (score >= 70) return dir === 'BUY' ? { label: 'Buy', color: '#00C27A' } : { label: 'Sell', color: '#FF5252' };
  if (score >= 60) return dir === 'BUY' ? { label: 'Watch for Buy', color: '#9CCC65' } : { label: 'Watch for Sell', color: '#FF8A65' };
  return { label: 'Watchlist', color: '#8B93A7' };
}

// ── Core: assess one symbol × timeframe ─────────────────────────

export function assessOpportunity(params: {
  builder: OHLCVBuilder;
  symbol: string;
  tf: ScanTF;
  tick: { bid?: number; ask?: number } | undefined;
  calendar: NewsEvent[];
  openPositionCurrencies: string[];   // currencies the trader already holds
  balance: number;                    // for suggested sizing (0 = unknown)
  isLiveData: boolean;
}): Opportunity | null {
  const { builder, symbol, tf, tick, calendar, openPositionCurrencies, balance, isLiveData } = params;
  const bars = builder.getAllBars(symbol, tf.res);
  if (bars.length < 60) return null;
  const state = classifyMarketState(bars);
  if (!state) return null;
  const trending = state.state.includes('Uptrend') || state.state.includes('Downtrend');
  if (!trending) return null; // v1 scans trend-pullback setups; ranges are skipped, not disguised

  const price = bars[bars.length - 1].close;
  const zone = computeEntryZone(symbol, bars, state, price);
  if (!('direction' in zone)) return null;
  const direction: 'BUY' | 'SELL' = zone.direction === 'LONG' ? 'BUY' : 'SELL';

  // Higher-timeframe confluence (one step up; D1 has none above it here).
  const tfIdx = SCAN_TFS.findIndex((t) => t.label === tf.label);
  const htf = tfIdx >= 0 && tfIdx < SCAN_TFS.length - 1 ? SCAN_TFS[tfIdx + 1] : null;
  let htfState: string | null = null; let htfAligned: boolean | null = null;
  if (htf) {
    const hs = classifyMarketState(builder.getAllBars(symbol, htf.res));
    if (hs) {
      htfState = hs.state;
      htfAligned = direction === 'BUY' ? hs.state.includes('Uptrend') : hs.state.includes('Downtrend');
    }
  }

  // Volatility + spread + expected move.
  const closes = bars.map((b) => b.close);
  const atrSeries = atr(bars.map((b) => b.high), bars.map((b) => b.low), closes, 14).filter((v): v is number => v != null);
  const atrNow = atrSeries[atrSeries.length - 1] ?? 0;
  const atrPct = price > 0 ? (atrNow / price) * 100 : 0;
  const pip = getPipSize(symbol);
  const spreadPips = tick?.bid != null && tick?.ask != null ? (tick.ask - tick.bid) / pip : null;
  const expectedPips = Math.abs(zone.target1 - zone.preferred) / pip;
  const stretch = atrNow > 0 ? Math.abs(price - zone.preferred) / atrNow : 0;

  // News within 2h touching this symbol's currencies.
  const ccys = symbolCurrencies(symbol);
  const news = upcomingHighImpact(ccys, calendar, 2)[0] ?? null;

  // Correlated exposure vs currently open positions.
  const shared = ccys.filter((c) => openPositionCurrencies.includes(c));
  const correlatedExposure = shared.length ? shared.join('/') : null;

  // ── Transparent weighted score ──
  const components: ScoreComponent[] = [
    { name: 'Trend quality', weight: 0.25, score: Math.min(100, state.confidence + (state.state.includes('Strong') ? 5 : -10)), note: `${state.state}, confidence ${state.confidence}%` },
    { name: 'Entry quality', weight: 0.20, score: Math.max(0, 100 - Math.max(0, stretch - 0.5) * 55), note: stretch > 1.5 ? `price ${stretch.toFixed(1)}×ATR from the pullback anchor — chasing` : `price ${stretch.toFixed(1)}×ATR from the anchor` },
    { name: 'Risk : reward', weight: 0.15, score: Math.min(100, zone.riskReward1 * 55), note: `${zone.riskReward1}R to target 1` },
    { name: 'Multi-TF confluence', weight: 0.15, score: htfAligned == null ? 60 : htfAligned ? 95 : 20, note: htfState ? `${htf!.label}: ${htfState}${htfAligned ? ' — aligned' : ' — OPPOSES'}` : 'no higher timeframe available' },
    { name: 'Liquidity & spread', weight: 0.10, score: spreadPips == null ? 50 : Math.max(0, 100 - spreadPips * 12), note: spreadPips != null ? `${spreadPips.toFixed(1)} pips spread` : 'no live quote' },
    { name: 'Regime suitability', weight: 0.10, score: state.volatility === 'High Volatility' ? 55 : 85, note: state.volatility },
    { name: 'News risk', weight: 0.05, score: news ? 15 : 90, note: news ? `${news.currency} "${news.title}" within 2h` : 'no red-flag event inside 2h' },
  ];
  let score = Math.round(components.reduce((a, c) => a + c.score * c.weight, 0));
  if (correlatedExposure) score = Math.max(0, score - 8); // concentration penalty, shown below
  score = Math.max(0, Math.min(100, score));

  const { label, color: labelColor } = directionLabel(direction, score, !!news && (news.timeMs - Date.now()) < 45 * 60_000);

  // Reasons for / against — never a direction without evidence.
  const reasonsFor = [
    `${state.state} on ${tf.label} (confidence ${state.confidence}%)`,
    ...(htfAligned ? [`${htf!.label} trend agrees (${htfState})`] : []),
    `pullback entry plan: preferred ${zone.preferred}, ${zone.riskReward1}R to target 1`,
  ];
  const reasonsAgainst = [
    ...(htfAligned === false ? [`${htf!.label} trend OPPOSES this setup (${htfState})`] : []),
    ...(stretch > 1.5 ? ['price is extended from the entry anchor — chasing worsens R:R'] : []),
    ...(state.volatility === 'High Volatility' ? ['high volatility — wider stops, more slippage risk'] : []),
    ...(news ? [`${news.currency} "${news.title}" due — spreads jump and stops slip through news`] : []),
    ...(correlatedExposure ? [`adds to existing ${correlatedExposure} exposure in your open positions`] : []),
    ...(state.state.includes('Weak') ? ['trend is classified WEAK — lower conviction'] : []),
  ];
  if (!reasonsAgainst.length) reasonsAgainst.push('none detected right now — conditions can change quickly');

  // Sizing (1% risk default) + margin + max loss, when balance is known.
  let suggestedLots: number | null = null; let marginEstimate: number | null = null; let maxLossEstimate: number | null = null;
  if (balance > 0) {
    suggestedLots = lotsForRiskPct({ symbol, balance, pct: 1, entryPrice: zone.preferred, sl: zone.stop });
    if (suggestedLots != null) {
      marginEstimate = calcMarginRequired(symbol, suggestedLots, zone.preferred);
      maxLossEstimate = Math.abs(zone.preferred - zone.stop) / pip * calcPipValue(symbol, suggestedLots);
    }
  }

  // Duration estimate: distance to target over typical bar range.
  const barsToTarget = atrNow > 0 ? Math.max(1, Math.round(Math.abs(zone.target1 - zone.preferred) / atrNow * 2)) : null;
  const expectedDurationNote = barsToTarget
    ? `~${barsToTarget} × ${tf.label} bars to target 1 at typical volatility (estimate, not a promise)`
    : 'insufficient volatility data for a duration estimate';

  const risk = Math.abs(zone.preferred - zone.stop);
  const sign = direction === 'BUY' ? 1 : -1;
  const tp3 = Number((zone.preferred + sign * 3.5 * risk).toFixed(price < 20 ? 5 : 2));

  const now = Date.now();
  return {
    id: `${symbol}-${tf.label}-${direction}`,
    symbol, assetClass: assetClassOf(symbol),
    venue: isLiveData ? 'RAPTOR live feed' : 'RAPTOR platform feed (simulated pricing)',
    direction, label, labelColor,
    opportunityType: 'Trend-continuation pullback',
    style: tf.style, tfLabel: tf.label, holding: tf.holding, expectedDurationNote,
    regime: state, htfState, htfAligned,
    zone, tp3,
    trailingNote: 'after target 1: stop to break-even, trail the rest 1.5–2×ATR',
    breakEvenTrigger: zone.target1,
    expectedPips, spreadPips, atrPct,
    score, scoreLabel: SCORE_LABELS(score), components,
    reasonsFor, reasonsAgainst,
    invalidation: zone.invalidation,
    news, suggestedLots, marginEstimate, maxLossEstimate, correlatedExposure,
    freshAt: now,
    expiresAt: now + 45 * 60_000, // setups go stale; cards say so
  };
}

// ── Range / mean-reversion module (additive) ────────────────────
// Fades a WELL-ESTABLISHED range at its extreme, back toward the mid.
// Deliberately strict and honestly capped: the range must be wide
// (≥2.5×ATR), touched repeatedly on both sides, the market genuinely
// range-classified, and price sitting AT an extreme — otherwise null.
// Range setups never score above 82: ranges break, and "Exceptional"
// would be a lie for a fade.

export function assessRangeOpportunity(params: {
  builder: OHLCVBuilder;
  symbol: string;
  tf: ScanTF;
  tick: { bid?: number; ask?: number } | undefined;
  calendar: NewsEvent[];
  openPositionCurrencies: string[];
  balance: number;
  isLiveData: boolean;
}): Opportunity | null {
  const { builder, symbol, tf, tick, calendar, openPositionCurrencies, balance, isLiveData } = params;
  const bars = builder.getAllBars(symbol, tf.res);
  if (bars.length < 60) return null;
  const state = classifyMarketState(bars);
  if (!state) return null;
  if (!(state.state === 'Range Bound' || state.state === 'Sideways / Consolidation')) return null;
  if (state.volatility === 'High Volatility') return null; // expanding chop is not a fade

  const win = bars.slice(-48);
  const hi = Math.max(...win.map((b) => b.high));
  const lo = Math.min(...win.map((b) => b.low));
  const price = bars[bars.length - 1].close;
  const width = hi - lo;
  const closes = bars.map((b) => b.close);
  const atrSeries = atr(bars.map((b) => b.high), bars.map((b) => b.low), closes, 14).filter((v): v is number => v != null);
  const atrNow = atrSeries[atrSeries.length - 1] ?? 0;
  if (atrNow <= 0 || width < 2.5 * atrNow) return null; // range too narrow to fade

  // Touch counts: bars whose extreme came within 15% of the boundary.
  const zone = width * 0.15;
  const hiTouches = win.filter((b) => b.high >= hi - zone).length;
  const loTouches = win.filter((b) => b.low <= lo + zone).length;
  if (hiTouches < 2 || loTouches < 2) return null; // both walls must be proven

  // Price must be AT an extreme right now.
  let direction: 'BUY' | 'SELL';
  if (price <= lo + zone) direction = 'BUY';
  else if (price >= hi - zone) direction = 'SELL';
  else return null; // mid-range: nothing to fade

  const dp = price < 20 ? 5 : 2;
  const sign = direction === 'BUY' ? 1 : -1;
  const boundary = direction === 'BUY' ? lo : hi;
  const mid = (hi + lo) / 2;
  const preferred = Number(price.toFixed(dp));
  const stop = Number((boundary - sign * 0.6 * atrNow).toFixed(dp));
  const target1 = Number(mid.toFixed(dp));
  const target2 = Number((direction === 'BUY' ? hi - zone : lo + zone).toFixed(dp));
  const risk = Math.abs(preferred - stop);
  if (risk <= 0) return null;
  const rr1 = Math.round((Math.abs(target1 - preferred) / risk) * 100) / 100;
  if (rr1 < 1) return null; // a fade that can't pay 1R isn't worth the break risk

  const pip = getPipSize(symbol);
  const spreadPips = tick?.bid != null && tick?.ask != null ? (tick.ask - tick.bid) / pip : null;
  const ccys = symbolCurrencies(symbol);
  const news = upcomingHighImpact(ccys, calendar, 2)[0] ?? null;
  const shared = ccys.filter((c) => openPositionCurrencies.includes(c));

  const components: ScoreComponent[] = [
    { name: 'Range quality', weight: 0.30, score: Math.min(100, 40 + (hiTouches + loTouches) * 6), note: `${hiTouches} touches high wall · ${loTouches} low wall over 48 bars` },
    { name: 'Range width', weight: 0.20, score: Math.min(100, (width / atrNow) * 22), note: `${(width / atrNow).toFixed(1)}×ATR wide — wide ranges pay the fade` },
    { name: 'Extremity', weight: 0.20, score: Math.round(100 - (Math.abs(price - boundary) / zone) * 50), note: 'price is at the wall, not chasing the middle' },
    { name: 'Risk : reward', weight: 0.10, score: Math.min(100, rr1 * 55), note: `${rr1}R to the mid` },
    { name: 'Liquidity & spread', weight: 0.10, score: spreadPips == null ? 50 : Math.max(0, 100 - spreadPips * 12), note: spreadPips != null ? `${spreadPips.toFixed(1)} pips spread` : 'no live quote' },
    { name: 'News risk', weight: 0.10, score: news ? 10 : 90, note: news ? `${news.currency} "${news.title}" within 2h — releases BREAK ranges` : 'no red-flag event inside 2h' },
  ];
  let score = Math.round(components.reduce((a, c) => a + c.score * c.weight, 0));
  if (shared.length) score = Math.max(0, score - 8);
  score = Math.max(0, Math.min(82, score)); // honest cap: ranges break

  const { label, color: labelColor } = directionLabel(direction, score, !!news && (news.timeMs - Date.now()) < 45 * 60_000);
  const now = Date.now();

  let suggestedLots: number | null = null; let marginEstimate: number | null = null; let maxLossEstimate: number | null = null;
  if (balance > 0) {
    suggestedLots = lotsForRiskPct({ symbol, balance, pct: 1, entryPrice: preferred, sl: stop });
    if (suggestedLots != null) {
      marginEstimate = calcMarginRequired(symbol, suggestedLots, preferred);
      maxLossEstimate = risk / pip * calcPipValue(symbol, suggestedLots);
    }
  }

  return {
    id: `${symbol}-${tf.label}-${direction}-RANGE`,
    symbol, assetClass: assetClassOf(symbol),
    venue: isLiveData ? 'RAPTOR live feed' : 'RAPTOR platform feed (simulated pricing)',
    direction, label, labelColor,
    opportunityType: 'Range fade at extreme',
    style: tf.style, tfLabel: tf.label, holding: tf.holding,
    expectedDurationNote: `fade toward the mid — typically a fraction of the ${tf.label} range cycle (estimate, not a promise)`,
    regime: state, htfState: null, htfAligned: null,
    zone: {
      symbol, direction: direction === 'BUY' ? 'LONG' : 'SHORT',
      aggressive: preferred, preferred, conservative: Number((boundary + sign * 0.1 * width).toFixed(dp)),
      stop, target1, target2, riskReward1: rr1, confidence: Math.min(80, state.confidence + 10),
      invalidation: `a confirmed ${tf.label} close beyond ${stop} breaks the range — exit, never argue with a breakout.`,
      evidence: [`${hiTouches}+${loTouches} wall touches`, `${(width / atrNow).toFixed(1)}×ATR range width`],
      note: 'range fade: enter at the wall, stop beyond it, first target the mid',
    },
    tp3: target2,
    trailingNote: 'take the mid, trail the remainder only if the far wall stays intact',
    breakEvenTrigger: target1,
    expectedPips: Math.abs(target1 - preferred) / pip,
    spreadPips, atrPct: price > 0 ? (atrNow / price) * 100 : 0,
    score, scoreLabel: SCORE_LABELS(score), components,
    reasonsFor: [
      `${state.state} confirmed on ${tf.label} (confidence ${state.confidence}%)`,
      `proven range: ${hiTouches}/${loTouches} wall touches, ${(width / atrNow).toFixed(1)}×ATR wide`,
      `price at the ${direction === 'BUY' ? 'lower' : 'upper'} wall — fading toward the mid at ${rr1}R`,
    ],
    reasonsAgainst: [
      'ranges END in breakouts — the stop beyond the wall is non-negotiable',
      ...(news ? [`${news.currency} "${news.title}" due — releases break ranges; the news buffer applies`] : []),
      ...(shared.length ? [`adds to existing ${shared.join('/')} exposure`] : []),
      'score capped at 82 by design: no fade is ever "Exceptional"',
    ],
    invalidation: `a confirmed ${tf.label} close beyond the ${direction === 'BUY' ? 'low' : 'high'} wall breaks the range — exit immediately`,
    news, suggestedLots, marginEstimate, maxLossEstimate,
    correlatedExposure: shared.length ? shared.join('/') : null,
    freshAt: now,
    expiresAt: now + 45 * 60_000,
  };
}

// ── Full scan ───────────────────────────────────────────────────

export interface ScanFilters {
  assetClasses: AssetClass[];
  styles: string[];        // matched against ScanTF.style
  direction: 'both' | 'BUY' | 'SELL';
  minScore: number;
  portfolioOnly: boolean;
}

export const DEFAULT_FILTERS: ScanFilters = {
  assetClasses: ['forex', 'metal', 'energy', 'index', 'crypto'],
  styles: SCAN_TFS.map((t) => t.style),
  direction: 'both',
  minScore: 0,
  portfolioOnly: false,
};

const FILTERS_KEY = 'raptor_scanner_filters_v1';

export function loadScanFilters(): ScanFilters {
  try { return { ...DEFAULT_FILTERS, ...(JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}')) }; } catch { return { ...DEFAULT_FILTERS }; }
}

export function saveScanFilters(f: ScanFilters): void {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

export function runScan(params: {
  builder: OHLCVBuilder;
  universe: string[];
  ticks: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[];
  openPositions: { symbol: string; status: string }[];
  balance: number;
  isLiveData: boolean;
  filters: ScanFilters;
}): Opportunity[] {
  const { builder, universe, ticks, calendar, openPositions, balance, isLiveData, filters } = params;
  const openSymbols = openPositions.filter((p) => p.status === 'open').map((p) => p.symbol);
  const openCcys = [...new Set(openSymbols.flatMap((s) => symbolCurrencies(s)))];
  const out: Opportunity[] = [];
  for (const symbol of universe) {
    if (!filters.assetClasses.includes(assetClassOf(symbol))) continue;
    if (filters.portfolioOnly && !openSymbols.includes(symbol)) continue;
    for (const tf of SCAN_TFS) {
      if (!filters.styles.includes(tf.style)) continue;
      // Trend-pullback first; when the market isn't trending, the range
      // module gets its turn — ranges are now scanned, not just skipped.
      const opp = assessOpportunity({ builder, symbol, tf, tick: ticks[symbol], calendar, openPositionCurrencies: openCcys, balance, isLiveData })
        ?? assessRangeOpportunity({ builder, symbol, tf, tick: ticks[symbol], calendar, openPositionCurrencies: openCcys, balance, isLiveData });
      if (!opp) continue;
      if (filters.direction !== 'both' && opp.direction !== filters.direction) continue;
      if (opp.score < filters.minScore) continue;
      out.push(opp);
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

// ── Scanner self-grading: cards resolved against REAL bars ──────
// Every strong card (score ≥70) is remembered once per symbol×TF×day;
// later sweeps walk the actual bars — stop touched first counts as a
// loss (conservative), target first a win, 48h unresolved expires.
// The scoreboard grades the SCANNER itself, publicly, per style.

export interface ScanGrade {
  ts: number; symbol: string; tf: string; style: string; direction: 'BUY' | 'SELL';
  entry: number; stop: number; target: number;
  status: 'open' | 'win' | 'loss' | 'expired';
}

const GRADES_KEY = 'raptor_scanner_grades_v1';

export function loadScanGrades(): ScanGrade[] {
  try { return JSON.parse(localStorage.getItem(GRADES_KEY) || '[]'); } catch { return []; }
}

function saveScanGrades(list: ScanGrade[]): void {
  try { localStorage.setItem(GRADES_KEY, JSON.stringify(list.slice(-200))); } catch { /* ignore */ }
}

export function recordScanGrades(opps: Opportunity[]): void {
  const list = loadScanGrades();
  const today = new Date().toDateString();
  let changed = false;
  for (const o of opps) {
    if (o.score < 70) continue;
    if (list.some((g) => g.symbol === o.symbol && g.tf === o.tfLabel && new Date(g.ts).toDateString() === today)) continue;
    list.push({ ts: Date.now(), symbol: o.symbol, tf: o.tfLabel, style: o.style, direction: o.direction, entry: o.zone.preferred, stop: o.zone.stop, target: o.zone.target1, status: 'open' });
    changed = true;
  }
  if (changed) saveScanGrades(list);
}

export function resolveScanGrades(builder: OHLCVBuilder): void {
  const list = loadScanGrades();
  let changed = false;
  for (const g of list) {
    if (g.status !== 'open') continue;
    if (Date.now() - g.ts > 48 * 3_600_000) { g.status = 'expired'; changed = true; continue; }
    const res = SCAN_TFS.find((t) => t.label === g.tf)?.res ?? '15';
    const bars = builder.getAllBars(g.symbol, res).filter((b) => (b.time as number) * 1000 > g.ts);
    const dir = g.direction === 'BUY' ? 1 : -1;
    for (const b of bars) {
      const hitStop = dir > 0 ? b.low <= g.stop : b.high >= g.stop;
      const hitTarget = dir > 0 ? b.high >= g.target : b.low <= g.target;
      if (hitStop) { g.status = 'loss'; changed = true; break; } // ambiguous bars count against us
      if (hitTarget) { g.status = 'win'; changed = true; break; }
    }
  }
  if (changed) saveScanGrades(list);
}

export function scanGradeSummary(): Array<{ style: string; wins: number; losses: number; open: number }> {
  const by = new Map<string, { wins: number; losses: number; open: number }>();
  for (const g of loadScanGrades()) {
    const cell = by.get(g.style) ?? { wins: 0, losses: 0, open: 0 };
    if (g.status === 'win') cell.wins++;
    else if (g.status === 'loss') cell.losses++;
    else if (g.status === 'open') cell.open++;
    by.set(g.style, cell);
  }
  return [...by.entries()].map(([style, c]) => ({ style, ...c })).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
}

// ── Scanner signal log (audit-lite, exportable) ─────────────────

const LOG_KEY = 'raptor_scanner_log_v1';

export interface SignalLogEntry {
  ts: number; symbol: string; tf: string; direction: string; score: number;
  action: 'shown' | 'prepared' | 'executed' | 'rejected';
  detail?: string;
}

export function appendSignalLog(e: SignalLogEntry): void {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as SignalLogEntry[];
    log.push(e);
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-400)));
  } catch { /* ignore */ }
}

export function loadSignalLog(): SignalLogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}
