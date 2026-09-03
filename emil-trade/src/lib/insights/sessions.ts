// ═══════════════════════════════════════════════════════════════
// Session Panel engine (enhancement prompt §7). Session windows are fixed
// UTC schedules (standard market hours); everything MEASURED (volatility,
// range) comes from the platform's real bars — never invented.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';

export interface MarketSession {
  name: string;
  city: string;
  /** UTC open/close hours (close may wrap past midnight). */
  openUtc: number;   // fractional hours, e.g. 12.5 = 12:30
  closeUtc: number;
}

// Standard session windows in UTC (northern-winter schedule; DST shifts
// London/NY by 1h — shown as a caveat in the UI rather than silently guessed).
export const SESSIONS: MarketSession[] = [
  { name: 'Sydney', city: 'Sydney', openUtc: 21, closeUtc: 6 },
  { name: 'Tokyo', city: 'Tokyo', openUtc: 0, closeUtc: 9 },
  { name: 'Singapore', city: 'Singapore', openUtc: 1, closeUtc: 10 },
  { name: 'Mumbai', city: 'Mumbai', openUtc: 3.75, closeUtc: 10 },
  { name: 'Dubai', city: 'Dubai', openUtc: 6, closeUtc: 14 },
  { name: 'London', city: 'London', openUtc: 8, closeUtc: 17 },
  { name: 'New York', city: 'New York', openUtc: 13.5, closeUtc: 21 },
];

export interface SessionStatus extends MarketSession {
  open: boolean;
  /** Minutes until next transition (open→close or close→open). */
  minutesToChange: number;
  /** Average H1 bar range during this session's hours, % of price — measured
   *  from the platform's real bars for the given symbol. 0 = not enough data. */
  measuredVolPct: number;
  barsMeasured: number;
}

function inWindow(hourUtc: number, s: MarketSession): boolean {
  return s.openUtc < s.closeUtc
    ? hourUtc >= s.openUtc && hourUtc < s.closeUtc
    : hourUtc >= s.openUtc || hourUtc < s.closeUtc;
}

function minutesUntil(hourUtc: number, target: number): number {
  let diff = target - hourUtc;
  if (diff <= 0) diff += 24;
  return Math.round(diff * 60);
}

export function sessionStatuses(
  now: Date,
  symbol: string,
  builder: OHLCVBuilder | null,
): SessionStatus[] {
  const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60;
  const bars = builder ? builder.getAllBars(symbol, '60') : [];
  return SESSIONS.map((s) => {
    const open = inWindow(hourUtc, s);
    // Measured volatility: mean (high−low)/close of real H1 bars whose UTC
    // hour falls inside this session window.
    let sum = 0, n = 0;
    for (const b of bars) {
      const h = new Date(b.time * 1000).getUTCHours();
      if (inWindow(h, s) && b.close > 0) { sum += ((b.high - b.low) / b.close) * 100; n++; }
    }
    return {
      ...s,
      open,
      minutesToChange: minutesUntil(hourUtc, open ? s.closeUtc : s.openUtc),
      measuredVolPct: n > 0 ? sum / n : 0,
      barsMeasured: n,
    };
  });
}

/** Currently-overlapping open session pairs (the liquidity windows). */
export function activeOverlaps(statuses: SessionStatus[]): string[] {
  const open = statuses.filter((s) => s.open).map((s) => s.name);
  const out: string[] = [];
  for (let i = 0; i < open.length; i++)
    for (let j = i + 1; j < open.length; j++) out.push(`${open[i]} + ${open[j]}`);
  return out;
}

export function fmtCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
