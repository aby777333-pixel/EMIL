// ═══════════════════════════════════════════════════════════════
// NEXUS live market context (NEXUS super-prompt: "not a chatbot").
// Builds an honest snapshot of what the platform actually knows right now —
// live quotes from the price stream, the trader's real open positions and
// account — so NEXUS answers about THIS trader's situation, not generics.
// Everything here is real platform data; nothing is fabricated.
// ═══════════════════════════════════════════════════════════════

import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import { classifyMarketState, marketStateToText, type MarketStateAssessment } from '@/lib/nexus/market-state';
import { computeEntryZone, assessPosition, type EntryZoneAssessment, type NoSetupAssessment } from '@/lib/nexus/entry-exit';
import { atr } from '@/lib/trading/indicators';
import { sessionStatuses, activeOverlaps, fmtCountdown } from '@/lib/insights/sessions';

export interface NexusContext {
  activeSymbol: string | null;
  quotes: { symbol: string; bid: number; ask: number; spread: number }[];
  positions: {
    symbol: string; direction: string; size: number;
    openPrice: number; currentPrice: number; floatingPnl: number;
    sl: number | null; tp: number | null;
  }[];
  accountConnected: boolean;
  /** Real bar-based classification — only present when the terminal's bar
   *  builder is available on this page (never fabricated elsewhere). */
  marketState: (MarketStateAssessment & { symbol: string; timeframe: string }) | null;
  /** Real performance analytics computed from the account's closed trades. */
  performance: NexusPerformance | null;
  /** §5 entry-zone assessment for the active symbol (terminal only). */
  entryZone: (EntryZoneAssessment | NoSetupAssessment) | null;
  /** §6 per-position management assessments (terminal only). */
  positionNotes: { symbol: string; direction: string; headline: string; action: string; reasons: string[] }[];
  /** §27 daily-briefing support: live session clock (pure UTC math). */
  sessions: { open: string[]; overlaps: string[]; nextChange: string } | null;
  /** §15 opportunity scan across all streamed symbols (terminal only). */
  opportunities: {
    ranked: { symbol: string; direction: string; preferred: number; stop: number; target1: number; riskReward1: number; confidence: number; state: string }[];
    rangeBound: number;
    scanned: number;
  } | null;
}

export interface NexusPerformance {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;          // %
  netPnl: number;
  profitFactor: number | null;
  avgWin: number;
  avgLoss: number;
  currentLossStreak: number; // consecutive losses, most recent first
  tradesToday: number;
  avgTradesPerDay: number;   // over the distinct trading days in the sample
  avgSize: number;
  lastSize: number;
  lastTrade: {
    symbol: string; direction: string; size: number;
    openPrice: number; closePrice: number; pnl: number; closedAt: string;
  } | null;
}

/** Compute honest performance stats from real closed-position rows. */
export function computePerformance(rows: Record<string, unknown>[]): NexusPerformance | null {
  if (!rows || rows.length === 0) return null;
  const trades = rows.map((r) => ({
    symbol: String(r.symbol ?? ''),
    direction: String(r.direction ?? ''),
    size: Number(r.size ?? 0),
    openPrice: Number(r.open_price ?? 0),
    closePrice: Number(r.close_price ?? r.current_price ?? 0),
    pnl: Number(r.realized_pnl ?? r.floating_pnl ?? 0),
    closedAt: String(r.closed_at ?? ''),
  }));
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  let streak = 0;
  for (const t of trades) { if (t.pnl < 0) streak++; else break; }
  const today = new Date().toDateString();
  const tradesToday = trades.filter((t) => t.closedAt && new Date(t.closedAt).toDateString() === today).length;
  const days = new Set(trades.filter((t) => t.closedAt).map((t) => new Date(t.closedAt).toDateString())).size || 1;
  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Math.round((wins.length / trades.length) * 100),
    netPnl: trades.reduce((s, t) => s + t.pnl, 0),
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    currentLossStreak: streak,
    tradesToday,
    avgTradesPerDay: Math.round((trades.length / days) * 10) / 10,
    avgSize: trades.reduce((s, t) => s + t.size, 0) / trades.length,
    lastSize: trades[0]?.size ?? 0,
    lastTrade: trades[0] ?? null,
  };
}

export async function buildNexusContext(): Promise<NexusContext> {
  const state = useTradingStore.getState();
  const quotes = Object.values(state.prices ?? {})
    .slice(0, 16)
    .map((t) => ({ symbol: t.symbol, bid: t.bid, ask: t.ask, spread: t.spread }));

  let positions: NexusContext['positions'] = [];
  let performance: NexusPerformance | null = null;
  let accountConnected = false;
  if (state.activeAccountId) {
    accountConnected = true;
    try {
      const closed = await orderService.getTradeHistory(state.activeAccountId, 50);
      performance = computePerformance((closed ?? []) as Record<string, unknown>[]);
    } catch { /* history unavailable — omit honestly */ }
    try {
      const open = await orderService.getOpenPositions(state.activeAccountId);
      positions = (open ?? []).map((p: Record<string, unknown>) => ({
        symbol: String(p.symbol ?? ''),
        direction: String(p.direction ?? ''),
        size: Number(p.size ?? 0),
        openPrice: Number(p.open_price ?? 0),
        currentPrice: Number(p.current_price ?? 0),
        floatingPnl: Number(p.floating_pnl ?? 0),
        sl: p.sl != null ? Number(p.sl) : null,
        tp: p.tp != null ? Number(p.tp) : null,
      }));
    } catch { /* positions unavailable — report honestly as none */ }
  }

  // Market-state classification from REAL bars (terminal page only).
  let marketState: NexusContext['marketState'] = null;
  let entryZone: NexusContext['entryZone'] = null;
  const positionNotes: NexusContext['positionNotes'] = [];
  const builder = getOhlcvBuilder();
  if (builder && state.activeSymbol) {
    try {
      const bars = builder.getAllBars(state.activeSymbol, '60');
      const ms = classifyMarketState(bars);
      if (ms) {
        marketState = { ...ms, symbol: state.activeSymbol, timeframe: 'H1' };
        const tick = state.prices?.[state.activeSymbol];
        if (tick) entryZone = computeEntryZone(state.activeSymbol, bars, ms, tick.mid);
      }
    } catch { /* classification optional */ }
  }
  // §27: session clock — pure UTC math plus measured ranges from real bars.
  let sessions: NexusContext['sessions'] = null;
  try {
    const st = sessionStatuses(new Date(), state.activeSymbol ?? 'EURUSD', builder);
    const openNames = st.filter((s) => s.open).map((s) => s.name);
    const soonest = [...st].sort((a, b) => a.minutesToChange - b.minutesToChange)[0];
    sessions = {
      open: openNames,
      overlaps: activeOverlaps(st),
      nextChange: soonest ? `${soonest.name} ${soonest.open ? 'closes' : 'opens'} in ${fmtCountdown(soonest.minutesToChange)}` : '',
    };
  } catch { /* optional */ }

  // §15: opportunity scan — classify EVERY streamed symbol and rank the
  // trending setups by confidence. Range-bound symbols are counted honestly
  // rather than forced into fake setups.
  let opportunities: NexusContext['opportunities'] = null;
  if (builder && quotes.length > 0) {
    const ranked: NonNullable<NexusContext['opportunities']>['ranked'] = [];
    let rangeBound = 0;
    for (const q of quotes) {
      try {
        const bars = builder.getAllBars(q.symbol, '60');
        const ms = classifyMarketState(bars);
        if (!ms) continue;
        const zone = computeEntryZone(q.symbol, bars, ms, (q.bid + q.ask) / 2);
        if ('direction' in zone) {
          ranked.push({
            symbol: q.symbol, direction: zone.direction,
            preferred: zone.preferred, stop: zone.stop, target1: zone.target1,
            riskReward1: zone.riskReward1, confidence: zone.confidence, state: ms.state,
          });
        } else {
          rangeBound++;
        }
      } catch { /* skip symbol */ }
    }
    ranked.sort((a, b) => b.confidence - a.confidence);
    opportunities = { ranked: ranked.slice(0, 5), rangeBound, scanned: quotes.length };
  }

  // §6: reassess every open position against its own symbol's current regime.
  if (builder) {
    for (const p of positions) {
      try {
        const bars = builder.getAllBars(p.symbol, '60');
        const ms = classifyMarketState(bars);
        const closes = bars.map((b) => b.close);
        const av = atr(bars.map((b) => b.high), bars.map((b) => b.low), closes, 14).filter((v): v is number => v != null);
        const a = assessPosition(p, ms, av[av.length - 1] ?? null);
        positionNotes.push({ symbol: p.symbol, direction: p.direction, headline: a.headline, action: a.action, reasons: a.reasons });
      } catch { /* per-position assessment optional */ }
    }
  }

  return {
    activeSymbol: state.activeSymbol ?? null,
    quotes,
    positions,
    accountConnected,
    marketState,
    performance,
    entryZone,
    positionNotes,
    sessions,
    opportunities,
  };
}

/** Render the context as a compact block for the model / fallback engine. */
export function contextToText(ctx: NexusContext): string {
  const lines: string[] = [];
  lines.push(`Active chart symbol: ${ctx.activeSymbol ?? 'none'}`);
  if (ctx.quotes.length > 0) {
    lines.push('Live quotes (real-time from the platform feed):');
    for (const q of ctx.quotes) lines.push(`  ${q.symbol}: bid ${q.bid} / ask ${q.ask} (spread ${q.spread})`);
  } else {
    lines.push('Live quotes: none streaming on this page.');
  }
  if (!ctx.accountConnected) {
    lines.push('Trading account: not connected (signed out or no active account) — open positions unknown.');
  } else if (ctx.positions.length === 0) {
    lines.push('Open positions: none.');
  } else {
    lines.push(`Open positions (${ctx.positions.length}, real):`);
    for (const p of ctx.positions) {
      lines.push(`  ${p.direction} ${p.size} ${p.symbol} @ ${p.openPrice} → now ${p.currentPrice}, floating P&L ${p.floatingPnl >= 0 ? '+' : ''}${p.floatingPnl.toFixed(2)}, SL ${p.sl ?? '—'}, TP ${p.tp ?? '—'}`);
    }
  }
  if (ctx.marketState) {
    lines.push(marketStateToText(ctx.marketState.symbol, ctx.marketState.timeframe, ctx.marketState));
  }
  if (ctx.entryZone) {
    if ('direction' in ctx.entryZone) {
      const z = ctx.entryZone;
      lines.push(`Entry-zone assessment for ${z.symbol} (H1, real bars): ${z.direction} zone — aggressive ${z.aggressive} (market), preferred ${z.preferred} (EMA20 pullback), conservative ${z.conservative}; stop ${z.stop}; targets ${z.target1} / ${z.target2}; R:R ${z.riskReward1}; confidence ${z.confidence}%. Invalidation: ${z.invalidation} Note: ${z.note}`);
    } else {
      lines.push(`Entry-zone assessment for ${ctx.entryZone.symbol}: no high-quality setup — ${ctx.entryZone.reason}`);
    }
  }
  for (const n of ctx.positionNotes) {
    lines.push(`Position management (${n.direction} ${n.symbol}): ${n.headline} — ${n.action} Reasons: ${n.reasons.join(' | ')}`);
  }
  if (ctx.sessions) {
    lines.push(`Sessions now (UTC): ${ctx.sessions.open.length > 0 ? `${ctx.sessions.open.join(', ')} open` : 'all major sessions closed'}${ctx.sessions.overlaps.length > 0 ? ` — overlap: ${ctx.sessions.overlaps.join(' / ')}` : ''}. Next change: ${ctx.sessions.nextChange}.`);
  }
  if (ctx.opportunities) {
    const o = ctx.opportunities;
    if (o.ranked.length > 0) {
      lines.push(`Opportunity scan (real bars, ${o.scanned} symbols): ${o.ranked.map((r, i) => `${i + 1}. ${r.symbol} ${r.direction} — preferred ${r.preferred}, stop ${r.stop}, T1 ${r.target1}, R:R ${r.riskReward1}, confidence ${r.confidence}%, regime ${r.state}`).join(' | ')}. ${o.rangeBound} symbol(s) range-bound with no trend setup.`);
    } else {
      lines.push(`Opportunity scan (real bars, ${o.scanned} symbols): no trending setups right now — ${o.rangeBound} symbol(s) are range-bound/choppy.`);
    }
  }
  if (ctx.performance) {
    const p = ctx.performance;
    lines.push(`Performance (real, last ${p.totalTrades} closed trades): win rate ${p.winRate}% (${p.wins}W/${p.losses}L), net P&L ${p.netPnl >= 0 ? '+' : ''}${p.netPnl.toFixed(2)}, profit factor ${p.profitFactor != null ? p.profitFactor.toFixed(2) : 'n/a'}, avg win +${p.avgWin.toFixed(2)} / avg loss -${p.avgLoss.toFixed(2)}, current loss streak ${p.currentLossStreak}, trades today ${p.tradesToday} (avg ${p.avgTradesPerDay}/day), avg size ${p.avgSize.toFixed(2)} lots`);
    if (p.lastTrade) {
      const t = p.lastTrade;
      lines.push(`Last closed trade: ${t.direction} ${t.size} ${t.symbol} @ ${t.openPrice} → ${t.closePrice}, P&L ${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}, closed ${t.closedAt}`);
    }
  } else if (ctx.accountConnected) {
    lines.push('Performance: no closed trades in this account yet.');
  }
  return lines.join('\n');
}
