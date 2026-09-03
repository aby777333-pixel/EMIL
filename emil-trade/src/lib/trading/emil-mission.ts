// ═══════════════════════════════════════════════════════════════
// EMIL Mission Control — plain-language missions → structured rules.
// Deterministic parser (no LLM guessing): recognised clauses become typed
// parameter changes shown for confirmation; anything ambiguous is FLAGGED
// for manual entry, never guessed. Applying a mission only ever writes
// into the same envelope the consent gate governs.
// ═══════════════════════════════════════════════════════════════

import type { EmilAutoParams } from '@/lib/trading/emil-council';

export interface MissionRule { label: string; detail: string }

export interface MissionParse {
  rules: MissionRule[];
  unknown: string[];
  patch: Partial<EmilAutoParams>;
  wakeMinConviction?: number;
  wakeSessions?: { lon?: boolean; nyc?: boolean };
}

export function parseMission(text: string, universe: string[]): MissionParse {
  const rules: MissionRule[] = [];
  const unknown: string[] = [];
  const patch: Partial<EmilAutoParams> = {};
  let wakeMinConviction: number | undefined;
  let wakeSessions: { lon?: boolean; nyc?: boolean } | undefined;

  // Split on sentence ends — but never inside a decimal like "0.5".
  const clauses = text.split(/(?:[;\n]+|\.(?!\d))+/).map((c) => c.trim()).filter(Boolean);
  for (const clause of clauses) {
    const c = clause.toLowerCase();
    let matched = false;

    // Instruments: "only trade gold and eurusd" / "trade only X, Y"
    const symbols = universe.filter((s) => c.includes(s.toLowerCase()));
    const aliasMap: Record<string, string> = { gold: 'XAUUSD', silver: 'XAGUSD', bitcoin: 'BTCUSD', oil: 'USOIL', nasdaq: 'NAS100', dow: 'US30' };
    for (const [alias, sym] of Object.entries(aliasMap)) {
      if (c.includes(alias) && universe.includes(sym) && !symbols.includes(sym)) symbols.push(sym);
    }
    if (symbols.length && /only|just|restrict/.test(c)) {
      patch.selectAll = false;
      patch.symbols = symbols;
      rules.push({ label: 'Instrument whitelist', detail: symbols.join(', ') });
      matched = true;
    }

    // Risk per trade: "0.25 percent risk" / "risk no more than 1%"
    const riskM = c.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:risk|per trade)|risk[^.\d]*(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    if (riskM) {
      const v = parseFloat(riskM[1] ?? riskM[2]);
      if (v > 0 && v <= 3) { patch.riskPct = v; rules.push({ label: 'Risk per trade', detail: `${v}% of balance` }); matched = true; }
    }

    // Stop after N losses
    const lossM = c.match(/stop (?:trading )?after (\d+|one|two|three)\s*(?:consecutive )?loss/);
    if (lossM) {
      const map: Record<string, number> = { one: 1, two: 2, three: 3 };
      const n = map[lossM[1]] ?? parseInt(lossM[1], 10);
      if (n >= 1 && n <= 10) { patch.stopAfterLosses = n; rules.push({ label: 'Stop after losses', detail: `${n} consecutive losses → pilot pauses` }); matched = true; }
    }

    // Daily profit target: "$300 target" / "target of 500" / "lock the day at 300"
    if (/target|stop.*achiev|lock/.test(c) && !/loss/.test(c)) {
      const targetM = c.match(/\$\s?(\d{2,6})/) ?? c.match(/(\d{2,6})(?!\s*(?:%|percent|loss))/);
      if (targetM) {
        const v = parseInt(targetM[1], 10);
        if (v >= 10) { patch.dailyProfitLock = v; rules.push({ label: 'Daily profit lock', detail: `bank the day at +$${v} and pause` }); matched = true; }
      }
    }

    // Daily loss stop: "max daily loss 300"
    const dlossM = c.match(/(?:daily|max(?:imum)?) loss[^0-9$]*\$?\s?(\d{2,6})/);
    if (dlossM) {
      const v = parseInt(dlossM[1], 10);
      if (v >= 10) { patch.dailyLossStop = v; rules.push({ label: 'Daily loss stop', detail: `pause the day at −$${v}` }); matched = true; }
    }

    // Scalping timeframes: "scalp using m1 and m5"
    if (/scalp/.test(c) || /\bm1\b/.test(c) || /\bm5\b/.test(c)) {
      const modes: string[] = [];
      if (/\bm1\b|scalp/.test(c)) modes.push('Scalping');
      if (/\bm5\b/.test(c)) modes.push('Fast Intraday');
      if (modes.length) {
        patch.modeControl = 'shared';
        patch.enabledModes = modes;
        rules.push({ label: 'Trade modes', detail: modes.join(' + ') + ' only' });
        matched = true;
      }
    }

    // Regional expressions (§9): common trader phrases map to precise rules.
    if (/wake me (?:up )?for london|wake.*london (?:open|session)/.test(c)) {
      wakeSessions = { ...wakeSessions, lon: true };
      rules.push({ label: 'Wake for London', detail: 'session-open wake alert armed for London' });
      matched = true;
    }
    if (/wake me (?:up )?for new york|wake.*new york (?:open|session)/.test(c)) {
      wakeSessions = { ...wakeSessions, nyc: true };
      rules.push({ label: 'Wake for New York', detail: 'session-open wake alert armed for New York' });
      matched = true;
    }
    if (/take (?:a |only )?small trades?|small trades? only/.test(c)) {
      patch.smallSteady = true;
      rules.push({ label: 'Small trades', detail: 'Small & Steady ON — base lot only, quality bar +10' });
      matched = true;
    }
    if (/do (?:not|n't) chase|no chasing/.test(c)) {
      rules.push({ label: 'No chasing', detail: 'already enforced: stretched entries are skipped by the missed-entry discipline' });
      matched = true;
    }
    if (/(?:book|cut|close|move).*(?:profit|trade|half|cost)/.test(c) && !matched) {
      unknown.push(`"${clause}" — live-position actions (book profit / close half / move to cost) act through the positions panel or pilot management, not the mission envelope; EMIL will not guess which position you mean`);
      matched = true;
    }

    // Capital protection: "protect my capital above everything" / "do not touch my capital"
    if (/protect (?:my )?capital|do (?:not|n't) touch my capital/.test(c)) {
      patch.smallSteady = true;
      rules.push({ label: 'Capital first', detail: 'Small & Steady ON (base lot only, quality bar +10). Tip: also set Profit-Only with your protected-capital line in the gate.' });
      matched = true;
    }

    // Trade from profits only
    if (/(?:trade )?(?:only )?from (?:realised |realized )?profits?/.test(c)) {
      patch.profitOnly = true;
      rules.push({ label: 'Profit-funded trading', detail: 'Profit-Only ON — set/confirm the protected-capital line in the gate' });
      matched = true;
    }

    // News avoidance (always enforced; acknowledge)
    if (/avoid.*news|no news|not.*during news/.test(c)) {
      rules.push({ label: 'News avoidance', detail: 'already enforced: no entries within 30 min of red-flag events + uncertainty gate' });
      matched = true;
    }

    // Wake bar: "wake me only above 90 conviction"
    const convM = c.match(/(?:conviction|confidence)[^0-9]*(\d{2})/);
    if (convM && /wake|alert/.test(c)) {
      wakeMinConviction = Math.max(50, Math.min(100, parseInt(convM[1], 10)));
      rules.push({ label: 'Wake filter', detail: `wake only above ${wakeMinConviction} conviction` });
      matched = true;
    }

    // Sessions (honest: session-scoped trading windows are a coming control)
    if (/london|new york|session/.test(c) && !matched) {
      unknown.push(`"${clause}" — session-scoped trading windows aren't wired to the pilot yet; use Wake alerts for session opens meanwhile`);
      matched = true;
    }

    if (!matched) unknown.push(`"${clause}" — not understood; set it manually rather than letting EMIL guess`);
  }

  return { rules, unknown, patch, wakeMinConviction, wakeSessions };
}

// ── EMIL question handling ────────────────────────────────────────────
// Parity with the Hedge/Scan command bars: clickable questions EMIL answers
// from its REAL state (armed status, limits, Governor, recent decisions).
// Nothing here executes — it's read-only status, so it's always safe to ask.

/** Heuristic: is this input a question rather than a mission instruction? */
export function isEmilQuestion(text: string): boolean {
  return /^(why|what|how|is|are|which|can|should|does|do|where|when|will|am)\b|\?\s*$/i.test(text.trim());
}

/** Canned questions shown as clickable chips under EMIL's mission bar. */
export const EMIL_QUESTIONS: string[] = [
  'Is EMIL trading right now?',
  'Is EMIL allowed to execute or only advise?',
  'What are my current EMIL limits?',
  'Why did EMIL not take a trade?',
  'What mode is EMIL in?',
  'Which instruments can EMIL trade?',
  'What will EMIL do without my answer?',
];

export interface EmilQAContext {
  armed: boolean;
  mode: string | null;
  params: EmilAutoParams;
  gov: { maxTotalLots: number; maxAutomatedLots: number; maxPerSymbolLots: number; maxOpenPositions: number; dailyLossLimitPct: number };
  log: { ts: number; kind: string; text: string }[];
}

/** Answer a question from EMIL's live state — never invents, never executes. */
export function answerEmilQuestion(question: string, ctx: EmilQAContext): string[] {
  const q = question.toLowerCase();
  const p = ctx.params;
  const lines: string[] = [];

  if (/advise|execute|allowed|permission|restrict/.test(q)) {
    lines.push(ctx.armed
      ? 'EMIL is ARMED — it may execute within your approved limits. The Account Risk Governor and Shield rules still outrank every action.'
      : 'EMIL is NOT armed — it only advises. Nothing executes until you arm the pilot and pass the consent gate.');
    return lines;
  }

  if (/why|reject|block|paus|stop|halt|not (?:take|trade|enter|open)|no trade/.test(q)) {
    const interesting = ctx.log.filter((l) => ['blocked', 'halt', 'manual', 'error', 'mode'].includes(l.kind)).slice(-5).reverse();
    if (interesting.length) {
      lines.push('EMIL’s most recent decisions / refusals (each carries its reason):');
      for (const l of interesting) lines.push(`· ${new Date(l.ts).toLocaleTimeString()} [${l.kind.toUpperCase()}] ${l.text}`);
    } else {
      lines.push('No refusals or halts logged recently. EMIL only enters when a qualified setup clears the council, the Governor and Shield — otherwise it waits.');
    }
    return lines;
  }

  if (/instrument|symbol|which.*trade|pairs?/.test(q)) {
    lines.push(p.selectAll ? 'EMIL may consider every instrument in your watch universe.' : `EMIL is restricted to: ${(p.symbols ?? []).join(', ') || 'none set — pick instruments or enable Select-All'}.`);
    return lines;
  }

  if (/without my answer|no answer|unanswered|fall ?back/.test(q)) {
    lines.push('If you don’t answer a wake alert, EMIL never invents permission — it falls back to your already-approved rules only, and otherwise holds.');
    return lines;
  }

  if (/\bmode\b/.test(q)) {
    lines.push(`Mode control: ${p.modeControl}${p.enabledModes?.length ? ` (allowed: ${p.enabledModes.join(', ')})` : ''}. Active now: ${ctx.mode ?? 'none / monitoring'}.`);
    return lines;
  }

  // Default: a full status snapshot.
  lines.push(ctx.armed ? '● EMIL is ARMED — executing within your approved limits.' : '○ EMIL is monitoring only (not armed) — advice, no execution.');
  lines.push(`Risk per trade ${p.riskPct}% · base lot ${p.baseLot} · stop after ${p.stopAfterLosses} losses · max ${p.maxPerDay}/day · daily profit lock $${p.dailyProfitLock || '—'} · daily loss stop $${p.dailyLossStop}.`);
  lines.push(`Account Risk Governor (above every engine): max total ${ctx.gov.maxTotalLots} lots · max automated ${ctx.gov.maxAutomatedLots} · max/symbol ${ctx.gov.maxPerSymbolLots} · max ${ctx.gov.maxOpenPositions} positions · daily loss ${ctx.gov.dailyLossLimitPct}%.`);
  lines.push(p.selectAll ? 'Instruments: EMIL’s pick from your whole universe.' : `Instruments: ${(p.symbols ?? []).join(', ') || 'none set'}.`);
  return lines;
}
