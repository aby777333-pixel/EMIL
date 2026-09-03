// ═══════════════════════════════════════════════════════════════
// Account & Risk Alerts — the notification types the price/condition
// alerts didn't cover: spread blow-outs, margin-level warnings, live
// open-P&L thresholds (profit-protect / loss warning) and high-impact
// news proximity. Evaluated live against the trading store + economic
// calendar, firing an in-app toast and (if permitted) a browser
// notification once, then needing a re-arm. Persisted in localStorage.
//
// Pure/​store-agnostic here: the caller passes the live snapshot in, so
// this is trivially portable to a server-side alert runtime later.
// ═══════════════════════════════════════════════════════════════

import { getPipSize } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';

export type AcctAlertKind = 'spread_above' | 'margin_below' | 'open_profit' | 'open_loss' | 'news_within';

export const ACCT_KIND_LABELS: Record<AcctAlertKind, string> = {
  spread_above: 'Spread above (pips)',
  margin_below: 'Margin level below (%)',
  open_profit: 'Open profit above ($)',
  open_loss: 'Open loss below (−$)',
  news_within: 'High-impact news within (min)',
};

export interface AcctAlert {
  id: string;
  kind: AcctAlertKind;
  symbol?: string;          // spread_above / news_within
  threshold: number;
  note?: string;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  message?: string;
}

const KEY = 'raptor_account_alerts_v1';

export function loadAcctAlerts(): AcctAlert[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveAcctAlerts(a: AcctAlert[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

export function describeAcctAlert(a: AcctAlert): string {
  switch (a.kind) {
    case 'spread_above': return `${a.symbol} spread > ${a.threshold}p`;
    case 'margin_below': return `margin level < ${a.threshold}%`;
    case 'open_profit': return `open P&L > +$${a.threshold}`;
    case 'open_loss': return `open P&L < −$${a.threshold}`;
    case 'news_within': return `${a.symbol} news ≤ ${a.threshold}m away`;
  }
}

export interface AcctSnapshot {
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  marginLevelPct: number;
  floatingPnl: number;
  calendar: NewsEvent[];
}

export interface FiredAcct { alert: AcctAlert; message: string }

/** Evaluate all armed account alerts against the live snapshot. */
export function evaluateAcctAlerts(alerts: AcctAlert[], snap: AcctSnapshot): FiredAcct[] {
  const fired: FiredAcct[] = [];
  for (const a of alerts) {
    if (a.triggered) continue;
    let hit = false; let message = '';
    switch (a.kind) {
      case 'spread_above': {
        const t = a.symbol ? snap.prices[a.symbol] : undefined;
        if (t?.bid != null && t?.ask != null) {
          const spread = (t.ask - t.bid) / getPipSize(a.symbol!);
          if (spread > a.threshold) { hit = true; message = `${a.symbol} spread ${spread.toFixed(1)}p exceeded ${a.threshold}p`; }
        }
        break;
      }
      case 'margin_below': {
        if (snap.marginLevelPct > 0 && snap.marginLevelPct < a.threshold) { hit = true; message = `margin level ${snap.marginLevelPct.toFixed(0)}% fell below ${a.threshold}%`; }
        break;
      }
      case 'open_profit': {
        if (snap.floatingPnl >= a.threshold) { hit = true; message = `open P&L +$${snap.floatingPnl.toFixed(2)} reached +$${a.threshold} — consider protecting profit`; }
        break;
      }
      case 'open_loss': {
        if (snap.floatingPnl <= -a.threshold) { hit = true; message = `open P&L −$${Math.abs(snap.floatingPnl).toFixed(2)} reached −$${a.threshold}`; }
        break;
      }
      case 'news_within': {
        if (a.symbol) {
          const ev = upcomingHighImpact(symbolCurrencies(a.symbol), snap.calendar, a.threshold / 60 || 1)[0];
          if (ev) { hit = true; message = `${a.symbol}: ${ev.currency} ${ev.title} in ${fmtEta(ev.timeMs)}`; }
        }
        break;
      }
    }
    if (hit) fired.push({ alert: a, message });
  }
  return fired;
}
