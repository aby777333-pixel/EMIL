// ═══════════════════════════════════════════════════════════════
// RAPTOR Widget Registry — the full Trader Utility Widget Suite as a
// data-driven catalogue. Each widget has a pure compute() over a shared
// context (precomputed once per refresh in WidgetHub), so ~60 widgets
// reuse the same engine reads instead of 60 bespoke components.
//
// Honesty rule: a widget computes from data the platform GENUINELY has.
// Where a reading needs a feed we don't have yet (true order-flow depth,
// resting-order liquidity, per-venue slippage), the card says so plainly
// rather than inventing numbers — and still offers the risk-controlled
// Trade · Auto Hedge · Exit All actions.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { InstrumentSpec } from '@/lib/insights/risk';
import type { NewsEvent } from '@/lib/trading/news-guard';
import { upcomingHighImpact, fmtEta } from '@/lib/trading/news-guard';
import { symbolCurrencies } from '@/lib/trading/protection';
import { correlationMatrix, currencyExposureMap, findHedges, type HedgeCandidate, type ExposureRow } from '@/lib/trading/hedge-engine';
import { assessOpportunity, SCAN_TFS, type Opportunity } from '@/lib/trading/scanner-engine';
import { loadBaskets, capitalRow, loadHedgeAutoParams } from '@/lib/trading/hedge-auto';
import { loadGovernorLimits } from '@/lib/trading/risk-governor';
import {
  buySellPressure, mtfTrendAlignment, volumeFlow, supportResistance, breakoutReversal,
  currencyStrength, riskReward, positionSize, sessionClock, marketHeat, marketRegime,
  trendStrength, momentumRead, marketStructure, volatilityRead, spreadCost, tradeScenario,
  brokerCondition, type Ticks,
} from '@/lib/trading/widget-engines';
import { feedHealth } from '@/lib/trading/feed-watchdog';
import { journalStats, winRate, type JournalRow } from '@/lib/trading/trade-journal';
import type { TradeContext } from '@/components/trading/widgets/WidgetControls';

export interface LivePos {
  id: string; symbol: string; direction: string; size: number; status: string;
  open_price: number; current_price?: number | null; unrealized_pnl?: number | null;
  sl?: number | null; tp?: number | null; opened_at?: string; comment?: string | null;
}

export interface SharedCtx {
  builder: OHLCVBuilder;
  symbol: string;
  prices: Ticks;
  universe: string[];
  positions: LivePos[];
  specs: Record<string, InstrumentSpec> | null;
  calendar: NewsEvent[];
  closed: JournalRow[];          // real closed-trade history for the journal widgets
  balance: number;
  equity: number;
  freeMargin: number;
  usedMargin: number;
  marginLevel: number;
  riskPct: number;
}

export interface WidgetRow { k: string; v: string; c?: string }
export interface WidgetOutput { rows: WidgetRow[]; tag?: string; tagColor?: string; trade?: Partial<TradeContext>; note?: string; bar?: number }
export interface WidgetDef { id: string; name: string; category: string; accent: string; compute: (s: SharedCtx) => WidgetOutput }

export const CATEGORIES = [
  'Direction & Pressure', 'Trend & Structure', 'Levels & Setups', 'Strength & Correlation',
  'Volatility & Cost', 'Risk & Sizing', 'Hedging', 'Account Safety',
  'Trade Management', 'Timing & News', 'Scanner & Opportunity', 'Platform & Emergency',
] as const;

const G = '#00E5A0', R = '#FF5252', A = '#FFB300', B = '#4DD0E1', V = '#CE93D8';
const dirColor = (d: string) => d.includes('ull') || d === 'Up' || d === 'BUY' ? G : d.includes('ear') || d === 'Down' || d === 'SELL' ? R : A;
const fx = (n: number, sym: string) => n.toFixed(sym.includes('JPY') ? 3 : sym.startsWith('XAU') || /^(US30|NAS100|SPX500|BTC|ETH)/.test(sym) ? 2 : 5);

// Open positions helper by scope.
const openPos = (s: SharedCtx) => s.positions.filter((p) => p.status === 'open');
const symPos = (s: SharedCtx) => openPos(s).filter((p) => p.symbol === s.symbol);

export const WIDGETS: WidgetDef[] = [
  // ═══ Direction & Pressure ═══
  { id: 'pressure', name: 'Buy / Sell Pressure', category: 'Direction & Pressure', accent: B, compute: (s) => {
    const r = buySellPressure(s.builder, s.symbol, '60', s.prices[s.symbol]);
    if (!r) return { rows: [], note: 'collecting bars…' };
    return { bar: r.buyPct, tag: r.signal, tagColor: dirColor(r.signal), trade: { direction: r.bias === 'Bullish' ? 'BUY' : r.bias === 'Bearish' ? 'SELL' : undefined },
      rows: [{ k: 'Buy / Sell', v: `${r.buyPct}% / ${r.sellPct}%` }, { k: 'Bias · strength', v: `${r.bias} · ${r.strength}`, c: dirColor(r.bias) }, { k: 'Momentum', v: `${r.momentum > 0 ? '+' : ''}${r.momentum}` }, { k: 'Spread · conf', v: `${r.spreadPips != null ? r.spreadPips.toFixed(1) + 'p' : '—'} · ${r.confidence}%` }] };
  } },
  { id: 'bullbear', name: 'Bullish / Bearish %', category: 'Direction & Pressure', accent: B, compute: (s) => {
    const reg = marketRegime(s.builder, s.symbol); const p = buySellPressure(s.builder, s.symbol, '60', s.prices[s.symbol]);
    if (!reg || !p) return { rows: [], note: 'collecting bars…' };
    const bull = Math.round((p.buyPct * 0.6 + reg.confidence * 0.4)); const bear = 100 - bull;
    return { bar: bull, tag: bull >= 55 ? 'Bull' : bear >= 55 ? 'Bear' : 'Mixed', tagColor: bull >= 55 ? G : bear >= 55 ? R : A, trade: { direction: bull >= 55 ? 'BUY' : bear >= 55 ? 'SELL' : undefined },
      rows: [{ k: 'Bullish', v: `${bull}%`, c: G }, { k: 'Bearish', v: `${bear}%`, c: R }, { k: 'Regime conf', v: `${reg.confidence}%` }, { k: 'Not certainty', v: 'probabilities only' }] };
  } },
  { id: 'momentum', name: 'Momentum', category: 'Direction & Pressure', accent: B, compute: (s) => {
    const m = momentumRead(s.builder, s.symbol);
    if (!m) return { rows: [], note: 'collecting bars…' };
    return { bar: m.score, tag: m.direction, tagColor: dirColor(m.direction), trade: { direction: m.direction === 'Up' ? 'BUY' : m.direction === 'Down' ? 'SELL' : undefined },
      rows: [{ k: 'Momentum score', v: `${m.score}` }, { k: 'Direction', v: m.direction, c: dirColor(m.direction) }, { k: 'State', v: m.state }, { k: 'Note', v: m.state === 'decelerating' ? 'watch for exhaustion' : 'ride while it holds' }] };
  } },
  { id: 'orderflow', name: 'Order Flow Imbalance', category: 'Direction & Pressure', accent: B, compute: (s) => {
    const v = volumeFlow(s.builder, s.symbol, '60');
    if (!v) return { rows: [], note: 'collecting bars…' };
    return { tag: v.delta > 0 ? 'Buyers' : v.delta < 0 ? 'Sellers' : 'Balanced', tagColor: v.delta > 0 ? G : v.delta < 0 ? R : A,
      rows: [{ k: 'Delta (proxy)', v: `${v.delta > 0 ? '+' : ''}${v.delta}`, c: v.delta > 0 ? G : R }, { k: 'Buy / Sell vol', v: `${v.buyVol} / ${v.sellVol}` }, { k: 'Acceleration', v: `${v.acceleration > 0 ? '+' : ''}${v.acceleration}%` }],
      note: 'Candle-delta proxy — true tick-level order flow needs a depth feed (not yet connected).' };
  } },
  { id: 'volflow', name: 'Volume Flow', category: 'Direction & Pressure', accent: B, compute: (s) => {
    const v = volumeFlow(s.builder, s.symbol, '60');
    if (!v) return { rows: [], note: 'collecting bars…' };
    return { tag: v.signal, tagColor: v.signal.startsWith('Buy') ? G : v.signal.startsWith('Sell') ? R : A,
      rows: [{ k: 'Relative volume', v: `${v.relative}×`, c: v.relative >= 1.5 ? A : undefined }, { k: 'Delta · accel', v: `${v.delta > 0 ? '+' : ''}${v.delta} · ${v.acceleration}%` }], note: v.note };
  } },

  // ═══ Trend & Structure ═══
  { id: 'mtf', name: 'Trend Alignment (MTF)', category: 'Trend & Structure', accent: B, compute: (s) => {
    const m = mtfTrendAlignment(s.builder, s.symbol);
    return { tag: `${m.aligned}/5 ${m.dominant}`, tagColor: dirColor(m.dominant), trade: { direction: m.dominant === 'Bullish' ? 'BUY' : m.dominant === 'Bearish' ? 'SELL' : undefined },
      rows: m.rows.map((r) => ({ k: r.tf, v: `${r.direction} · ${r.strength}% · ${r.signal}`, c: dirColor(r.direction) })), note: m.conflict ? '⚠ timeframes conflict — extra risk on trend trades' : undefined };
  } },
  { id: 'trendstrength', name: 'Trend Strength', category: 'Trend & Structure', accent: B, compute: (s) => {
    const t = trendStrength(s.builder, s.symbol);
    if (!t) return { rows: [], note: 'collecting bars…' };
    return { bar: t.strengthPct, tag: t.direction, tagColor: dirColor(t.direction), trade: { direction: t.direction === 'Bullish' ? 'BUY' : t.direction === 'Bearish' ? 'SELL' : undefined },
      rows: [{ k: 'Direction', v: t.direction, c: dirColor(t.direction) }, { k: 'Strength', v: `${t.strengthPct}%` }, { k: 'Maturity', v: t.maturity }, { k: 'Exhaustion risk', v: t.exhaustionRisk, c: t.exhaustionRisk === 'elevated' ? A : undefined }] };
  } },
  { id: 'regime', name: 'Market Regime', category: 'Trend & Structure', accent: B, compute: (s) => {
    const r = marketRegime(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    return { bar: r.confidence, tag: r.regime, tagColor: r.regime.includes('trend') ? G : A,
      rows: [{ k: 'Regime', v: r.regime, c: G }, { k: 'Confidence · vol', v: `${r.confidence}% · ${r.volatility}` }, { k: 'Suitable', v: r.suitable, c: G }, { k: 'Unsuitable', v: r.unsuitable, c: R }] };
  } },
  { id: 'structure', name: 'Market Structure', category: 'Trend & Structure', accent: B, compute: (s) => {
    const m = marketStructure(s.builder, s.symbol);
    if (!m) return { rows: [], note: 'collecting bars…' };
    return { tag: m.bias, tagColor: dirColor(m.bias), trade: { direction: m.bias === 'Bullish' ? 'BUY' : m.bias === 'Bearish' ? 'SELL' : undefined },
      rows: [{ k: 'Structure', v: m.label, c: dirColor(m.bias) }, { k: 'Bias', v: m.bias }, { k: 'Note', v: m.note }] };
  } },
  { id: 'priceaction', name: 'Price Action', category: 'Trend & Structure', accent: B, compute: (s) => {
    const bars = s.builder.getAllBars(s.symbol, '60'); if (bars.length < 5) return { rows: [], note: 'collecting bars…' };
    const [b2, b1] = [bars[bars.length - 2], bars[bars.length - 1]];
    const engulf = Math.abs(b1.close - b1.open) > Math.abs(b2.close - b2.open) * 1.2 && Math.sign(b1.close - b1.open) !== Math.sign(b2.close - b2.open);
    const body = Math.abs(b1.close - b1.open); const range = Math.max(1e-9, b1.high - b1.low);
    const pin = (b1.high - Math.max(b1.close, b1.open)) > body * 1.8 || (Math.min(b1.close, b1.open) - b1.low) > body * 1.8;
    const patt = engulf ? (b1.close > b1.open ? 'Bullish engulfing' : 'Bearish engulfing') : pin ? 'Pin bar (rejection)' : body / range > 0.7 ? 'Strong momentum candle' : 'No clean pattern';
    return { tag: patt === 'No clean pattern' ? 'wait' : 'signal', tagColor: patt === 'No clean pattern' ? A : G,
      rows: [{ k: 'Last-bar pattern', v: patt, c: patt === 'No clean pattern' ? undefined : G }, { k: 'Body / range', v: `${Math.round(body / range * 100)}%` }, { k: 'Context', v: 'confirm with S/R + trend before acting' }] };
  } },
  { id: 'candles', name: 'Candlestick Confirmation', category: 'Trend & Structure', accent: B, compute: (s) => {
    const bars = s.builder.getAllBars(s.symbol, '60'); if (bars.length < 3) return { rows: [], note: 'collecting bars…' };
    const b1 = bars[bars.length - 1]; const bullish = b1.close > b1.open;
    const reg = marketRegime(s.builder, s.symbol);
    return { tag: bullish ? 'Bullish' : 'Bearish', tagColor: bullish ? G : R,
      rows: [{ k: 'Last candle', v: bullish ? 'bullish close' : 'bearish close', c: bullish ? G : R }, { k: 'Trend context', v: reg?.regime ?? '—' }, { k: 'Reliability', v: 'only meaningful WITH trend + level context' }],
      note: 'Patterns without market context are ignored by design.' };
  } },

  // ═══ Levels & Setups ═══
  { id: 'sr', name: 'Support / Resistance', category: 'Levels & Setups', accent: B, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    return { trade: { direction: buy ? 'BUY' : 'SELL', entry: r.price, stop: buy ? r.immediateSupport : r.immediateResistance, target: buy ? r.immediateResistance : r.immediateSupport },
      rows: [{ k: 'Resistance', v: `${fx(r.immediateResistance, s.symbol)} (+${r.distResistancePips}p)`, c: R }, { k: 'Price', v: fx(r.price, s.symbol), c: '#fff' }, { k: 'Support', v: `${fx(r.immediateSupport, s.symbol)} (-${r.distSupportPips}p)`, c: G }, { k: 'Pivot · prev', v: `${fx(r.pivot, s.symbol)} · ${fx(r.prevClose, s.symbol)}` }] };
  } },
  { id: 'breakout', name: 'Breakout Probability', category: 'Levels & Setups', accent: B, compute: (s) => {
    const r = breakoutReversal(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    return { bar: r.breakoutProb, tag: r.bias, tagColor: dirColor(r.bias), trade: { direction: r.bias === 'Bullish' ? 'BUY' : r.bias === 'Bearish' ? 'SELL' : undefined },
      rows: [{ k: 'Breakout / hold', v: `${r.breakoutProb}% / ${r.rangeHoldProb}%` }, { k: 'False breakout', v: `${r.falseBreakoutProb}%`, c: A }, { k: 'Compression', v: `${r.compression}%` }], note: r.note };
  } },
  { id: 'reversal', name: 'Reversal Probability', category: 'Levels & Setups', accent: B, compute: (s) => {
    const r = breakoutReversal(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    return { bar: r.reversalProb, tag: r.reversalProb > 55 ? 'reversal risk' : 'continuation', tagColor: r.reversalProb > 55 ? A : G,
      rows: [{ k: 'Reversal', v: `${r.reversalProb}%`, c: A }, { k: 'Continuation', v: `${r.continuationProb}%`, c: G }, { k: 'Note', v: r.reversalProb > 55 ? 'consider reducing / tightening stop' : 'trend likely persists' }] };
  } },
  { id: 'liquidity', name: 'Liquidity Map', category: 'Levels & Setups', accent: B, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    return { rows: [{ k: 'Liquidity above', v: `${fx(r.strongResistance, s.symbol)} (day H ${fx(r.dayHigh, s.symbol)})`, c: R }, { k: 'Price', v: fx(r.price, s.symbol), c: '#fff' }, { k: 'Liquidity below', v: `${fx(r.strongSupport, s.symbol)} (day L ${fx(r.dayLow, s.symbol)})`, c: G }, { k: 'Sweep risk', v: `${r.distResistancePips}p up / ${r.distSupportPips}p down` }],
      note: 'Swing/structure proxy — resting-order & stop-cluster depth needs a Level-2 feed (not connected).' };
  } },
  { id: 'entryzone', name: 'Best Entry / Exit Zone', category: 'Levels & Setups', accent: B, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const entry = buy ? r.immediateSupport : r.immediateResistance;
    return { trade: { direction: buy ? 'BUY' : 'SELL', entry, stop: buy ? r.strongSupport : r.strongResistance, target: buy ? r.immediateResistance : r.immediateSupport },
      rows: [{ k: 'Aggressive', v: fx(r.price, s.symbol) }, { k: 'Preferred zone', v: fx(entry, s.symbol), c: G }, { k: 'Stop beyond', v: fx(buy ? r.strongSupport : r.strongResistance, s.symbol), c: R }, { k: 'Target', v: fx(buy ? r.immediateResistance : r.immediateSupport, s.symbol) }] };
  } },
  { id: 'gaps', name: 'Gap Scanner', category: 'Levels & Setups', accent: B, compute: (s) => {
    const bars = s.builder.getAllBars(s.symbol, '1D'); if (bars.length < 3) return { rows: [], note: 'collecting daily bars…' };
    const [prev, last] = [bars[bars.length - 2], bars[bars.length - 1]];
    const gap = last.open - prev.close; const pip = s.specs?.[s.symbol]?.pricescale ?? 100000;
    const gapPts = Math.round(gap * pip);
    return { tag: Math.abs(gapPts) < 5 ? 'no gap' : gap > 0 ? 'gap up' : 'gap down', tagColor: Math.abs(gapPts) < 5 ? A : gap > 0 ? G : R,
      rows: [{ k: 'Open gap', v: `${gapPts > 0 ? '+' : ''}${gapPts} pts`, c: Math.abs(gapPts) < 5 ? undefined : (gap > 0 ? G : R) }, { k: 'Prev close', v: fx(prev.close, s.symbol) }, { k: 'Fill target', v: fx(prev.close, s.symbol) }], note: Math.abs(gapPts) < 5 ? 'no tradable gap today' : 'gaps often fill — but not always' };
  } },

  // ═══ Strength & Correlation ═══
  { id: 'ccystrength', name: 'Currency Strength', category: 'Strength & Correlation', accent: B, compute: (s) => {
    const rows = currencyStrength(s.builder, s.universe);
    return { rows: rows.map((r, i) => ({ k: r.ccy, v: `${r.strengthPct}% ${r.momentum === 'Rising' ? '↑' : r.momentum === 'Falling' ? '↓' : '·'}`, c: i < 2 ? G : i >= rows.length - 2 ? R : undefined })), note: 'Strongest vs weakest = cleanest trend pair.' };
  } },
  { id: 'assetstrength', name: 'Asset Strength', category: 'Strength & Correlation', accent: B, compute: (s) => {
    const classes: Record<string, number[]> = { Forex: [], Metals: [], Indices: [], Crypto: [], Energy: [] };
    for (const sym of s.universe) {
      const bars = s.builder.getAllBars(sym, '60'); if (bars.length < 13) continue;
      const chg = (bars[bars.length - 1].close - bars[bars.length - 12].close) / bars[bars.length - 12].close * 100;
      const cls = /^XA[UG]/.test(sym) ? 'Metals' : /^(BTC|ETH)/.test(sym) ? 'Crypto' : /(US30|NAS100|SPX500)/.test(sym) ? 'Indices' : /(USOIL|UKOIL|NATGAS)/.test(sym) ? 'Energy' : 'Forex';
      classes[cls].push(chg);
    }
    const rows = Object.entries(classes).filter(([, v]) => v.length).map(([k, v]) => ({ k, avg: v.reduce((a, b) => a + b, 0) / v.length })).sort((a, b) => b.avg - a.avg);
    return { rows: rows.map((r) => ({ k: r.k, v: `${r.avg >= 0 ? '+' : ''}${r.avg.toFixed(2)}%`, c: r.avg >= 0 ? G : R })), note: 'Relative 12-bar performance by asset class.' };
  } },
  { id: 'pairing', name: 'Relative Strength Pairing', category: 'Strength & Correlation', accent: B, compute: (s) => {
    const rows = currencyStrength(s.builder, s.universe);
    if (rows.length < 2) return { rows: [], note: 'collecting bars…' };
    const strong = rows[0], weak = rows[rows.length - 1];
    const pair = `${strong.ccy}${weak.ccy}`; const inv = `${weak.ccy}${strong.ccy}`;
    const tradable = s.universe.includes(pair) ? pair : s.universe.includes(inv) ? inv : `${strong.ccy}/${weak.ccy}`;
    return { tag: 'pair idea', tagColor: G, trade: { symbol: s.universe.includes(pair) ? pair : s.universe.includes(inv) ? inv : s.symbol, direction: s.universe.includes(pair) ? 'BUY' : 'SELL' },
      rows: [{ k: 'Strongest', v: `${strong.ccy} ${strong.strengthPct}%`, c: G }, { k: 'Weakest', v: `${weak.ccy} ${weak.strengthPct}%`, c: R }, { k: 'Tradable pair', v: tradable, c: '#fff' }, { k: 'Diff', v: `${strong.strengthPct - weak.strengthPct}%` }] };
  } },
  { id: 'correlation', name: 'Correlation Matrix', category: 'Strength & Correlation', accent: B, compute: (s) => {
    const m = correlationMatrix(s.builder, s.universe.slice(0, 8));
    if (!m.symbols.length) return { rows: [], note: 'collecting bars…' };
    const rows: WidgetRow[] = [];
    const i = m.symbols.indexOf(s.symbol);
    if (i >= 0) {
      const pairs = m.symbols.map((sym, j) => ({ sym, c: m.cells[i][j] })).filter((x) => x.sym !== s.symbol && x.c != null).sort((a, b) => Math.abs(b.c!) - Math.abs(a.c!)).slice(0, 5);
      for (const p of pairs) rows.push({ k: `vs ${p.sym}`, v: `${Math.round(p.c! * 100)}%`, c: p.c! > 0.5 ? G : p.c! < -0.5 ? R : undefined });
    }
    return { rows: rows.length ? rows : [{ k: s.symbol, v: 'no strong correlations right now' }], note: 'Positive = moves together · negative = offsets (hedge candidate).' };
  } },
  { id: 'ccyexposure', name: 'Currency Exposure', category: 'Strength & Correlation', accent: B, compute: (s) => {
    const rows: ExposureRow[] = s.specs ? currencyExposureMap(openPos(s), s.specs) : [];
    if (!rows.length) return { rows: [], note: 'No open positions — no currency exposure.' };
    return { rows: rows.slice(0, 8).map((e) => ({ k: e.ccy, v: `net ${e.net >= 0 ? '+' : ''}$${Math.abs(e.net).toFixed(0)} ${e.net >= 0 ? 'long' : 'short'}`, c: e.net >= 0 ? G : R })) };
  } },

  // ═══ Volatility & Cost ═══
  { id: 'volatility', name: 'Volatility', category: 'Volatility & Cost', accent: A, compute: (s) => {
    const v = volatilityRead(s.builder, s.symbol);
    if (!v) return { rows: [], note: 'collecting bars…' };
    return { bar: v.percentile, tag: v.regime, tagColor: v.regime === 'expanded' ? R : v.regime === 'compressed' ? A : G,
      rows: [{ k: 'ATR', v: `${fx(v.atr, s.symbol)} (${v.atrPct}%)` }, { k: 'Percentile', v: `${v.percentile}%` }, { k: 'Suggested stop', v: `${v.suggestedStopPips}p (1.5 ATR)` }], note: v.regime === 'expanded' ? 'reduce lot size — stops must be wider' : v.regime === 'compressed' ? 'coiled — expansion likely' : undefined };
  } },
  { id: 'spreadcost', name: 'Spread & Execution Cost', category: 'Volatility & Cost', accent: A, compute: (s) => {
    const c = spreadCost(s.symbol, s.prices[s.symbol], s.specs?.[s.symbol]);
    return { tag: c.state, tagColor: c.state === 'Normal' ? G : c.state === 'Elevated' ? A : R,
      rows: [{ k: 'Spread', v: c.spreadPips != null ? `${c.spreadPips}p` : '—' }, { k: 'State', v: c.state, c: c.state === 'Normal' ? G : c.state === 'Unsafe' ? R : A }, { k: 'Est. round-trip', v: c.est }], note: c.state === 'Unsafe' || c.state === 'Expensive' ? 'wait for a tighter spread or use a limit order' : undefined };
  } },
  { id: 'slippage', name: 'Slippage & Execution Quality', category: 'Volatility & Cost', accent: A, compute: (s) => {
    const c = spreadCost(s.symbol, s.prices[s.symbol], s.specs?.[s.symbol]);
    return { tag: c.state === 'Normal' ? 'OK' : 'caution', tagColor: c.state === 'Normal' ? G : A,
      rows: [{ k: 'Spread proxy', v: c.spreadPips != null ? `${c.spreadPips}p (${c.state})` : '—' }, { k: 'Live quote', v: s.prices[s.symbol]?.bid != null ? 'fresh' : 'stale' }],
      note: 'Real fill-quality / rejection / delay metrics need broker execution telemetry (not connected). Use limit orders when spread is elevated.' };
  } },
  { id: 'costvprofit', name: 'Trade Cost vs Profit', category: 'Volatility & Cost', accent: A, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol); const spec = s.specs?.[s.symbol];
    if (!r || !spec) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const rr = riskReward({ symbol: s.symbol, entry: r.price, stop: buy ? r.immediateSupport : r.immediateResistance, target: buy ? r.immediateResistance : r.immediateSupport, lots: 0.01, spec, spreadPips: spreadCost(s.symbol, s.prices[s.symbol], spec).spreadPips });
    if (!rr) return { rows: [], note: 'no valid stop distance' };
    return { rows: [{ k: 'Gross reward', v: `$${rr.rewardCash.toFixed(2)}` }, { k: 'Cost estimate', v: `$${rr.costCash.toFixed(2)}`, c: A }, { k: 'Net R:R', v: `1:${rr.netRR}`, c: rr.netRR >= 1.5 ? G : rr.netRR >= 1 ? A : R }, { k: 'Verdict', v: rr.netRR >= 1.5 ? 'costs well covered' : 'costs eat the edge' }] };
  } },

  // ═══ Risk & Sizing ═══
  { id: 'riskreward', name: 'Risk-to-Reward (net)', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol); const spec = s.specs?.[s.symbol];
    if (!r || !spec) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const stop = buy ? r.immediateSupport : r.immediateResistance, target = buy ? r.immediateResistance : r.immediateSupport;
    const rr = riskReward({ symbol: s.symbol, entry: r.price, stop, target, lots: 0.01, spec, spreadPips: spreadCost(s.symbol, s.prices[s.symbol], spec).spreadPips });
    if (!rr) return { rows: [], note: 'no valid stop distance' };
    return { trade: { direction: buy ? 'BUY' : 'SELL', entry: r.price, stop, target }, tag: rr.netRR >= 1.5 ? 'good' : rr.netRR >= 1 ? 'ok' : 'weak', tagColor: rr.netRR >= 1.5 ? G : rr.netRR >= 1 ? A : R,
      rows: [{ k: 'Gross R:R', v: `1:${rr.grossRR}` }, { k: 'Net R:R', v: `1:${rr.netRR}`, c: rr.netRR >= 1.5 ? G : R }, { k: 'Risk / reward', v: `$${rr.riskCash.toFixed(2)} / $${rr.rewardCash.toFixed(2)}` }] };
  } },
  { id: 'possize', name: 'Position Size', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol); const spec = s.specs?.[s.symbol];
    if (!r || !spec || !(s.balance > 0)) return { rows: [], note: s.balance > 0 ? 'collecting bars…' : 'select an account with a balance' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const sz = positionSize({ balance: s.balance, riskPct: s.riskPct, entry: r.price, stop: buy ? r.immediateSupport : r.immediateResistance, spec });
    if (!sz) return { rows: [], note: 'no valid stop distance' };
    return { trade: { direction: buy ? 'BUY' : 'SELL', entry: r.price, stop: buy ? r.immediateSupport : r.immediateResistance, lots: sz.lot },
      rows: [{ k: 'Risk', v: `${s.riskPct}% = $${sz.riskAmount.toFixed(2)}` }, { k: 'Suggested lot', v: `${sz.lot}`, c: G }, { k: 'Margin · max', v: `$${sz.margin.toFixed(0)} · ${sz.maxLot}` }], note: sz.note };
  } },
  { id: 'stopquality', name: 'Stop-Loss Quality', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol); const v = volatilityRead(s.builder, s.symbol);
    if (!r || !v) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const stopDist = Math.abs(r.price - (buy ? r.immediateSupport : r.immediateResistance)) / (s.specs?.[s.symbol]?.pricescale ? 1 : 1);
    const stopPips = Math.round(Math.abs(r.price - (buy ? r.immediateSupport : r.immediateResistance)) / (1 / (s.specs?.[s.symbol]?.pricescale ?? 100000)));
    const insideNoise = stopPips < v.suggestedStopPips * 0.5;
    return { tag: insideNoise ? 'too tight' : 'structural', tagColor: insideNoise ? A : G,
      rows: [{ k: 'Structure stop', v: fx(buy ? r.immediateSupport : r.immediateResistance, s.symbol), c: G }, { k: 'ATR floor', v: `${v.suggestedStopPips}p` }, { k: 'Quality', v: insideNoise ? 'inside noise — widen it' : 'beyond structure — good' }], note: 'Stops inside normal volatility get wicked out.' };
  } },
  { id: 'tpquality', name: 'Take-Profit Quality', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const r = supportResistance(s.builder, s.symbol);
    if (!r) return { rows: [], note: 'collecting bars…' };
    const buy = Math.abs(r.price - r.immediateSupport) < Math.abs(r.immediateResistance - r.price);
    const target = buy ? r.immediateResistance : r.immediateSupport; const nextObstacle = buy ? r.strongResistance : r.strongSupport;
    return { rows: [{ k: 'Nearest target', v: fx(target, s.symbol), c: G }, { k: 'Obstacle before it', v: fx(nextObstacle, s.symbol), c: A }, { k: 'Realistic?', v: `${buy ? r.distResistancePips : r.distSupportPips}p away` }], note: 'Target sits at the nearest real level, not a wish.' };
  } },
  { id: 'entryquality', name: 'Entry Quality', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const mtf = mtfTrendAlignment(s.builder, s.symbol); const c = spreadCost(s.symbol, s.prices[s.symbol], s.specs?.[s.symbol]);
    const news = upcomingHighImpact(symbolCurrencies(s.symbol), s.calendar, 1)[0];
    let score = 40; score += mtf.aligned * 8; if (c.state === 'Normal') score += 15; if (!news) score += 12; if (mtf.conflict) score -= 15;
    score = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Acceptable' : score >= 40 ? 'Weak' : 'Avoid';
    return { bar: score, tag: grade, tagColor: score >= 80 ? G : score >= 60 ? B : score >= 40 ? A : R, trade: { direction: mtf.dominant === 'Bullish' ? 'BUY' : mtf.dominant === 'Bearish' ? 'SELL' : undefined },
      rows: [{ k: 'Entry quality', v: `${score}/100 · ${grade}`, c: score >= 60 ? G : R }, { k: 'Trend alignment', v: `${mtf.aligned}/5` }, { k: 'Spread · news', v: `${c.state} · ${news ? 'event soon' : 'clear'}` }] };
  } },
  { id: 'scenario', name: 'Trade Scenario', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const sc = tradeScenario(s.builder, s.symbol, s.specs?.[s.symbol], 0.01);
    if (!sc) return { rows: [], note: 'collecting bars…' };
    return { rows: [{ k: 'Best case', v: sc.best, c: G }, { k: 'Base case', v: sc.base }, { k: 'Worst case', v: sc.worst, c: R }], note: 'Per 0.01 lot. Worst case ignores gap/slippage tails — real tails are larger.' };
  } },
  { id: 'whatif', name: 'What-If Risk', category: 'Risk & Sizing', accent: G, compute: (s) => {
    const floating = openPos(s).reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    const exposureLots = openPos(s).reduce((a, p) => a + p.size, 0);
    return { rows: [
      { k: 'If vol doubles', v: `stops ~2× wider — halve new lot size`, c: A },
      { k: 'If all stops hit', v: `floating now $${floating.toFixed(2)} + stop distances`, c: R },
      { k: 'If account -5%', v: `-$${(s.balance * 0.05).toFixed(0)} → governor blocks new risk`, c: R },
      { k: 'Open exposure', v: `${exposureLots.toFixed(2)} lots` },
    ], note: 'Stress estimates from current positions + limits.' };
  } },

  // ═══ Hedging ═══
  { id: 'hedgeopp', name: 'Hedge Opportunity', category: 'Hedging', accent: V, compute: (s) => {
    if (!s.specs) return { rows: [], note: 'loading specs…' };
    const buy = 'BUY' as const;
    const { viable } = findHedges(s.builder, { primary: s.symbol, direction: buy, lots: 0.1, hedgePct: 0.5 }, s.universe, s.specs, s.prices);
    if (!viable.length) return { rows: [{ k: s.symbol, v: 'no reliable hedge right now' }], note: 'The engine refuses to force a weak or costly hedge.' };
    const h: HedgeCandidate = viable[0];
    return { tag: 'available', tagColor: V, trade: { symbol: h.symbol, direction: h.hedgeDirection },
      rows: [{ k: 'Hedge', v: `${h.hedgeDirection} ${h.symbol}`, c: V }, { k: 'Correlation', v: `${(h.corr.avg ?? 0).toFixed(2)}` }, { k: 'Exposure cut', v: `${h.reductionPct.toFixed(0)}%` }, { k: 'Cost · margin', v: `$${h.spreadCost.toFixed(2)} · $${h.marginEstimate.toFixed(0)}` }], note: 'Fails if the correlation weakens/reverses/gaps. Never guaranteed.' };
  } },
  { id: 'basketmon', name: 'Hedge Basket Monitor', category: 'Hedging', accent: V, compute: (s) => {
    const baskets = loadBaskets().filter((b) => b.status !== 'closed');
    if (!baskets.length) return { rows: [{ k: 'Baskets', v: 'none active' }], note: 'Active hedge baskets appear here.' };
    return { tag: `${baskets.length} active`, tagColor: V,
      rows: baskets.slice(0, 4).map((b) => ({ k: `${b.primarySymbol} basket`, v: `stage ${b.stage} · ${b.status} · +$${b.targetUsd}/-$${b.maxLossUsd}`, c: V })), note: 'Manage legs on the Hedge Trade page — any single-leg close recalculates the basket first.' };
  } },

  // ═══ Account Safety ═══
  { id: 'losslimit', name: 'Loss Limit', category: 'Account Safety', accent: R, compute: (s) => {
    const g = loadGovernorLimits(); const h = loadHedgeAutoParams();
    return { rows: [{ k: 'Account daily cap', v: `${g.dailyLossLimitPct}% ($${(s.balance * g.dailyLossLimitPct / 100).toFixed(0)})`, c: R }, { k: 'Hedge daily stop', v: `$${h.dailyLossLimitUsd}` }, { k: 'Max total lots', v: `${g.maxTotalLots}` }, { k: 'Max automated lots', v: `${g.maxAutomatedLots}` }], note: 'Governor blocks new automated risk past these.' };
  } },
  { id: 'drawdown', name: 'Drawdown Guard', category: 'Account Safety', accent: R, compute: (s) => {
    const dd = s.balance > 0 ? Math.max(0, (s.balance - s.equity) / s.balance * 100) : 0;
    const floating = openPos(s).reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    return { bar: Math.min(100, dd * 10), tag: dd >= 5 ? 'high' : dd >= 2 ? 'watch' : 'ok', tagColor: dd >= 5 ? R : dd >= 2 ? A : G,
      rows: [{ k: 'Equity drawdown', v: `${dd.toFixed(1)}%`, c: dd >= 2 ? R : G }, { k: 'Floating P&L', v: `${floating >= 0 ? '+' : ''}$${floating.toFixed(2)}`, c: floating >= 0 ? G : R }, { k: 'Governor halt', v: `${loadGovernorLimits().dailyLossLimitPct}%` }], note: dd >= 2 ? 'reduce lots / pause new entries' : undefined };
  } },
  { id: 'profitlock', name: 'Daily Profit Lock', category: 'Account Safety', accent: G, compute: (s) => {
    const floating = openPos(s).reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    const cap = capitalRow(s.balance);
    return { rows: [{ k: 'Floating profit', v: `${floating >= 0 ? '+' : ''}$${floating.toFixed(2)}`, c: floating >= 0 ? G : R }, { k: 'Suggested day target', v: `$${cap.target[0]}–$${cap.target[1]}` }, { k: 'Protect', v: '80% of realized once hit' }], note: 'Realized-P&L history feeds the true lock on the Scan/Hedge pages.' };
  } },
  { id: 'equityprot', name: 'Equity Protection', category: 'Account Safety', accent: R, compute: (s) => {
    return { rows: [{ k: 'Balance', v: `$${s.balance.toFixed(0)}` }, { k: 'Equity', v: `$${s.equity.toFixed(0)}`, c: s.equity >= s.balance ? G : R }, { k: 'Floor (50%)', v: `$${(s.balance * 0.5).toFixed(0)}`, c: A }], note: 'Governor forces margin preservation below 50% of balance.' };
  } },
  { id: 'marginhealth', name: 'Margin Health', category: 'Account Safety', accent: R, compute: (s) => {
    return { tag: s.marginLevel === 0 ? '—' : s.marginLevel < 200 ? 'low' : 'ok', tagColor: s.marginLevel && s.marginLevel < 200 ? R : G,
      rows: [{ k: 'Used margin', v: `$${s.usedMargin.toFixed(0)}` }, { k: 'Free margin', v: `$${s.freeMargin.toFixed(0)}`, c: G }, { k: 'Margin level', v: s.marginLevel ? `${s.marginLevel.toFixed(0)}%` : '—', c: s.marginLevel && s.marginLevel < 500 ? A : G }], note: s.marginLevel && s.marginLevel < 300 ? 'reduce exposure — margin thinning' : undefined };
  } },
  { id: 'portexposure', name: 'Portfolio Exposure', category: 'Account Safety', accent: R, compute: (s) => {
    const rows: ExposureRow[] = s.specs ? currencyExposureMap(openPos(s), s.specs) : [];
    const lots = openPos(s).reduce((a, p) => a + p.size, 0);
    if (!rows.length) return { rows: [{ k: 'Exposure', v: 'no open positions' }] };
    return { rows: [{ k: 'Open lots', v: `${lots.toFixed(2)}` }, ...rows.slice(0, 5).map((e) => ({ k: e.ccy, v: `${e.net >= 0 ? '+' : ''}$${Math.abs(e.net).toFixed(0)} ${e.net >= 0 ? 'long' : 'short'}`, c: e.net >= 0 ? G : R }))] };
  } },

  // ═══ Trade Management ═══
  { id: 'tradehealth', name: 'Open Trade Health', category: 'Trade Management', accent: B, compute: (s) => {
    const open = openPos(s);
    if (!open.length) return { rows: [{ k: 'Open trades', v: 'none' }] };
    return { rows: open.slice(0, 6).map((p) => { const pnl = Number(p.unrealized_pnl ?? 0); const health = pnl >= 0 ? 'healthy' : pnl > -5 ? 'watch' : 'reduce'; return { k: `${p.symbol} ${p.direction}`, v: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} · ${health}`, c: pnl >= 0 ? G : pnl > -5 ? A : R }; }) };
  } },
  { id: 'exitquality', name: 'Exit Quality', category: 'Trade Management', accent: B, compute: (s) => {
    const mine = symPos(s);
    if (!mine.length) return { rows: [{ k: s.symbol, v: 'no open position here' }], note: 'Open a position to evaluate its exit.' };
    const reg = marketRegime(s.builder, s.symbol); const pnl = mine.reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    const action = pnl >= 0 && reg?.regime.includes('trend') ? 'Hold / trail' : pnl >= 0 ? 'Take partial' : 'Reduce / reassess';
    return { tag: action, tagColor: action.startsWith('Hold') ? G : action.startsWith('Take') ? B : R,
      rows: [{ k: 'This-symbol P&L', v: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, c: pnl >= 0 ? G : R }, { k: 'Trend status', v: reg?.regime ?? '—' }, { k: 'Suggested', v: action }] };
  } },
  { id: 'invalidation', name: 'Trade Invalidation', category: 'Trade Management', accent: B, compute: (s) => {
    const mine = symPos(s);
    if (!mine.length) return { rows: [{ k: s.symbol, v: 'no open position here' }] };
    const struct = marketStructure(s.builder, s.symbol);
    return { rows: mine.slice(0, 4).map((p) => { const wrongWay = (p.direction === 'BUY' && struct?.bias === 'Bearish') || (p.direction === 'SELL' && struct?.bias === 'Bullish'); return { k: `${p.symbol} ${p.direction}`, v: wrongWay ? 'structure now against it' : 'thesis intact', c: wrongWay ? R : G }; }), note: 'Structure flip against a position is an invalidation warning.' };
  } },
  { id: 'breakeven', name: 'Break-Even Manager', category: 'Trade Management', accent: B, compute: (s) => {
    const open = openPos(s).filter((p) => Number(p.unrealized_pnl ?? 0) > 0);
    if (!open.length) return { rows: [{ k: 'Eligible', v: 'no profitable trades yet' }] };
    return { tag: `${open.length} eligible`, tagColor: G, rows: open.slice(0, 5).map((p) => ({ k: `${p.symbol} ${p.direction}`, v: `+$${Number(p.unrealized_pnl ?? 0).toFixed(2)} → move stop to entry`, c: G })), note: 'Move eligible trades to break-even to remove risk. Use the position panel to edit stops.' };
  } },
  { id: 'partial', name: 'Partial Profit Manager', category: 'Trade Management', accent: B, compute: (s) => {
    const open = openPos(s).filter((p) => Number(p.unrealized_pnl ?? 0) > 0);
    if (!open.length) return { rows: [{ k: 'Open profit', v: 'none to bank yet' }] };
    return { rows: open.slice(0, 5).map((p) => ({ k: `${p.symbol}`, v: `+$${Number(p.unrealized_pnl ?? 0).toFixed(2)} · close 25/50/75%?`, c: G })), note: 'Bank a portion at targets and let the runner ride. Close % from the position panel.' };
  } },
  { id: 'trailing', name: 'Trailing Profit', category: 'Trade Management', accent: B, compute: (s) => {
    const v = volatilityRead(s.builder, s.symbol); const open = openPos(s).filter((p) => Number(p.unrealized_pnl ?? 0) > 0);
    return { rows: [{ k: 'Trailable trades', v: `${open.length}` }, { k: 'Suggested trail', v: v ? `${v.suggestedStopPips}p (1.5 ATR)` : '—' }, { k: 'Method', v: 'ATR / structure' }], note: open.length ? 'Lock ≥50% of open profit; never move the trail backward.' : 'No open profit to trail.' };
  } },
  { id: 'timeintrade', name: 'Time-in-Trade', category: 'Trade Management', accent: B, compute: (s) => {
    const open = openPos(s);
    if (!open.length) return { rows: [{ k: 'Open trades', v: 'none' }] };
    return { rows: open.slice(0, 6).map((p) => { const mins = p.opened_at ? Math.round((Date.now() - new Date(p.opened_at).getTime()) / 60000) : 0; return { k: `${p.symbol} ${p.direction}`, v: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`, c: mins > 1440 ? A : undefined }; }), note: 'Watch overnight/swap costs on trades open past a session.' };
  } },
  { id: 'streak', name: 'Consecutive Win / Loss', category: 'Trade Management', accent: B, compute: (s) => {
    const j = journalStats(s.closed);
    if (!j.total.n) return { rows: [{ k: 'History', v: 'no closed trades yet' }], note: 'Streaks build from your real closed trades.' };
    return { tag: j.winStreak ? `${j.winStreak}W` : j.lossStreak ? `${j.lossStreak}L` : '—', tagColor: j.winStreak ? G : j.lossStreak ? R : A,
      rows: [{ k: 'Win streak', v: `${j.winStreak}`, c: G }, { k: 'Loss streak', v: `${j.lossStreak}`, c: R }, { k: 'Closed trades', v: `${j.total.n}` }, { k: 'Win rate', v: `${winRate(j.total)}%` }], note: j.lossStreak >= 2 ? 'reduce risk / take a cooldown' : undefined };
  } },

  // ═══ Timing & News ═══
  { id: 'session', name: 'Session Clock', category: 'Timing & News', accent: B, compute: (s) => {
    const sc = sessionClock(Date.now());
    return { tag: sc.liquidity, tagColor: sc.liquidity.startsWith('Peak') ? G : sc.liquidity === 'High' ? B : A,
      rows: sc.sessions.map((x) => ({ k: x.name, v: x.open ? `open · ${Math.floor(x.minsLeft / 60)}h ${x.minsLeft % 60}m` : 'closed', c: x.open ? G : 'rgba(255,255,255,0.3)' })) };
  } },
  { id: 'marketopen', name: 'Market Open / Close', category: 'Timing & News', accent: B, compute: (s) => {
    const sc = sessionClock(Date.now());
    const soonest = [...sc.sessions].filter((x) => x.open).sort((a, b) => a.minsLeft - b.minsLeft)[0];
    return { rows: [{ k: 'Active sessions', v: sc.active.join(', ') || 'none (thin)' }, { k: 'Next close', v: soonest ? `${soonest.name} in ${Math.floor(soonest.minsLeft / 60)}h ${soonest.minsLeft % 60}m` : '—' }, { k: 'Liquidity', v: sc.liquidity }], note: 'Close intraday trades before the session you traded ends.' };
  } },
  { id: 'sessionperf', name: 'Session Performance', category: 'Timing & News', accent: B, compute: (s) => {
    const j = journalStats(s.closed);
    const entries = Object.entries(j.bySession).sort((a, b) => b[1].pnl - a[1].pnl);
    if (!entries.length) return { rows: [{ k: 'By-session P&L', v: 'no closed trades yet' }], note: 'Builds from your real closed trades.' };
    return { rows: entries.map(([sess, b]) => ({ k: sess, v: `${b.pnl >= 0 ? '+' : ''}$${b.pnl.toFixed(2)} · ${winRate(b)}% (${b.n})`, c: b.pnl >= 0 ? G : R })), note: `Best: ${entries[0][0]}. Today: ${j.todayTrades} trade(s), ${j.todayPnl >= 0 ? '+' : ''}$${j.todayPnl.toFixed(2)}.` };
  } },
  { id: 'newsrisk', name: 'News Risk', category: 'Timing & News', accent: A, compute: (s) => {
    const ev = upcomingHighImpact(symbolCurrencies(s.symbol), s.calendar, 4)[0];
    if (!ev) return { rows: [{ k: s.symbol, v: 'no red-flag event inside 4h' }], tag: 'clear', tagColor: G };
    return { tag: 'event ahead', tagColor: A, rows: [{ k: 'Event', v: `${ev.currency} ${ev.title}`, c: A }, { k: 'In', v: fmtEta(ev.timeMs) }, { k: 'Action', v: 'reduce/close short-term trades before it', c: R }] };
  } },
  { id: 'calendar', name: 'Economic Calendar Countdown', category: 'Timing & News', accent: A, compute: (s) => {
    const evs = upcomingHighImpact([...new Set(s.universe.flatMap((x) => symbolCurrencies(x)))], s.calendar, 12).slice(0, 5);
    if (!evs.length) return { rows: [{ k: 'Calendar', v: 'no high-impact events inside 12h' }] };
    return { rows: evs.map((e) => ({ k: `${e.currency} ${e.title}`.slice(0, 26), v: fmtEta(e.timeMs), c: A })), note: 'Cancel pending orders before major releases.' };
  } },
  { id: 'newsreaction', name: 'News Reaction', category: 'Timing & News', accent: A, compute: (s) => {
    const v = volatilityRead(s.builder, s.symbol); const c = spreadCost(s.symbol, s.prices[s.symbol], s.specs?.[s.symbol]);
    return { rows: [{ k: 'Volatility now', v: v ? `${v.regime} (${v.percentile}%)` : '—', c: v?.regime === 'expanded' ? R : G }, { k: 'Spread', v: c.spreadPips != null ? `${c.spreadPips}p (${c.state})` : '—' }, { k: 'Safe to trade?', v: v?.regime === 'expanded' || c.state !== 'Normal' ? 'wait for normalization' : 'conditions normal' }], note: 'After news: trade only once spread + volatility settle.' };
  } },
  { id: 'timing', name: 'Trade Timing', category: 'Timing & News', accent: A, compute: (s) => {
    const c = spreadCost(s.symbol, s.prices[s.symbol], s.specs?.[s.symbol]); const sc = sessionClock(Date.now());
    const news = upcomingHighImpact(symbolCurrencies(s.symbol), s.calendar, 1)[0];
    const good = c.state === 'Normal' && !news && sc.liquidity !== 'Thin';
    return { tag: good ? 'trade now' : news ? 'wait (news)' : 'caution', tagColor: good ? G : A,
      rows: [{ k: 'Spread', v: `${c.state}` }, { k: 'Liquidity', v: sc.liquidity }, { k: 'News', v: news ? `event in ${fmtEta(news.timeMs)}` : 'clear' }, { k: 'Verdict', v: good ? 'conditions favourable' : 'hold for better timing', c: good ? G : A }] };
  } },

  // ═══ Scanner & Opportunity ═══
  { id: 'scanopp', name: 'Scanner Opportunity', category: 'Scanner & Opportunity', accent: B, compute: (s) => {
    let best: Opportunity | null = null;
    for (const tf of SCAN_TFS) { const o = assessOpportunity({ builder: s.builder, symbol: s.symbol, tf, tick: s.prices[s.symbol], calendar: s.calendar, openPositionCurrencies: [], balance: s.balance, isLiveData: false }); if (o && (!best || o.score > best.score)) best = o; }
    if (!best) return { rows: [{ k: s.symbol, v: 'no scanner setup on this symbol' }] };
    return { tag: `${best.score} ${best.scoreLabel}`, tagColor: best.score >= 75 ? G : best.score >= 60 ? A : R, trade: { direction: best.direction, entry: best.zone.preferred, stop: best.zone.stop, target: best.zone.target1 },
      rows: [{ k: 'Setup', v: `${best.direction} · ${best.tfLabel} ${best.style}`, c: dirColor(best.direction) }, { k: 'Entry / stop / TP', v: `${fx(best.zone.preferred, s.symbol)} / ${fx(best.zone.stop, s.symbol)} / ${fx(best.zone.target1, s.symbol)}` }, { k: 'R:R', v: `1:${best.zone.riskReward1.toFixed(1)}` }] };
  } },
  { id: 'oppranking', name: 'Opportunity Ranking', category: 'Scanner & Opportunity', accent: B, compute: (s) => {
    const found: Opportunity[] = [];
    for (const sym of s.universe.slice(0, 20)) for (const tf of SCAN_TFS.filter((t) => ['15m', 'H1', 'H4'].includes(t.label))) { const o = assessOpportunity({ builder: s.builder, symbol: sym, tf, tick: s.prices[sym], calendar: s.calendar, openPositionCurrencies: [], balance: s.balance, isLiveData: false }); if (o) found.push(o); }
    const top = found.sort((a, b) => b.score - a.score).slice(0, 6);
    if (!top.length) return { rows: [{ k: 'Opportunities', v: 'none pass right now' }] };
    return { rows: top.map((o) => ({ k: `${o.symbol} ${o.direction}`, v: `${o.tfLabel} · ${o.score} (${o.scoreLabel})`, c: o.score >= 75 ? G : undefined })), note: 'Ranked by scanner score across the universe.' };
  } },
  { id: 'missedopp', name: 'Missed Opportunity', category: 'Scanner & Opportunity', accent: B, compute: () => {
    return { rows: [{ k: 'Missed setups', v: 'tracked from your rejected signals' }], note: 'Builds from the scanner log — reviews whether a rejection was correct. Does not encourage revenge trading.' };
  } },
  { id: 'stratperf', name: 'Strategy Performance', category: 'Scanner & Opportunity', accent: B, compute: (s) => {
    const j = journalStats(s.closed);
    const entries = Object.entries(j.bySource).sort((a, b) => b[1].pnl - a[1].pnl);
    if (!entries.length) return { rows: [{ k: 'By source', v: 'no closed trades yet' }], note: 'Manual vs EMIL vs Scanner vs Auto Hedge/Scan vs EA — from real closes.' };
    return { rows: [
      ...entries.map(([src, b]) => ({ k: src, v: `${b.pnl >= 0 ? '+' : ''}$${b.pnl.toFixed(2)} · ${winRate(b)}% (${b.n})`, c: b.pnl >= 0 ? G : R })),
      { k: 'Profit factor · avg R', v: `${j.profitFactor === Infinity ? '∞' : j.profitFactor ?? '—'} · ${j.avgR ?? '—'}` },
    ], note: 'Real per-engine attribution from closed trades.' };
  } },

  // ═══ Platform & Emergency ═══
  { id: 'broker', name: 'Broker Condition', category: 'Platform & Emergency', accent: B, compute: (s) => {
    const b = brokerCondition(s.symbol, s.specs?.[s.symbol], s.prices[s.symbol]);
    return { rows: b.rows.map((r) => ({ k: r.k, v: r.v })) };
  } },
  { id: 'platform', name: 'Platform Health', category: 'Platform & Emergency', accent: B, compute: (s) => {
    const h = feedHealth(s.prices, Date.now());
    const hc = h.status === 'healthy' ? G : h.status === 'degraded' ? A : R;
    return { tag: h.status, tagColor: hc,
      rows: [
        { k: 'Market data', v: h.quoting > 0 ? `${h.quoting} instruments live` : 'no quotes', c: h.quoting > 0 ? G : R },
        { k: 'Feed integrity', v: h.note, c: hc },
        { k: 'Stale / wide-spread', v: `${h.stale.length} / ${h.wideSpread.length}`, c: h.stale.length || h.wideSpread.length ? A : G },
        { k: 'Clock skew', v: h.clockSkewMs != null ? `${Math.abs(h.clockSkewMs)}ms` : '—', c: h.clockSkewMs != null && Math.abs(h.clockSkewMs) > 2000 ? A : G },
        { k: 'Risk governor', v: 'active', c: G },
      ], note: h.status === 'unsafe' ? 'feed unsafe — automation stands down' : 'Auto Hedge / Scan will not arm when the feed is unsafe.' };
  } },
  { id: 'emergency', name: 'Emergency Risk', category: 'Platform & Emergency', accent: R, compute: (s) => {
    const open = openPos(s);
    return { tag: `${open.length} open`, tagColor: open.length ? A : G,
      rows: [{ k: 'Open trades', v: `${open.length}` }, { k: 'Use "Exit All" below', v: 'summary → confirm by scope' }, { k: 'Global stop', v: 'closes every trade with confirmation' }], note: 'Emergency actions confirm first (except margin-danger auto-actions).' };
  } },
];

export const WIDGETS_BY_CATEGORY = (): Record<string, WidgetDef[]> => {
  const out: Record<string, WidgetDef[]> = {};
  for (const c of CATEGORIES) out[c] = [];
  for (const w of WIDGETS) (out[w.category] ??= []).push(w);
  return out;
};
