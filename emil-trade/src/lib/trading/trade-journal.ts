// ═══════════════════════════════════════════════════════════════
// Trade Journal — turns the account's real closed-trade history into
// structured performance analytics: per-session, per-strategy (by the
// order comment tag), R-multiples, win rate, profit factor, streaks.
// It reads what the platform already records (place/close writes the
// comment + timestamps + realized P&L), so the Session Performance,
// Strategy Performance and Streak widgets stop being placeholders and
// show REAL numbers as trades close. No new capture hooks needed on
// the order path — journalStats() derives everything from history.
// ═══════════════════════════════════════════════════════════════

export interface JournalRow {
  symbol?: string;
  direction?: string;
  size?: number;
  realized_pnl?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  open_price?: number | null;
  close_price?: number | null;
  sl?: number | null;
  comment?: string | null;
}

export type EngineSource = 'Manual' | 'EMIL' | 'Scanner' | 'Auto Hedge' | 'Auto Scan' | 'EA' | 'Widget';

export function sourceOf(comment: string | null | undefined): EngineSource {
  const c = (comment ?? '').toLowerCase();
  if (c.startsWith('hedgeauto')) return 'Auto Hedge';
  if (c.startsWith('scanauto')) return 'Auto Scan';
  if (c.startsWith('scanner')) return 'Scanner';
  if (c.startsWith('emil')) return 'EMIL';
  if (c.startsWith('widget')) return 'Widget';
  if (c.startsWith('ea')) return 'EA';
  return 'Manual';
}

// UTC session windows (approx.), same as the widget engines.
export function sessionOf(ms: number): 'Sydney' | 'Tokyo' | 'London' | 'New York' | 'Off-hours' {
  const h = new Date(ms).getUTCHours();
  if (h >= 12 && h < 21) return 'New York';
  if (h >= 7 && h < 12) return 'London';
  if (h >= 0 && h < 7) return 'Tokyo';
  if (h >= 21) return 'Sydney';
  return 'Off-hours';
}

/** R-multiple: realized P&L relative to the trade's initial risk (entry→SL). */
function rMultiple(r: JournalRow): number | null {
  const pnl = Number(r.realized_pnl ?? 0);
  if (r.open_price == null || r.sl == null || r.sl === 0 || r.size == null) return null;
  const riskDist = Math.abs(r.open_price - r.sl);
  if (!(riskDist > 0)) return null;
  // pnl / (risk per unit * size) — approximate; sign preserved from pnl.
  const rewardDist = r.close_price != null ? Math.abs(r.close_price - r.open_price) : Math.abs(riskDist);
  const magnitude = rewardDist / riskDist;
  return pnl >= 0 ? magnitude : -magnitude;
}

export interface Bucket { n: number; wins: number; pnl: number }
const emptyBucket = (): Bucket => ({ n: 0, wins: 0, pnl: 0 });

export interface JournalStats {
  total: Bucket;
  bySession: Record<string, Bucket>;
  bySource: Record<string, Bucket>;
  bySymbol: Record<string, Bucket>;
  winStreak: number;
  lossStreak: number;
  avgR: number | null;
  profitFactor: number | null;
  todayPnl: number;
  todayTrades: number;
}

function add(b: Bucket, pnl: number) { b.n += 1; if (pnl >= 0) b.wins += 1; b.pnl += pnl; }

export function journalStats(rows: JournalRow[]): JournalStats {
  const closed = rows.filter((r) => (r.closed_at ?? '') !== '').sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
  const total = emptyBucket();
  const bySession: Record<string, Bucket> = {};
  const bySource: Record<string, Bucket> = {};
  const bySymbol: Record<string, Bucket> = {};
  let grossWin = 0, grossLoss = 0, rSum = 0, rCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  let todayPnl = 0, todayTrades = 0;

  for (const r of closed) {
    const pnl = Number(r.realized_pnl ?? 0);
    const ms = new Date(r.closed_at!).getTime();
    add(total, pnl);
    (bySession[sessionOf(ms)] ??= emptyBucket());
    add(bySession[sessionOf(ms)], pnl);
    (bySource[sourceOf(r.comment)] ??= emptyBucket());
    add(bySource[sourceOf(r.comment)], pnl);
    if (r.symbol) { (bySymbol[r.symbol] ??= emptyBucket()); add(bySymbol[r.symbol], pnl); }
    if (pnl >= 0) grossWin += pnl; else grossLoss += -pnl;
    const rm = rMultiple(r); if (rm != null) { rSum += rm; rCount += 1; }
    if ((r.closed_at ?? '').slice(0, 10) === today) { todayPnl += pnl; todayTrades += 1; }
  }

  // Streaks from the tail (most recent).
  let winStreak = 0, lossStreak = 0;
  for (let i = closed.length - 1; i >= 0; i--) { if (Number(closed[i].realized_pnl ?? 0) >= 0) winStreak++; else break; }
  for (let i = closed.length - 1; i >= 0; i--) { if (Number(closed[i].realized_pnl ?? 0) < 0) lossStreak++; else break; }

  return {
    total, bySession, bySource, bySymbol, winStreak, lossStreak,
    avgR: rCount ? Math.round((rSum / rCount) * 100) / 100 : null,
    profitFactor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : (grossWin > 0 ? Infinity : null),
    todayPnl: Math.round(todayPnl * 100) / 100,
    todayTrades,
  };
}

export const winRate = (b: Bucket): number => (b.n ? Math.round((b.wins / b.n) * 100) : 0);
