// ═══════════════════════════════════════════════════════════════
// Raptor AI Correlation Hedging Engine — the math core.
// Pure functions over REAL platform bars and the trader's live positions.
// Nothing is hard-coded: every correlation is computed from aligned bar
// returns at multiple timeframes, with stability/confidence scoring and an
// honest "no reliable hedge" verdict when the data doesn't support one.
//
// Honesty contract (§17): a hedge is never risk-free. Correlations weaken,
// reverse and break; hedging adds spread/commission/swap/margin/execution
// risk. All outputs are ESTIMATES and are labelled as such in the UI.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBar } from '@/types/trading';
import type { OHLCVBuilder, Resolution } from '@/lib/trading/ohlcv-builder';
import { valuePerUnitPerLot, type InstrumentSpec } from '@/lib/insights/risk';
import { atr } from '@/lib/trading/indicators';
import { symbolCurrencies } from '@/lib/trading/protection';

// ── Correlation windows (rolling, real bars) ────────────────────

export interface CorrWindow { label: string; res: Resolution; maxReturns: number }

export const CORR_WINDOWS: CorrWindow[] = [
  { label: 'M5',  res: '5',   maxReturns: 288 },  // ~24h
  { label: 'M15', res: '15',  maxReturns: 192 },  // ~48h
  { label: 'H1',  res: '60',  maxReturns: 168 },  // ~1w
  { label: 'H4',  res: '240', maxReturns: 180 },  // ~1mo
  { label: 'D1',  res: '1D',  maxReturns: 90 },   // ~1 quarter
];

function alignedReturns(a: OHLCVBar[], b: OHLCVBar[], maxN: number): [number[], number[]] {
  const mapB = new Map<number, number>();
  for (const bar of b) mapB.set(bar.time, bar.close);
  const ra: number[] = []; const rb: number[] = [];
  let prevA: number | null = null; let prevB: number | null = null;
  for (const bar of a) {
    const closeB = mapB.get(bar.time);
    if (closeB == null) continue;
    if (prevA != null && prevB != null && prevA > 0 && prevB > 0) {
      ra.push(Math.log(bar.close / prevA));
      rb.push(Math.log(closeB / prevB));
    }
    prevA = bar.close; prevB = closeB;
  }
  return [ra.slice(-maxN), rb.slice(-maxN)];
}

export function pearson(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 30) return null; // too few samples to say anything honest
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i];
  }
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  if (vx <= 0 || vy <= 0) return null;
  return Math.max(-1, Math.min(1, cov / Math.sqrt(vx * vy)));
}

export interface CorrelationRead {
  perWindow: { label: string; corr: number | null; n: number }[];
  avg: number | null;          // weighted average of computable windows
  stability: number;           // 0–1: 1 = windows agree tightly
  trend: 'stable' | 'strengthening' | 'weakening' | 'reversing';
  breaking: boolean;           // recent H1 corr diverges hard from D1 history
  confidence: number;          // 0–100
  label: string;               // human label incl. reliability
  labelColor: string;
}

/** Portfolio-level hedge suggestion: instead of pair-by-pair, find the
 *  single instrument that best offsets the LARGEST net currency exposure
 *  across all open positions. Estimate-grade by design (lot-for-lot on
 *  the dominant currency, default 50% trim) — the full pair-level math
 *  still lives in the finder; this answers "one trade to cut my biggest
 *  concentration". */
export function portfolioHedgeSuggestion(params: {
  positions: Array<{ symbol: string; direction: string; size: number; status?: string }>;
  universe: string[];
  symbolCurrenciesFn: (s: string) => string[];
}): { ccy: string; netLots: number; instrument: string; direction: 'BUY' | 'SELL'; lots: number; rationale: string } | null {
  const { positions, universe, symbolCurrenciesFn } = params;
  const open = positions.filter((p) => (p.status ?? 'open') === 'open');
  if (!open.length) return null;
  const net = new Map<string, number>();
  for (const p of open) {
    const ccys = symbolCurrenciesFn(p.symbol);
    const sign = p.direction === 'BUY' ? 1 : -1;
    if (ccys[0]) net.set(ccys[0], (net.get(ccys[0]) ?? 0) + sign * Number(p.size));
    if (ccys[1]) net.set(ccys[1], (net.get(ccys[1]) ?? 0) - sign * Number(p.size));
  }
  const ranked = [...net.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = ranked[0];
  if (!top || Math.abs(top[1]) < 0.02) return null; // nothing concentrated enough to bother
  const [ccy, netLots] = top;
  // Prefer a liquid instrument where the target currency is the BASE (clean
  // direction math): net long base → SELL reduces it; net short → BUY.
  const baseFirst = universe.filter((s) => symbolCurrenciesFn(s)[0] === ccy);
  const quoteSide = universe.filter((s) => symbolCurrenciesFn(s)[1] === ccy);
  const instrument = baseFirst[0] ?? quoteSide[0];
  if (!instrument) return null;
  const isBase = symbolCurrenciesFn(instrument)[0] === ccy;
  const direction: 'BUY' | 'SELL' = (netLots > 0) === isBase ? 'SELL' : 'BUY';
  const lots = Math.max(0.01, Math.round(Math.abs(netLots) * 0.5 * 100) / 100);
  return {
    ccy, netLots: Math.round(netLots * 100) / 100, instrument, direction, lots,
    rationale: `your largest net exposure is ${ccy} ${netLots > 0 ? '+' : ''}${netLots.toFixed(2)} lots across ${open.length} position(s); ${direction} ${lots} ${instrument} trims roughly half of it. Estimate-grade (lot-for-lot on ${ccy}) — load the pair in the finder for the full correlation-adjusted math, and confirm like any order.`,
  };
}

/** Hedge decay forecast: turns the measured stability + trend into a
 *  forward-looking maintenance read. Deterministic mapping over real
 *  measurements — a review schedule, never a prediction of prices. */
export function decayForecast(read: { stability: number; trend: string; breaking: boolean }): { label: string; color: string; note: string } {
  if (read.breaking) return { label: 'BREAKING NOW', color: '#FF5252', note: 'short-window correlation has decoupled from the hedge horizon — this hedge may already not protect; review immediately' };
  if (read.trend === 'reversing') return { label: 'Deteriorating fast', color: '#FF5252', note: 'the relationship is reversing sign — unwind or re-select; do not rely on this hedge overnight' };
  if (read.trend === 'weakening') return { label: 'Deteriorating', color: '#FFB300', note: 'correlation is weakening across windows — review within the session; effectiveness is fading' };
  if (read.stability < 0.5) return { label: 'Unstable', color: '#FFB300', note: 'windows disagree — treat protection estimates as loose; check daily' };
  if (read.trend === 'strengthening') return { label: 'Improving', color: '#00C27A', note: 'relationship tightening — routine daily check is enough' };
  return { label: 'Holding', color: '#00C27A', note: 'stable across windows — routine daily check is enough' };
}

export function correlationRead(
  builder: OHLCVBuilder, primary: string, candidate: string,
): CorrelationRead {
  const perWindow = CORR_WINDOWS.map((w) => {
    const [ra, rb] = alignedReturns(builder.getAllBars(primary, w.res), builder.getAllBars(candidate, w.res), w.maxReturns);
    return { label: w.label, corr: pearson(ra, rb), n: ra.length };
  });
  const usable = perWindow.filter((w) => w.corr != null) as { label: string; corr: number; n: number }[];
  if (!usable.length) {
    return { perWindow, avg: null, stability: 0, trend: 'stable', breaking: false, confidence: 0, label: 'Unreliable Relationship', labelColor: '#8B93A7' };
  }
  const avg = usable.reduce((a, w) => a + w.corr, 0) / usable.length;
  const spread = Math.sqrt(usable.reduce((a, w) => a + (w.corr - avg) ** 2, 0) / usable.length);
  const stability = Math.max(0, 1 - spread / 0.5);

  // Trend: short-horizon (M5/M15/H1 avg) vs long-horizon (H4/D1 avg).
  const shortW = usable.filter((w) => ['M5', 'M15', 'H1'].includes(w.label));
  const longW = usable.filter((w) => ['H4', 'D1'].includes(w.label));
  let trend: CorrelationRead['trend'] = 'stable';
  let breaking = false;
  if (shortW.length && longW.length) {
    const s = shortW.reduce((a, w) => a + w.corr, 0) / shortW.length;
    const l = longW.reduce((a, w) => a + w.corr, 0) / longW.length;
    if (Math.sign(s) !== Math.sign(l) && Math.abs(l) > 0.3 && Math.abs(s) > 0.2) { trend = 'reversing'; breaking = true; }
    else if (Math.abs(s) > Math.abs(l) + 0.15) trend = 'strengthening';
    else if (Math.abs(s) < Math.abs(l) - 0.15) { trend = 'weakening'; breaking = Math.abs(l) - Math.abs(s) > 0.35; }
  }

  const sampleScore = Math.min(1, usable.length / CORR_WINDOWS.length);
  const confidence = Math.round(Math.abs(avg) * 55 + stability * 30 + sampleScore * 15);

  let label: string; let labelColor: string;
  const a = Math.abs(avg);
  if (breaking) { label = 'Correlation Breaking'; labelColor = '#FF7043'; }
  else if (stability < 0.35) { label = 'Unreliable Relationship'; labelColor = '#8B93A7'; }
  else if (a >= 0.7) { label = avg > 0 ? 'Strong Positive Correlation' : 'Strong Negative Correlation'; labelColor = avg > 0 ? '#00C27A' : '#FF5252'; }
  else if (a >= 0.4) { label = avg > 0 ? 'Moderate Positive Correlation' : 'Moderate Negative Correlation'; labelColor = avg > 0 ? '#9CCC65' : '#FF8A65'; }
  else { label = 'Weak Correlation'; labelColor = '#8B93A7'; }

  return { perWindow, avg, stability, trend, breaking, confidence, label, labelColor };
}

// ── Volatility (ATR% on H1) ─────────────────────────────────────

export function atrRead(builder: OHLCVBuilder, symbol: string): { atr: number; price: number; atrPct: number } | null {
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length < 20) return null;
  const series = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), 14).filter((v): v is number => v != null);
  const a = series[series.length - 1];
  const price = bars[bars.length - 1].close;
  if (!a || !(price > 0)) return null;
  return { atr: a, price, atrPct: (a / price) * 100 };
}

// ── Hedge candidate assessment ──────────────────────────────────

export interface HedgeCandidate {
  symbol: string;
  corr: CorrelationRead;
  hedgeDirection: 'BUY' | 'SELL';       // direction that OFFSETS the primary
  suggestedLots: number;
  rawRatio: number;                     // notional-based ratio
  volAdjRatio: number;                  // ATR-adjusted ratio
  finalRatio: number;                   // corr × vol adjusted
  riskBefore: number;                   // primary 1×ATR move, account $
  riskAfter: number;                    // combined estimate, account $
  reductionPct: number;                 // estimated drawdown reduction
  spreadCost: number;                   // hedge leg entry spread, $
  marginEstimate: number;               // hedge leg margin at 1:500, $
  sharedCurrencies: string[];
  viable: boolean;
  reasons: string[];                    // honest notes incl. failure risks
}

export interface HedgeInputs {
  primary: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  hedgePct: number;                     // 0.25 / 0.5 / 0.75 / 1 / custom
}

export function assessCandidate(
  builder: OHLCVBuilder,
  inputs: HedgeInputs,
  candidate: string,
  specs: Record<string, InstrumentSpec>,
  ticks: Record<string, { bid?: number; ask?: number } | undefined>,
): HedgeCandidate | null {
  if (candidate === inputs.primary) return null;
  const specP = specs[inputs.primary]; const specH = specs[candidate];
  const volP = atrRead(builder, inputs.primary); const volH = atrRead(builder, candidate);
  if (!specP || !specH || !volP || !volH) return null;
  const corr = correlationRead(builder, inputs.primary, candidate);
  if (corr.avg == null) return null;

  // Hedge horizon correlation: hedges are typically held hours-to-days, so
  // sizing and viability weight the H1/H4/D1 windows; M5/M15 stay
  // informational (they mostly carry noise for this purpose).
  const horizonW = corr.perWindow.filter((w) => ['H1', 'H4', 'D1'].includes(w.label) && w.corr != null) as { label: string; corr: number }[];
  const horizonAvg = horizonW.length ? horizonW.reduce((a, w) => a + w.corr, 0) / horizonW.length : corr.avg;
  const horizonSpread = horizonW.length >= 2
    ? Math.sqrt(horizonW.reduce((a, w) => a + (w.corr - horizonAvg) ** 2, 0) / horizonW.length)
    : 1;
  const horizonStability = Math.max(0, 1 - horizonSpread / 0.5);

  // Offset direction: positive correlation → trade the candidate opposite
  // the primary; negative correlation → trade it the same way.
  const hedgeDirection: 'BUY' | 'SELL' = horizonAvg >= 0
    ? (inputs.direction === 'BUY' ? 'SELL' : 'BUY')
    : inputs.direction;

  const vpuP = valuePerUnitPerLot(specP); const vpuH = valuePerUnitPerLot(specH);
  const atrDollarPerLotP = volP.atr * vpuP;   // $ move of one 1×ATR swing per lot
  const atrDollarPerLotH = volH.atr * vpuH;
  if (!(atrDollarPerLotH > 0)) return null;

  const primaryAtrDollar = atrDollarPerLotP * inputs.lots;
  const rawRatio = (volP.price * specP.contractSize) > 0 ? (volH.price * specH.contractSize) / (volP.price * specP.contractSize) : 0;
  const volAdjRatio = atrDollarPerLotP / atrDollarPerLotH;
  const finalRatio = volAdjRatio * Math.abs(horizonAvg);
  const suggestedLots = Math.max(0.01, Math.round(inputs.lots * inputs.hedgePct * finalRatio * 100) / 100);

  const hedgeAtrDollar = atrDollarPerLotH * suggestedLots;
  // Combined 1×ATR risk with the offsetting direction: cross term reduces it
  // by |ρ| — an estimate that DEGRADES if the correlation weakens.
  const riskAfter = Math.sqrt(Math.max(0,
    primaryAtrDollar ** 2 + hedgeAtrDollar ** 2 - 2 * Math.abs(horizonAvg) * primaryAtrDollar * hedgeAtrDollar));
  const reductionPct = primaryAtrDollar > 0 ? Math.max(0, (1 - riskAfter / primaryAtrDollar) * 100) : 0;

  const t = ticks[candidate];
  const spreadCost = t?.bid != null && t?.ask != null ? (t.ask - t.bid) * vpuH * suggestedLots : 0;
  const marginEstimate = (suggestedLots * specH.contractSize * volH.price) / 500;

  const ccyP = symbolCurrencies(inputs.primary);
  const sharedCurrencies = symbolCurrencies(candidate).filter((c) => ccyP.includes(c));

  const reasons: string[] = [];
  // Viability judged on the hedge horizon (H1/H4/D1) — where hedges live.
  const viable = Math.abs(horizonAvg) >= 0.55 && horizonStability >= 0.35 && !corr.breaking && horizonW.length >= 2;
  if (horizonW.length < 2) reasons.push('not enough H1/H4/D1 history to judge the hedge horizon');
  else if (Math.abs(horizonAvg) < 0.55) reasons.push('correlation too weak on the hedge horizon (H1/H4/D1)');
  if (horizonW.length >= 2 && horizonStability < 0.35) reasons.push('correlation unstable across the hedge horizon');
  if (corr.breaking) reasons.push('relationship is breaking/reversing right now');
  if (viable) {
    reasons.push(`hedge-horizon correlation ${horizonAvg.toFixed(2)} (H1/H4/D1, stability ${(horizonStability * 100).toFixed(0)}%)`);
    if (sharedCurrencies.length) reasons.push(`shares ${sharedCurrencies.join('/')} exposure with ${inputs.primary}`);
    reasons.push('fails if the correlation weakens, reverses or gaps through news');
  }

  return {
    symbol: candidate, corr, hedgeDirection, suggestedLots,
    rawRatio, volAdjRatio, finalRatio,
    riskBefore: primaryAtrDollar, riskAfter, reductionPct,
    spreadCost, marginEstimate, sharedCurrencies, viable, reasons,
  };
}

/** Rank all candidates for a primary. Returns viable hedges best-first,
 *  plus the non-viable rest (for transparency). */
export function findHedges(
  builder: OHLCVBuilder,
  inputs: HedgeInputs,
  universe: string[],
  specs: Record<string, InstrumentSpec>,
  ticks: Record<string, { bid?: number; ask?: number } | undefined>,
): { viable: HedgeCandidate[]; rejected: HedgeCandidate[] } {
  const all = universe
    .map((s) => assessCandidate(builder, inputs, s, specs, ticks))
    .filter((c): c is HedgeCandidate => c != null);
  const viable = all.filter((c) => c.viable)
    .sort((a, b) => (b.reductionPct * b.corr.confidence) - (a.reductionPct * a.corr.confidence));
  const rejected = all.filter((c) => !c.viable)
    .sort((a, b) => Math.abs(b.corr.avg ?? 0) - Math.abs(a.corr.avg ?? 0));
  return { viable, rejected };
}

// ── Currency exposure map (§7) ──────────────────────────────────

export interface ExposureRow { ccy: string; long: number; short: number; net: number }

export function currencyExposureMap(
  positions: { symbol: string; direction: string; size: number; open_price: number; status: string }[],
  specs: Record<string, InstrumentSpec>,
): ExposureRow[] {
  const map = new Map<string, { long: number; short: number }>();
  for (const p of positions) {
    if (p.status !== 'open') continue;
    const spec = specs[p.symbol];
    if (!spec) continue;
    const notional = Number(p.size) * spec.contractSize * Number(p.open_price);
    const ccys = symbolCurrencies(p.symbol);
    const isBuy = p.direction.toUpperCase() === 'BUY';
    // Base currency: long if buying; quote currency: the opposite side.
    ccys.forEach((c, i) => {
      const entry = map.get(c) ?? { long: 0, short: 0 };
      const longSide = i === 0 ? isBuy : !isBuy;
      if (longSide) entry.long += notional; else entry.short += notional;
      map.set(c, entry);
    });
  }
  return [...map.entries()]
    .map(([ccy, v]) => ({ ccy, long: v.long, short: v.short, net: v.long - v.short }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

// ── Hedge Stress Lab (§16-lite): historical simulation ──────────
// Replays REAL H1 closes: how would (primary alone) vs (primary + this
// hedge) have behaved? Honest by construction — it is history, not a
// forecast, and the report says so.

export interface StressResult {
  days: number;
  unhedgedFinal: number;   // $ P&L of the primary alone over the window
  hedgedFinal: number;     // $ P&L of primary + hedge legs
  ddUnhedged: number;      // worst peak-to-trough drawdown, $
  ddHedged: number;
  volUnhedged: number;     // std of hourly P&L changes, $
  volHedged: number;
  helpedPct: number;       // % of rolling 24h windows where the hedge cut the drawdown
  windows: number;
}

export function stressTest(
  builder: OHLCVBuilder,
  inputs: HedgeInputs,
  c: HedgeCandidate,
  specs: Record<string, InstrumentSpec>,
): StressResult | null {
  const specP = specs[inputs.primary]; const specH = specs[c.symbol];
  if (!specP || !specH) return null;
  const A = builder.getAllBars(inputs.primary, '60');
  const B = builder.getAllBars(c.symbol, '60');
  const mapB = new Map<number, number>();
  for (const b of B) mapB.set(b.time, b.close);
  const closesA: number[] = []; const closesB: number[] = [];
  for (const bar of A) {
    const cb = mapB.get(bar.time);
    if (cb != null) { closesA.push(bar.close); closesB.push(cb); }
  }
  const n = Math.min(closesA.length, 720); // up to ~30 trading days of H1
  if (n < 48) return null;
  const a = closesA.slice(-n); const b = closesB.slice(-n);
  const dirP = inputs.direction === 'BUY' ? 1 : -1;
  const dirH = c.hedgeDirection === 'BUY' ? 1 : -1;
  const vpuP = valuePerUnitPerLot(specP) * inputs.lots;
  const vpuH = valuePerUnitPerLot(specH) * c.suggestedLots;

  const un: number[] = []; const he: number[] = [];
  for (let i = 0; i < n; i++) {
    const pnlP = (a[i] - a[0]) * dirP * vpuP;
    const pnlH = (b[i] - b[0]) * dirH * vpuH;
    un.push(pnlP); he.push(pnlP + pnlH);
  }
  const dd = (s: number[]) => { let peak = -Infinity, worst = 0; for (const v of s) { peak = Math.max(peak, v); worst = Math.min(worst, v - peak); } return worst; };
  const vol = (s: number[]) => {
    const d: number[] = []; for (let i = 1; i < s.length; i++) d.push(s[i] - s[i - 1]);
    const m = d.reduce((x, y) => x + y, 0) / d.length;
    return Math.sqrt(d.reduce((x, y) => x + (y - m) ** 2, 0) / d.length);
  };
  // Rolling 24h windows: did the hedge reduce the window's drawdown?
  let helped = 0; let windows = 0;
  for (let s = 0; s + 24 <= n; s += 24) {
    const wu = un.slice(s, s + 24).map((v) => v - un[s]);
    const wh = he.slice(s, s + 24).map((v) => v - he[s]);
    windows++;
    if (Math.abs(dd(wh)) < Math.abs(dd(wu))) helped++;
  }
  return {
    days: Math.round(n / 24),
    unhedgedFinal: un[n - 1], hedgedFinal: he[n - 1],
    ddUnhedged: dd(un), ddHedged: dd(he),
    volUnhedged: vol(un), volHedged: vol(he),
    helpedPct: windows ? (helped / windows) * 100 : 0,
    windows,
  };
}

// ── Lead–lag detector ───────────────────────────────────────────
// Cross-correlation at ±3 H1-bar shifts: does one instrument tend to move
// first? Informational only — lead–lag relationships drift constantly.

export function leadLag(builder: OHLCVBuilder, primary: string, candidate: string):
  { shift: number; corr: number; syncCorr: number } | null {
  const [ra, rb] = (() => {
    const A = builder.getAllBars(primary, '60'); const B = builder.getAllBars(candidate, '60');
    const mapB = new Map<number, number>();
    for (const bar of B) mapB.set(bar.time, bar.close);
    const xa: number[] = []; const xb: number[] = [];
    let pa: number | null = null; let pb: number | null = null;
    for (const bar of A) {
      const cb = mapB.get(bar.time);
      if (cb == null) continue;
      if (pa != null && pb != null && pa > 0 && pb > 0) { xa.push(Math.log(bar.close / pa)); xb.push(Math.log(cb / pb)); }
      pa = bar.close; pb = cb;
    }
    return [xa.slice(-168), xb.slice(-168)];
  })();
  const sync = pearson(ra, rb);
  if (sync == null) return null;
  let best = { shift: 0, corr: sync };
  for (const shift of [-3, -2, -1, 1, 2, 3]) {
    const x = shift > 0 ? ra.slice(0, -shift) : ra.slice(-shift);
    const y = shift > 0 ? rb.slice(shift) : rb.slice(0, ra.length + shift);
    const cc = pearson(x, y);
    if (cc != null && Math.abs(cc) > Math.abs(best.corr) + 0.05) best = { shift, corr: cc };
  }
  return { ...best, syncCorr: sync };
}

// ── Spread divergence z-score (pseudo-cointegration read, §3) ───
// Z-score of the log price ratio vs its rolling H1 mean. |z| > 2 = the two
// instruments are unusually stretched apart — mean-reversion pressure, but
// NEVER a certainty ("stretched" can always stretch further).

export function spreadZ(builder: OHLCVBuilder, primary: string, candidate: string): number | null {
  const A = builder.getAllBars(primary, '60'); const B = builder.getAllBars(candidate, '60');
  const mapB = new Map<number, number>();
  for (const b of B) mapB.set(b.time, b.close);
  const spread: number[] = [];
  for (const bar of A) {
    const cb = mapB.get(bar.time);
    if (cb != null && bar.close > 0 && cb > 0) spread.push(Math.log(bar.close) - Math.log(cb));
  }
  const s = spread.slice(-168);
  if (s.length < 48) return null;
  const m = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / s.length);
  if (!(sd > 0)) return null;
  return (s[s.length - 1] - m) / sd;
}

// ── Weekend gap analyzer ────────────────────────────────────────
// Median and worst open-vs-prior-close gap across weekends in the D1 data,
// as a % of price — informs the Weekend Hedge decision with real history.

export function weekendGap(builder: OHLCVBuilder, symbol: string):
  { medianPct: number; worstPct: number; n: number } | null {
  const bars = builder.getAllBars(symbol, '1D');
  if (bars.length < 10) return null;
  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const dt = bars[i].time - bars[i - 1].time;
    if (dt > 1.5 * 86_400 && bars[i - 1].close > 0) {
      gaps.push(Math.abs(bars[i].open - bars[i - 1].close) / bars[i - 1].close * 100);
    }
  }
  if (!gaps.length) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  return { medianPct: sorted[Math.floor(sorted.length / 2)], worstPct: sorted[sorted.length - 1], n: gaps.length };
}

// ── Correlation matrix (all pairs, H1) ──────────────────────────

export function correlationMatrix(builder: OHLCVBuilder, symbols: string[]):
  { symbols: string[]; cells: (number | null)[][] } {
  const returns = symbols.map((s) => {
    const bars = builder.getAllBars(s, '60');
    const byTime = new Map<number, number>();
    let prev: number | null = null;
    for (const b of bars) {
      if (prev != null && prev > 0) byTime.set(b.time, Math.log(b.close / prev));
      prev = b.close;
    }
    return byTime;
  });
  const cells: (number | null)[][] = symbols.map(() => symbols.map(() => null));
  for (let i = 0; i < symbols.length; i++) {
    cells[i][i] = 1;
    for (let j = i + 1; j < symbols.length; j++) {
      const x: number[] = []; const y: number[] = [];
      for (const [t, r] of returns[i]) {
        const rj = returns[j].get(t);
        if (rj != null) { x.push(r); y.push(rj); }
      }
      const c = pearson(x.slice(-168), y.slice(-168));
      cells[i][j] = c; cells[j][i] = c;
    }
  }
  return { symbols, cells };
}

// ── Hedge groups (combined position view, §11) ──────────────────

export interface HedgeGroup {
  id: string;
  name: string;
  primaryPositionId: string;
  hedgePositionId: string;
  primarySymbol: string;
  hedgeSymbol: string;
  corrAtEntry: number;
  createdAt: number;
  record: Record<string, unknown>;      // full downloadable audit record
}

const GROUPS_KEY = 'raptor_hedge_groups_v1';

export function loadHedgeGroups(): HedgeGroup[] {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; }
}

export function saveHedgeGroups(groups: HedgeGroup[]): void {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups.slice(-40))); } catch { /* ignore */ }
}
