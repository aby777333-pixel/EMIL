// ═══════════════════════════════════════════════════════════════
// Condition alerts (enhancement prompt §10). Indicator conditions are
// evaluated on REAL closed H1 bars from the platform's OHLCV builder —
// the same ema/rsi/sma code the chart indicators use. A condition fires
// on the CROSS (state change between the last two closed bars), not on
// mere level presence, so alerts don't re-fire every evaluation.
// ═══════════════════════════════════════════════════════════════

import { ema, rsi, sma } from '@/lib/trading/indicators';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';

export type ConditionKind = 'ema_cross' | 'rsi_ob' | 'rsi_os' | 'vol_spike';

export interface ConditionAlert {
  id: string;
  symbol: string;
  kind: ConditionKind;
  /** ema_cross: fast/slow · rsi_*: period/level · vol_spike: mult */
  fast?: number;
  slow?: number;
  period?: number;
  level?: number;
  mult?: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  message?: string;
}

const KEY = 'raptor_condition_alerts';

export function loadConditionAlerts(): ConditionAlert[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveConditionAlerts(a: ConditionAlert[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

export const KIND_LABELS: Record<ConditionKind, string> = {
  ema_cross: 'EMA cross',
  rsi_ob: 'RSI overbought',
  rsi_os: 'RSI oversold',
  vol_spike: 'Volume spike',
};

export function describeCondition(a: ConditionAlert): string {
  switch (a.kind) {
    case 'ema_cross': return `EMA ${a.fast ?? 9} × EMA ${a.slow ?? 21} cross`;
    case 'rsi_ob': return `RSI(${a.period ?? 14}) crosses above ${a.level ?? 70}`;
    case 'rsi_os': return `RSI(${a.period ?? 14}) crosses below ${a.level ?? 30}`;
    case 'vol_spike': return `Volume > ${a.mult ?? 3}× its 20-bar average`;
  }
}

function last2<T>(arr: (T | null)[]): [T, T] | null {
  const vals: T[] = [];
  for (let i = arr.length - 1; i >= 0 && vals.length < 2; i--) {
    if (arr[i] != null) vals.unshift(arr[i] as T);
  }
  return vals.length === 2 ? [vals[0], vals[1]] : null;
}

/** Evaluate all armed alerts against the last CLOSED bars. Returns the
 *  fired alerts with their messages; caller persists + notifies. */
export function evaluateConditionAlerts(
  alerts: ConditionAlert[],
  builder: OHLCVBuilder | null,
): { alert: ConditionAlert; message: string }[] {
  if (!builder) return [];
  const fired: { alert: ConditionAlert; message: string }[] = [];
  for (const a of alerts) {
    if (a.triggered) continue;
    try {
      const bars = builder.getAllBars(a.symbol, '60');
      // Drop the in-progress bar — conditions judge CLOSED bars only.
      const closed = bars.slice(0, -1);
      if (closed.length < 40) continue;
      const closes = closed.map((b) => b.close);
      let message: string | null = null;

      if (a.kind === 'ema_cross') {
        const fast = a.fast ?? 9, slow = a.slow ?? 21;
        const f2 = last2(ema(closes, fast));
        const s2 = last2(ema(closes, slow));
        if (f2 && s2) {
          if (f2[0] <= s2[0] && f2[1] > s2[1]) message = `${a.symbol} H1: EMA${fast} crossed ABOVE EMA${slow} (bullish cross).`;
          else if (f2[0] >= s2[0] && f2[1] < s2[1]) message = `${a.symbol} H1: EMA${fast} crossed BELOW EMA${slow} (bearish cross).`;
        }
      } else if (a.kind === 'rsi_ob' || a.kind === 'rsi_os') {
        const period = a.period ?? 14;
        const level = a.level ?? (a.kind === 'rsi_ob' ? 70 : 30);
        const r2 = last2(rsi(closes, period));
        if (r2) {
          if (a.kind === 'rsi_ob' && r2[0] < level && r2[1] >= level) message = `${a.symbol} H1: RSI(${period}) crossed above ${level} — now ${r2[1].toFixed(1)} (overbought).`;
          if (a.kind === 'rsi_os' && r2[0] > level && r2[1] <= level) message = `${a.symbol} H1: RSI(${period}) crossed below ${level} — now ${r2[1].toFixed(1)} (oversold).`;
        }
      } else if (a.kind === 'vol_spike') {
        const mult = a.mult ?? 3;
        const vols = closed.map((b) => b.volume ?? 0);
        const avg2 = last2(sma(vols, 20));
        const lastVol = vols[vols.length - 1];
        if (avg2 && avg2[1] > 0 && lastVol > mult * avg2[1]) {
          message = `${a.symbol} H1: volume ${lastVol.toFixed(0)} is ${(lastVol / avg2[1]).toFixed(1)}× the 20-bar average (platform feed).`;
        }
      }

      if (message) fired.push({ alert: a, message });
    } catch { /* skip symbol */ }
  }
  return fired;
}
