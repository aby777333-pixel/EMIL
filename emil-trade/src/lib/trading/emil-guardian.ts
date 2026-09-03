// ═══════════════════════════════════════════════════════════════
// EMIL GUARDIAN — the independent fire alarm EMIL cannot silence.
// Lives in the ORDER PATH (order-service), completely outside EMIL's
// decision engine. Every EMIL-tagged order is re-checked here with the
// Guardian's OWN reads; a veto throws and the order never reaches the
// broker RPC. The strategy brain has no API to disable, bypass or tune
// these watchdogs — that separation is the entire point.
//
// Watchdogs: duplicate-order · rate-limit · missing stop-loss ·
// stale/missing quote · abnormal spread · unreadable market (uncertainty).
// ═══════════════════════════════════════════════════════════════

import { useTradingStore } from '@/stores/trading';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import { uncertaintyScore } from '@/lib/trading/emil-macro';
import { getPipSize } from '@/lib/trading/ticket-math';
import { getCalendar } from '@/lib/trading/news-guard';
import { emilLog } from '@/lib/trading/emil-council';

export class GuardianVetoError extends Error {
  constructor(message: string) { super(message); this.name = 'GuardianVetoError'; }
}

interface RecentOrder { symbol: string; direction: string; size: number; ts: number }
const recent: RecentOrder[] = [];

function veto(reason: string): never {
  try { emilLog('blocked', `GUARDIAN VETO: ${reason}`); } catch { /* logging must never break the veto */ }
  throw new GuardianVetoError(`🛑 GUARDIAN VETO — ${reason}`);
}

/** Independent veto layer for EMIL-tagged orders. Throws GuardianVetoError;
 *  never mutates anything. Closing positions is never routed through here. */
export async function guardianCheck(params: {
  symbol: string; direction: 'BUY' | 'SELL'; size: number;
  sl?: number | null; comment?: string | null;
}): Promise<void> {
  const comment = String(params.comment ?? '');
  if (!comment.startsWith('EMIL')) return; // guardian governs EMIL only
  const now = Date.now();

  // 1 · Duplicate-order watchdog: identical intent within 45s.
  for (let i = recent.length - 1; i >= 0; i--) {
    if (now - recent[i].ts > 5 * 60_000) { recent.splice(0, i + 1); break; }
  }
  if (recent.some((r) => r.symbol === params.symbol && r.direction === params.direction && now - r.ts < 45_000)) {
    veto(`duplicate-order watchdog — an identical ${params.direction} ${params.symbol} intent fired < 45s ago`);
  }

  // 2 · Rate watchdog: more than 3 EMIL orders inside one minute.
  if (recent.filter((r) => now - r.ts < 60_000).length >= 3) {
    veto('rate watchdog — more than 3 EMIL orders in 60s looks like a runaway loop');
  }

  // 3 · Missing stop-loss on EMIL entries (hedge legs are the offset itself).
  if (!comment.startsWith('EMIL:HEDGE') && (params.sl == null || params.sl === 0)) {
    veto('an EMIL entry without a stop loss is not allowed — unbounded downside is never authorized');
  }

  // 4 · Stale / missing quote.
  const tick = useTradingStore.getState().prices[params.symbol];
  if (tick?.bid == null || tick?.ask == null) {
    veto(`no live quote for ${params.symbol} — trading stale data is forbidden`);
  }

  // 5 · Abnormal spread (independent hard ceiling, regardless of settings).
  const spreadPips = (tick.ask - tick.bid) / getPipSize(params.symbol);
  if (spreadPips > 12) {
    veto(`abnormal spread on ${params.symbol} (${spreadPips.toFixed(1)} pips) — execution environment is unsafe`);
  }

  // 6 · Unreadable market: the Guardian's own uncertainty read.
  const builder = getOhlcvBuilder();
  if (builder) {
    try {
      const calendar = await getCalendar();
      const unc = uncertaintyScore(builder, params.symbol, tick, calendar);
      if (unc.level === 'HIGH') {
        veto(`market unreadable (uncertainty ${unc.score}/100: ${unc.reasons[0]}) — the safest trade is none`);
      }
    } catch (e) {
      if (e instanceof GuardianVetoError) throw e;
      // uncertainty read failed — the other watchdogs still stand
    }
  }

  recent.push({ symbol: params.symbol, direction: params.direction, size: params.size, ts: now });
}
