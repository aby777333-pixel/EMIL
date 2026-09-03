// ═══════════════════════════════════════════════════════════════
// EMIL Universal Adaptive Trading — mode & timeframe autonomy layer.
// ADDITIVE: sits beside the Trade Mode Engine, Scanner, Hedge, Risk,
// Guardian and Learning systems; it owns NO execution. It widens EMIL's
// timeframe universe to every resolution the platform's data layer
// genuinely builds, assigns per-role timeframes, ranks mode×TF
// suitability transparently, and enforces anti-flip-flop stability and
// trade-identity preservation. Timeframes the data layer does NOT build
// (tick, 1-second, 45-second, 2-day, 3-day, quarterly, yearly) are
// honestly listed as unsupported — never simulated.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { assessOpportunity, SCAN_TFS, type ScanTF, type Opportunity } from '@/lib/trading/scanner-engine';
import { classifyMarketState } from '@/lib/nexus/market-state';
import type { NewsEvent } from '@/lib/trading/news-guard';

// ── The full adaptive timeframe ladder (ascending) ──────────────
// Every entry maps to a resolution the OHLCV builder actually maintains.
// Styles reuse the Trade Mode Engine's vocabulary where they overlap so
// the existing enabledModes controls keep working unchanged.

export const ADAPT_TFS: ScanTF[] = [
  { label: '30S', res: '30S', style: 'Micro Scalping', holding: 'seconds to minutes' },
  { label: 'M1',  res: '1',   style: 'Scalping',       holding: 'minutes' },
  { label: 'M2',  res: '2',   style: 'Scalping',       holding: 'minutes' },
  { label: 'M5',  res: '5',   style: 'Fast Intraday',  holding: 'minutes to an hour' },
  { label: 'M10', res: '10',  style: 'Fast Intraday',  holding: 'under an hour' },
  { label: 'M15', res: '15',  style: 'Intraday',       holding: 'minutes to one session' },
  { label: 'M30', res: '30',  style: 'Day Trading',    holding: 'hours' },
  { label: 'H1',  res: '60',  style: 'Intraday / Swing', holding: 'hours to a day' },
  { label: 'H2',  res: '120', style: 'Swing',          holding: 'a day or two' },
  { label: 'H4',  res: '240', style: 'Swing',          holding: 'a day to several weeks' },
  { label: 'H8',  res: '480', style: 'Swing',          holding: 'days to weeks' },
  { label: 'D1',  res: '1D',  style: 'Positional',     holding: 'weeks to months' },
  { label: 'W1',  res: '1W',  style: 'Investment',     holding: 'months' },
];

// Ladder entries the base scanner does not already cover.
export const EXTENDED_TFS: ScanTF[] = ADAPT_TFS.filter((t) => !SCAN_TFS.some((s) => s.label === t.label));

export const UNSUPPORTED_TF_NOTE =
  'Not provided by the data layer (never simulated): Tick · 1s · 45s · 2-Day · 3-Day · Quarterly · Yearly. ' +
  'Sub-30s bars and near-duplicate steps (M3/M20/M45/H3/H6/H12/1Mo) exist in the chart engine but are excluded from EMIL’s ladder — on this feed they add noise, not edge.';

// ── Timeframe role assignment (§3) ──────────────────────────────

export interface TfRoles {
  context: string; trend: string; setup: string; confirmation: string;
  entry: string; management: string; exit: string;
}

export function tfRoles(entryLabel: string): TfRoles | null {
  const i = ADAPT_TFS.findIndex((t) => t.label === entryLabel);
  if (i < 0) return null;
  const at = (k: number) => ADAPT_TFS[Math.min(ADAPT_TFS.length - 1, k)].label;
  return {
    entry: at(i), confirmation: at(i + 1), setup: at(i + 2),
    trend: at(i + 3), context: at(i + 4), management: at(i + 1), exit: at(i + 2),
  };
}

// ── Mode fusion (§8): honest composite labels from real evidence ─

export function fusionLabel(opp: Opportunity): string {
  if (opp.opportunityType.startsWith('Range')) {
    return opp.regime.volatility === 'Low Volatility' ? 'Range + Mean Reversion + Compression' : 'Range + Mean Reversion';
  }
  const parts = ['Trend Following', 'Pullback'];
  if (opp.regime.state.includes('Strong')) parts.push('Momentum');
  if (opp.regime.volatility === 'High Volatility') parts.push('Volatility Expansion');
  return parts.join(' + ');
}

// ── Adaptation authority preferences (§19) ──────────────────────
// Two mutually-exclusive authorities: 'trader' (preference fields active,
// EMIL-everything dormant) or 'emil' ("Let EMIL Select Everything" —
// trader fields dormant; requires recorded §24 consent). Defaults preserve
// pre-existing behaviour exactly (scanner's six TFs, no locks, no pause).

export interface AdaptPrefs {
  control: 'trader' | 'emil';
  allowedTFs: string[];
  lockedTF: string | null;
  lockedMode: string | null;
  pause: boolean;
  consentAt: number | null;
}

const ADAPT_KEY = 'raptor_emil_adapt_v1';

export const DEFAULT_ADAPT: AdaptPrefs = {
  control: 'trader',
  allowedTFs: SCAN_TFS.map((t) => t.label),
  lockedTF: null,
  lockedMode: null,
  pause: false,
  consentAt: null,
};

export function loadAdaptPrefs(): AdaptPrefs {
  try { return { ...DEFAULT_ADAPT, ...(JSON.parse(localStorage.getItem(ADAPT_KEY) || '{}')) }; } catch { return { ...DEFAULT_ADAPT }; }
}

export function saveAdaptPrefs(p: AdaptPrefs): void {
  try { localStorage.setItem(ADAPT_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** The timeframe labels EMIL may actually use right now. */
export function effectiveAllowedTFs(p: AdaptPrefs): string[] {
  if (p.control === 'emil' && p.consentAt) return ADAPT_TFS.map((t) => t.label);
  if (p.lockedTF) return [p.lockedTF];
  return p.allowedTFs.length ? p.allowedTFs : SCAN_TFS.map((t) => t.label);
}

// §24 — displayed verbatim before unrestricted selection is enabled.
export const ADAPT_DISCLAIMER =
  'EMIL may autonomously select and change trading modes, strategies, instruments, timeframes, entries, exits, and ' +
  'trade-management methods within the trader’s approved permissions. Such adaptation does not guarantee profit, ' +
  'capital preservation, or successful execution. Moving between timeframes or trading modes can increase holding ' +
  'duration, exposure, transaction costs, market risk, gap risk, and execution risk. EMIL must not increase approved ' +
  'account risk, widen a stop merely to avoid a loss, or access protected capital without permission. The trader ' +
  'remains responsible for enabling, configuring, and supervising autonomous trading.';

// ── Adaptation Stability Engine (§15): anti-flip-flop ───────────

const STAB_KEY = 'raptor_emil_adaptstab_v1';
const SWITCH_COOLDOWN_MS = 10 * 60_000;   // min time between global mode switches
const MIN_CONF_IMPROVE = 8;               // proposed mode must beat current by this inside cooldown
const MAX_SWITCHES_PER_DAY = 12;          // beyond this, only clear improvements switch
const MAX_CHANGES_PER_TRADE = 3;          // mode/TF changes per open position

interface StabStore { lastSwitch: number; day: string; switchesToday: number; perTrade: Record<string, number> }

function loadStab(): StabStore {
  const today = new Date().toDateString();
  try {
    const s = JSON.parse(localStorage.getItem(STAB_KEY) || '{}') as Partial<StabStore>;
    if (s.day !== today) return { lastSwitch: s.lastSwitch ?? 0, day: today, switchesToday: 0, perTrade: {} };
    return { lastSwitch: s.lastSwitch ?? 0, day: today, switchesToday: s.switchesToday ?? 0, perTrade: s.perTrade ?? {} };
  } catch { return { lastSwitch: 0, day: today, switchesToday: 0, perTrade: {} }; }
}

function saveStab(s: StabStore): void {
  try { localStorage.setItem(STAB_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/**
 * May the pilot switch its active mode right now? `improvement` is the
 * proposed candidate's adjusted score minus the best candidate still
 * available in the CURRENT mode (Infinity when the current mode has no
 * qualified candidate — leaving a dry mode is not flip-flopping).
 * Risk-protection actions (exits, No-Trade) never pass through here.
 */
export function stabilityCheck(params: { pause: boolean; improvement: number }): { ok: boolean; reason: string } {
  if (params.pause) return { ok: false, reason: 'adaptation paused by the trader' };
  const s = loadStab();
  const inCooldown = Date.now() - s.lastSwitch < SWITCH_COOLDOWN_MS;
  if (inCooldown && params.improvement < MIN_CONF_IMPROVE) {
    return { ok: false, reason: `switch cooldown active and the proposed mode is only +${params.improvement.toFixed(0)} better (needs +${MIN_CONF_IMPROVE})` };
  }
  if (s.switchesToday >= MAX_SWITCHES_PER_DAY && params.improvement < MIN_CONF_IMPROVE * 2) {
    return { ok: false, reason: `${s.switchesToday} switches today — only clear improvements (+${MIN_CONF_IMPROVE * 2}) may switch now` };
  }
  return { ok: true, reason: '' };
}

export function recordModeSwitch(): void {
  const s = loadStab();
  s.lastSwitch = Date.now();
  s.switchesToday += 1;
  saveStab(s);
}

export function tradeChangeAllowed(posId: string): boolean {
  return (loadStab().perTrade[posId] ?? 0) < MAX_CHANGES_PER_TRADE;
}

export function recordTradeChange(posId: string): void {
  const s = loadStab();
  s.perTrade[posId] = (s.perTrade[posId] ?? 0) + 1;
  const keys = Object.keys(s.perTrade);
  if (keys.length > 120) for (const k of keys.slice(0, keys.length - 120)) delete s.perTrade[k];
  saveStab(s);
}

// ── Trade Identity Preservation (§10): history is never rewritten ─

export interface IdentityChange { ts: number; kind: 'mode' | 'tf' | 'stop' | 'target' | 'partial' | 'hedge' | 'exit'; from?: string; to?: string; note: string }

export interface TradeIdentity {
  id: string; symbol: string; direction: string;
  mode: string; tf: string;
  originalStop: number | null; originalTp: number | null; originalRisk: number | null;
  firstSeen: number;
  changes: IdentityChange[];
}

const IDENT_KEY = 'raptor_emil_tradeident_v1';

export function loadIdentities(): Record<string, TradeIdentity> {
  try { return JSON.parse(localStorage.getItem(IDENT_KEY) || '{}'); } catch { return {}; }
}

function saveIdentities(m: Record<string, TradeIdentity>): void {
  try {
    const ids = Object.keys(m);
    if (ids.length > 60) {
      const drop = ids.sort((a, b) => m[a].firstSeen - m[b].firstSeen).slice(0, ids.length - 60);
      for (const id of drop) delete m[id];
    }
    localStorage.setItem(IDENT_KEY, JSON.stringify(m));
  } catch { /* ignore */ }
}

export function ensureIdentity(pos: { id: string; symbol: string; direction: string; sl: number | null; tp: number | null; comment?: string | null }, originalRisk: number | null): TradeIdentity {
  const m = loadIdentities();
  if (m[pos.id]) return m[pos.id];
  const tf = String(pos.comment ?? '').split(':')[2] ?? '?';
  const ladder = ADAPT_TFS.find((t) => t.label === tf);
  m[pos.id] = {
    id: pos.id, symbol: pos.symbol, direction: pos.direction,
    mode: ladder?.style ?? 'Unknown', tf,
    originalStop: pos.sl, originalTp: pos.tp, originalRisk,
    firstSeen: Date.now(), changes: [],
  };
  saveIdentities(m);
  return m[pos.id];
}

export function appendIdentityChange(posId: string, change: IdentityChange): void {
  const m = loadIdentities();
  if (!m[posId]) return;
  m[posId].changes.push(change);
  saveIdentities(m);
}

/** Current management TF for a position — original unless a 'tf' change was recorded. */
export function currentManagedTf(ident: TradeIdentity): string {
  for (let i = ident.changes.length - 1; i >= 0; i--) {
    if (ident.changes[i].kind === 'tf' && ident.changes[i].to) return ident.changes[i].to!;
  }
  return ident.tf;
}

// ── Mode × Timeframe suitability matrix (§6) ────────────────────

export interface MatrixRow {
  mode: string; tf: string; suitability: number;
  confidence: string; risk: string; duration: string; note: string;
}

export function suitabilityMatrix(params: {
  builder: OHLCVBuilder;
  symbol: string;
  tick: { bid?: number; ask?: number } | undefined;
  calendar: NewsEvent[];
  allowed: string[];
}): MatrixRow[] {
  const { builder, symbol, tick, calendar, allowed } = params;
  const rows: MatrixRow[] = [];
  let best = 0;
  for (const tf of ADAPT_TFS) {
    if (!allowed.includes(tf.label)) continue;
    const bars = builder.getAllBars(symbol, tf.res);
    if (bars.length < 60) {
      rows.push({ mode: tf.style, tf: tf.label, suitability: 0, confidence: 'None', risk: '—', duration: tf.holding, note: `insufficient history (${bars.length} bars) — no read, honestly` });
      continue;
    }
    const opp = assessOpportunity({ builder, symbol, tf, tick, calendar, openPositionCurrencies: [], balance: 0, isLiveData: false });
    if (opp) {
      best = Math.max(best, opp.score);
      const conf = opp.score >= 75 ? 'High' : opp.score >= 65 ? 'Medium–High' : opp.score >= 55 ? 'Medium' : 'Low';
      const tfIdx = ADAPT_TFS.findIndex((t) => t.label === tf.label);
      const risk = opp.regime.volatility === 'High Volatility' ? 'High' : tfIdx <= 4 ? 'Low–Medium' : 'Medium';
      rows.push({ mode: tf.style, tf: tf.label, suitability: opp.score, confidence: conf, risk, duration: tf.holding, note: `${fusionLabel(opp)} · ${opp.direction}` });
    } else {
      const state = classifyMarketState(bars);
      const suit = state ? Math.max(10, Math.min(45, Math.round(state.confidence / 2))) : 10;
      rows.push({ mode: 'Range / Observe', tf: tf.label, suitability: suit, confidence: 'Low', risk: '—', duration: tf.holding, note: state ? `${state.state} — range execution model not built; observation only` : 'unreadable regime' });
    }
  }
  rows.push({
    mode: 'No-Trade', tf: 'All', suitability: best > 0 ? Math.max(18, 95 - best) : 95,
    confidence: best > 0 ? 'Low' : 'High', risk: '—', duration: 'until conditions improve',
    note: 'staying flat is a first-class decision — it wins whenever nothing qualifies',
  });
  return rows.sort((a, b) => b.suitability - a.suitability);
}
