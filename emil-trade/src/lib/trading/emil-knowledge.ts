// ═══════════════════════════════════════════════════════════════
// EMIL Autonomous Global Trading Knowledge Engine — honest edition.
// ADDITIVE: continuous background learning over the sources this
// platform GENUINELY has (live bars/ticks, the real economic calendar,
// Lara language services, EMIL's own trade/veto/forecast history).
// The connector framework lists every other source category honestly as
// NOT CONNECTED — news, filings, research, social — never simulated.
//
// Iron rules: knowledge is measured, versioned and expiring — never
// invented; conflicts supersede with history preserved, never silently
// overwritten; and NOTHING here can reach live trading except through
// the Knowledge-to-Trading Firewall (the existing Shield → Guardian →
// consent-envelope order path, which this module cannot touch).
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { atr } from '@/lib/trading/indicators';
import { getPipSize } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';

// ── §38 Trader controls ─────────────────────────────────────────

export interface KnowPrefs {
  enabled: boolean;          // Always Learning master switch
  consentAt: number | null;  // §40 disclaimer acceptance
  learnTrades: boolean;      // learn from my trades
  learnOverrides: boolean;   // learn from my overrides
  summaries: boolean;        // periodic learning summaries
  materialAlerts: boolean;   // material-change alerts
  autoWatchlists: boolean;   // automatic temporary watchlists
}

const PREFS_KEY = 'raptor_emil_knowprefs_v1';

export const DEFAULT_KNOW_PREFS: KnowPrefs = {
  enabled: false, consentAt: null, learnTrades: true, learnOverrides: true,
  summaries: true, materialAlerts: true, autoWatchlists: true,
};

export function loadKnowPrefs(): KnowPrefs {
  try { return { ...DEFAULT_KNOW_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) }; } catch { return { ...DEFAULT_KNOW_PREFS }; }
}

export function saveKnowPrefs(p: KnowPrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function allLearningOn(p: KnowPrefs): KnowPrefs {
  return { ...p, enabled: true, learnTrades: true, learnOverrides: true, summaries: true, materialAlerts: true, autoWatchlists: true };
}

export function allLearningOff(p: KnowPrefs): KnowPrefs {
  return { ...p, enabled: false, learnTrades: false, learnOverrides: false, summaries: false, materialAlerts: false, autoWatchlists: false };
}

// §40 — displayed verbatim before enabling.
export const KNOWLEDGE_DISCLAIMER =
  'EMIL may autonomously collect, organise, translate, analyse, and learn from approved trading-related information ' +
  'sources. Information may be incomplete, delayed, mistranslated, inaccurate, manipulated, outdated, or unavailable. ' +
  'EMIL’s learning, forecasts, research, and market interpretations do not guarantee successful trading or prevent ' +
  'loss. Newly learned information will not directly alter critical live-trading permissions or risk settings without ' +
  'the required validation and approval. Traders remain responsible for reviewing autonomous trading permissions and decisions.';

// ── §4/§6 Source connectors — real status, honest gaps ──────────

export interface SourceRow {
  name: string; category: string; region: string;
  reliability: string; status: 'Connected' | 'Degraded' | 'Not connected';
  updates: string; note: string;
}

export function sourceRegistry(sarvamConfigured: boolean, calendarCount: number, liveSymbols: number, eaStrategies = 0): SourceRow[] {
  return [
    { name: 'RAPTOR platform price feed', category: 'Market data', region: 'Global', reliability: 'Official primary (simulated pricing until the real LP)', status: liveSymbols > 0 ? 'Connected' : 'Degraded', updates: 'sub-second ticks → bars on every resolution', note: `${liveSymbols} instruments quoting` },
    { name: 'EA Strategy Library (owner MQL5 collection)', category: 'Strategy knowledge', region: 'Local', reliability: 'Official primary source (distilled from EA source code)', status: eaStrategies > 0 ? 'Connected' : 'Not connected', updates: 'bundled — refreshed on import', note: eaStrategies > 0 ? `${eaStrategies} strategies + terminology glossary` : 'no strategies imported yet' },
    { name: 'Economic calendar (ForexFactory feed)', category: 'Economic calendar', region: 'Global', reliability: 'Established secondary source', status: calendarCount > 0 ? 'Connected' : 'Degraded', updates: '30-min server cache', note: `${calendarCount} events this week` },
    { name: 'Lara language services', category: 'Language / translation', region: 'India', reliability: 'Verified institutional service', status: sarvamConfigured ? 'Connected' : 'Not connected', updates: 'on demand', note: sarvamConfigured ? 'translate + speech armed' : 'SARVAM_API_KEY not configured' },
    { name: 'EMIL trade / veto / forecast history', category: 'Platform-generated data', region: 'Local', reliability: 'Official primary source', status: 'Connected', updates: 'every pilot cycle', note: 'closed trades, Guardian vetoes, shadow setups, forecasts' },
    { name: 'News services', category: 'News', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'awaiting licensed source — never simulated' },
    { name: 'Exchange & regulatory announcements', category: 'Official publications', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'awaiting licensed source — never simulated' },
    { name: 'Central-bank publications', category: 'Official publications', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'calendar carries the release times; full texts await a licensed source' },
    { name: 'Company filings & earnings', category: 'Corporate data', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'awaiting licensed source — never simulated' },
    { name: 'Research papers', category: 'Research', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'awaiting licensed source — never simulated' },
    { name: 'Shipping / energy / weather data', category: 'Physical world', region: 'Global', reliability: '—', status: 'Not connected', updates: '—', note: 'awaiting licensed source — never simulated' },
    { name: 'Social sentiment', category: 'Crowd / rumour', region: 'Global', reliability: 'Rumour-class (would never be treated as fact)', status: 'Not connected', updates: '—', note: 'awaiting permitted source — never simulated' },
  ];
}

// ── §33 Knowledge-to-Trading Firewall — the real gates ──────────

export const FIREWALL_GATES: Array<{ gate: string; enforcement: string }> = [
  { gate: '1. Source verification', enforcement: 'only the connected-source registry feeds learning; unverified categories are not connected at all' },
  { gate: '2. Relevance assessment', enforcement: 'facts link to instruments/currencies; unrelated material is never stored as trading knowledge' },
  { gate: '3. Data-quality checks', enforcement: 'stale-quote refusal + uncertainty gate + Guardian data watchdogs in the order path' },
  { gate: '4. Market-regime assessment', enforcement: 'every candidate re-reads the live regime; knowledge never substitutes for it' },
  { gate: '5. Strategy validation', enforcement: 'no untested strategy has a path to live — research/paper/shadow stages precede any proposal' },
  { gate: '6. Risk checks', enforcement: 'Shield rules + risk budget + profit-decay protection run before every order' },
  { gate: '7. Portfolio checks', enforcement: 'one-per-symbol + correlation penalties + exposure map' },
  { gate: '8. Execution checks', enforcement: 'spread/cost gates + missed-entry discipline' },
  { gate: '9. Guardian approval', enforcement: 'independent watchdogs in the order path — knowledge cannot silence them' },
  { gate: '10. Trader permission', enforcement: 'the typed-consent envelope bounds everything; knowledge can only ever suggest, or reduce risk' },
];

// ── §19/§28/§29 Knowledge store — labelled, versioned, expiring ──

export type FactKind = 'measurement' | 'emil-interpretation' | 'emil-forecast' | 'scenario' | 'official-schedule';

export interface KnowledgeFact {
  id: string;                // stable subject key — one active fact per subject
  kind: FactKind;
  level: 'session' | 'tactical' | 'strategic';
  subject: string;
  statement: string;
  evidence: string;
  confidence: number;        // 0-100
  learnedAt: number;
  lastVerified: number;
  freshUntil: number;        // §18 expiry
  status: 'active' | 'expired';
  history: Array<{ statement: string; replacedAt: number; reason: string }>;
}

const KNOW_KEY = 'raptor_emil_know_v1';

export function loadKnowledge(): KnowledgeFact[] {
  try { return JSON.parse(localStorage.getItem(KNOW_KEY) || '[]'); } catch { return []; }
}

function saveKnowledge(list: KnowledgeFact[]): void {
  try { localStorage.setItem(KNOW_KEY, JSON.stringify(list.slice(-250))); } catch { /* ignore */ }
}

/** §29: conflicts supersede WITH history — never silently overwritten. */
export function upsertFact(f: Omit<KnowledgeFact, 'history' | 'status' | 'learnedAt' | 'lastVerified'> & { reason?: string }): 'new' | 'updated' | 'unchanged' {
  const list = loadKnowledge();
  const now = Date.now();
  const i = list.findIndex((x) => x.id === f.id);
  if (i < 0) {
    list.push({ ...f, learnedAt: now, lastVerified: now, status: 'active', history: [] });
    saveKnowledge(list);
    return 'new';
  }
  const cur = list[i];
  if (cur.statement === f.statement) {
    cur.lastVerified = now; cur.freshUntil = f.freshUntil; cur.confidence = f.confidence; cur.status = 'active';
    saveKnowledge(list);
    return 'unchanged';
  }
  cur.history = [...cur.history, { statement: cur.statement, replacedAt: now, reason: f.reason ?? 'newer measurement' }].slice(-5);
  cur.statement = f.statement; cur.evidence = f.evidence; cur.confidence = f.confidence;
  cur.lastVerified = now; cur.freshUntil = f.freshUntil; cur.kind = f.kind; cur.status = 'active';
  saveKnowledge(list);
  return 'updated';
}

/** §18: expire stale facts — outdated knowledge never silently stays active. */
export function expireStaleFacts(): number {
  const list = loadKnowledge();
  let n = 0;
  const now = Date.now();
  for (const f of list) {
    if (f.status === 'active' && now > f.freshUntil) { f.status = 'expired'; n++; }
  }
  if (n) saveKnowledge(list);
  return n;
}

// ── §26 Execution behaviour: spread profiles per symbol × session ──

interface SpreadCell { n: number; median: number; samples: number[] }
type SpreadStore = Record<string, Record<string, SpreadCell>>; // symbol → bucket

const SPREAD_KEY = 'raptor_emil_spreads_v1';

function sessionBucket(): string {
  const h = new Date().getUTCHours();
  if (h >= 7 && h < 12) return 'LON';
  if (h >= 12 && h < 16) return 'LON×NY';
  if (h >= 16 && h < 21) return 'NY';
  if (h >= 23 || h < 7) return 'ASIA';
  return 'OFF';
}

export function loadSpreadProfiles(): SpreadStore {
  try { return JSON.parse(localStorage.getItem(SPREAD_KEY) || '{}'); } catch { return {}; }
}

export function sampleSpreads(prices: Record<string, { bid?: number; ask?: number } | undefined>): void {
  const store = loadSpreadProfiles();
  const bucket = sessionBucket();
  for (const [sym, t] of Object.entries(prices)) {
    if (t?.bid == null || t?.ask == null) continue;
    const pips = (t.ask - t.bid) / getPipSize(sym);
    if (!Number.isFinite(pips) || pips < 0 || pips > 200) continue;
    const bySym = (store[sym] ??= {});
    const cell = (bySym[bucket] ??= { n: 0, median: 0, samples: [] });
    cell.samples.push(Math.round(pips * 10) / 10);
    if (cell.samples.length > 60) cell.samples.shift();
    cell.n += 1;
    cell.median = [...cell.samples].sort((a, b) => a - b)[Math.floor(cell.samples.length / 2)];
  }
  try { localStorage.setItem(SPREAD_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

// ── §9 Correlation edges of the knowledge graph (live, validated) ──

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 30) return null;
  const ax = a.slice(-n); const bx = b.slice(-n);
  const ma = ax.reduce((x, y) => x + y, 0) / n;
  const mb = bx.reduce((x, y) => x + y, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) { const u = ax[i] - ma; const v = bx[i] - mb; num += u * v; da += u * u; db += v * v; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

function logReturns(builder: OHLCVBuilder, symbol: string): number[] {
  const bars = builder.getAllBars(symbol, '60');
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close > 0 && bars[i].close > 0) out.push(Math.log(bars[i].close / bars[i - 1].close));
  }
  return out.slice(-80);
}

/** Update correlation edges among the watch set; returns breakdown alerts. */
export function updateCorrelationEdges(builder: OHLCVBuilder, symbols: string[]): { learned: string[]; breakdowns: string[] } {
  const learned: string[] = []; const breakdowns: string[] = [];
  const set = symbols.slice(0, 8);
  const rets = new Map(set.map((s) => [s, logReturns(builder, s)]));
  const prior = new Map(loadKnowledge().filter((f) => f.id.startsWith('corr:') && f.status === 'active').map((f) => [f.id, f]));
  for (let i = 0; i < set.length; i++) {
    for (let j = i + 1; j < set.length; j++) {
      const a = set[i]; const b = set[j];
      const r = pearson(rets.get(a) ?? [], rets.get(b) ?? []);
      if (r == null) continue;
      const id = `corr:${a}/${b}`;
      const prev = prior.get(id);
      if (Math.abs(r) >= 0.5) {
        const res = upsertFact({
          id, kind: 'measurement', level: 'tactical', subject: `${a} ↔ ${b}`,
          statement: `H1 correlation ${r.toFixed(2)} (${r > 0 ? 'moves together' : 'moves inversely'})`,
          evidence: '80 H1 log-return bars, Pearson', confidence: Math.min(90, Math.round(Math.abs(r) * 100)),
          freshUntil: Date.now() + 6 * 3_600_000, reason: 'correlation re-measured',
        });
        if (res === 'new') learned.push(`relationship: ${a}↔${b} corr ${r.toFixed(2)}`);
      } else if (prev && prev.confidence >= 60 && Math.abs(r) < 0.3) {
        upsertFact({
          id, kind: 'measurement', level: 'tactical', subject: `${a} ↔ ${b}`,
          statement: `correlation BROKE DOWN: now ${r.toFixed(2)} (was strong)`,
          evidence: '80 H1 log-return bars, Pearson', confidence: 70,
          freshUntil: Date.now() + 6 * 3_600_000, reason: 'correlation breakdown detected',
        });
        breakdowns.push(`${a}/${b}: correlation broke down to ${r.toFixed(2)} — hedges assuming the old relationship carry extra risk`);
      }
    }
  }
  return { learned, breakdowns };
}

// ── §21/§22 Event-reaction memory: measure real releases ────────

interface EventReaction { title: string; currency: string; samples: Array<{ ts: number; atrRatio: number; rangePips: number }> }

const EVENTMEM_KEY = 'raptor_emil_eventmem_v1';
const EVENTSEEN_KEY = 'raptor_emil_eventseen_v1';

export function loadEventMemory(): EventReaction[] {
  try { return JSON.parse(localStorage.getItem(EVENTMEM_KEY) || '[]'); } catch { return []; }
}

/** After a high-impact release passes, measure the reaction on the most
 *  liquid symbol of that currency (M5 ATR post/pre + released range). */
export function measureEventReactions(builder: OHLCVBuilder, calendar: NewsEvent[], universe: string[]): string[] {
  const learned: string[] = [];
  let seen: Record<string, number>;
  try { seen = JSON.parse(localStorage.getItem(EVENTSEEN_KEY) || '{}'); } catch { seen = {}; }
  const now = Date.now();
  const due = calendar.filter((e) => e.impact === 'High' && e.timeMs + 45 * 60_000 < now && now - e.timeMs < 3 * 3_600_000 && !seen[`${e.title}|${e.timeMs}`]);
  for (const ev of due.slice(0, 3)) {
    const sym = universe.find((s) => symbolCurrencies(s).includes(ev.currency));
    if (!sym) { seen[`${ev.title}|${ev.timeMs}`] = now; continue; }
    const bars = builder.getAllBars(sym, '5');
    const pre = bars.filter((b) => (b.time as number) * 1000 < ev.timeMs).slice(-24);
    const post = bars.filter((b) => (b.time as number) * 1000 >= ev.timeMs).slice(0, 9);
    if (pre.length < 15 || post.length < 6) continue; // not enough real data yet — wait, don't guess
    const atrOf = (bs: typeof bars) => {
      const s = atr(bs.map((b) => b.high), bs.map((b) => b.low), bs.map((b) => b.close), Math.min(14, bs.length - 1)).filter((v): v is number => v != null);
      return s[s.length - 1] ?? 0;
    };
    const preAtr = atrOf(pre); const postAtr = atrOf(post);
    if (preAtr <= 0) continue;
    const ratio = Math.round((postAtr / preAtr) * 10) / 10;
    const rangePips = Math.round((Math.max(...post.map((b) => b.high)) - Math.min(...post.map((b) => b.low))) / getPipSize(sym));
    const mem = loadEventMemory();
    let rec = mem.find((m) => m.title === ev.title && m.currency === ev.currency);
    if (!rec) { rec = { title: ev.title, currency: ev.currency, samples: [] }; mem.push(rec); }
    rec.samples = [...rec.samples, { ts: ev.timeMs, atrRatio: ratio, rangePips }].slice(-10);
    try { localStorage.setItem(EVENTMEM_KEY, JSON.stringify(mem.slice(-60))); } catch { /* ignore */ }
    seen[`${ev.title}|${ev.timeMs}`] = now;
    upsertFact({
      id: `event:${ev.currency}:${ev.title}`, kind: 'measurement', level: 'strategic',
      subject: `${ev.currency} "${ev.title}"`,
      statement: `measured reaction on ${sym}: volatility ×${ratio}, ${rangePips} pips range in 45 min (${rec.samples.length} sample${rec.samples.length > 1 ? 's' : ''})`,
      evidence: 'M5 ATR post/pre around the actual release', confidence: Math.min(85, 40 + rec.samples.length * 10),
      freshUntil: Date.now() + 90 * 86_400_000, reason: 'new release measured',
    });
    learned.push(`event learned: ${ev.currency} ${ev.title} → vol ×${ratio}, ${rangePips}p on ${sym}`);
  }
  const keys = Object.keys(seen);
  if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete seen[k];
  try { localStorage.setItem(EVENTSEEN_KEY, JSON.stringify(seen)); } catch { /* ignore */ }
  return learned;
}

/** §21 pre-event briefing for the next high-impact event. */
export interface EventBriefing {
  ev: NewsEvent; affectedSymbols: string[];
  history: string; plan: string;
}

export function preEventBriefing(calendar: NewsEvent[], universe: string[]): EventBriefing | null {
  const next = upcomingHighImpact(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY', 'INR'], calendar, 24)[0];
  if (!next) return null;
  const affected = universe.filter((s) => symbolCurrencies(s).includes(next.currency)).slice(0, 8);
  const mem = loadEventMemory().find((m) => m.title === next.title && m.currency === next.currency);
  const history = mem && mem.samples.length
    ? `measured history (${mem.samples.length}×): median vol ×${[...mem.samples].sort((a, b) => a.atrRatio - b.atrRatio)[Math.floor(mem.samples.length / 2)].atrRatio}, ranges ${Math.min(...mem.samples.map((s) => s.rangePips))}–${Math.max(...mem.samples.map((s) => s.rangePips))} pips`
    : 'no measured history for this exact release yet — the first observation will be recorded automatically';
  return {
    ev: next, affectedSymbols: affected, history,
    plan: 'no new entries within 30 min (enforced news buffer); spreads widen and stops slip through releases; No-Trade through the window is a valid plan',
  };
}

// ── §23 Forecast calibration — honest self-scoring ──────────────

interface ForecastSnap { ts: number; symbol: string; scenario: string; prob: number; price: number; dueAt: number; outcome: 'pending' | 'right' | 'wrong' | 'flat' }

const CALIB_KEY = 'raptor_emil_calib_v1';

export function loadCalibration(): ForecastSnap[] {
  try { return JSON.parse(localStorage.getItem(CALIB_KEY) || '[]'); } catch { return []; }
}

function saveCalibration(list: ForecastSnap[]): void {
  try { localStorage.setItem(CALIB_KEY, JSON.stringify(list.slice(-120))); } catch { /* ignore */ }
}

export function snapshotForecast(symbol: string, scenario: string, prob: number, price: number): void {
  const list = loadCalibration();
  // one live snapshot per symbol per 4h window
  if (list.some((s) => s.symbol === symbol && s.outcome === 'pending')) return;
  list.push({ ts: Date.now(), symbol, scenario, prob, price, dueAt: Date.now() + 4 * 3_600_000, outcome: 'pending' });
  saveCalibration(list);
}

export function scoreDueForecasts(prices: Record<string, { bid?: number } | undefined>): string[] {
  const list = loadCalibration();
  const out: string[] = [];
  let changed = false;
  for (const s of list) {
    if (s.outcome !== 'pending' || Date.now() < s.dueAt) continue;
    const cur = prices[s.symbol]?.bid;
    if (cur == null) continue;
    const moved = (cur - s.price) / s.price;
    const up = s.scenario.toLowerCase().includes('bullish') || s.scenario.toLowerCase().includes('up');
    const down = s.scenario.toLowerCase().includes('bearish') || s.scenario.toLowerCase().includes('down');
    if (Math.abs(moved) < 0.0005) s.outcome = 'flat';
    else if ((up && moved > 0) || (down && moved < 0)) s.outcome = 'right';
    else if (up || down) s.outcome = 'wrong';
    else s.outcome = Math.abs(moved) < 0.002 ? 'right' : 'wrong'; // range/consolidation scenarios: right if it stayed contained
    changed = true;
    out.push(`forecast scored: ${s.symbol} "${s.scenario}" (${s.prob}%) → ${s.outcome.toUpperCase()} after 4h`);
  }
  if (changed) saveCalibration(list);
  return out;
}

export interface CalibrationSummary { scored: number; right: number; wrong: number; flat: number; note: string }

export function calibrationSummary(): CalibrationSummary {
  const list = loadCalibration().filter((s) => s.outcome !== 'pending');
  const right = list.filter((s) => s.outcome === 'right').length;
  const wrong = list.filter((s) => s.outcome === 'wrong').length;
  const flat = list.filter((s) => s.outcome === 'flat').length;
  const note = list.length < 15
    ? `${list.length} scored — calibration verdicts need ≥15 samples; failed forecasts are never hidden`
    : `${Math.round((right / Math.max(1, right + wrong)) * 100)}% directional hit rate on decided outcomes — ${right + wrong < list.length ? `${flat} went nowhere; ` : ''}confidence is discounted where this underperforms`;
  return { scored: list.length, right, wrong, flat, note };
}

// ── §20 Autonomous temporary watchlists (from the real calendar) ──

export interface AutoWatchlist { id: string; reason: string; symbols: string[]; risk: string; expiresAt: number }

export function buildAutoWatchlists(calendar: NewsEvent[], universe: string[]): AutoWatchlist[] {
  const week = calendar.filter((e) => e.impact === 'High' && e.timeMs > Date.now() && e.timeMs < Date.now() + 7 * 86_400_000);
  const byCcy = new Map<string, NewsEvent[]>();
  for (const e of week) byCcy.set(e.currency, [...(byCcy.get(e.currency) ?? []), e]);
  const out: AutoWatchlist[] = [];
  for (const [ccy, evs] of byCcy) {
    if (evs.length < 2) continue;
    const symbols = universe.filter((s) => symbolCurrencies(s).includes(ccy)).slice(0, 8);
    if (!symbols.length) continue;
    out.push({
      id: `watch:${ccy}`,
      reason: `${ccy} event cluster: ${evs.length} red-flag releases this week (${evs.slice(0, 3).map((e) => e.title).join(' · ')}${evs.length > 3 ? '…' : ''})`,
      symbols, risk: 'elevated volatility windows — spreads widen, stops slip; the 30-min news buffer applies to every entry',
      expiresAt: Math.max(...evs.map((e) => e.timeMs)) + 3_600_000,
    });
  }
  return out.sort((a, b) => b.symbols.length - a.symbols.length).slice(0, 4);
}

// ── §16/§17 Learning priorities — real gaps, ranked ─────────────

export interface LearningTask { priority: 'Critical' | 'Urgent' | 'Important' | 'Useful' | 'Background'; task: string }

export function learningPriorities(params: {
  calendar: NewsEvent[]; universe: string[];
  benchedCount: number; calib: CalibrationSummary;
  openSymbols: string[];
}): LearningTask[] {
  const { calendar, universe, benchedCount, calib, openSymbols } = params;
  const tasks: LearningTask[] = [];
  const next = upcomingHighImpact(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'], calendar, 12)[0];
  if (next) {
    const mem = loadEventMemory().find((m) => m.title === next.title && m.currency === next.currency);
    const exposed = openSymbols.some((s) => symbolCurrencies(s).includes(next.currency));
    tasks.push({
      priority: exposed ? 'Critical' : mem ? 'Useful' : 'Urgent',
      task: `${next.currency} "${next.title}" inside 12h — ${mem ? `history known (${mem.samples.length} samples); refresh on release` : 'NO reaction history yet; measure the release'}${exposed ? ' · OPEN EXPOSURE on this currency' : ''}`,
    });
  }
  if (calib.wrong > calib.right && calib.scored >= 10) tasks.push({ priority: 'Important', task: `forecast calibration is underwater (${calib.right}W/${calib.wrong}L) — confidence discounts stay applied until it recovers` });
  if (benchedCount > 0) tasks.push({ priority: 'Important', task: `${benchedCount} benched symbol×TF bucket(s) — re-evaluate after fresh samples; benching is risk-reducing, not permanent` });
  const thin = universe.filter((s) => loadSpreadProfiles()[s] == null).length;
  if (thin > 0) tasks.push({ priority: 'Useful', task: `spread profiles missing for ${thin} instrument(s) — sampling continues automatically` });
  tasks.push({ priority: 'Background', task: 'correlation edges re-validated every sweep; breakdowns raise material alerts' });
  return tasks;
}

// ── §30 Summaries + §36 health ──────────────────────────────────

export interface LearningHealth {
  status: string; facts: number; freshPct: number; storageKB: number;
  sourcesConnected: number; sourcesDown: number; lastSweep: number | null;
}

const SWEEP_KEY = 'raptor_emil_lastsweep_v1';

export function recordSweep(): void {
  try { localStorage.setItem(SWEEP_KEY, String(Date.now())); } catch { /* ignore */ }
}

export function learningHealth(enabled: boolean, sources: SourceRow[]): LearningHealth {
  const facts = loadKnowledge();
  const active = facts.filter((f) => f.status === 'active');
  let storageKB = 0;
  try {
    for (const k of ['raptor_emil_know_v1', 'raptor_emil_spreads_v1', 'raptor_emil_eventmem_v1', 'raptor_emil_calib_v1']) {
      storageKB += (localStorage.getItem(k)?.length ?? 0) / 1024;
    }
  } catch { /* ignore */ }
  let lastSweep: number | null = null;
  try { const v = localStorage.getItem(SWEEP_KEY); lastSweep = v ? Number(v) : null; } catch { /* ignore */ }
  const connected = sources.filter((s) => s.status === 'Connected').length;
  const degraded = sources.filter((s) => s.status === 'Degraded').length;
  return {
    status: !enabled ? 'Paused' : degraded > 0 ? 'Limited' : 'Learning normally',
    facts: active.length,
    freshPct: facts.length ? Math.round((active.length / facts.length) * 100) : 100,
    storageKB: Math.round(storageKB),
    sourcesConnected: connected, sourcesDown: degraded,
    lastSweep,
  };
}

export function dailySummary(): string {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const facts = loadKnowledge();
  const today = facts.filter((f) => f.lastVerified >= midnight.getTime());
  const superseded = facts.filter((f) => f.history.some((h) => h.replacedAt >= midnight.getTime())).length;
  const calib = calibrationSummary();
  return `today: ${today.length} fact(s) learned/re-verified · ${superseded} corrected with history preserved · forecasts scored ${calib.scored} lifetime (${calib.right}R/${calib.wrong}W/${calib.flat}F) · event memories ${loadEventMemory().length} · nothing entered live trading without passing the firewall.`;
}
