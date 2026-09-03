// ═══════════════════════════════════════════════════════════════
// RAPTOR Natural-Language Trading Commands — deterministic parser
// for the Hedge Trade and Scan Trade command bars.
//
// Contract (per the owner's spec):
//   · Every command converts into VISIBLE structured settings before
//     anything applies — the trader confirms or cancels; nothing is
//     silently invented.
//   · Unsafe instructions (no stop loss, martingale, use-all-balance,
//     ignore limits, guaranteed recovery…) are REFUSED with a reason.
//   · Contradicting instructions in one message are flagged — the
//     engine never guesses which rule wins.
//   · Question-like input gets a status answer, not a settings change.
//   · Account-safety limits always outrank strategy instructions —
//     the parser can tighten but a plain command can never disable
//     Shield, Guardian or the Risk Governor.
//   · Every submission, interpretation and application is audit-logged.
//
// This is a deterministic keyword parser (no LLM): predictable,
// auditable and offline. Unrecognized clauses are listed back to the
// trader to rephrase — never guessed.
// ═══════════════════════════════════════════════════════════════

import {
  loadHedgeAutoParams, saveHedgeAutoParams, setHedgeAutoOn, isHedgeAutoConsented,
  hedgeAutoLog, loadHedgeAutoLog, loadBaskets, HEDGE_PRESETS, type HedgeAutoParams,
} from '@/lib/trading/hedge-auto';
import {
  loadScanAutoParams, saveScanAutoParams, setScanAutoOn, isScanAutoConsented,
  scanAutoLog, loadScanAutoLog, SCAN_MODES, type ScanAutoParams,
} from '@/lib/trading/scan-auto';
import { loadGovernorLimits, saveGovernorLimits, type GovernorLimits } from '@/lib/trading/risk-governor';

export type CommandScope = 'hedge' | 'scan';

export interface Directive {
  target: 'hedge' | 'scan' | 'governor' | 'engine';
  field: string;
  label: string;          // human-readable setting name
  value: number | boolean | string | string[];
  display: string;        // shown to the trader before applying
}

export interface ParseResult {
  directives: Directive[];
  refused: Array<{ clause: string; reason: string }>;
  conflicts: Array<{ field: string; values: string[] }>;
  unknown: string[];
  isQuestion: boolean;
}

// ── Numeric extraction ──────────────────────────────────────────

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, 'forty-five': 45, sixty: 60, half: 0.5, quarter: 0.25,
};

function num(s: string): number | null {
  const w = s.toLowerCase().trim();
  if (w in WORD_NUM) return WORD_NUM[w];
  const n = parseFloat(w.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function firstPercent(clause: string): number | null {
  const m = clause.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)/i);
  return m ? num(m[1]) : null;
}
function firstDollar(clause: string): number | null {
  const m = clause.match(/\$\s*(\d+(?:\.\d+)?)/) ?? clause.match(/(\d+(?:\.\d+)?)\s*dollars?/i)
    ?? clause.match(/\b(one|two|three|five|ten|twenty|fifty)\s+dollars?\b/i);
  return m ? num(m[1]) : null;
}
function firstLots(clause: string): number | null {
  const m = clause.match(/(\d+\.\d+|\d+)\s*lots?/i);
  return m ? num(m[1]) : null;
}
function firstCount(clause: string): number | null {
  const m = clause.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i);
  return m ? num(m[1]) : null;
}
function firstMinutes(clause: string): number | null {
  const h = clause.match(/(\d+(?:\.\d+)?|one|two|three)\s*hours?/i);
  if (h) { const v = num(h[1]); return v != null ? v * 60 : null; }
  const m = clause.match(/(\d+|one|two|three|five|ten|fifteen|twenty|thirty|sixty)\s*min/i);
  return m ? num(m[1]) : null;
}

// ── Unsafe instructions — refused, never negotiated ─────────────

const UNSAFE: Array<{ re: RegExp; reason: string }> = [
  { re: /without\s+(a\s+)?stop|no\s+stop[- ]?loss|remove\s+(the\s+)?stops?/i, reason: 'every position must carry a hard stop — no-stop trading is refused' },
  { re: /martingale|double\s+(the\s+lot|after\s+every\s+loss|down)|keep\s+doubling/i, reason: 'martingale / lot-doubling after losses is disabled by design' },
  { re: /all\s+(my\s+)?balance|entire\s+account|maximum\s+leverage/i, reason: 'full-balance or max-leverage sizing creates uncontrolled risk' },
  { re: /ignore\s+(the\s+)?(margin|risk|loss|daily|drawdown|limit)/i, reason: 'account-safety limits cannot be weakened by a trading command' },
  { re: /guarantee[ds]?\s+(profit|recovery)|never\s+close\s+at\s+a\s+loss|at\s+any\s+cost|no\s+matter\s+how\s+long/i, reason: 'no engine may promise recovery or hold losers indefinitely — three outcomes are valid: small profit, break-even, controlled loss' },
  { re: /disable\s+(all\s+)?(safety|shield|guardian|governor|protection)/i, reason: 'Shield, Guardian and the Risk Governor cannot be disabled from the command bar' },
  { re: /keep\s+adding|unlimited\s+(hedge|stages|levels)|as\s+many\s+trades\s+as\s+possible/i, reason: 'unlimited averaging/stages are refused — stage and level caps are hard limits' },
  { re: /stale\s+price|disconnected|even\s+if\s+margin/i, reason: 'execution on stale data or insufficient margin is always refused' },
];

// ── Rule patterns ───────────────────────────────────────────────

interface Rule {
  scope: CommandScope | 'both';
  re: RegExp;
  build: (clause: string, scope: CommandScope) => Directive | null;
}

const d = (target: Directive['target'], field: string, label: string, value: Directive['value'], display: string): Directive =>
  ({ target, field, label, value, display });

const RULES: Rule[] = [
  // ── Engine on/off ──
  { scope: 'both', re: /(pause|stop|disable|switch\s*off|turn\s*off)\b.*\b(auto\s*hedge|hedge\s*(trade|engine|automation))/i,
    build: () => d('engine', 'hedgeOff', 'Auto Hedge', false, 'Switch Auto Hedge OFF (monitor-only)') },
  { scope: 'both', re: /(resume|enable|switch\s*on|turn\s*on|activate)\b.*\b(auto\s*hedge|hedge\s*(trade|engine|automation))/i,
    build: () => d('engine', 'hedgeOn', 'Auto Hedge', true, 'Switch Auto Hedge ON (requires recorded consent)') },
  { scope: 'both', re: /(pause|stop|disable|switch\s*off|turn\s*off)\b.*\b(auto\s*scan|scan\s*(trade|engine|automation)|scanner)/i,
    build: () => d('engine', 'scanOff', 'Auto Scan', false, 'Switch Auto Scan OFF (signals continue, no orders)') },
  { scope: 'both', re: /(resume|enable|switch\s*on|turn\s*on|activate)\b.*\b(auto\s*scan|scan\s*(trade|engine)|scanner)/i,
    build: () => d('engine', 'scanOn', 'Auto Scan', true, 'Switch Auto Scan ON (requires recorded consent)') },
  { scope: 'both', re: /^(pause|stop)\b(?!.*(hedge|scan)).*\b(trading|everything|all)\b/i,
    build: (_c, scope) => scope === 'hedge'
      ? d('engine', 'hedgeOff', 'Auto Hedge', false, 'Switch Auto Hedge OFF')
      : d('engine', 'scanOff', 'Auto Scan', false, 'Switch Auto Scan OFF') },

  // ── Presets / tone ──
  { scope: 'both', re: /\b(very\s+safe|tiny|micro|smallest)\b/i,
    build: (_c, scope) => scope === 'hedge'
      ? d('hedge', 'preset', 'Risk preset', 'micro', 'Apply the Micro Protection preset (smallest lots, 1 hedge level, tight caps)')
      : d('scan', 'mode', 'Profit mode', 'small-profit', 'Apply the Small-Profit mode (tightest limits, fastest exits)') },
  { scope: 'both', re: /\b(conservative|keep\s+it\s+safe|protect\s+(my\s+)?capital|go\s+slow|cut\s+(the\s+)?risk)/i,
    build: (_c, scope) => scope === 'hedge'
      ? d('hedge', 'preset', 'Risk preset', 'conservative', 'Apply the Conservative preset')
      : d('scan', 'mode', 'Profit mode', 'conservative', 'Apply the Conservative mode') },
  { scope: 'both', re: /\bbalanced\b/i,
    build: (_c, scope) => scope === 'hedge'
      ? d('hedge', 'preset', 'Risk preset', 'balanced', 'Apply the Balanced preset')
      : d('scan', 'mode', 'Profit mode', 'balanced', 'Apply the Balanced mode') },
  { scope: 'hedge', re: /\b(aggressive|advanced)\b/i,
    build: () => d('hedge', 'preset', 'Risk preset', 'advanced', 'Apply the Advanced preset (multi-instrument baskets — explicit warning applies)') },

  // ── Hedge activation ──
  { scope: 'hedge', re: /hedge\b.*\b(los(es|s|ing)|down)\b.*(more\s+than|exceeds?|reaches|of)?/i,
    build: (c) => { const v = firstDollar(c); return v != null ? d('hedge', 'activationLossUsd', 'Loss $ before hedge', v, `Hedge a position only after it loses more than $${v}`) : null; } },
  { scope: 'hedge', re: /(in\s+loss|losing)\s+for\b|after\b.*\bminutes?\b.*loss|loss\b.*\bfor\b/i,
    build: (c) => { const v = firstMinutes(c); return v != null ? d('hedge', 'activationMinutes', 'Minutes in loss before hedge', v, `Wait ${v} minute(s) in loss before considering a hedge`) : null; } },
  { scope: 'hedge', re: /correlations?\b.*(stronger|above|at\s+least|minimum|over)/i,
    build: (c) => { const v = firstPercent(c); return v != null ? d('hedge', 'minCorrelation', 'Minimum |correlation|', v / 100, `Use only correlations stronger than ${v}%`) : null; } },
  { scope: 'hedge', re: /\b(one|two|three|1|2|3)\b.*(instruments?|pairs?|legs?)\b.*(hedge|basket)|hedge\b.*\b(one|two|three|1|2|3)\b.*(instruments?|pairs?)/i,
    build: (c) => { const v = firstCount(c); return v != null && v >= 1 && v <= 3 ? d('hedge', 'maxHedgeInstruments', 'Max hedge instruments', v, `Use at most ${v} hedge instrument(s) per basket`) : null; } },
  { scope: 'hedge', re: /(stages?|levels?)\b/i,
    build: (c) => { if (!/hedge|stage|level/i.test(c)) return null; const v = firstCount(c); return v != null && v >= 1 && v <= 2 ? d('hedge', 'maxLevels', 'Max hedge stages', v, `Allow at most ${v} risk-adding hedge stage(s)`) : null; } },
  { scope: 'hedge', re: /basket\b.*(profit|net)\b.*(reach|at|of)|close\b.*basket\b.*\$/i,
    build: (c) => { const v = firstDollar(c); return v != null ? d('hedge', 'basketTargetUsd', 'Basket net profit target', v, `Close the basket when net profit reaches $${v} (bare-minimum profit mode)`) : null; } },
  { scope: 'hedge', re: /(maximum|max|accept)\b.*basket\s+loss|basket\b.*\bloss\b.*(maximum|of|reaches)/i,
    build: (c) => { const v = firstDollar(c); return v != null ? d('hedge', 'maxBasketLossUsd', 'Max basket loss', v, `Force-close the basket at a controlled loss of $${v}`) : null; } },
  { scope: 'hedge', re: /(never|not)\b.*(increase|exceed)\b.*hedge\b.*(times|x|multiple)|hedge\b.*(exceed|more\s+than)\b.*(times|x)\b/i,
    build: (c) => { const m = c.match(/(\d+(?:\.\d+)?|two|three)\s*(?:times|x)/i); const v = m ? num(m[1]) : null; return v != null ? d('hedge', 'maxLotMult', 'Hedge lot cap (× primary)', v, `Never let hedge lots exceed ${v}× the original position`) : null; } },
  { scope: 'hedge', re: /basket\b.*(after|within|duration)\b.*(hours?|minutes?)/i,
    build: (c) => { const mins = firstMinutes(c); return mins != null ? d('hedge', 'maxBasketHours', 'Max basket duration (h)', Math.max(1, Math.round(mins / 60 * 10) / 10), `Close any basket still open after ${mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}min`}`) : null; } },
  { scope: 'hedge', re: /(no|not|never|do\s*n.t)\b.*hedge\b.*news|news\b.*(no|not)\b.*hedge/i,
    build: () => d('hedge', 'newsBlackout', 'News blackout', true, 'Never open hedges near red-flag news events') },

  // ── Lot sizing ──
  { scope: 'scan', re: /(start|use|fixed)\b.*(every\s+trade|lot)\b.*(with|of|size)?|lot\s+size\s+of/i,
    build: (c) => { if (!/lot/i.test(c) || /hedge/i.test(c)) return null; const v = firstLots(c); return v != null && v <= 5 && /start|fixed|every/i.test(c) ? d('scan', 'fixedLot', 'Fixed lot per trade', v, `Start every engine trade with ${v} lot (fixed sizing)`) : null; } },
  { scope: 'scan', re: /(never|not)\b.*exceed\b.*lot|maximum\b.*lot\b.*trade/i,
    build: (c) => { if (/hedge/i.test(c)) return null; const v = firstLots(c); return v != null && v <= 5 ? d('scan', 'maxLotPerTrade', 'Max lot per trade', v, `Never exceed ${v} lot on any engine trade (hard cap)`) : null; } },
  { scope: 'hedge', re: /hedge\b.*(never|not)?\b.*(exceed|beyond|maximum|max)\b.*lot|start\b.*hedge\b.*lot/i,
    build: (c) => { const v = firstLots(c); return v != null && v <= 5 ? d('hedge', 'maxHedgeLots', 'Max hedge lots per leg', v, `Never let a hedge leg exceed ${v} lot`) : null; } },

  // ── Scan risk & limits ──
  { scope: 'scan', re: /risk\b.*(no\s+more\s+than|at\s+most|maximum|of)?\b.*(percent|%)/i,
    build: (c) => { const v = firstPercent(c); return v != null && v <= 5 ? d('scan', 'riskPct', 'Risk % per trade', v, `Risk no more than ${v}% of balance per trade`) : null; } },
  { scope: 'scan', re: /(confidence|score)\b.*\b(at\s+least|above|minimum|of|over)|(at\s+least|above|over|minimum)\b.*\b(confidence|score)/i,
    build: (c) => { const v = firstPercent(c) ?? firstCount(c); return v != null && v >= 40 && v <= 100 ? d('scan', 'minScore', 'Minimum opportunity score', v, `Show/execute only signals scoring at least ${v}`) : null; } },
  { scope: 'scan', re: /1\s*:\s*(\d+(?:\.\d+)?)|risk[- ]?(?:to[- ])?reward/i,
    build: (c) => { const m = c.match(/1\s*:\s*(\d+(?:\.\d+)?)/); const v = m ? num(m[1]) : null; return v != null ? d('scan', 'minRR', 'Minimum risk:reward', v, `Take only trades offering at least 1:${v}`) : null; } },
  { scope: 'scan', re: /trades?\s+(per|a)\s+day|per\s+day\b.*trades?|more\s+than\b.*trades?\b.*day/i,
    build: (c) => { const v = firstCount(c); return v != null && v >= 1 && v <= 50 ? d('scan', 'maxPerDay', 'Max trades per day', v, `Take no more than ${v} engine trade(s) per day`) : null; } },
  { scope: 'scan', re: /(open|same\s+time|simultaneous(ly)?|at\s+once)\b.*trades?|trades?\b.*(open|at\s+the\s+same\s+time)/i,
    build: (c) => { const v = firstCount(c); return v != null && v >= 1 && v <= 20 ? d('scan', 'maxOpenTrades', 'Max open engine trades', v, `Keep at most ${v} engine trade(s) open at once`) : null; } },
  { scope: 'both', re: /(after|stop)\b.*(consecutive\s+loss|losing\s+trades?|straight\s+loss|two\s+losses|three\s+losses)/i,
    build: (c, scope) => { const v = firstCount(c); if (v == null || v < 1 || v > 10) return null;
      return scope === 'scan'
        ? d('scan', 'consecutiveLossStop', 'Stop after consecutive losses', v, `Stop the engine for the day after ${v} consecutive losses`)
        : d('hedge', 'dailyLossNote', 'Consecutive losses', v, `Noted: Hedge engine stands down for the day when its daily loss stop is hit — set "Engine daily loss stop" to bound this`); } },
  { scope: 'both', re: /(stop|lock|pause)\b.*day\b.*los(e|ing|s)|los(e|ing|s)\b.*\$\d+.*(day|today)|(day|today)\b.*los/i,
    build: (c, scope) => { const v = firstDollar(c); if (v == null) return null;
      return scope === 'scan'
        ? d('scan', 'dailyLossLimitUsd', 'Daily loss limit $', v, `Stop the engine for the day after losing $${v}`)
        : d('hedge', 'dailyLossLimitUsd', 'Engine daily loss stop $', v, `Hedge engine stands down for the day after $${v} account loss`); } },
  { scope: 'scan', re: /(lock|stop)\b.*(day|trading)\b.*(profit|making|\$)|profit\b.*(reach|target)\b.*(day|lock)/i,
    build: (c) => { const v = firstDollar(c); return v != null ? d('scan', 'dailyProfitLockUsd', 'Daily profit lock $', v, `Lock the day and stop after banking $${v} profit`) : null; } },
  { scope: 'scan', re: /(pause|cooldown|wait)\b.*(after|following)\b.*loss|loss\b.*(pause|cooldown|wait)/i,
    build: (c) => { const v = firstMinutes(c); return v != null ? d('scan', 'lossCooldownMin', 'Cooldown after a loss (min)', v, `Pause ${v} minute(s) after a losing engine close`) : null; } },
  { scope: 'scan', re: /\bscalp/i,
    build: () => d('scan', 'allowedTfs', 'Allowed timeframes', ['M1', 'M5'], 'Scan scalping timeframes only (M1 + M5)') },
  { scope: 'scan', re: /\bintraday\b/i,
    build: () => d('scan', 'allowedTfs', 'Allowed timeframes', ['M15', 'H1'], 'Scan intraday timeframes only (M15 + H1)') },
  { scope: 'scan', re: /\bswing\b/i,
    build: () => d('scan', 'allowedTfs', 'Allowed timeframes', ['H4', 'D1'], 'Scan swing timeframes only (H4 + D1)') },
  { scope: 'both', re: /(no|not|never|avoid|do\s*n.t)\b.*(trade|trading|enter)\b.*news|news\b.*(stay\s+flat|stay\s+out|pause)/i,
    build: (_c, scope) => scope === 'scan'
      ? d('scan', 'newsFilter', 'News filter', true, 'Stand aside near red-flag news events')
      : d('hedge', 'newsBlackout', 'News blackout', true, 'Never open hedges near red-flag news events') },

  // ── Spread ──
  { scope: 'both', re: /spread\b.*(exceed|more\s+than|above|wider|over)/i,
    build: (c, scope) => { const v = firstCount(c); if (v == null) return null;
      return scope === 'hedge'
        ? d('hedge', 'maxSpreadPoints', 'Max spread (points)', v, `Refuse hedge legs when spread exceeds ${v} points`)
        : d('governor', 'note', 'Spread cap', v, `Noted for Scan: the scanner already scores spread per opportunity; the governor cannot set per-trade spread — tighten "Minimum opportunity score" to demand cheaper setups`); } },

  // ── Governor / portfolio ──
  { scope: 'both', re: /(combined|total)\b.*(automated\s+)?(exposure|lots|volume)\b.*(below|above|under|max|exceed)/i,
    build: (c) => { const v = firstLots(c) ?? firstCount(c); return v != null && v <= 50 ? d('governor', 'maxAutomatedLots', 'Max automated lots (all engines)', v, `Keep combined automated exposure below ${v} lot(s) — enforced by the account Risk Governor`) : null; } },
  { scope: 'both', re: /(account|of\s+the\s+account)\b.*(per\s+day|daily)|per\s+day\b.*(percent|%)/i,
    build: (c) => { const v = firstPercent(c); return v != null && v <= 20 ? d('governor', 'dailyLossLimitPct', 'Account daily loss %', v, `Governor blocks ALL new automated risk after ${v}% account loss in a day`) : null; } },
  { scope: 'both', re: /(drawdown|equity\s+falls?)\b.*(percent|%)\b.*(stop|pause|halt)|stop\b.*drawdown/i,
    build: (c) => { const v = firstPercent(c); return v != null && v <= 20 ? d('governor', 'dailyLossLimitPct', 'Account daily loss %', v, `Governor stands all engines down at ${v}% account drawdown for the day`) : null; } },
  { scope: 'both', re: /(maximum|max)\b.*lot\s+size|lot\s+size\b.*(maximum|of)/i,
    build: (c) => { const v = firstLots(c); return v != null ? d('governor', 'maxPerSymbolLots', 'Max lots per symbol', v, `Cap combined lots on any single symbol at ${v}`) : null; } },
];

// ── Question handling ───────────────────────────────────────────

const QUESTION_RE = /^(why|what|how|is|are|which|can|should|am|do(es)?\s|has|where|when)\b|\?\s*$/i;

/** Canned questions shown as clickable chips on the command bars. */
export const QUESTION_LIBRARY: Record<CommandScope, string[]> = {
  hedge: [
    'Why has Auto Hedge paused?',
    'What did the engine reject and why?',
    'What are my current hedge limits?',
    'How close am I to the daily loss limit?',
    'What is the basket profit target?',
    'What would make a hedge fail?',
    'Which baskets are active?',
    'What happens if I intervene manually?',
    'Is EMIL restricted to advice?',
  ],
  scan: [
    'Why has Auto Scan stopped trading?',
    'What did the engine reject and why?',
    'What are my current risk limits?',
    'How close am I to the daily loss limit?',
    'What lot size will the engine use?',
    'How many trades remain today?',
    'What happens if I intervene manually?',
    'Is EMIL restricted to advice?',
  ],
};

export function answerQuestion(scope: CommandScope, question = ''): string[] {
  const gov = loadGovernorLimits();
  const lines: string[] = [];
  const q = question.toLowerCase();
  const log = scope === 'hedge' ? loadHedgeAutoLog() : loadScanAutoLog();

  // Targeted intents first — then the standard status snapshot below.
  if (/why|reject|block|paus|stopp|halt/.test(q)) {
    const interesting = log.filter((l) => ['blocked', 'halt', 'manual', 'error'].includes(l.kind)).slice(-5).reverse();
    if (interesting.length) {
      lines.push('Most recent engine refusals / halts (every decision carries its reason):');
      for (const l of interesting) lines.push(`· ${new Date(l.ts).toLocaleTimeString()} [${l.kind.toUpperCase()}] ${l.text}`);
    } else {
      lines.push('No refusals, halts or manual interventions recorded yet — the full history lives in the engine log.');
    }
    lines.push('Also note: the engine only evaluates while this window is open, and it stands down when consent is missing, a daily limit is hit, or the Risk Governor blocks new exposure.');
  }
  if (/intervene|manual/.test(q)) {
    lines.push(scope === 'hedge'
      ? 'Manual intervention: touching a basket position switches Auto Hedge OFF for that basket — you manage it from there. "Reassess & Resume" recalculates at current prices before the engine takes it back. Nothing resumes silently.'
      : 'Manual intervention: engine positions carry their SL/TP from entry. If you modify or close one it becomes yours — the engine never fights or reverses a manual change.');
  }
  if (/emil/.test(q)) {
    lines.push('EMIL has been removed from this module entirely — it lives only in its own console and never had execution authority here. Hedge Trade and Scan Trade are fully independent of EMIL and of each other.');
  }
  if (scope === 'hedge' && /basket/.test(q)) {
    const active = loadBaskets().filter((b) => b.status !== 'closed');
    lines.push(active.length
      ? `Active baskets: ${active.map((b) => `${b.primarySymbol} (stage ${b.stage}, ${b.status}, target +$${b.targetUsd} / max -$${b.maxLossUsd})`).join(' · ')}`
      : 'No active hedge baskets right now.');
  }
  if (scope === 'scan' && /lot/.test(q)) {
    const p = loadScanAutoParams();
    lines.push(`Lot sizing: ${p.lotMode === 'fixed' ? `FIXED ${p.fixedLot} lots per trade` : `${p.riskPct}% of balance vs the stop`} — hard cap ${p.maxLotPerTrade} lots per trade, and the account Risk Governor caps combined exposure on top.`);
  }
  if (scope === 'hedge') {
    const p = loadHedgeAutoParams();
    lines.push(`Auto Hedge is ${isHedgeAutoConsented() ? 'consented' : 'NOT yet consented'} · preset ${p.preset}.`);
    lines.push(`Activation: loss ≥ $${p.activationLossUsd} for ${p.activationMinutes}min · min |correlation| ${p.minCorrelation} · spread ≤ ${p.maxSpreadPoints}pt · news blackout ${p.newsBlackout ? 'ON' : 'OFF'}.`);
    lines.push(`Basket: target +$${p.basketTargetUsd} (max hope $${p.basketMaxTargetUsd}) · forced close at -$${p.maxBasketLossUsd} or ${p.maxBasketHours}h · ≤${p.maxHedgeInstruments} instrument(s), ≤${p.maxLevels} stage(s), hedge lots ≤ ${p.maxLotMult}× primary.`);
    lines.push(`Engine stands down for the day at -$${p.dailyLossLimitUsd}. Decisions and refusals are in the Decision log.`);
  } else {
    const p = loadScanAutoParams();
    lines.push(`Auto Scan is ${isScanAutoConsented() ? 'consented' : 'NOT yet consented'} · mode ${p.mode}.`);
    lines.push(`Per trade: risk ${p.riskPct}% · score ≥ ${p.minScore} · RR ≥ 1:${p.minRR} · timeframes ${p.allowedTfs.join('/')}.`);
    lines.push(`Limits: ≤${p.maxPerDay}/day · ≤${p.maxOpenTrades} open · ≤${p.maxPerSymbol}/instrument · cooldown ${p.cooldownMin}min (+${p.lossCooldownMin}min after a loss) · stops after ${p.consecutiveLossStop} straight losses.`);
    lines.push(`Daily: loss stop -$${p.dailyLossLimitUsd}${p.dailyProfitLockUsd > 0 ? ` · profit lock +$${p.dailyProfitLockUsd}` : ''} · news filter ${p.newsFilter ? 'ON' : 'OFF'}. Reasons for every entry/refusal are in the Engine log.`);
  }
  lines.push(`Account Risk Governor (above ALL engines): ≤${gov.maxTotalLots} total lots · ≤${gov.maxAutomatedLots} automated lots · ≤${gov.maxPerSymbolLots}/symbol · ≤${gov.maxOpenPositions} positions · ${gov.dailyLossLimitPct}% daily loss cap.`);
  lines.push('EMIL has no execution authority in this module; Hedge Trade and Scan Trade stay fully independent.');
  return lines;
}

// ── Parse ───────────────────────────────────────────────────────

export function parseTradeCommand(text: string, scope: CommandScope): ParseResult {
  const isQuestion = QUESTION_RE.test(text.trim());
  const result: ParseResult = { directives: [], refused: [], conflicts: [], unknown: [], isQuestion };
  if (isQuestion) return result;

  // Clause split: sentence periods (NOT decimal points), semicolons/newlines,
  // plus commas followed by an imperative verb.
  const clauses = text.split(/(?<=[;\n])|(?<=\.)(?!\d)|,\s*(?=(?:do|use|stop|risk|never|close|wait|hedge|scan|trade|lock|pause|keep|take|avoid|show)\b)/i)
    .map((c) => c.trim()).filter((c) => c.length > 2);

  for (const clause of clauses) {
    const unsafe = UNSAFE.find((u) => u.re.test(clause));
    if (unsafe) { result.refused.push({ clause, reason: unsafe.reason }); continue; }

    let matched = false;
    for (const rule of RULES) {
      if (rule.scope !== 'both' && rule.scope !== scope) continue;
      if (!rule.re.test(clause)) continue;
      const dir = rule.build(clause, scope);
      if (dir) { result.directives.push(dir); matched = true; break; }
    }
    if (!matched) result.unknown.push(clause);
  }

  // Contradiction detection: same field set to different values in one message.
  const byField = new Map<string, Directive[]>();
  for (const dir of result.directives) {
    const key = `${dir.target}:${dir.field}`;
    byField.set(key, [...(byField.get(key) ?? []), dir]);
  }
  for (const [key, dirs] of byField) {
    const values = [...new Set(dirs.map((x) => JSON.stringify(x.value)))];
    if (values.length > 1) {
      result.conflicts.push({ field: dirs[0].label, values: dirs.map((x) => x.display) });
      result.directives = result.directives.filter((x) => `${x.target}:${x.field}` !== key);
    }
  }
  return result;
}

// ── Apply (only after the trader confirms) ──────────────────────

export function applyDirectives(directives: Directive[], scope: CommandScope): string[] {
  const applied: string[] = [];
  const hedge = { ...loadHedgeAutoParams() };
  const scan = { ...loadScanAutoParams() };
  const gov = { ...loadGovernorLimits() };
  let hedgeDirty = false, scanDirty = false, govDirty = false;

  for (const dir of directives) {
    if (dir.target === 'hedge') {
      if (dir.field === 'preset' && typeof dir.value === 'string' && dir.value in HEDGE_PRESETS) {
        Object.assign(hedge, HEDGE_PRESETS[dir.value as keyof typeof HEDGE_PRESETS], { preset: dir.value });
      } else if (dir.field in hedge) {
        (hedge as Record<string, unknown>)[dir.field] = dir.value;
        hedge.preset = 'custom';
      } else { continue; }
      hedgeDirty = true; applied.push(dir.display);
    } else if (dir.target === 'scan') {
      if (dir.field === 'mode' && typeof dir.value === 'string' && dir.value in SCAN_MODES) {
        Object.assign(scan, SCAN_MODES[dir.value as keyof typeof SCAN_MODES], { mode: dir.value });
      } else if (dir.field in scan) {
        (scan as Record<string, unknown>)[dir.field] = dir.value;
        scan.mode = 'custom';
      } else { continue; }
      scanDirty = true; applied.push(dir.display);
    } else if (dir.target === 'governor') {
      if (dir.field in gov) {
        (gov as Record<string, unknown>)[dir.field] = dir.value;
        govDirty = true; applied.push(dir.display);
      }
    } else if (dir.target === 'engine') {
      if (dir.field === 'hedgeOff') { setHedgeAutoOn(false); applied.push(dir.display); }
      if (dir.field === 'scanOff') { setScanAutoOn(false); applied.push(dir.display); }
      if (dir.field === 'hedgeOn') {
        if (isHedgeAutoConsented()) { setHedgeAutoOn(true); applied.push(dir.display); }
        else applied.push('Auto Hedge NOT enabled — typed consent is required first (use the Auto Hedge toggle)');
      }
      if (dir.field === 'scanOn') {
        if (isScanAutoConsented()) { setScanAutoOn(true); applied.push(dir.display); }
        else applied.push('Auto Scan NOT enabled — typed consent is required first (use the Auto Scan toggle)');
      }
    }
  }

  if (hedgeDirty) saveHedgeAutoParams(hedge);
  if (scanDirty) saveScanAutoParams(scan);
  if (govDirty) saveGovernorLimits(gov);

  const logLine = `NL COMMAND applied: ${applied.join(' · ')}`;
  if (scope === 'hedge') hedgeAutoLog('consent', logLine); else scanAutoLog('consent', logLine);
  return applied;
}
