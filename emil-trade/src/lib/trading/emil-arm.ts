// ═══════════════════════════════════════════════════════════════
// EMIL Arming & Permission Tokens — the Scanner/Hedge → EMIL handoff.
// Central rule (displayed and enforced): OPENING EMIL IS NOT AUTHORITY.
// "Arm EMIL" only carries the full proposal context into the console so
// EMIL can analyse and prepare. Execution needs an explicit per-proposal
// confirmation which mints a SINGLE-USE, time-limited, deviation-bounded
// permission token — consumed on execution, invalidated by expiry,
// cancellation or any material change. Everything is audited.
// ═══════════════════════════════════════════════════════════════

import { getPipSize } from '@/lib/trading/ticket-math';

export interface ArmedContext {
  id: string;
  kind: 'scan' | 'hedge';
  ts: number;
  expiresAt: number;          // proposals go stale — 10 minutes
  symbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryRef: number;           // reference price when armed
  stop: number | null;
  target: number | null;
  tf?: string;
  score?: number;
  // hedge-specific
  primary?: string;
  hedgeRatioPct?: number;
  corr?: number | null;
  reductionPct?: number;
  // display
  reasons?: string[];
  source: string;             // 'Scanner' | 'Hedge Engine'
}

const ARM_KEY = 'raptor_emil_armed_v1';
const TOKEN_KEY = 'raptor_emil_token_v1';
export const ARM_TTL_MS = 10 * 60_000;

export function armEmil(ctx: Omit<ArmedContext, 'id' | 'ts' | 'expiresAt'>): ArmedContext {
  const full: ArmedContext = {
    ...ctx,
    id: `${ctx.kind}-${ctx.symbol}-${Date.now()}`,
    ts: Date.now(),
    expiresAt: Date.now() + ARM_TTL_MS,
  };
  try { localStorage.setItem(ARM_KEY, JSON.stringify(full)); } catch { /* ignore */ }
  return full;
}

export function loadArmedContext(): ArmedContext | null {
  try {
    const raw = localStorage.getItem(ARM_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as ArmedContext;
    if (Date.now() > ctx.expiresAt) { localStorage.removeItem(ARM_KEY); return null; }
    return ctx;
  } catch { return null; }
}

export function clearArmedContext(): void {
  try { localStorage.removeItem(ARM_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// ── §12 Permission tokens: single-use, bounded, revocable ───────

export interface PermissionToken {
  proposalId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  maxLots: number;
  entryRef: number;
  maxDeviationPips: number;
  sl: number | null;
  tp: number | null;
  createdAt: number;
  expiresAt: number;          // 90 seconds — confirm means NOW, not later
  used: boolean;
}

export function issueToken(ctx: ArmedContext, currentMid: number): PermissionToken {
  const pip = getPipSize(ctx.symbol);
  // Allowed drift after confirmation: 15 pips or 0.05% of price, whichever
  // is larger — beyond that the proposal has materially changed.
  const maxDeviationPips = Math.max(15, (currentMid * 0.0005) / pip);
  const token: PermissionToken = {
    proposalId: ctx.id, symbol: ctx.symbol, direction: ctx.direction,
    maxLots: ctx.lots, entryRef: currentMid, maxDeviationPips,
    sl: ctx.stop, tp: ctx.target,
    createdAt: Date.now(), expiresAt: Date.now() + 90_000, used: false,
  };
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(token)); } catch { /* ignore */ }
  return token;
}

export function validateToken(token: PermissionToken, ctx: ArmedContext, currentMid: number): { ok: boolean; reason: string } {
  if (token.used) return { ok: false, reason: 'token already used — single-use by design' };
  if (Date.now() > token.expiresAt) return { ok: false, reason: 'confirmation expired (90s) — re-confirm the proposal' };
  if (token.proposalId !== ctx.id) return { ok: false, reason: 'token does not match this proposal — fresh confirmation required' };
  if (token.symbol !== ctx.symbol || token.direction !== ctx.direction) return { ok: false, reason: 'material change (instrument/direction) — fresh confirmation required' };
  const pip = getPipSize(token.symbol);
  const drift = Math.abs(currentMid - token.entryRef) / pip;
  if (drift > token.maxDeviationPips) return { ok: false, reason: `price moved ${drift.toFixed(1)} pips since confirmation (limit ${token.maxDeviationPips.toFixed(0)}) — material change, re-confirm` };
  return { ok: true, reason: '' };
}

export function consumeToken(): void {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw) {
      const t = JSON.parse(raw) as PermissionToken;
      t.used = true;
      localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    }
  } catch { /* ignore */ }
}
