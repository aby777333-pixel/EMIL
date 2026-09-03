// ═══════════════════════════════════════════════════════════════
// Trade Journal engine (enhancement prompt §5). Trades come from the real
// positions table; annotations live in trade_journal (RLS, owner-only).
// Analytics are computed from actual closed trades — no invented stats.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';

export const REASONS = ['Trend follow', 'Breakout', 'Reversal', 'Range play', 'News', 'EA signal', 'NEXUS idea', 'Other'] as const;
export const EMOTIONS = ['Calm', 'Confident', 'Hesitant', 'Fearful', 'Greedy', 'Revenge', 'Rushed', 'Bored'] as const;

export interface JournalEntry {
  position_id: string;
  reason: string | null;
  emotion: string | null;
  notes: string | null;
  mistakes: string | null;
  lessons: string | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  direction: string;
  size: number;
  open_price: number;
  close_price: number | null;
  realized_pnl: number;
  commission: number;
  swap_accrued: number;
  opened_at: string;
  closed_at: string;
  comment: string | null;
  journal?: JournalEntry | null;
}

interface DbRow { [k: string]: unknown }

export function normalizeTrade(r: DbRow): ClosedTrade {
  return {
    id: String(r.id),
    symbol: String(r.symbol),
    direction: String(r.direction),
    size: Number(r.size),
    open_price: Number(r.open_price),
    close_price: r.close_price != null ? Number(r.close_price) : null,
    realized_pnl: Number(r.realized_pnl ?? 0),
    commission: Number(r.commission ?? 0),
    swap_accrued: Number(r.swap_accrued ?? 0),
    opened_at: String(r.opened_at),
    closed_at: String(r.closed_at),
    comment: r.comment != null ? String(r.comment) : null,
  };
}

export async function fetchJournalEntries(positionIds: string[]): Promise<Map<string, JournalEntry>> {
  const map = new Map<string, JournalEntry>();
  if (positionIds.length === 0) return map;
  try {
    const { data } = await createClient()
      .from('trade_journal')
      .select('position_id, reason, emotion, notes, mistakes, lessons')
      .in('position_id', positionIds);
    for (const r of data ?? []) map.set(r.position_id as string, r as unknown as JournalEntry);
  } catch { /* signed out / RLS — empty map is honest */ }
  return map;
}

export async function saveJournalEntry(entry: JournalEntry & { account_id?: string | null }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await createClient()
      .from('trade_journal')
      .upsert({
        position_id: entry.position_id,
        account_id: entry.account_id ?? null,
        reason: entry.reason || null,
        emotion: entry.emotion || null,
        notes: entry.notes || null,
        mistakes: entry.mistakes || null,
        lessons: entry.lessons || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'position_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'save failed' };
  }
}

// ── Analytics (real closed trades only) ─────────────────────────

export interface JournalAnalytics {
  total: number; wins: number; losses: number; winRate: number;
  grossProfit: number; grossLoss: number; profitFactor: number | null;
  avgWin: number; avgLoss: number; expectancy: number;
  best: ClosedTrade | null; worst: ClosedTrade | null;
  bySymbol: { key: string; n: number; pnl: number; winRate: number }[];
  byDirection: { key: string; n: number; pnl: number; winRate: number }[];
  byOpenHourBucket: { key: string; n: number; pnl: number; winRate: number }[];
  byEmotion: { key: string; n: number; pnl: number; winRate: number }[];
  byReason: { key: string; n: number; pnl: number; winRate: number }[];
  annotated: number;
}

function bucketize(trades: ClosedTrade[], keyOf: (t: ClosedTrade) => string | null) {
  const m = new Map<string, { n: number; pnl: number; wins: number }>();
  for (const t of trades) {
    const k = keyOf(t);
    if (!k) continue;
    const b = m.get(k) ?? { n: 0, pnl: 0, wins: 0 };
    b.n++; b.pnl += t.realized_pnl; if (t.realized_pnl > 0) b.wins++;
    m.set(k, b);
  }
  return [...m.entries()]
    .map(([key, b]) => ({ key, n: b.n, pnl: b.pnl, winRate: (b.wins / b.n) * 100 }))
    .sort((a, b) => b.pnl - a.pnl);
}

/** UTC open-hour bucket — honest, derived purely from opened_at. */
function hourBucket(t: ClosedTrade): string {
  const h = new Date(t.opened_at).getUTCHours();
  if (h < 7) return 'Asia (00–07 UTC)';
  if (h < 12) return 'London am (07–12 UTC)';
  if (h < 16) return 'London/NY overlap (12–16 UTC)';
  if (h < 21) return 'New York (16–21 UTC)';
  return 'Late (21–24 UTC)';
}

export function computeAnalytics(trades: ClosedTrade[]): JournalAnalytics {
  const wins = trades.filter((t) => t.realized_pnl > 0);
  const losses = trades.filter((t) => t.realized_pnl < 0);
  const grossProfit = wins.reduce((s, t) => s + t.realized_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realized_pnl, 0));
  const sorted = [...trades].sort((a, b) => b.realized_pnl - a.realized_pnl);
  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    grossProfit, grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    expectancy: trades.length ? trades.reduce((s, t) => s + t.realized_pnl, 0) / trades.length : 0,
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
    bySymbol: bucketize(trades, (t) => t.symbol),
    byDirection: bucketize(trades, (t) => t.direction),
    byOpenHourBucket: bucketize(trades, hourBucket),
    byEmotion: bucketize(trades, (t) => t.journal?.emotion ?? null),
    byReason: bucketize(trades, (t) => t.journal?.reason ?? null),
    annotated: trades.filter((t) => t.journal && (t.journal.reason || t.journal.emotion || t.journal.notes)).length,
  };
}

// ── CSV export (real download) ──────────────────────────────────

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(trades: ClosedTrade[]): string {
  const header = [
    'closed_at', 'opened_at', 'symbol', 'direction', 'size', 'open_price', 'close_price',
    'realized_pnl', 'commission', 'swap', 'duration_min', 'comment',
    'reason', 'emotion', 'notes', 'mistakes', 'lessons',
  ];
  const rows = trades.map((t) => [
    t.closed_at, t.opened_at, t.symbol, t.direction, t.size, t.open_price, t.close_price ?? '',
    t.realized_pnl, t.commission, t.swap_accrued,
    Math.round((new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 60000),
    t.comment ?? '',
    t.journal?.reason ?? '', t.journal?.emotion ?? '', t.journal?.notes ?? '',
    t.journal?.mistakes ?? '', t.journal?.lessons ?? '',
  ].map(esc).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function fmtDuration(openedAt: string, closedAt: string): string {
  const min = Math.round((new Date(closedAt).getTime() - new Date(openedAt).getTime()) / 60000);
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
}
