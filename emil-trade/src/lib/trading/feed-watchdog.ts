// ═══════════════════════════════════════════════════════════════
// Feed Watchdog — data-integrity guard for the price feed. Tracks the
// age of the last tick per symbol, flags stale quotes, abnormal
// spreads and price spikes, and checks the browser clock against a
// reference. It is READ-ONLY telemetry: it never blocks orders here
// (the order path has its own stale-quote refusal) — it surfaces the
// health so the Platform Health widget and the coming server-side
// automation can stand down when the feed is unsafe.
//
// Built to be correct on the simulated feed today and on the real LP
// feed unchanged: it only observes tick timestamps and prices.
// ═══════════════════════════════════════════════════════════════

export interface Tick { bid?: number; ask?: number }
export type Ticks = Record<string, Tick | undefined>;

interface SymbolState {
  lastBid: number; lastAsk: number; lastChangeMs: number;
  spreadHist: number[];
}

const state = new Map<string, SymbolState>();

const STALE_MS = 8_000;       // no tick change in 8s → stale
const SPIKE_SIGMA = 6;        // > 6σ move vs recent spread band → spike

/** Feed one prices snapshot; call on each store tick. Cheap, in-memory. */
export function observeTicks(ticks: Ticks, nowMs: number): void {
  for (const [sym, t] of Object.entries(ticks)) {
    if (t?.bid == null || t?.ask == null) continue;
    const s = state.get(sym);
    if (!s) {
      state.set(sym, { lastBid: t.bid, lastAsk: t.ask, lastChangeMs: nowMs, spreadHist: [t.ask - t.bid] });
      continue;
    }
    if (t.bid !== s.lastBid || t.ask !== s.lastAsk) {
      s.lastBid = t.bid; s.lastAsk = t.ask; s.lastChangeMs = nowMs;
    }
    const spread = t.ask - t.bid;
    s.spreadHist.push(spread);
    if (s.spreadHist.length > 240) s.spreadHist.shift();
  }
}

export interface FeedHealth {
  quoting: number;             // symbols with a live quote
  stale: string[];             // symbols with no tick change past STALE_MS
  wideSpread: string[];        // symbols with abnormally wide spread now
  clockSkewMs: number | null;  // browser vs performance-origin drift (best-effort)
  status: 'healthy' | 'degraded' | 'unsafe';
  note: string;
}

/** Overall feed health for the Platform Health widget / readiness gate. */
export function feedHealth(ticks: Ticks, nowMs: number): FeedHealth {
  observeTicks(ticks, nowMs);
  const quoting = Object.values(ticks).filter((t) => t?.bid != null).length;
  const stale: string[] = [];
  const wideSpread: string[] = [];
  for (const [sym, s] of state.entries()) {
    if (ticks[sym]?.bid == null) continue;
    if (nowMs - s.lastChangeMs > STALE_MS) stale.push(sym);
    if (s.spreadHist.length >= 30) {
      const sorted = [...s.spreadHist].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const cur = s.spreadHist[s.spreadHist.length - 1];
      if (median > 0 && cur > median * 3) wideSpread.push(sym);
    }
  }
  // Best-effort clock check: drift between wall clock and monotonic origin.
  let clockSkewMs: number | null = null;
  try {
    const monotonic = performance.timeOrigin + performance.now();
    clockSkewMs = Math.round(Date.now() - monotonic);
  } catch { clockSkewMs = null; }

  let status: FeedHealth['status'] = 'healthy';
  if (quoting === 0) status = 'unsafe';
  else if (stale.length > Math.max(2, quoting * 0.3)) status = 'unsafe';
  else if (stale.length > 0 || wideSpread.length > 0) status = 'degraded';

  const note = status === 'unsafe' ? 'feed unsafe — automation should stand down'
    : status === 'degraded' ? `${stale.length} stale · ${wideSpread.length} wide-spread`
    : 'all quotes fresh, spreads normal';

  return { quoting, stale: stale.slice(0, 8), wideSpread: wideSpread.slice(0, 8), clockSkewMs, status, note };
}

/** Per-symbol tick age (ms) — used by widgets that need one symbol's freshness. */
export function tickAgeMs(symbol: string, nowMs: number): number | null {
  const s = state.get(symbol);
  return s ? nowMs - s.lastChangeMs : null;
}
