// ═══════════════════════════════════════════════════════════════
// EMIL EA Strategy Knowledge — the owner's MQL5 Expert Advisor
// collection ("EA BACK UP JULY 2026"), distilled from source code into
// structured strategy cards + a trading/MQL5 terminology glossary.
//
// This is BUNDLED REFERENCE KNOWLEDGE: every card was read from the
// actual .mq5 entry/exit/risk code (not marketing text). EMIL uses it
// three ways, all observe-only and firewalled:
//   1. A "Strategy Library" council agent — matches the live regime to
//      the strategy families in the library and cites the closest
//      playbook. It suggests and explains; it never places orders.
//   2. Strategic facts seeded into the knowledge store (versioned,
//      exportable, deletable like every other fact).
//   3. A browsable library + glossary console inside EMIL Always
//      Learning, so the trader sees exactly what EMIL knows.
// ═══════════════════════════════════════════════════════════════

import { upsertFact } from '@/lib/trading/emil-knowledge';
import type { CouncilStance } from '@/lib/trading/emil-council';

export type EAFamily =
  | 'trend' | 'reversal' | 'scalper' | 'hybrid'
  | 'grid' | 'hedge' | 'martingale' | 'breakout' | 'pattern';

export interface EATerm { term: string; def: string }

export interface EAStrategyCard {
  name: string;
  family: EAFamily;
  indicators: string[];
  entry: string;
  exit: string;
  risk: string;
  params: string[];
  timeframes: string[];
  pairs: string[];
  /** The market inefficiency/behavior the strategy claims to exploit. */
  edge: string;
  terms: EATerm[];
  /** Where the strategy came from; undefined = the owner's own collection. */
  origin?: string;
}

// Distilled EA sources live in the sibling data module.
import { EA_STRATEGY_CARDS } from '@/lib/trading/emil-ea-knowledge-data';

export const EA_STRATEGY_LIBRARY: EAStrategyCard[] = EA_STRATEGY_CARDS;

/** Deduped glossary across every card (first definition wins). */
export function eaTerminology(): EATerm[] {
  const seen = new Map<string, EATerm>();
  for (const card of EA_STRATEGY_LIBRARY) {
    for (const t of card.terms) {
      const key = t.term.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term));
}

export function libraryByFamily(): Record<string, EAStrategyCard[]> {
  const out: Record<string, EAStrategyCard[]> = {};
  for (const c of EA_STRATEGY_LIBRARY) (out[c.family] ??= []).push(c);
  return out;
}

// ── Council integration (observe-only) ──────────────────────────
// Regime → which strategy families historically fit that condition.
const REGIME_FAMILIES: Array<{ match: (state: string) => boolean; families: EAFamily[]; label: string }> = [
  { match: (s) => s.includes('Strong Uptrend') || s.includes('Strong Downtrend'), families: ['trend', 'scalper', 'breakout'], label: 'strong trend' },
  { match: (s) => s.includes('Uptrend') || s.includes('Downtrend'), families: ['trend', 'hybrid', 'pattern'], label: 'trend' },
  { match: (s) => s.includes('Range') || s.includes('Chop') || s.includes('Neutral'), families: ['reversal', 'pattern'], label: 'range/chop' },
];

export interface StrategyLibraryRead {
  stance: CouncilStance;
  confidence: number;
  note: string;
  matches: EAStrategyCard[];
}

/**
 * The Strategy Library agent's read: given the live regime string
 * (from classifyMarketState) pick the library strategies whose FAMILY
 * fits the current condition and whose timeframe list contains the
 * active timeframe. Pure lookup over bundled knowledge — no backtest
 * claims, no execution path.
 */
export function strategyLibraryRead(regimeState: string | null, tfLabel: string): StrategyLibraryRead {
  if (!regimeState || EA_STRATEGY_LIBRARY.length === 0) {
    return { stance: 'neutral', confidence: 25, note: 'library loaded — waiting for a regime read', matches: [] };
  }
  const rule = REGIME_FAMILIES.find((r) => r.match(regimeState));
  if (!rule) {
    return { stance: 'neutral', confidence: 30, note: `no library family maps to "${regimeState}"`, matches: [] };
  }
  const inFamily = EA_STRATEGY_LIBRARY.filter((c) => rule.families.includes(c.family));
  const tfMatched = inFamily.filter((c) => c.timeframes.some((t) => t.toLowerCase() === tfLabel.toLowerCase()));
  const matches = (tfMatched.length ? tfMatched : inFamily).slice(0, 3);
  const best = matches[0];
  const dir: CouncilStance = regimeState.includes('Uptrend') ? 'bull' : regimeState.includes('Downtrend') ? 'bear' : 'neutral';
  return {
    stance: dir,
    confidence: dir === 'neutral' ? 40 : tfMatched.length ? 62 : 52,
    note: best
      ? `${rule.label} regime — closest playbook: ${best.name} (${best.indicators.slice(0, 2).join(' + ')}); ${matches.length} of ${EA_STRATEGY_LIBRARY.length} strategies fit`
      : `${rule.label} regime — no ${rule.families.join('/')} strategy in the library fits`,
    matches,
  };
}

// ── Knowledge-store seeding (idempotent) ────────────────────────
/** Seed one strategic fact per strategy. upsertFact makes this
 *  idempotent; re-imports supersede with history kept. */
export function seedEaKnowledgeFacts(): number {
  let seeded = 0;
  for (const c of EA_STRATEGY_LIBRARY) {
    const r = upsertFact({
      id: `ea:${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'measurement',
      level: 'strategic',
      subject: `EA strategy · ${c.name}`,
      statement: `${c.family.toUpperCase()} — ${c.edge} Entry: ${c.entry} Exit: ${c.exit}`,
      evidence: c.origin ? `distilled from MQL source (${c.origin})` : 'distilled from MQL5 source (EA BACK UP JULY 2026)',
      confidence: 70,
      freshUntil: Date.now() + 90 * 24 * 3_600_000,
      reason: 'EA library import',
    });
    if (r === 'new') seeded++;
  }
  return seeded;
}
