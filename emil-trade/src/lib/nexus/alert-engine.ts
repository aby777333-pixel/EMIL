// ═══════════════════════════════════════════════════════════════
// Active NEXUS alert engine (additive super-prompt: Active Market
// Intelligence & Trade Guardian). Modular, switchable, honest:
// every alert is computed from REAL platform data, carries severity,
// evidence and (where derived) a confidence score, and is deduplicated
// with per-key cooldowns so the trader is never flooded (§18).
// Control levels (§21): observe = feed only; alert = feed + pop-ups.
// ═══════════════════════════════════════════════════════════════

import type { NexusContext } from '@/lib/nexus/market-context';

export type NexusAlertSeverity = 'info' | 'opportunity' | 'warning' | 'critical';

export interface NexusAlert {
  id: string;
  key: string;              // dedup/cooldown key
  ts: number;
  severity: NexusAlertSeverity;
  symbol?: string;
  title: string;            // brief first-glance line (§17)
  detail: string;           // expandable explanation
  evidence?: string[];
  confidence?: number;      // 0-100 where derived from signal agreement
  source: string;           // which detector produced it
  dismissed?: boolean;
}

export interface ActiveNexusConfig {
  enabled: boolean;
  level: 'observe' | 'alert';
  /** §19 Voice Alert Mode: speak warning/critical alerts via speechSynthesis. */
  voice?: boolean;
}

const CONFIG_KEY = 'raptor_nexus_active';
const FEED_KEY = 'raptor_nexus_alert_feed';
const FEED_CAP = 100;

// Per-key cooldowns (§18): a repeated condition doesn't re-alert until the
// cooldown elapses or the condition escalates.
const COOLDOWN_MS: Record<NexusAlertSeverity, number> = {
  info: 30 * 60_000,
  opportunity: 20 * 60_000,
  warning: 10 * 60_000,
  critical: 5 * 60_000,
};

export function loadActiveConfig(): ActiveNexusConfig {
  try {
    const c = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
    if (c && typeof c.enabled === 'boolean') return c;
  } catch { /* ignore */ }
  return { enabled: false, level: 'alert' };
}

export function saveActiveConfig(c: ActiveNexusConfig): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export function loadAlertFeed(): NexusAlert[] {
  try {
    const a = JSON.parse(localStorage.getItem(FEED_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

function saveFeed(feed: NexusAlert[]): void {
  try { localStorage.setItem(FEED_KEY, JSON.stringify(feed.slice(0, FEED_CAP))); } catch { /* ignore */ }
}

export function dismissAlert(id: string): NexusAlert[] {
  const feed = loadAlertFeed().map((a) => (a.id === id ? { ...a, dismissed: true } : a));
  saveFeed(feed);
  return feed;
}

export function clearAlertFeed(): void {
  saveFeed([]);
}

/** External producers (e.g. §10 condition alerts) can add to the Alert
 *  Center feed through the same dedup/cooldown gate as the scanners. */
export function pushExternalAlert(a: Omit<NexusAlert, 'id' | 'ts'>): void {
  pushAlerts([a]);
}

/** Append new alerts respecting dedup + cooldown; returns {feed, fresh}. */
function pushAlerts(candidates: Omit<NexusAlert, 'id' | 'ts'>[]): { feed: NexusAlert[]; fresh: NexusAlert[] } {
  const feed = loadAlertFeed();
  const now = Date.now();
  const fresh: NexusAlert[] = [];
  for (const c of candidates) {
    const last = feed.find((a) => a.key === c.key);
    if (last && now - last.ts < COOLDOWN_MS[c.severity]) continue; // §18 cooldown
    const alert: NexusAlert = { ...c, id: `na-${now}-${Math.random().toString(36).slice(2, 7)}`, ts: now };
    feed.unshift(alert);
    fresh.push(alert);
  }
  if (fresh.length > 0) saveFeed(feed);
  return { feed, fresh };
}

// ─── Detectors (all real data; nothing simulated) ─────────────────

// Market-state transition memory (per symbol, module-lifetime).
const lastStates = new Map<string, string>();
// Rolling spread windows per symbol for anomaly detection.
const spreadWindows = new Map<string, number[]>();

function detectStateTransition(ctx: NexusContext): Omit<NexusAlert, 'id' | 'ts'>[] {
  const ms = ctx.marketState;
  if (!ms) return [];
  const prev = lastStates.get(ms.symbol);
  lastStates.set(ms.symbol, ms.state);
  if (!prev || prev === ms.state) return [];
  const worsening = ms.state.includes('Downtrend') || prev.includes('Uptrend');
  return [{
    key: `state-${ms.symbol}`,
    severity: ms.state.includes('Strong') ? 'opportunity' : 'warning',
    symbol: ms.symbol,
    title: `${ms.symbol} ${ms.timeframe} state changed: ${prev} → ${ms.state}`,
    detail: `The bar-based classification moved from "${prev}" to "${ms.state}" (${ms.volatility.toLowerCase()}). ${worsening ? 'Existing longs face elevated risk if the change confirms.' : 'Watch for confirmation before acting.'} This is an evidence-based assessment, not a prediction.`,
    evidence: ms.evidence,
    confidence: ms.confidence,
    source: 'market-state',
  }];
}

function detectGuardian(ctx: NexusContext): Omit<NexusAlert, 'id' | 'ts'>[] {
  const out: Omit<NexusAlert, 'id' | 'ts'>[] = [];
  const noSl = ctx.positions.filter((p) => p.sl == null || p.sl === 0);
  if (noSl.length > 0) {
    out.push({
      key: `nosl-${noSl.map((p) => p.symbol).sort().join(',')}`,
      severity: 'critical',
      title: `${noSl.length} open position(s) without a stop loss`,
      detail: `Unprotected: ${noSl.map((p) => `${p.direction} ${p.size} ${p.symbol}`).join(', ')}. A position with no stop has unbounded downside — consider defining one at a technical level.`,
      evidence: noSl.map((p) => `${p.symbol}: SL not set, floating P&L ${p.floatingPnl >= 0 ? '+' : ''}${p.floatingPnl.toFixed(2)}`),
      source: 'trade-guardian',
    });
  }
  const bigLosers = ctx.positions.filter((p) => p.floatingPnl <= -100);
  for (const p of bigLosers) {
    out.push({
      key: `loss-${p.symbol}-${p.direction}`,
      severity: 'warning',
      symbol: p.symbol,
      title: `${p.symbol} ${p.direction} floating loss ${p.floatingPnl.toFixed(2)}`,
      detail: `${p.direction} ${p.size} ${p.symbol} opened @ ${p.openPrice} is now ${p.currentPrice}. Re-check whether the original entry thesis still holds; if it is invalidated, the loss is information, not a reason to widen the stop.`,
      evidence: [`Open ${p.openPrice} → now ${p.currentPrice}`, `SL ${p.sl ?? 'not set'} · TP ${p.tp ?? 'not set'}`],
      source: 'trade-guardian',
    });
  }
  // Directional concentration (§11, simple same-symbol/currency stacking)
  const dirCount = new Map<string, number>();
  for (const p of ctx.positions) {
    for (const ccy of [p.symbol.slice(0, 3), p.symbol.slice(3, 6)]) {
      if (ccy.length === 3) dirCount.set(ccy, (dirCount.get(ccy) ?? 0) + 1);
    }
  }
  const concentrated = [...dirCount.entries()].filter(([, n]) => n >= 3);
  if (concentrated.length > 0) {
    out.push({
      key: `conc-${concentrated.map(([c]) => c).join(',')}`,
      severity: 'warning',
      title: `Concentrated exposure: ${concentrated.map(([c, n]) => `${c} in ${n} positions`).join(', ')}`,
      detail: 'Several positions share the same currency. Individually small trades can behave as one large position when that currency moves.',
      evidence: ctx.positions.map((p) => `${p.direction} ${p.size} ${p.symbol}`),
      source: 'portfolio-guardian',
    });
  }
  return out;
}

function detectSpreadAnomaly(ctx: NexusContext): Omit<NexusAlert, 'id' | 'ts'>[] {
  const out: Omit<NexusAlert, 'id' | 'ts'>[] = [];
  for (const q of ctx.quotes) {
    const w = spreadWindows.get(q.symbol) ?? [];
    w.push(q.spread);
    if (w.length > 30) w.shift();
    spreadWindows.set(q.symbol, w);
    if (w.length < 10) continue;
    const median = [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)];
    if (median > 0 && q.spread > median * 3) {
      out.push({
        key: `spread-${q.symbol}`,
        severity: 'warning',
        symbol: q.symbol,
        title: `${q.symbol} spread widened to ${q.spread} (~${(q.spread / median).toFixed(1)}× normal)`,
        detail: `Median spread over the recent window is ${median.toFixed(2)}; it is now ${q.spread}. Execution costs and slippage risk are elevated — market orders and tight stops are most affected.`,
        evidence: [`Rolling median ${median.toFixed(2)} vs current ${q.spread}`, `Window: last ${w.length} observations`],
        source: 'execution-monitor',
      });
    }
  }
  return out;
}

/** Run every detector once against a fresh context. Honest by construction:
 *  returns only alerts derived from the data passed in. */
export function runActiveScan(ctx: NexusContext): { feed: NexusAlert[]; fresh: NexusAlert[] } {
  const candidates = [
    ...detectStateTransition(ctx),
    ...detectGuardian(ctx),
    ...detectSpreadAnomaly(ctx),
  ];
  return pushAlerts(candidates);
}

export const SEVERITY_STYLES: Record<NexusAlertSeverity, { color: string; label: string }> = {
  info: { color: '#00b4ff', label: 'Info' },
  opportunity: { color: '#00dc82', label: 'Opportunity' },
  warning: { color: '#f59e0b', label: 'Warning' },
  critical: { color: '#ef4444', label: 'Critical' },
};
