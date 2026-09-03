// ═══════════════════════════════════════════════════════════════
// Custom EA upload → platform conversion
//
// A user uploads a MetaTrader expert (.mq5 source or .ex5 compiled).
// We can't run compiled MQL5 in a browser, so "conversion to platform
// compatibility" means: read the source, detect which indicators /
// signal patterns it uses, and map it onto one of the platform's
// runnable strategy engines (the same engines that power the built-in
// EA library). The converted EA is persisted and appears in the
// EAs/Robots dropdown to be attached and traded like any other.
// ═══════════════════════════════════════════════════════════════

import type { StrategyKind } from './ea-engine';

// One extracted MQL5 `input` declaration (super-prompt §7 parameter extraction).
export interface ExtractedInput {
  name: string;
  label: string;        // trailing comment when present, else the name
  mqlType: string;      // int / double / bool / string / ENUM_* / color / datetime …
  defaultValue: string; // as written in source
  /** `input group "…"` the declaration belongs to (order-preserving). */
  group?: string;
  /** Allowed members for enum-typed inputs (custom enums parsed from source,
   *  plus built-in ENUM_TIMEFRAMES). */
  enumValues?: string[];
}

// Per-event / per-feature conversion outcome (§2/§4): never silently omitted.
export interface ConversionItem {
  item: string;
  status: 'converted' | 'approximated' | 'unsupported' | 'manual-review';
  note: string;
}

export interface ConversionReport {
  fileKind: 'ea-source' | 'indicator-source' | 'compiled';
  sourceAvailable: boolean;
  detectedEngine: StrategyKind;
  engineScore: number;      // detector confidence score (0 = filename-only default)
  events: ConversionItem[];
  features: ConversionItem[];
  securityFlags: string[];  // DLL imports / WebRequest / file I/O found in source
  overall: 'converted' | 'partial' | 'compiled-only' | 'manual-review';
  convertedAt: number;
}

export interface CustomEA {
  id: string;
  name: string;
  description: string;
  pairs: string[];
  timeframes: string[];
  type: 'scalper' | 'trend' | 'reversal' | 'hybrid' | 'grid' | 'hedge' | 'martingale';
  rating: number;
  status: string;
  custom: true;
  strategyKind: StrategyKind;
  sourceKind: 'mq5' | 'ex5' | 'pine';
  // Library registration metadata (§16/§31) — absent on EAs uploaded before this
  // version; all consumers must treat these as optional.
  inputs?: ExtractedInput[];
  report?: ConversionReport;
  source?: string;          // .mq5/.pine source (capped); never present for .ex5
  checksum?: string;
  uploadedAt?: number;
  version?: string;
  author?: string;
  /** Pine indicators only: supported plot() expressions transpiled to a
   *  runnable Raptor Script (plots on the RAPTOR chart via the script engine). */
  raptorScript?: string;
}

const STORAGE_KEY = 'raptor-custom-eas';
const CHANGED_EVENT = 'raptor-custom-eas-changed';

// ─── Detection: map MQL5 source features → a platform strategy ─────

interface Detector {
  kind: StrategyKind;
  type: CustomEA['type'];
  test: (src: string) => number; // score; highest wins
}

function count(src: string, re: RegExp): number {
  return (src.match(re) ?? []).length;
}

const DETECTORS: Detector[] = [
  {
    kind: 'boll_macd', type: 'reversal',
    test: (s) => (count(s, /iBands|Bollinger|ta\.bb/gi) > 0 && count(s, /iMACD|MACD/gi) > 0 ? 6 : 0),
  },
  {
    kind: 'sar_flip', type: 'scalper',
    test: (s) => count(s, /iSAR|ParabolicSAR|Parabolic\s*SAR|ta\.sar/gi) > 0 ? 5 : 0,
  },
  {
    kind: 'ichimoku', type: 'trend',
    test: (s) => count(s, /iIchimoku|Ichimoku|Tenkan|Kijun|SenkouSpan|SuperIchi/gi) > 0 ? 5 : 0,
  },
  {
    kind: 'rsi_macd', type: 'hybrid',
    test: (s) => (count(s, /iRSI|RSI/gi) > 0 && count(s, /iMACD|MACD/gi) > 0 ? 5 : 0),
  },
  {
    kind: 'rsi_adaptive', type: 'hybrid',
    test: (s) => (count(s, /iRSI|RSI/gi) > 0 && count(s, /iStochastic|Stochastic/gi) > 0 ? 5 : 0),
  },
  {
    kind: 'kalman', type: 'trend',
    test: (s) => count(s, /Kalman/gi) > 0 ? 5 : 0,
  },
  {
    kind: 'linreg', type: 'trend',
    test: (s) => count(s, /LinReg|Linear\s*Regression|Regression\s*Candle/gi) > 0 ? 4 : 0,
  },
  {
    kind: 'ssl', type: 'trend',
    test: (s) => count(s, /SSL|NNFX|Baseline/gi) > 0 ? 3 : 0,
  },
  {
    kind: 'ema_pullback', type: 'trend',
    // EMA-based with a pullback / cross feel
    test: (s) => (count(s, /iMA|EMA|MovingAverage/gi) >= 2 ? 3 : 0),
  },
  {
    kind: 'pattern', type: 'hybrid',
    test: (s) => count(s, /Pattern|Engulf|Fractal|HeadAndShoulders|Fibonacci/gi) > 0 ? 3 : 0,
  },
  {
    kind: 'trend_reversal', type: 'reversal',
    test: (s) => count(s, /Reversal|Trend/gi) > 0 ? 2 : 0,
  },
];

// ─── Pine Script support ───────────────────────────────────────────
// Pine strategies convert like MQL5 EAs (mapped onto a platform engine);
// Pine indicators additionally get their supported plot() expressions
// transpiled into a runnable Raptor Script.

export function isPineSource(filename: string, content: string): boolean {
  if (/\.(pine|pinescript)$/i.test(filename)) return true;
  return /\/\/@version=\d/.test(content) && /\b(indicator|strategy|study)\s*\(/.test(content);
}

const PINE_INPUT_RE = /(\w+)\s*=\s*input(?:\.(int|float|bool|string|timeframe|symbol|color|price|session|source|time))?\s*\(\s*([^,)\n]+)\s*(?:,\s*(?:title\s*=\s*)?["']([^"'\n]+)["'])?/g;

export function extractPineInputs(src: string): ExtractedInput[] {
  const out: ExtractedInput[] = [];
  let m: RegExpExecArray | null;
  PINE_INPUT_RE.lastIndex = 0;
  while ((m = PINE_INPUT_RE.exec(src)) !== null && out.length < 200) {
    // group="…" named arg later in the same input(...) call, if present
    const lineEnd = src.indexOf('\n', m.index);
    const rest = src.slice(m.index, lineEnd < 0 ? src.length : lineEnd);
    const g = rest.match(/group\s*=\s*["']([^"']+)["']/);
    const optionsMatch = rest.match(/options\s*=\s*\[([^\]]+)\]/);
    out.push({
      name: m[1],
      mqlType: m[2] ? `input.${m[2]}` : 'input',
      defaultValue: m[3].trim().replace(/^["']|["']$/g, ''),
      label: (m[4] || m[1].replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')).trim(),
      group: g?.[1],
      enumValues: m[2] === 'bool'
        ? undefined
        : optionsMatch?.[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean),
    });
  }
  return out;
}

/** First string argument of indicator("…")/strategy("…") as the display name. */
function extractPineName(src: string, filename: string): string {
  const m = src.match(/\b(?:indicator|strategy|study)\s*\(\s*["']([^"'\n]+)["']/);
  if (m && m[1].length <= 60) return m[1].trim();
  return filename.replace(/\.(pine|pinescript|txt)$/i, '').replace(/[_]+/g, ' ').trim() || 'Pine Script';
}

// Transpile supported Pine plot() expressions → Raptor Script lines. Honest
// subset: bare series (close/open/high/low) and single ta.* calls the script
// engine has helpers for. Everything else is kept as a SKIPPED comment so
// nothing is silently dropped.
const PINE_PLOT_COLORS = ['#0091D5', '#F5A623', '#7ED321', '#BD10E0', '#50E3C2', '#FF5252'];

function transpilePineExpr(expr: string): string | null {
  const e = expr.trim();
  if (/^(close|open|high|low)$/.test(e)) return e;
  let m = e.match(/^ta\.(sma|ema|rsi)\s*\(\s*(close|open|high|low)\s*,\s*(\d+)\s*\)$/);
  if (m) return `${m[1]}(${m[2]}, ${m[3]})`;
  m = e.match(/^ta\.atr\s*\(\s*(\d+)\s*\)$/);
  if (m) return `atr(high, low, close, ${m[1]})`;
  m = e.match(/^ta\.(highest|lowest)\s*\(\s*(close|open|high|low)\s*,\s*(\d+)\s*\)$/);
  if (m) return `${m[1]}(${m[2]}, ${m[3]})`;
  m = e.match(/^ta\.mom\s*\(\s*(close|open|high|low)\s*,\s*(\d+)\s*\)$/);
  if (m) return `momentum(${m[1]}, ${m[2]})`;
  return null;
}

export function transpilePineToRaptorScript(src: string, name: string): { script: string; converted: number; skipped: number } {
  const lines: string[] = [`// Converted from Pine Script: ${name}`];
  let converted = 0, skipped = 0;
  const plotRe = /^\s*plot\s*\(([^\n]*)\)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = plotRe.exec(src)) !== null && converted + skipped < 24) {
    // first top-level argument (up to the first comma not inside parens)
    const args = m[1];
    let depth = 0, cut = args.length;
    for (let i = 0; i < args.length; i++) {
      const c = args[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) { cut = i; break; }
    }
    const expr = args.slice(0, cut).trim();
    const title = (args.match(/title\s*=\s*["']([^"']+)["']/) || [])[1];
    const js = transpilePineExpr(expr);
    if (js) {
      lines.push(`plot(${js}, { color: '${PINE_PLOT_COLORS[converted % PINE_PLOT_COLORS.length]}' });${title ? ` // ${title}` : ''}`);
      converted++;
    } else {
      lines.push(`// SKIPPED (unsupported expression): plot(${expr})`);
      skipped++;
    }
  }
  return { script: lines.join('\n'), converted, skipped };
}

// ─── §7 Parameter extraction: parse MQL5 `input` declarations ──────

const INPUT_LINE_RE = /^\s*(?:input|sinput|extern)\s+([A-Za-z_][\w<>:]*)\s+([A-Za-z_]\w*)\s*=\s*([^;]+);\s*(?:\/\/\s*(.*))?$/;
const GROUP_LINE_RE = /^\s*input\s+group\s+"([^"]*)"/;
const ENUM_DECL_RE = /enum\s+([A-Za-z_]\w*)\s*\{([^}]*)\}/g;

/** Built-in MQL enums the UI can offer as dropdowns. */
export const BUILTIN_ENUMS: Record<string, string[]> = {
  ENUM_TIMEFRAMES: ['PERIOD_M1', 'PERIOD_M5', 'PERIOD_M15', 'PERIOD_M30', 'PERIOD_H1', 'PERIOD_H4', 'PERIOD_D1', 'PERIOD_W1', 'PERIOD_MN1'],
  ENUM_APPLIED_PRICE: ['PRICE_CLOSE', 'PRICE_OPEN', 'PRICE_HIGH', 'PRICE_LOW', 'PRICE_MEDIAN', 'PRICE_TYPICAL', 'PRICE_WEIGHTED'],
  ENUM_MA_METHOD: ['MODE_SMA', 'MODE_EMA', 'MODE_SMMA', 'MODE_LWMA'],
  ENUM_ORDER_TYPE_FILLING: ['ORDER_FILLING_FOK', 'ORDER_FILLING_IOC', 'ORDER_FILLING_RETURN'],
};

/** Custom `enum Name { A, B = 2, C };` declarations → member-name lists. */
export function extractEnumDecls(src: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let m: RegExpExecArray | null;
  ENUM_DECL_RE.lastIndex = 0;
  while ((m = ENUM_DECL_RE.exec(src)) !== null) {
    const members = m[2]
      .split(',')
      .map((p) => p.split('=')[0].split('//')[0].trim())
      .filter((p) => /^[A-Za-z_]\w*$/.test(p));
    if (members.length > 0) out[m[1]] = members;
  }
  return out;
}

export function extractInputs(src: string): ExtractedInput[] {
  const out: ExtractedInput[] = [];
  const enums = extractEnumDecls(src);
  let group: string | undefined;
  for (const line of src.split('\n')) {
    if (out.length >= 200) break;
    const g = line.match(GROUP_LINE_RE);
    if (g) { group = g[1].replace(/^[=\s]+|[=\s]+$/g, '') || g[1]; continue; }
    const m = line.match(INPUT_LINE_RE);
    if (!m) continue;
    const mqlType = m[1];
    out.push({
      mqlType,
      name: m[2],
      defaultValue: m[3].trim(),
      label: (m[4] || m[2].replace(/^Inp/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')).trim(),
      group,
      enumValues: enums[mqlType] ?? BUILTIN_ENUMS[mqlType],
    });
  }
  return out;
}

// ─── §5/§25 blank-safe validation + §23 MT5 .set files ─────────────

const INT_TYPES = new Set(['int', 'uint', 'long', 'ulong', 'short', 'ushort', 'char', 'uchar', 'input.int']);
const FLOAT_TYPES = new Set(['double', 'float', 'input.float', 'input.price']);
const BOOL_TYPES = new Set(['bool', 'input.bool']);

/** Validate a trader-entered override. Empty string = "use EA default" and is
 *  always valid (§5). Returns a clear message, or null when valid. */
export function validateInputValue(inp: ExtractedInput, value: string): string | null {
  const v = value.trim();
  if (v === '') return null; // blank optional → EA default applies
  if (INT_TYPES.has(inp.mqlType)) {
    if (!/^-?\d+$/.test(v)) return `${inp.name} must be a whole number (${inp.mqlType}).`;
    if (inp.mqlType.startsWith('u') && v.startsWith('-')) return `${inp.name} cannot be negative (${inp.mqlType}).`;
    return null;
  }
  if (FLOAT_TYPES.has(inp.mqlType)) {
    return /^-?\d+(\.\d+)?$/.test(v) ? null : `${inp.name} must be a number (${inp.mqlType}).`;
  }
  if (BOOL_TYPES.has(inp.mqlType)) {
    return /^(true|false)$/i.test(v) ? null : `${inp.name} must be true or false.`;
  }
  if (inp.enumValues) {
    return inp.enumValues.includes(v) ? null : `${inp.name} must be one of: ${inp.enumValues.join(', ')}.`;
  }
  return null; // string/color/datetime/etc. accept free text
}

/** Effective value: trader override when set, else the EA's declared default. */
export function effectiveInputValue(inp: ExtractedInput, overrides: Record<string, string>): string {
  const o = overrides[inp.name];
  return o !== undefined && o !== '' ? o : inp.defaultValue.replace(/^"|"$/g, '');
}

const OVERRIDES_KEY = 'raptor_ea_input_overrides';

export function loadInputOverrides(eaId: string): Record<string, string> {
  try {
    const all = JSON.parse(window.localStorage.getItem(OVERRIDES_KEY) || '{}');
    return all[eaId] ?? {};
  } catch { return {}; }
}

export function saveInputOverrides(eaId: string, overrides: Record<string, string>): void {
  try {
    const all = JSON.parse(window.localStorage.getItem(OVERRIDES_KEY) || '{}');
    all[eaId] = overrides;
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch { /* ignore quota */ }
}

/** Export the effective parameter set as an MT5-style .set file. */
export function exportSetFile(ea: CustomEA, overrides: Record<string, string>): string {
  const lines = [`; ${ea.name} — exported from RAPTOR ${new Date().toISOString()}`, ';'];
  for (const inp of ea.inputs ?? []) {
    lines.push(`${inp.name}=${effectiveInputValue(inp, overrides)}`);
  }
  return lines.join('\r\n');
}

/** Parse an MT5 .set file into name→value pairs (comments/sections ignored). */
export function parseSetFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('[')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    // MT5 optimisation suffixes (Name,F=1||start||step||stop||Y) — keep the base value
    out[line.slice(0, eq).trim().replace(/,F$/, '')] = line.slice(eq + 1).split('||')[0].trim();
  }
  return out;
}

// ─── §2/§4 Conversion report — honest per-event / per-feature status ─

function has(src: string, re: RegExp): boolean { return re.test(src); }

export function buildConversionReport(
  filename: string, src: string, engine: StrategyKind, engineScore: number,
): ConversionReport {
  const compiled = !src;
  const pine = !compiled && isPineSource(filename, src);
  const isIndicator = !compiled && (pine
    ? (has(src, /\b(indicator|study)\s*\(/) && !has(src, /\bstrategy\s*\(/))
    : (has(src, /#property\s+indicator_/i) || (has(src, /\bOnCalculate\s*\(/) && !has(src, /\bOnTick\s*\(/))));

  if (compiled) {
    return {
      fileKind: 'compiled', sourceAvailable: false,
      detectedEngine: engine, engineScore: 0,
      events: [{ item: 'All events', status: 'unsupported', note: 'Compiled binary — no readable source. Runs via the platform strategy engine chosen from the filename; original logic is NOT executed.' }],
      features: [],
      securityFlags: [],
      overall: 'compiled-only',
      convertedAt: Date.now(),
    };
  }

  const events: ConversionItem[] = [];
  const ev = (re: RegExp, item: string, status: ConversionItem['status'], note: string) => {
    if (has(src, re)) events.push({ item, status, note });
  };

  if (pine) {
    // ── Pine Script branch ──
    ev(/\bstrategy\s*\(/, 'strategy() declaration', 'converted', 'Mapped to the platform EA lifecycle (attach/detach + bar-close evaluation).');
    ev(/\b(indicator|study)\s*\(/, 'indicator() declaration', 'converted', 'Registered as an indicator; supported plots transpiled to a Raptor Script (see Script).');
    ev(/\bstrategy\.(entry|order|close|exit)\s*\(/, 'strategy.entry/exit/close', 'converted', 'Mapped to the platform order service via the strategy engine.');
    ev(/\bplot(candle|char|shape|arrow)?\s*\(/, 'plot() series', 'approximated', 'Supported expressions (close/open/high/low, ta.sma/ema/rsi/atr/highest/lowest/mom) transpile to Raptor Script; the rest are kept as SKIPPED comments.');
    ev(/request\.security\s*\(/, 'request.security (multi-timeframe)', 'unsupported', 'Cross-timeframe series requests are not executed in the web runtime.');
    ev(/\balert(condition)?\s*\(/, 'alert / alertcondition', 'approximated', 'Recreate alerts with the platform Alerts menu (price-level engine).');
    ev(/\b(varip|barstate\.)/, 'varip / barstate', 'approximated', 'Bar-state semantics follow the platform bar-close model.');
    ev(/\b(array|matrix|map)\.\w+\s*\(/, 'array/matrix/map API', 'manual-review', 'Pine collection APIs are not auto-translated.');
    ev(/\bstrategy\.risk\./, 'strategy.risk rules', 'manual-review', 'Configure equivalents in EA Properties (Risk tab).');

    const features: ConversionItem[] = [];
    const ft = (re: RegExp, item: string, status: ConversionItem['status'], note: string) => {
      if (has(src, re)) features.push({ item, status, note });
    };
    ft(/ta\.(sma|ema|rsi|macd|atr|bb|stoch|sar|highest|lowest|mom)/, 'ta.* indicator calls', 'converted', 'Mapped to platform indicator calculations.');
    ft(/StopLoss|stop\s*=|loss\s*=/i, 'Stop-loss logic', 'approximated', 'Replaced by ATR-scaled SL from EA Properties (editable).');
    ft(/TakeProfit|limit\s*=|profit\s*=/i, 'Take-profit logic', 'approximated', 'Replaced by ATR-scaled TP from EA Properties (editable).');
    ft(/trail/i, 'Trailing stop', 'unsupported', 'Server-side trailing is not implemented in the web runtime.');

    const securityFlags: string[] = [];
    if (has(src, /request\.security/)) securityFlags.push('request.security() call found (not executed).');

    const hasUnsupported = [...events, ...features].some((i) => i.status === 'unsupported');
    const hasReview = [...events, ...features].some((i) => i.status === 'manual-review');
    return {
      fileKind: isIndicator ? 'indicator-source' : 'ea-source',
      sourceAvailable: true,
      detectedEngine: engine, engineScore,
      events, features, securityFlags,
      overall: hasUnsupported || hasReview ? 'partial' : 'converted',
      convertedAt: Date.now(),
    };
  }

  ev(/\bOnInit\s*\(/, 'OnInit', 'converted', 'Mapped to the runtime attach/initialisation lifecycle.');
  ev(/\bOnDeinit\s*\(/, 'OnDeinit', 'converted', 'Mapped to the runtime detach lifecycle.');
  ev(/\bOnTick\s*\(/, 'OnTick', 'approximated', 'Runs on platform ticks, evaluated on bar close (bar-level model, not every raw tick).');
  ev(/\bOnTimer\s*\(/, 'OnTimer', 'unsupported', 'No timer events in the web runtime — timer-driven logic will not fire. Manual review advised.');
  ev(/\bOnTrade\s*\(/, 'OnTrade', 'approximated', 'Order lifecycle handled by the platform order service; custom OnTrade code is not executed.');
  ev(/\bOnTradeTransaction\s*\(/, 'OnTradeTransaction', 'unsupported', 'Transaction-level callbacks are not available in the web runtime.');
  ev(/\bOnChartEvent\s*\(/, 'OnChartEvent', 'unsupported', 'Chart-object events are not bridged to the strategy engine.');
  ev(/\bOnCalculate\s*\(/, 'OnCalculate', isIndicator ? 'manual-review' : 'approximated', isIndicator ? 'Indicator buffer logic — map plots via the Raptor Script editor or the indicator catalog.' : 'Indicator-style calculation inside an EA — approximated by the mapped engine.');

  const features: ConversionItem[] = [];
  const ft = (re: RegExp, item: string, status: ConversionItem['status'], note: string) => {
    if (has(src, re)) features.push({ item, status, note });
  };
  ft(/\bOrderSend|\btrade\.(Buy|Sell)|CTrade/i, 'Order execution', 'converted', 'Mapped to the platform order service (place_market_order / pending orders).');
  ft(/StopLoss|\bSL\b|sl\s*=/i, 'Stop-loss logic', 'approximated', 'Replaced by ATR-scaled SL from EA Properties (editable).');
  ft(/TakeProfit|\bTP\b|tp\s*=/i, 'Take-profit logic', 'approximated', 'Replaced by ATR-scaled TP from EA Properties (editable).');
  ft(/Trailing/i, 'Trailing stop', 'unsupported', 'Server-side trailing is not implemented in the web runtime.');
  ft(/\bMagic|magic_number|MagicNumber/i, 'Magic number', 'converted', 'A per-instance magic number is derived from the attach key.');
  ft(/iCustom\s*\(/, 'iCustom calls', 'manual-review', 'External custom indicators are not bundled — the mapped engine approximates the signal.');
  ft(/#import/, 'DLL imports', 'unsupported', 'DLLs cannot run in the browser and are never executed.');
  ft(/WebRequest/i, 'WebRequest', 'unsupported', 'Outbound network calls from strategies are blocked.');
  ft(/File(Open|Write|Read)/i, 'File operations', 'unsupported', 'Strategy file I/O is not available in the web runtime.');
  ft(/PositionClosePartial|partial/i, 'Partial close', 'approximated', 'Batch close controls exist in QuickTrade; per-EA partial logic is not executed.');
  ft(/Hedg/i, 'Hedging logic', 'manual-review', 'Account netting/hedging semantics depend on the trading account.');

  const securityFlags: string[] = [];
  if (has(src, /#import/)) securityFlags.push('DLL import directive found (never executed).');
  if (has(src, /WebRequest/i)) securityFlags.push('WebRequest network call found (blocked).');
  if (has(src, /File(Open|Write|Read)/i)) securityFlags.push('File I/O found (not available).');

  const hasUnsupported = [...events, ...features].some((i) => i.status === 'unsupported');
  const hasReview = isIndicator || [...events, ...features].some((i) => i.status === 'manual-review');
  const overall: ConversionReport['overall'] = isIndicator
    ? 'manual-review'
    : hasUnsupported || hasReview ? 'partial' : 'converted';

  return {
    fileKind: isIndicator ? 'indicator-source' : 'ea-source',
    sourceAvailable: true,
    detectedEngine: engine, engineScore,
    events, features, securityFlags, overall,
    convertedAt: Date.now(),
  };
}

// ─── §31 checksum (djb2) for duplicate detection ───────────────────

export function checksumOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

const MAX_STORED_SOURCE = 200_000; // chars — keep localStorage well under quota

/** Extract a display name from the source, else fall back to the filename. */
function extractName(src: string, filename: string): string {
  const prop = src.match(/#property\s+description\s+"([^"]+)"/i);
  if (prop && prop[1].length <= 48) return prop[1].split(/[.\-–—|]/)[0].trim();
  const base = filename.replace(/\.(mq5|ex5)$/i, '').replace(/[_]+/g, ' ').trim();
  return base || 'Custom EA';
}

function extractDescription(src: string): string | null {
  const prop = src.match(/#property\s+description\s+"([^"]+)"/i);
  return prop ? prop[1] : null;
}

/**
 * Convert an uploaded EA file to a platform-compatible CustomEA.
 * For .mq5 the source is parsed; for .ex5 (binary) we key off the
 * filename and default to a trend engine (no source to inspect).
 */
export function convertUploadedEA(filename: string, content: string): CustomEA {
  const pine = isPineSource(filename, content);
  const isMq5 = !pine && /\.mq5$/i.test(filename);
  const hasSource = pine || isMq5;
  const src = hasSource ? content : '';

  let best: Detector = DETECTORS[DETECTORS.length - 1];
  let bestScore = 0;
  if (hasSource) {
    for (const d of DETECTORS) {
      const score = d.test(src);
      if (score > bestScore) { bestScore = score; best = d; }
    }
  }

  const name = pine
    ? extractPineName(src, filename)
    : isMq5 ? extractName(src, filename) : filename.replace(/\.(mq5|ex5)$/i, '').replace(/[_]+/g, ' ').trim();
  const lang = pine ? 'Pine Script' : isMq5 ? 'MQL5 source' : 'compiled EA';
  const desc = (isMq5 && extractDescription(src)) ||
    `Uploaded ${lang} — converted to the platform's ${best.kind.replace(/_/g, ' ')} engine.`;

  const versionMatch = pine ? src.match(/\/\/@version=(\d+)/) : isMq5 ? src.match(/#property\s+version\s+"([^"]+)"/i) : null;
  const authorMatch = isMq5 ? src.match(/#property\s+copyright\s+"([^"]+)"/i) : null;

  const report = buildConversionReport(filename, src, best.kind, bestScore);
  // Pine indicators: transpile supported plots into a runnable Raptor Script.
  let raptorScript: string | undefined;
  if (pine && report.fileKind === 'indicator-source') {
    const t = transpilePineToRaptorScript(src, name);
    if (t.converted > 0) raptorScript = t.script;
    report.features.push({
      item: 'Raptor Script transpile',
      status: t.converted > 0 ? (t.skipped > 0 ? 'approximated' : 'converted') : 'manual-review',
      note: `${t.converted} plot(s) transpiled, ${t.skipped} skipped. ${t.converted > 0 ? 'Apply it from the Script tab.' : 'No supported plot expressions found — build it in the Raptor Script editor.'}`,
    });
  }

  return {
    id: `custom-${genId()}`,
    name: name || 'Custom EA',
    description: desc,
    pairs: ['EURUSD', 'GBPUSD', 'XAUUSD'],
    timeframes: ['15m', '1H'],
    type: best.type,
    rating: 4.0,
    status: 'available',
    custom: true,
    strategyKind: best.kind,
    sourceKind: pine ? 'pine' : isMq5 ? 'mq5' : 'ex5',
    // §7/§2/§16/§31 — extraction, report, source, registration metadata
    inputs: pine ? extractPineInputs(src) : isMq5 ? extractInputs(src) : [],
    report,
    source: hasSource ? src.slice(0, MAX_STORED_SOURCE) : undefined,
    checksum: checksumOf(hasSource ? src : filename),
    uploadedAt: Date.now(),
    version: pine && versionMatch ? `Pine v${versionMatch[1]}` : versionMatch?.[1],
    author: authorMatch?.[1],
    raptorScript,
  };
}

/** Re-convert an edited source in place: re-runs extraction, engine detection,
 *  the conversion report and (for Pine indicators) the script transpile,
 *  preserving the EA's identity. Returns the updated EA, or null. */
export function reconvertCustomEA(id: string, newSource: string): CustomEA | null {
  const list = loadCustomEAs();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const prev = list[idx];
  if (prev.sourceKind === 'ex5') return null; // compiled-only stays read-only
  const pseudoName = `${prev.name.replace(/\s+/g, '_')}.${prev.sourceKind === 'pine' ? 'pine' : 'mq5'}`;
  const fresh = convertUploadedEA(pseudoName, newSource);
  const updated: CustomEA = { ...fresh, id: prev.id, uploadedAt: prev.uploadedAt, sourceKind: prev.sourceKind };
  list[idx] = updated;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  return updated;
}

/** §31 duplicate detection: an already-uploaded file (same checksum) is rejected. */
export function findDuplicate(checksum: string): CustomEA | undefined {
  return loadCustomEAs().find((e) => e.checksum === checksum);
}

// ─── Persistence (localStorage + change event) ────────────────────

function genId(): string {
  // Browser-safe unique id without external deps.
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && 'randomUUID' in c) return (c as Crypto).randomUUID();
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function loadCustomEAs(): CustomEA[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomEA[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomEA(ea: CustomEA): void {
  if (typeof window === 'undefined') return;
  const list = loadCustomEAs();
  list.push(ea);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function removeCustomEA(id: string): void {
  if (typeof window === 'undefined') return;
  const list = loadCustomEAs().filter((e) => e.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function onCustomEAsChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED_EVENT, cb);
  window.addEventListener('storage', cb); // cross-tab
  return () => {
    window.removeEventListener(CHANGED_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
