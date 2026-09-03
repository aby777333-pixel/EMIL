// ═══════════════════════════════════════════════════════════════
// RAPTOR Account-Level Risk Governor — one authority ABOVE every
// trading engine (manual, EMIL pilot, Scanner, Auto Hedge, Auto Scan,
// attached EAs). Each automated engine must call governorCheck()
// before placing ANY order; the governor sees combined account
// exposure regardless of which engine created it, attributing
// positions by their comment tag:
//   Manual (no tag) · EMIL:* · Scanner:* · HedgeAuto:* · ScanAuto:* · EA:*
//
// The governor never places or closes trades itself — it only gates
// new automated risk and reports status. Emergency flattening stays
// with the trader's explicit controls and Shield rules.
// ═══════════════════════════════════════════════════════════════

export interface GovernorLimits {
  maxTotalLots: number;        // combined open lots across every engine
  maxOpenPositions: number;    // combined open position count
  maxPerSymbolLots: number;    // combined lots on any single symbol
  dailyLossLimitPct: number;   // % of balance — realized+floating today
  maxAutomatedLots: number;    // lots owned by automated engines only
}

export const DEFAULT_GOVERNOR_LIMITS: GovernorLimits = {
  maxTotalLots: 2.0,
  maxOpenPositions: 12,
  maxPerSymbolLots: 0.5,
  dailyLossLimitPct: 5,
  maxAutomatedLots: 1.0,
};

const KEY = 'raptor_risk_governor_v1';

export function loadGovernorLimits(): GovernorLimits {
  try { return { ...DEFAULT_GOVERNOR_LIMITS, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) }; }
  catch { return { ...DEFAULT_GOVERNOR_LIMITS }; }
}

export function saveGovernorLimits(l: GovernorLimits): void {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

export interface GovernorPosition {
  symbol: string;
  size: number;
  status: string;
  comment?: string | null;
  realized_pnl?: number | null;
  unrealized_pnl?: number | null;
}

export function positionSource(comment: string | null | undefined):
  'manual' | 'emil' | 'scanner' | 'hedge-auto' | 'scan-auto' | 'ea' {
  const c = (comment ?? '').toLowerCase();
  if (c.startsWith('emil')) return 'emil';
  if (c.startsWith('hedgeauto')) return 'hedge-auto';
  if (c.startsWith('scanauto')) return 'scan-auto';
  if (c.startsWith('scanner')) return 'scanner';
  if (c.startsWith('ea')) return 'ea';
  return 'manual';
}

const AUTOMATED = new Set(['emil', 'scanner', 'hedge-auto', 'scan-auto', 'ea']);

export interface GovernorVerdict { allowed: boolean; reason: string }

/** The single gate every automated engine calls before ANY new order. */
export function governorCheck(params: {
  positions: GovernorPosition[];
  balance: number;
  equity: number;
  realizedToday: number;   // realized P/L today across the account
  addLots: number;         // lots the engine wants to add
  symbol: string;
}): GovernorVerdict {
  const { positions, balance, equity, realizedToday, addLots, symbol } = params;
  const l = loadGovernorLimits();
  const open = positions.filter((p) => p.status === 'open');

  const totalLots = open.reduce((a, p) => a + p.size, 0);
  if (totalLots + addLots > l.maxTotalLots) {
    return { allowed: false, reason: `total lots ${(totalLots + addLots).toFixed(2)} would exceed the account cap ${l.maxTotalLots}` };
  }
  if (open.length + 1 > l.maxOpenPositions) {
    return { allowed: false, reason: `open positions would exceed the account cap ${l.maxOpenPositions}` };
  }
  const symbolLots = open.filter((p) => p.symbol === symbol).reduce((a, p) => a + p.size, 0);
  if (symbolLots + addLots > l.maxPerSymbolLots) {
    return { allowed: false, reason: `${symbol} lots ${(symbolLots + addLots).toFixed(2)} would exceed the per-symbol cap ${l.maxPerSymbolLots}` };
  }
  const autoLots = open
    .filter((p) => AUTOMATED.has(positionSource(p.comment)))
    .reduce((a, p) => a + p.size, 0);
  if (autoLots + addLots > l.maxAutomatedLots) {
    return { allowed: false, reason: `automated lots ${(autoLots + addLots).toFixed(2)} would exceed the automation cap ${l.maxAutomatedLots}` };
  }
  if (balance > 0) {
    const floating = open.reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    const dayLoss = realizedToday + Math.min(0, floating);
    if (dayLoss < 0 && Math.abs(dayLoss) >= balance * l.dailyLossLimitPct / 100) {
      return { allowed: false, reason: `daily loss ${dayLoss.toFixed(2)} has reached the ${l.dailyLossLimitPct}% account limit — no new automated risk today` };
    }
  }
  if (equity > 0 && balance > 0 && equity < balance * 0.5) {
    return { allowed: false, reason: 'equity below 50% of balance — margin preservation overrides all engines' };
  }
  return { allowed: true, reason: 'within account-level limits' };
}

export interface SourceExposure { source: string; lots: number; positions: number; floating: number }

/** Per-engine exposure breakdown for governor status displays. */
export function exposureBySource(positions: GovernorPosition[]): SourceExposure[] {
  const open = positions.filter((p) => p.status === 'open');
  const map = new Map<string, SourceExposure>();
  for (const p of open) {
    const s = positionSource(p.comment);
    const row = map.get(s) ?? { source: s, lots: 0, positions: 0, floating: 0 };
    row.lots += p.size;
    row.positions += 1;
    row.floating += Number(p.unrealized_pnl ?? 0);
    map.set(s, row);
  }
  return [...map.values()].sort((a, b) => b.lots - a.lots);
}
