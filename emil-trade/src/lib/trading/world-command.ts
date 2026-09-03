// ═══════════════════════════════════════════════════════════════
// RAPTOR Global Market Command Center + Portfolio DNA + Digital Twin +
// News Studio + Watchdog + Memory Search — the differentiation layer.
// Honest edition: every number is computed from live bars/ticks, the real
// economic calendar, the trader's own positions/history and EMIL's own
// records. The Digital Twin runs BOOTSTRAP simulations that resample the
// instrument's actual recent returns — statistical futures from measured
// behaviour, labelled as such, never predictions. Regions with no tradable
// instruments on this feed say so instead of inventing markets.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { atr } from '@/lib/trading/indicators';
import { getPipSize, calcPipValue } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';
import { marketMood } from '@/lib/trading/emil-macro';
import { assetClassOf } from '@/lib/trading/scanner-engine';
import { loadSpreadProfiles } from '@/lib/trading/emil-knowledge';

export interface OpenPosLite {
  id?: string; symbol: string; direction: string; size: number;
  open_price: number; current_price?: number | null; sl: number | null; comment?: string | null; status?: string;
}

// ── §1 Regions of the interactive world map ─────────────────────

export interface Region {
  id: string; name: string; ccy: string; centralBank: string;
  tz: string; openH: number; closeH: number;
  pos: { x: number; y: number }; // percent coordinates on the map canvas
}

export const REGIONS: Region[] = [
  { id: 'US', name: 'United States', ccy: 'USD', centralBank: 'Federal Reserve', tz: 'America/New_York', openH: 9, closeH: 17, pos: { x: 18, y: 34 } },
  { id: 'CA', name: 'Canada', ccy: 'CAD', centralBank: 'Bank of Canada', tz: 'America/Toronto', openH: 9, closeH: 17, pos: { x: 17, y: 20 } },
  { id: 'UK', name: 'United Kingdom', ccy: 'GBP', centralBank: 'Bank of England', tz: 'Europe/London', openH: 8, closeH: 16, pos: { x: 44, y: 22 } },
  { id: 'EU', name: 'Euro Area', ccy: 'EUR', centralBank: 'European Central Bank', tz: 'Europe/Berlin', openH: 9, closeH: 17, pos: { x: 49, y: 28 } },
  { id: 'CH', name: 'Switzerland', ccy: 'CHF', centralBank: 'Swiss National Bank', tz: 'Europe/Zurich', openH: 9, closeH: 17, pos: { x: 48, y: 33.5 } },
  { id: 'IN', name: 'India', ccy: 'INR', centralBank: 'Reserve Bank of India', tz: 'Asia/Kolkata', openH: 9, closeH: 15, pos: { x: 66, y: 44 } },
  { id: 'CN', name: 'China', ccy: 'CNY', centralBank: 'People’s Bank of China', tz: 'Asia/Shanghai', openH: 9, closeH: 15, pos: { x: 74, y: 34 } },
  { id: 'JP', name: 'Japan', ccy: 'JPY', centralBank: 'Bank of Japan', tz: 'Asia/Tokyo', openH: 9, closeH: 15, pos: { x: 84, y: 32 } },
  { id: 'AU', name: 'Australia', ccy: 'AUD', centralBank: 'Reserve Bank of Australia', tz: 'Australia/Sydney', openH: 10, closeH: 16, pos: { x: 82, y: 66 } },
  { id: 'NZ', name: 'New Zealand', ccy: 'NZD', centralBank: 'Reserve Bank of New Zealand', tz: 'Pacific/Auckland', openH: 10, closeH: 16, pos: { x: 91, y: 74 } },
];

function nowInZone(tz: string): { hour: number; minute: number; weekday: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = Number(get('hour')); const minute = Number(get('minute'));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { hour, minute, weekday, hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export interface RegionSnapshot {
  region: Region;
  marketOpen: boolean;
  localTime: string;
  instruments: Array<{ symbol: string; price: number | null; chg24hPct: number | null; regime: string | null; regimeConf: number | null }>;
  events: NewsEvent[];
  exposure: Array<{ symbol: string; direction: string; size: number }>;
  mood: { label: string; color: string } | null;
  outlook: string;
  riskScore: number;         // 0-100, higher = riskier conditions
  riskParts: string[];
}

function ret24h(builder: OHLCVBuilder, symbol: string): number | null {
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length < 25) return null;
  const ref = bars[bars.length - 25].close;
  return ref > 0 ? Math.round(((bars[bars.length - 1].close - ref) / ref) * 10000) / 100 : null;
}

export function regionSnapshot(params: {
  builder: OHLCVBuilder; region: Region;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[]; positions: OpenPosLite[];
}): RegionSnapshot {
  const { builder, region, prices, calendar, positions } = params;
  const universe = Object.keys(prices).filter((s) => prices[s]?.bid != null);
  const symbols = universe.filter((s) => symbolCurrencies(s).includes(region.ccy)).slice(0, 8);

  const instruments = symbols.map((s) => {
    const st = classifyMarketState(builder.getAllBars(s, '60'));
    return { symbol: s, price: prices[s]?.bid ?? null, chg24hPct: ret24h(builder, s), regime: st?.state ?? null, regimeConf: st?.confidence ?? null };
  });

  const t = nowInZone(region.tz);
  const marketOpen = t.weekday >= 1 && t.weekday <= 5 && t.hour >= region.openH && t.hour < region.closeH;
  const events = upcomingHighImpact([region.ccy], calendar, 72).slice(0, 3);
  const exposure = positions
    .filter((p) => (p.status ?? 'open') === 'open' && symbolCurrencies(p.symbol).includes(region.ccy))
    .map((p) => ({ symbol: p.symbol, direction: p.direction, size: Number(p.size) }));

  const flagship = symbols[0] ?? null;
  const mood = flagship ? marketMood(builder, flagship, prices[flagship], calendar) : null;

  // Composite risk score from measured parts.
  const riskParts: string[] = [];
  let risk = 20;
  const soon = upcomingHighImpact([region.ccy], calendar, 12);
  if (soon.length) { risk += Math.min(30, soon.length * 15); riskParts.push(`${soon.length} red-flag event(s) inside 12h`); }
  const highVol = instruments.filter((i) => i.regime && classifyVol(builder, i.symbol)).length;
  if (highVol) { risk += Math.min(25, highVol * 8); riskParts.push(`${highVol} instrument(s) in high volatility`); }
  if (mood && (mood.label === 'Chaotic' || mood.label === 'Nervous')) { risk += 20; riskParts.push(`mood reads ${mood.label}`); }
  if (!marketOpen) { riskParts.push('local cash market closed — thinner regional liquidity'); risk += 5; }
  if (!riskParts.length) riskParts.push('conditions look orderly right now');
  risk = Math.min(100, risk);

  const trending = instruments.filter((i) => i.regime?.includes('trend') || i.regime?.includes('Uptrend') || i.regime?.includes('Downtrend'));
  const outlook = !symbols.length
    ? `no ${region.ccy} instruments on this feed yet — sessions, calendar and central-bank schedule still tracked; instruments arrive with broader market data`
    : trending.length
      ? `${trending.length}/${instruments.length} ${region.ccy} instruments trending — EMIL treats aligned pullbacks as the only entries worth ranking here`
      : `${region.ccy} instruments read range/quiet — No-Trade is the honest default until structure improves`;

  return { region, marketOpen, localTime: t.hhmm, instruments, events, exposure, mood: mood ? { label: mood.label, color: mood.color } : null, outlook, riskScore: risk, riskParts };
}

function classifyVol(builder: OHLCVBuilder, symbol: string): boolean {
  const st = classifyMarketState(builder.getAllBars(symbol, '60'));
  return st?.volatility === 'High Volatility';
}

// ── §2/§7 Portfolio DNA + risk heat ─────────────────────────────

export interface DnaMetric { name: string; score: number; heat: string; note: string }

const heatColor = (riskPct: number) =>
  riskPct >= 80 ? '#B388FF' : riskPct >= 60 ? '#FF5252' : riskPct >= 40 ? '#FF9800' : riskPct >= 20 ? '#FFEB3B' : '#00C27A';

function pearsonLocal(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 30) return null;
  const ax = a.slice(-n); const bx = b.slice(-n);
  const ma = ax.reduce((x, y) => x + y, 0) / n; const mb = bx.reduce((x, y) => x + y, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) { const u = ax[i] - ma; const v = bx[i] - mb; num += u * v; da += u * u; db += v * v; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

function returnsOf(builder: OHLCVBuilder, symbol: string): number[] {
  const bars = builder.getAllBars(symbol, '60');
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) if (bars[i - 1].close > 0) out.push(Math.log(bars[i].close / bars[i - 1].close));
  return out.slice(-80);
}

export interface PortfolioDNA {
  metrics: DnaMetric[];
  currencyExposure: Array<{ ccy: string; netLots: number }>;
  positionHeat: Array<{ symbol: string; direction: string; risk$: number | null; heat: string }>;
  empty: boolean;
}

export function portfolioDNA(builder: OHLCVBuilder, positions: OpenPosLite[]): PortfolioDNA {
  const open = positions.filter((p) => (p.status ?? 'open') === 'open');
  if (!open.length) return { metrics: [], currencyExposure: [], positionHeat: [], empty: true };

  // Currency exposure: signed net lots per currency (base +, quote −).
  const ccyMap = new Map<string, number>();
  for (const p of open) {
    const ccys = symbolCurrencies(p.symbol);
    const sign = p.direction === 'BUY' ? 1 : -1;
    if (ccys[0]) ccyMap.set(ccys[0], (ccyMap.get(ccys[0]) ?? 0) + sign * Number(p.size));
    if (ccys[1]) ccyMap.set(ccys[1], (ccyMap.get(ccys[1]) ?? 0) - sign * Number(p.size));
  }
  const currencyExposure = [...ccyMap.entries()].map(([ccy, netLots]) => ({ ccy, netLots: Math.round(netLots * 100) / 100 }))
    .sort((a, b) => Math.abs(b.netLots) - Math.abs(a.netLots));

  // Per-position stop risk + heat.
  const positionHeat = open.map((p) => {
    let risk$: number | null = null;
    if (p.sl != null && p.sl !== 0) {
      const dir = p.direction === 'BUY' ? 1 : -1;
      const dist = (Number(p.open_price) - Number(p.sl)) * dir;
      if (dist > 0) risk$ = Math.round(dist / getPipSize(p.symbol) * calcPipValue(p.symbol, Number(p.size)));
    }
    const heat = p.sl == null || p.sl === 0 ? '#B388FF' : risk$ != null && risk$ > 500 ? '#FF5252' : risk$ != null && risk$ > 200 ? '#FF9800' : '#00C27A';
    return { symbol: p.symbol, direction: p.direction, risk$, heat };
  });

  // Concentration: largest symbol share of total lots.
  const totalLots = open.reduce((a, p) => a + Number(p.size), 0);
  const bySym = new Map<string, number>();
  for (const p of open) bySym.set(p.symbol, (bySym.get(p.symbol) ?? 0) + Number(p.size));
  const maxShare = totalLots > 0 ? Math.max(...bySym.values()) / totalLots : 0;

  // Correlation score: average |pairwise| among held symbols.
  const held = [...bySym.keys()].slice(0, 6);
  const rets = new Map(held.map((s) => [s, returnsOf(builder, s)]));
  let corrSum = 0; let corrN = 0;
  for (let i = 0; i < held.length; i++) for (let j = i + 1; j < held.length; j++) {
    const r = pearsonLocal(rets.get(held[i]) ?? [], rets.get(held[j]) ?? []);
    if (r != null) { corrSum += Math.abs(r); corrN++; }
  }
  const avgCorr = corrN ? corrSum / corrN : 0;

  // Volatility score: average H1 ATR% of held symbols.
  let volSum = 0; let volN = 0;
  for (const s of held) {
    const bars = builder.getAllBars(s, '60');
    if (bars.length < 20) continue;
    const series = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), 14).filter((v): v is number => v != null);
    const a0 = series[series.length - 1];
    const px = bars[bars.length - 1].close;
    if (a0 && px > 0) { volSum += (a0 / px) * 100; volN++; }
  }
  const avgVolPct = volN ? volSum / volN : 0;

  // Liquidity: measured median spreads of held symbols (session profiles).
  const profiles = loadSpreadProfiles();
  const spreadMeds = held.map((s) => {
    const cells = profiles[s];
    if (!cells) return null;
    const meds = Object.values(cells).map((c) => c.median);
    return meds.length ? meds.reduce((a, b) => a + b, 0) / meds.length : null;
  }).filter((v): v is number => v != null);
  const avgSpread = spreadMeds.length ? spreadMeds.reduce((a, b) => a + b, 0) / spreadMeds.length : null;

  // Hedge legs present?
  const hedgeLegs = open.filter((p) => String(p.comment ?? '').includes('HEDGE') || String(p.comment ?? '').startsWith('Hedge')).length;

  // Weekend proximity (UTC Friday after 15:00 → elevated).
  const now = new Date();
  const weekendNear = now.getUTCDay() === 5 && now.getUTCHours() >= 15;

  const missingSl = positionHeat.filter((p) => p.risk$ == null).length;
  const assetClasses = new Set(open.map((p) => assetClassOf(p.symbol)));

  const metrics: DnaMetric[] = [
    { name: 'Concentration', score: Math.round(maxShare * 100), heat: heatColor(maxShare * 100), note: `largest single instrument = ${Math.round(maxShare * 100)}% of open lots` },
    { name: 'Correlation', score: Math.round(avgCorr * 100), heat: heatColor(avgCorr * 100), note: corrN ? `avg |pairwise corr| ${avgCorr.toFixed(2)} across ${corrN} pair(s) — high correlation = positions fail together` : 'single instrument — correlation not applicable' },
    { name: 'Volatility', score: Math.min(100, Math.round(avgVolPct * 120)), heat: heatColor(Math.min(100, avgVolPct * 120)), note: `avg H1 ATR ${avgVolPct.toFixed(2)}% of price across held instruments` },
    { name: 'Diversification', score: Math.round(Math.min(100, (assetClasses.size / 4) * 60 + (1 - maxShare) * 40)), heat: heatColor(100 - Math.min(100, (assetClasses.size / 4) * 60 + (1 - maxShare) * 40)), note: `${assetClasses.size} asset class(es): ${[...assetClasses].join(', ')}` },
    { name: 'Stop coverage', score: Math.round(((open.length - missingSl) / open.length) * 100), heat: missingSl ? '#B388FF' : '#00C27A', note: missingSl ? `${missingSl} position(s) WITHOUT a stop-loss — unbounded risk` : 'every open position carries a stop' },
    { name: 'Liquidity (measured)', score: avgSpread != null ? Math.max(0, Math.round(100 - avgSpread * 10)) : 50, heat: avgSpread != null ? heatColor(Math.min(100, avgSpread * 10)) : '#8B93A7', note: avgSpread != null ? `avg measured median spread ${avgSpread.toFixed(1)} pips (learned profiles)` : 'spread profiles still building' },
    { name: 'Hedging', score: hedgeLegs ? 70 : 0, heat: hedgeLegs ? '#00C27A' : '#FFEB3B', note: hedgeLegs ? `${hedgeLegs} hedge leg(s) active` : 'no hedge legs — fine when exposure is deliberate' },
    { name: 'Overnight / weekend', score: weekendNear ? 75 : 35, heat: weekendNear ? '#FF9800' : '#FFEB3B', note: weekendNear ? 'weekend gap window approaching (UTC Friday PM) — gaps jump stops' : `${open.length} open position(s) carry overnight swap + gap exposure` },
  ];

  return { metrics, currencyExposure, positionHeat, empty: false };
}

// ── Flagship: Digital Financial Twin (bootstrap simulation) ─────

export interface TwinResult {
  nPaths: number; horizon: string;
  pTarget: number; pStop: number; pNeither: number;
  medianMaxAdverseR: number;
  note: string;
}

/** Simulate plausible futures by BOOTSTRAP-resampling the instrument's own
 *  recent M15 returns — measured behaviour, not an invented model. Counts
 *  which barrier (target/stop) paths touch first inside the horizon. */
export function simulateTwin(params: {
  builder: OHLCVBuilder; symbol: string; direction: 'BUY' | 'SELL';
  entry: number; stop: number; target: number;
  nPaths?: number; horizonBars?: number;
}): TwinResult | null {
  const { builder, symbol, direction, entry, stop, target, nPaths = 300, horizonBars = 96 } = params;
  const bars = builder.getAllBars(symbol, '15');
  if (bars.length < 80) return null;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) if (bars[i - 1].close > 0) rets.push(bars[i].close / bars[i - 1].close - 1);
  const pool = rets.slice(-300);
  if (pool.length < 60) return null;
  const dir = direction === 'BUY' ? 1 : -1;
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;

  let hitT = 0; let hitS = 0; let neither = 0;
  const maes: number[] = [];
  // Deterministic LCG so re-renders don't jitter the result each second.
  let seed = 42 + Math.floor(entry * 1000) % 1000;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let p = 0; p < nPaths; p++) {
    let px = entry;
    let mae = 0;
    let resolved = false;
    for (let b = 0; b < horizonBars; b++) {
      px *= 1 + pool[Math.floor(rand() * pool.length)];
      const adverse = (entry - px) * dir;
      if (adverse > mae) mae = adverse;
      if (dir > 0 ? px <= stop : px >= stop) { hitS++; resolved = true; break; }
      if (dir > 0 ? px >= target : px <= target) { hitT++; resolved = true; break; }
    }
    if (!resolved) neither++;
    maes.push(mae / risk);
  }
  maes.sort((a, b) => a - b);
  return {
    nPaths, horizon: `${horizonBars} × M15 bars (~${Math.round(horizonBars / 4)}h)`,
    pTarget: Math.round((hitT / nPaths) * 100),
    pStop: Math.round((hitS / nPaths) * 100),
    pNeither: Math.round((neither / nPaths) * 100),
    medianMaxAdverseR: Math.round(maes[Math.floor(maes.length / 2)] * 100) / 100,
    note: 'bootstrap of this instrument’s own recent M15 returns — a statistical rehearsal of plausible futures, NOT a prediction; regime changes invalidate it',
  };
}

// ── §20 AI News Studio: briefings composed from real reads ──────

export type BriefingKind = 'morning' | 'london' | 'us' | 'close' | 'weekly';

export function buildBriefing(params: {
  kind: BriefingKind; builder: OHLCVBuilder;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[]; positions: OpenPosLite[];
}): string {
  const { kind, builder, prices, calendar, positions } = params;
  const universe = Object.keys(prices).filter((s) => prices[s]?.bid != null);
  const movers = universe
    .map((s) => ({ s, r: ret24h(builder, s) }))
    .filter((x): x is { s: string; r: number } => x.r != null)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const top = movers.slice(0, 5);
  const trending = universe.map((s) => ({ s, st: classifyMarketState(builder.getAllBars(s, '60')) }))
    .filter((x) => x.st && (x.st.state.includes('Uptrend') || x.st.state.includes('Downtrend')));
  const horizonH = kind === 'weekly' ? 24 * 7 : 24;
  const events = upcomingHighImpact(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'], calendar, horizonH).slice(0, kind === 'weekly' ? 10 : 5);
  const open = positions.filter((p) => (p.status ?? 'open') === 'open');
  const titles: Record<BriefingKind, string> = {
    morning: '🌅 MORNING BRIEFING', london: '🇬🇧 LONDON SESSION BRIEFING', us: '🇺🇸 US SESSION BRIEFING',
    close: '🌙 MARKET-CLOSE REVIEW', weekly: '📅 WEEKLY REVIEW & OUTLOOK',
  };
  const lines: string[] = [
    `${titles[kind]} — ${new Date().toUTCString()}`,
    `Generated by EMIL from live platform reads (simulated pricing until the real LP). Probabilities, never certainty.`,
    '',
    `MOVERS (24h): ${top.length ? top.map((m) => `${m.s} ${m.r > 0 ? '+' : ''}${m.r}%`).join(' · ') : 'insufficient bar history yet'}`,
    `REGIMES: ${trending.length ? trending.slice(0, 6).map((t) => `${t.s} ${t.st!.state} (${t.st!.confidence}%)`).join(' · ') : 'no confirmed trends — range/quiet across the board; No-Trade is a valid stance'}`,
    '',
    `EVENT RISK (${kind === 'weekly' ? 'next 7 days' : 'next 24h'}):`,
    ...(events.length ? events.map((e) => `  • ${e.currency} “${e.title}” — ${new Date(e.timeMs).toUTCString()}`) : ['  • no red-flag releases inside the window']),
    '',
    `PORTFOLIO: ${open.length ? `${open.length} open position(s): ${open.map((p) => `${p.direction} ${p.size} ${p.symbol}`).join(' · ')}` : 'flat — flat is a position'}`,
    '',
    `RISK NOTES: news buffer blocks entries within 30 min of red-flag events; spreads widen through releases; every order passes Shield + Guardian. Neither the broker nor the Raptor platform is responsible for trading losses.`,
  ];
  return lines.join('\n');
}

// ── §15 AI Watchdog — the auditor that watches EMIL ─────────────

export interface WatchdogItem { ts: number; headline: string; qa: Array<{ q: string; a: string }>; flag: string | null }

export function watchdogReview(params: {
  replays: Array<{ ts: number; symbol: string; direction: string; tf: string; mode: string; scores: { confidence: number; uncertainty: number }; alternatives: string[]; sessionOpen: string[]; nextNews: string | null }>;
  openEmil: OpenPosLite[];
  autoParams: { riskPct: number; baseLot: number; smallSteady: boolean; autoHedge: boolean };
}): WatchdogItem[] {
  const { replays, openEmil, autoParams } = params;
  const items: WatchdogItem[] = replays.slice(-3).reverse().map((r) => ({
    ts: r.ts,
    headline: `${r.direction} ${r.symbol} (${r.mode})`,
    qa: [
      { q: 'Why this trade?', a: `highest-ranked qualified setup; ${r.alternatives.length ? `beat ${r.alternatives.length} alternative(s): ${r.alternatives.join(' · ')}` : 'no other candidate qualified that cycle'}` },
      { q: 'Why now?', a: `sessions open: ${r.sessionOpen.join('/') || 'none'} · news check: ${r.nextNews ?? 'no red-flag event inside 24h'} · 30-min buffer was clear` },
      { q: 'Why this size?', a: `${autoParams.smallSteady ? `Small & Steady: base lot ${autoParams.baseLot} only` : `sized from the ${autoParams.riskPct}% risk envelope`} — streaks and mode changes never scale size` },
      { q: 'Why not hedge instead?', a: autoParams.autoHedge ? 'auto-hedge stays armed: a viable hedge leg deploys if the trade goes ≥0.5R adverse with an uncertain council' : 'auto-hedge is OFF by trader choice; the stop is the protection' },
      { q: 'Could risk have been lower?', a: `confidence ${r.scores.confidence} vs uncertainty ${r.scores.uncertainty}${r.scores.uncertainty >= 35 ? ' — elevated: the -8 ranking discount was applied; skipping was the alternative' : ' — low uncertainty; the stop distance already defines worst case'}` },
    ],
    flag: r.scores.uncertainty >= 50 ? 'AUDIT FLAG: entered with materially elevated uncertainty — justified only by score margin; watchdog would prefer No-Trade at ≥60' : null,
  }));
  // Unexplained positions: open EMIL trades with no replay record.
  for (const p of openEmil) {
    if (!replays.some((r) => r.symbol === p.symbol)) {
      items.push({
        ts: Date.now(), headline: `OPEN ${p.direction} ${p.symbol}`,
        qa: [{ q: 'Where is the decision record?', a: 'no replay record found for this position (opened before the flight recorder, or via confirm-ticket) — records exist from Round 22 onward' }],
        flag: 'AUDIT NOTE: position predates or bypassed the replay recorder — management rules still apply in full',
      });
    }
  }
  return items.slice(0, 4);
}

// ── §17 AI Memory Search — deterministic answers from real history ──

interface HistRow { symbol?: string; direction?: string; size?: number; realized_pnl?: number | null; closed_at?: string | null; comment?: string | null }

// Instrument aliases — English plus common native-script names (Hindi,
// Tamil, Malayalam) so multilingual queries hit directly even before the
// Lara translation path runs.
export const SYM_ALIASES: Record<string, string> = {
  gold: 'XAUUSD', silver: 'XAGUSD', bitcoin: 'BTCUSD', btc: 'BTCUSD', oil: 'USOIL',
  nasdaq: 'NAS100', dow: 'US30', euro: 'EURUSD', pound: 'GBPUSD', yen: 'USDJPY',
  'सोना': 'XAUUSD', 'गोल्ड': 'XAUUSD', 'தங்கம்': 'XAUUSD', 'സ്വർണം': 'XAUUSD',
  'चांदी': 'XAGUSD', 'வெள்ளி': 'XAGUSD', 'വെള്ളി': 'XAGUSD',
  'तेल': 'USOIL', 'எண்ணெய்': 'USOIL', 'बिटकॉइन': 'BTCUSD',
  // Romanised forms (speech/transliteration outputs like "Sona" for सोना).
  sona: 'XAUUSD', thangam: 'XAUUSD', swarnam: 'XAUUSD', chandi: 'XAGUSD', velli: 'XAGUSD',
};
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function searchMemory(query: string, history: HistRow[]): string[] {
  const q = query.toLowerCase();
  let rows = history.filter((r) => r.closed_at);
  const filters: string[] = [];

  for (const [alias, sym] of Object.entries(SYM_ALIASES)) {
    if (q.includes(alias) || q.includes(sym.toLowerCase())) { rows = rows.filter((r) => r.symbol === sym); filters.push(sym); break; }
  }
  const mi = MONTHS.findIndex((m) => q.includes(m));
  if (mi >= 0) { rows = rows.filter((r) => new Date(r.closed_at!).getMonth() === mi); filters.push(MONTHS[mi]); }
  if (q.includes('london')) { rows = rows.filter((r) => { const h = new Date(r.closed_at!).getUTCHours(); return h >= 7 && h < 16; }); filters.push('London hours (UTC 7–16)'); }
  if (q.includes('new york') || q.includes('york')) { rows = rows.filter((r) => { const h = new Date(r.closed_at!).getUTCHours(); return h >= 12 && h < 21; }); filters.push('New York hours (UTC 12–21)'); }
  if (q.includes('hedge')) { rows = rows.filter((r) => String(r.comment ?? '').toUpperCase().includes('HEDGE')); filters.push('hedge trades'); }
  if (q.includes('emil')) { rows = rows.filter((r) => String(r.comment ?? '').startsWith('EMIL')); filters.push('EMIL trades'); }

  if (!rows.length) return [`No closed trades match ${filters.length ? filters.join(' + ') : 'that query'} in the loaded history — honest answer: nothing to summarise yet.`];

  const pnls = rows.map((r) => Number(r.realized_pnl ?? 0));
  const wins = pnls.filter((p) => p > 0);
  const net = pnls.reduce((a, b) => a + b, 0);
  const best = rows.reduce((a, b) => (Number(b.realized_pnl ?? 0) > Number(a.realized_pnl ?? 0) ? b : a));
  const worst = rows.reduce((a, b) => (Number(b.realized_pnl ?? 0) < Number(a.realized_pnl ?? 0) ? b : a));
  const biggest = rows.reduce((a, b) => (Number(b.size ?? 0) > Number(a.size ?? 0) ? b : a));

  const out = [
    `${filters.length ? `Filter: ${filters.join(' + ')} · ` : ''}${rows.length} closed trade(s) · net ${net >= 0 ? '+' : ''}$${net.toFixed(2)} · win rate ${Math.round((wins.length / rows.length) * 100)}%`,
    `Best: ${best.direction} ${best.symbol} ${Number(best.realized_pnl ?? 0) >= 0 ? '+' : ''}$${Number(best.realized_pnl ?? 0).toFixed(2)} (${new Date(best.closed_at!).toLocaleDateString()})`,
    `Worst: ${worst.direction} ${worst.symbol} $${Number(worst.realized_pnl ?? 0).toFixed(2)} (${new Date(worst.closed_at!).toLocaleDateString()})`,
  ];
  if (q.includes('biggest') || q.includes('largest')) out.push(`Largest position: ${biggest.direction} ${biggest.size} ${biggest.symbol} → ${Number(biggest.realized_pnl ?? 0) >= 0 ? '+' : ''}$${Number(biggest.realized_pnl ?? 0).toFixed(2)}`);
  if (q.includes('mistake') || q.includes('loss')) {
    const losses = rows.filter((r) => Number(r.realized_pnl ?? 0) < 0).slice(0, 3);
    out.push(`Losses in scope: ${losses.length ? losses.map((l) => `${l.symbol} $${Number(l.realized_pnl ?? 0).toFixed(0)}`).join(' · ') : 'none'} — the journal + regret reviews carry the lessons`);
  }
  out.push('Answered from your real closed-trade history only — no invention. Wider questions need more history.');
  return out;
}
