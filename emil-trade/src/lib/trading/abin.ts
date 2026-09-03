// ═══════════════════════════════════════════════════════════════
// ABIN — Advanced Brokerage Intelligence Network (original to Raptor).
// The financial-intelligence nervous system: one workspace composing the
// platform's REAL engines — live pricing, regimes, scanner, hedge math,
// EMIL, calendar, sessions, portfolio DNA, learned knowledge — into
// institutional workflows: discover → understand (EMIL) → opportunity
// (Scanner) → exposure (Hedge) → verify (Risk/Guardian) → confirm
// (trader) → execute (Raptor).
//
// Honesty contract: nothing here copies another terminal's interface,
// commands or data. Every figure carries lineage (platform-generated,
// simulated pricing until the real LP; calendar = licensed-free feed).
// Sections needing licensed data (equities fundamentals, bonds, options
// chains, L2, full-text news, research) are ENTITLEMENT SLOTS that say
// so — never simulated. Opening ABIN grants no trading authority.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { atr } from '@/lib/trading/indicators';
import { getPipSize } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';
import { marketMood } from '@/lib/trading/emil-macro';
import { assessOpportunity, SCAN_TFS, assetClassOf, type Opportunity } from '@/lib/trading/scanner-engine';
import { REGIONS, SYM_ALIASES, type Region } from '@/lib/trading/world-command';
import { loadKnowledge } from '@/lib/trading/emil-knowledge';
import { loadEventMemory } from '@/lib/trading/emil-knowledge';

// §44 — displayed verbatim in the ABIN footer.
export const ABIN_DISCLAIMER =
  'ABIN provides market data, financial information, research, analytics, artificial-intelligence-generated content, ' +
  'Scanner results, hedge analysis, and decision-support tools. Information may be delayed, incomplete, inaccurate, ' +
  'estimated, or supplied by third parties. ABIN does not guarantee investment performance, trade execution, profit, ' +
  'or protection from loss. Users remain responsible for verifying information and approving trading decisions. Access ' +
  'to real-time exchange data, research, news, and advanced analytics may require separate subscriptions and data entitlements.';

// ── §2 Market overview: real 24h performance by asset class ─────

export interface OverviewRow { symbol: string; price: number | null; chg24hPct: number | null; regime: string | null; volPct: number | null }
export interface OverviewGroup { assetClass: string; rows: OverviewRow[] }

function ret24h(builder: OHLCVBuilder, symbol: string): number | null {
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length < 25) return null;
  const ref = bars[bars.length - 25].close;
  return ref > 0 ? Math.round(((bars[bars.length - 1].close - ref) / ref) * 10000) / 100 : null;
}

function atrPctOf(builder: OHLCVBuilder, symbol: string): number | null {
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length < 20) return null;
  const s = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), 14).filter((v): v is number => v != null);
  const a0 = s[s.length - 1]; const px = bars[bars.length - 1].close;
  return a0 && px > 0 ? Math.round((a0 / px) * 10000) / 100 : null;
}

export function marketOverview(builder: OHLCVBuilder, prices: Record<string, { bid?: number } | undefined>): OverviewGroup[] {
  const universe = Object.keys(prices).filter((s) => prices[s]?.bid != null);
  const groups = new Map<string, OverviewRow[]>();
  for (const s of universe) {
    const st = classifyMarketState(builder.getAllBars(s, '60'));
    const row: OverviewRow = { symbol: s, price: prices[s]?.bid ?? null, chg24hPct: ret24h(builder, s), regime: st?.state ?? null, volPct: atrPctOf(builder, s) };
    const k = assetClassOf(s);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  const order = ['forex', 'metal', 'index', 'energy', 'crypto'];
  return [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([assetClass, rows]) => ({ assetClass, rows: rows.sort((a, b) => Math.abs(b.chg24hPct ?? 0) - Math.abs(a.chg24hPct ?? 0)) }));
}

// ── §3 Universal search: grouped, multilingual-alias aware ──────

export interface SearchItem { title: string; sub: string; action: { type: 'instrument' | 'region' | 'cb' | 'event' | 'page' | 'emil'; payload: string } }
export interface SearchGroup { label: string; items: SearchItem[] }

export function universalSearch(qRaw: string, params: { universe: string[]; calendar: NewsEvent[] }): SearchGroup[] {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const { universe, calendar } = params;
  const groups: SearchGroup[] = [];

  // Instruments: direct + English/native aliases.
  const instr = new Set<string>();
  for (const s of universe) if (s.toLowerCase().includes(q)) instr.add(s);
  for (const [alias, sym] of Object.entries(SYM_ALIASES)) {
    if ((q.includes(alias.toLowerCase()) || alias.toLowerCase().includes(q)) && universe.includes(sym)) instr.add(sym);
  }
  if (instr.size) groups.push({ label: 'Instruments', items: [...instr].slice(0, 6).map((s) => ({ title: s, sub: `${assetClassOf(s)} · open the security master page`, action: { type: 'instrument', payload: s } })) });

  // Countries / regions.
  const regions = REGIONS.filter((r) => r.name.toLowerCase().includes(q) || r.ccy.toLowerCase().includes(q) || r.id.toLowerCase() === q);
  if (regions.length) groups.push({ label: 'Countries & regions', items: regions.slice(0, 4).map((r) => ({ title: r.name, sub: `${r.ccy} · country intelligence (World Command Center)`, action: { type: 'region', payload: r.id } })) });

  // Central banks.
  const cbs = REGIONS.filter((r) => r.centralBank.toLowerCase().includes(q) || (q.includes('fed') && r.id === 'US') || (q.includes('rbi') && r.id === 'IN') || (q.includes('ecb') && r.id === 'EU') || (q.includes('boe') && r.id === 'UK') || (q.includes('boj') && r.id === 'JP'));
  if (cbs.length) groups.push({ label: 'Central banks', items: cbs.slice(0, 4).map((r) => ({ title: r.centralBank, sub: `${r.ccy} · policy events + measured reactions`, action: { type: 'cb', payload: r.id } })) });

  // Economic events (this week's real calendar).
  const evs = calendar.filter((e) => e.title.toLowerCase().includes(q) || e.currency.toLowerCase() === q).slice(0, 5);
  if (evs.length) groups.push({ label: 'Economic events', items: evs.map((e) => ({ title: `${e.currency} ${e.title}`, sub: `${new Date(e.timeMs).toUTCString()} · ${e.impact}`, action: { type: 'event', payload: e.currency } })) });

  // Workspaces & tools.
  const tools: SearchItem[] = [];
  if ('scanner scan opportunities'.includes(q) || q.includes('scan')) tools.push({ title: 'Global Trade Scanner', sub: 'ranked opportunities · Arm EMIL per card', action: { type: 'page', payload: '/terminal/scan-trade' } });
  if ('hedge hedging correlation'.includes(q) || q.includes('hedge')) tools.push({ title: 'Hedge Engine', sub: 'correlation hedging desk', action: { type: 'page', payload: '/terminal/hedge-trade' } });
  if ('emil ai assistant pilot'.includes(q) || q.includes('emil')) tools.push({ title: 'EMIL Cockpit', sub: 'council · pilot · governance · learning', action: { type: 'page', payload: '/terminal/emil' } });
  if ('world map country global'.includes(q) || q.includes('world') || q.includes('map')) tools.push({ title: 'World Command Center', sub: 'interactive map · Portfolio DNA · Digital Twin', action: { type: 'page', payload: '/terminal/world' } });
  if (q.includes('audit') || q.includes('health')) tools.push({ title: 'Platform Audit', sub: 'readiness · wiring · gaps', action: { type: 'page', payload: '/terminal/audit' } });
  if (tools.length) groups.push({ label: 'Workspaces & tools', items: tools });

  if (!groups.length) groups.push({ label: 'No matches', items: [{ title: `Ask EMIL about “${qRaw.slice(0, 60)}”`, sub: 'hand the question to the assistant instead', action: { type: 'emil', payload: qRaw } }] });
  return groups;
}

// ── §24 Command bar: original Raptor natural-language commands ──

export interface CommandResult { kind: 'instrument' | 'compare' | 'page' | 'emil' | 'search'; payload: string; payload2?: string; note: string }

function resolveInstrument(text: string, universe: string[]): string | null {
  const t = text.toLowerCase();
  for (const s of universe) if (t.includes(s.toLowerCase())) return s;
  for (const [alias, sym] of Object.entries(SYM_ALIASES)) if (t.includes(alias.toLowerCase()) && universe.includes(sym)) return sym;
  return null;
}

export function parseAbinCommand(text: string, universe: string[]): CommandResult {
  const t = text.toLowerCase().trim();
  const cmp = t.match(/compare\s+(.+?)\s+(?:and|vs|with)\s+(.+)/);
  if (cmp) {
    const a = resolveInstrument(cmp[1], universe); const b = resolveInstrument(cmp[2], universe);
    if (a && b) return { kind: 'compare', payload: a, payload2: b, note: `comparing ${a} vs ${b}` };
  }
  if (/^(open|show)\b/.test(t) || /intelligence/.test(t)) {
    const sym = resolveInstrument(t, universe);
    if (sym) return { kind: 'instrument', payload: sym, note: `opening ${sym} intelligence` };
  }
  if (t.includes('hedge')) {
    const sym = resolveInstrument(t, universe);
    return { kind: 'page', payload: '/terminal/hedge-trade', note: sym ? `opening the Hedge Engine (set primary to ${sym} there)` : 'opening the Hedge Engine' };
  }
  if (t.startsWith('scan') || t.includes('scanner')) return { kind: 'page', payload: '/terminal/scan-trade', note: 'opening the Global Scanner' };
  if (t.includes('exposure') || t.includes('portfolio') || t.includes('my risk')) return { kind: 'page', payload: '#portfolio', note: 'opening Portfolio Intelligence' };
  if (t.includes('briefing') || t.includes('morning report')) return { kind: 'page', payload: '/terminal/world', note: 'briefings live in the News Studio (World page)' };
  if (t.startsWith('ask emil') || t.includes('why')) return { kind: 'emil', payload: text.replace(/^ask emil[,:]?\s*/i, ''), note: 'handing to EMIL/NEXUS' };
  const sym = resolveInstrument(t, universe);
  if (sym) return { kind: 'instrument', payload: sym, note: `opening ${sym} intelligence` };
  return { kind: 'search', payload: text, note: 'running universal search' };
}

// ── §4 Security master page — every field measured or spec-sourced ──

export interface SecurityMaster {
  symbol: string; assetClass: string;
  base: string | null; quote: string | null;
  contractSize: number | null; priceScale: number | null; specType: string | null;
  bid: number | null; ask: number | null; spreadPips: number | null;
  chg24hPct: number | null; volPct: number | null;
  regime: string | null; regimeConf: number | null;
  mood: { label: string; color: string } | null;
  tradingHours: string;
  correlations: Array<{ pair: string; statement: string }>;
  events: NewsEvent[];
  scanner: Opportunity | null;
  lineage: string;
}

export function securityMaster(params: {
  builder: OHLCVBuilder; symbol: string;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[];
  specs: Record<string, { symbol: string; type: string; contractSize: number; pricescale: number }> | null;
  isLiveData: boolean;
}): SecurityMaster {
  const { builder, symbol, prices, calendar, specs, isLiveData } = params;
  const t = prices[symbol];
  const spec = specs?.[symbol] ?? null;
  const ccys = symbolCurrencies(symbol);
  const st = classifyMarketState(builder.getAllBars(symbol, '60'));
  const h1 = SCAN_TFS.find((x) => x.label === 'H1')!;
  const opp = assessOpportunity({ builder, symbol, tf: h1, tick: t, calendar, openPositionCurrencies: [], balance: 0, isLiveData });
  const cls = assetClassOf(symbol);
  const corr = loadKnowledge()
    .filter((f) => f.status === 'active' && f.id.startsWith('corr:') && f.subject.includes(symbol))
    .slice(0, 3)
    .map((f) => ({ pair: f.subject, statement: f.statement }));
  return {
    symbol, assetClass: cls,
    base: ccys[0] ?? null, quote: ccys[1] ?? null,
    contractSize: spec?.contractSize ?? null, priceScale: spec?.pricescale ?? null, specType: spec?.type ?? null,
    bid: t?.bid ?? null, ask: t?.ask ?? null,
    spreadPips: t?.bid != null && t?.ask != null ? Math.round(((t.ask - t.bid) / getPipSize(symbol)) * 10) / 10 : null,
    chg24hPct: ret24h(builder, symbol), volPct: atrPctOf(builder, symbol),
    regime: st?.state ?? null, regimeConf: st?.confidence ?? null,
    mood: (() => { const m = marketMood(builder, symbol, t, calendar); return { label: m.label, color: m.color }; })(),
    tradingHours: cls === 'crypto' ? '24/7 (platform feed)' : 'FX-desk hours 24/5; exchange-session detail arrives with licensed venue data',
    correlations: corr,
    events: upcomingHighImpact(ccys, calendar, 72).slice(0, 4),
    scanner: opp,
    lineage: isLiveData ? 'platform feed (live)' : 'platform-generated · simulated pricing until the real LP · contract specs from the instruments table',
  };
}

// ── §7 Central-bank intelligence (honest data slots) ────────────

export interface CbIntel {
  region: Region;
  policyEvents: NewsEvent[];
  reactions: Array<{ title: string; note: string }>;
  missing: string;
}

const RATE_WORDS = /rate|interest|policy|monetary|fomc|mpc|cash rate|refi|repo/i;

export function cbIntelligence(regionId: string, calendar: NewsEvent[]): CbIntel | null {
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return null;
  const policyEvents = calendar.filter((e) => e.currency === region.ccy && RATE_WORDS.test(e.title)).slice(0, 6);
  const reactions = loadEventMemory()
    .filter((m) => m.currency === region.ccy && RATE_WORDS.test(m.title))
    .map((m) => ({ title: m.title, note: `measured: median vol ×${[...m.samples].sort((a, b) => a.atrRatio - b.atrRatio)[Math.floor(m.samples.length / 2)]?.atrRatio ?? '—'} over ${m.samples.length} release(s)` }));
  return {
    region, policyEvents, reactions,
    missing: 'Policy-rate history, statements, minutes, voting patterns and balance-sheet data await a licensed central-bank data source — the slots exist; the numbers are never invented. The calendar above carries the real decision schedule.',
  };
}

// ── §36 Entitlement register — live vs awaiting license ─────────

export interface Entitlement { section: string; status: 'Live' | 'Partial' | 'Awaiting license'; note: string }

export const ENTITLEMENTS: Entitlement[] = [
  { section: 'FX / metals / indices / energy / crypto pricing', status: 'Live', note: 'platform feed (simulated until the real LP; same wiring carries live prices)' },
  { section: 'Economic calendar (forecast/previous/actual)', status: 'Live', note: 'licensed-free weekly feed via throttled proxy' },
  { section: 'Regimes, volatility, correlations, scanner, hedge math', status: 'Live', note: 'computed on-platform from live bars' },
  { section: 'EMIL intelligence + Lara languages', status: 'Live', note: 'platform-generated + consent-gated language services' },
  { section: 'Portfolio / execution analytics', status: 'Partial', note: 'position analytics live; fill/slippage quality needs the real LP' },
  { section: 'Equities fundamentals, earnings, corporate actions', status: 'Awaiting license', note: 'vendor slot defined; never simulated' },
  { section: 'Fixed income (bonds, curves, auctions)', status: 'Awaiting license', note: 'vendor slot defined; never simulated' },
  { section: 'Options chains / derivatives (IV, greeks, OI)', status: 'Awaiting license', note: 'vendor + venue entitlement required' },
  { section: 'Level-2 depth / time & sales / order flow', status: 'Awaiting license', note: 'exchange entitlement + real LP required' },
  { section: 'Full-text news & research redistribution', status: 'Awaiting license', note: 'headline/summary/attribution model until licensed; nothing republished' },
  { section: 'Alternative data (shipping, weather, satellite, sentiment)', status: 'Awaiting license', note: 'connector slots exist in the knowledge engine' },
  { section: 'Communication network (desks, chat, sharing)', status: 'Awaiting license', note: 'needs backend messaging infrastructure; guest-chat patterns exist in the JUNE portal' },
];

export const LINEAGE_LEGEND =
  'Lineage labels: PLATFORM = computed from live platform data · SIM = simulated pricing until the real LP · CALENDAR = licensed-free feed · ' +
  'EMIL = AI-generated estimate, never a fact · SLOT = awaiting licensed vendor, never simulated. Indicative prices are never presented as executable.';
