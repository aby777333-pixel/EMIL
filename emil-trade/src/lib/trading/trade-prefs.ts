// ═══════════════════════════════════════════════════════════════
// Trade preferences — one-click default stop-loss / take-profit.
// When enabled, a market order placed WITHOUT an explicit SL/TP gets
// the trader's default protective distances applied automatically (in
// pips), so one-click trades are never naked. Explicit SL/TP on the
// ticket always win. Off by default — no behaviour change until opted
// in. Purely additive; the order path is unchanged.
// ═══════════════════════════════════════════════════════════════

import { getPipSize } from '@/lib/trading/ticket-math';

export interface TradePrefs {
  autoProtect: boolean;   // apply defaults when SL/TP left blank
  defaultSlPips: number;
  defaultTpPips: number;
}

export const DEFAULT_TRADE_PREFS: TradePrefs = { autoProtect: false, defaultSlPips: 20, defaultTpPips: 40 };

const KEY = 'raptor_trade_prefs_v1';

export function loadTradePrefs(): TradePrefs {
  try { return { ...DEFAULT_TRADE_PREFS, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) }; }
  catch { return { ...DEFAULT_TRADE_PREFS }; }
}
export function saveTradePrefs(p: TradePrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Compute default SL/TP prices for a market order, if auto-protect is on and
 *  the trader left them blank. Returns undefined for a field the trader set. */
export function defaultProtection(symbol: string, direction: 'BUY' | 'SELL', fill: number, explicitSl?: number, explicitTp?: number): { sl?: number; tp?: number } {
  const p = loadTradePrefs();
  const pip = getPipSize(symbol);
  const out: { sl?: number; tp?: number } = {};
  if (explicitSl != null) out.sl = explicitSl;
  else if (p.autoProtect && p.defaultSlPips > 0) out.sl = direction === 'BUY' ? fill - p.defaultSlPips * pip : fill + p.defaultSlPips * pip;
  if (explicitTp != null) out.tp = explicitTp;
  else if (p.autoProtect && p.defaultTpPips > 0) out.tp = direction === 'BUY' ? fill + p.defaultTpPips * pip : fill - p.defaultTpPips * pip;
  return out;
}
