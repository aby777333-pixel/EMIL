// ═══════════════════════════════════════════════════════════════
// Risk engine (enhancement prompt §15 Risk Dashboard, §14 Position Sizer).
// Every figure derives from the SAME math the backend uses:
//   pnl = priceDiff × size × contract_size   (÷100 for JPY forex pairs,
//   mirroring close_position / the instruments table exactly).
// Nothing is estimated where real data exists; gaps are flagged, not filled.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';

export interface InstrumentSpec {
  symbol: string;
  type: string;
  contractSize: number;
  pricescale: number;
}

// Fallback copy of public.instruments (same values) so the panel still
// computes when the fetch fails; live rows win when available.
const FALLBACK_SPECS: Record<string, InstrumentSpec> = {
  AUDUSD: { symbol: 'AUDUSD', type: 'forex', contractSize: 100000, pricescale: 100000 },
  BTCUSD: { symbol: 'BTCUSD', type: 'crypto', contractSize: 1, pricescale: 100 },
  ETHUSD: { symbol: 'ETHUSD', type: 'crypto', contractSize: 1, pricescale: 100 },
  EURGBP: { symbol: 'EURGBP', type: 'forex', contractSize: 100000, pricescale: 100000 },
  EURJPY: { symbol: 'EURJPY', type: 'forex', contractSize: 100000, pricescale: 1000 },
  EURUSD: { symbol: 'EURUSD', type: 'forex', contractSize: 100000, pricescale: 100000 },
  GBPJPY: { symbol: 'GBPJPY', type: 'forex', contractSize: 100000, pricescale: 1000 },
  GBPUSD: { symbol: 'GBPUSD', type: 'forex', contractSize: 100000, pricescale: 100000 },
  NAS100: { symbol: 'NAS100', type: 'index', contractSize: 1, pricescale: 10 },
  NATGAS: { symbol: 'NATGAS', type: 'energy', contractSize: 10000, pricescale: 10000 },
  NZDUSD: { symbol: 'NZDUSD', type: 'forex', contractSize: 100000, pricescale: 100000 },
  SPX500: { symbol: 'SPX500', type: 'index', contractSize: 1, pricescale: 10 },
  UKOIL: { symbol: 'UKOIL', type: 'energy', contractSize: 1000, pricescale: 1000 },
  US30: { symbol: 'US30', type: 'index', contractSize: 1, pricescale: 10 },
  USDCAD: { symbol: 'USDCAD', type: 'forex', contractSize: 100000, pricescale: 100000 },
  USDCHF: { symbol: 'USDCHF', type: 'forex', contractSize: 100000, pricescale: 100000 },
  USDJPY: { symbol: 'USDJPY', type: 'forex', contractSize: 100000, pricescale: 1000 },
  USOIL: { symbol: 'USOIL', type: 'energy', contractSize: 1000, pricescale: 1000 },
  XAGUSD: { symbol: 'XAGUSD', type: 'metal', contractSize: 5000, pricescale: 1000 },
  XAUUSD: { symbol: 'XAUUSD', type: 'metal', contractSize: 100, pricescale: 100 },
};

let specCache: Record<string, InstrumentSpec> | null = null;

export async function getInstrumentSpecs(): Promise<Record<string, InstrumentSpec>> {
  if (specCache) return specCache;
  try {
    const { data } = await createClient().from('instruments').select('symbol, type, contract_size, pricescale');
    const map: Record<string, InstrumentSpec> = { ...FALLBACK_SPECS };
    for (const r of data ?? []) {
      map[r.symbol as string] = {
        symbol: r.symbol as string,
        type: r.type as string,
        contractSize: Number(r.contract_size),
        pricescale: Number(r.pricescale),
      };
    }
    specCache = map;
    return map;
  } catch {
    return FALLBACK_SPECS;
  }
}

/** Account-currency value of a 1.0 price-unit move per 1.0 lot — the exact
 *  factor close_position uses (incl. the JPY forex adjustment). */
export function valuePerUnitPerLot(spec: InstrumentSpec): number {
  let v = spec.contractSize;
  if (spec.type === 'forex' && spec.pricescale <= 1000) v = v / 100;
  return v;
}

// ── §15 open-position risk ──────────────────────────────────────

export interface PositionRisk {
  id: string;
  symbol: string;
  direction: string;
  size: number;
  openPrice: number;
  currentPrice: number;
  sl: number | null;
  floatingPnl: number;
  /** Currency loss if the SL is hit from the CURRENT price. Negative =
   *  the SL locks in profit. null = no SL (unbounded). */
  riskAtSl: number | null;
  /** Margin currently used by this position (open_price basis, like the RPC). */
  marginUsed: number | null;
}

interface DbPosition {
  id: string; symbol: string; direction: string; size: number | string;
  open_price: number | string; current_price: number | string | null;
  sl: number | string | null; floating_pnl: number | string | null;
}

export function assessPositionRisk(
  positions: DbPosition[],
  specs: Record<string, InstrumentSpec>,
  leverage: number | null,
): PositionRisk[] {
  return positions.map((p) => {
    const spec = specs[p.symbol];
    const size = Number(p.size);
    const open = Number(p.open_price);
    const cur = Number(p.current_price ?? p.open_price);
    const sl = p.sl != null ? Number(p.sl) : null;
    let riskAtSl: number | null = null;
    if (sl != null && spec) {
      const perUnit = valuePerUnitPerLot(spec);
      riskAtSl = p.direction === 'BUY'
        ? (cur - sl) * size * perUnit
        : (sl - cur) * size * perUnit;
    }
    return {
      id: p.id, symbol: p.symbol, direction: p.direction, size,
      openPrice: open, currentPrice: cur, sl,
      floatingPnl: Number(p.floating_pnl ?? 0),
      riskAtSl,
      marginUsed: spec && leverage ? (size * spec.contractSize * open) / leverage : null,
    };
  });
}

// ── §15 currency / asset exposure ───────────────────────────────

/** Net exposure in lots per currency (forex legs) or per asset (others).
 *  BUY EURUSD 0.5 → +0.5 EUR, −0.5 USD. */
export function currencyExposure(
  risks: PositionRisk[],
  specs: Record<string, InstrumentSpec>,
): { bucket: string; netLots: number }[] {
  const map = new Map<string, number>();
  const add = (k: string, v: number) => map.set(k, (map.get(k) ?? 0) + v);
  for (const r of risks) {
    const sign = r.direction === 'BUY' ? 1 : -1;
    const spec = specs[r.symbol];
    if (spec?.type === 'forex' && r.symbol.length === 6) {
      add(r.symbol.slice(0, 3), sign * r.size);
      add(r.symbol.slice(3, 6), -sign * r.size);
    } else {
      add(r.symbol, sign * r.size);
    }
  }
  return [...map.entries()]
    .map(([bucket, netLots]) => ({ bucket, netLots }))
    .filter((e) => Math.abs(e.netLots) > 1e-9)
    .sort((a, b) => Math.abs(b.netLots) - Math.abs(a.netLots));
}

// ── §15 realized P&L by period ──────────────────────────────────

interface ClosedPosition { realized_pnl: number | string | null; commission: number | string | null; swap_accrued: number | string | null; closed_at: string | null }

export function periodPnl(closed: ClosedPosition[]): {
  today: number; last7d: number; last30d: number; commission: number; swap: number; counted: number;
} {
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  let today = 0, last7d = 0, last30d = 0, commission = 0, swap = 0, counted = 0;
  for (const c of closed) {
    if (!c.closed_at) continue;
    const t = new Date(c.closed_at).getTime();
    const pnl = Number(c.realized_pnl ?? 0);
    if (t >= startOfDay.getTime()) today += pnl;
    if (now - t <= 7 * 86400_000) last7d += pnl;
    if (now - t <= 30 * 86400_000) {
      last30d += pnl;
      commission += Number(c.commission ?? 0);
      swap += Number(c.swap_accrued ?? 0);
      counted++;
    }
  }
  return { today, last7d, last30d, commission, swap, counted };
}

// ── §15 pairwise correlation from real bars ─────────────────────

export function pairCorrelations(
  symbols: string[],
  builder: OHLCVBuilder | null,
  window = 80,
): { a: string; b: string; corr: number; bars: number }[] {
  if (!builder) return [];
  const uniq = [...new Set(symbols)];
  const returns = new Map<string, number[]>();
  for (const s of uniq) {
    try {
      const bars = builder.getAllBars(s, '60').slice(-(window + 1));
      if (bars.length < 30) continue;
      const rets: number[] = [];
      for (let i = 1; i < bars.length; i++) {
        if (bars[i - 1].close > 0) rets.push(Math.log(bars[i].close / bars[i - 1].close));
      }
      returns.set(s, rets);
    } catch { /* skip */ }
  }
  const out: { a: string; b: string; corr: number; bars: number }[] = [];
  const syms = [...returns.keys()];
  for (let i = 0; i < syms.length; i++) {
    for (let j = i + 1; j < syms.length; j++) {
      const ra = returns.get(syms[i])!, rb = returns.get(syms[j])!;
      const n = Math.min(ra.length, rb.length);
      if (n < 30) continue;
      const a = ra.slice(-n), b = rb.slice(-n);
      const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
      let cov = 0, va = 0, vb = 0;
      for (let k = 0; k < n; k++) { const da = a[k] - ma, db = b[k] - mb; cov += da * db; va += da * da; vb += db * db; }
      if (va > 0 && vb > 0) out.push({ a: syms[i], b: syms[j], corr: cov / Math.sqrt(va * vb), bars: n });
    }
  }
  return out.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr));
}

// ── §14 position sizer ──────────────────────────────────────────

export interface SizerResult {
  lots: number;          // rounded DOWN to the 0.01 step — never risk more than asked
  rawLots: number;
  riskAmount: number;    // currency actually at risk with the rounded lots
  slDistance: number;
  perUnitValue: number;
  marginEstimate: number | null;
  warnings: string[];
}

export function computeLotSize(params: {
  riskAmount: number;      // account currency to risk
  entry: number;
  sl: number;
  spec: InstrumentSpec;
  equity: number | null;
  freeMargin: number | null;
  leverage: number | null;
}): SizerResult | { error: string } {
  const { riskAmount, entry, sl, spec } = params;
  if (!(riskAmount > 0)) return { error: 'Risk amount must be greater than zero.' };
  if (!(entry > 0) || !(sl > 0)) return { error: 'Entry and stop-loss prices are required.' };
  const slDistance = Math.abs(entry - sl);
  if (slDistance <= 0) return { error: 'Stop-loss must differ from the entry price.' };
  const perUnit = valuePerUnitPerLot(spec);
  const rawLots = riskAmount / (slDistance * perUnit);
  const lots = Math.max(0, Math.floor(rawLots * 100) / 100);
  const warnings: string[] = [];
  if (lots < 0.01) warnings.push('Computed size is below the 0.01 minimum lot — the stop is too wide for this risk amount.');
  const marginEstimate = params.leverage ? (lots * spec.contractSize * entry) / params.leverage : null;
  if (marginEstimate != null && params.freeMargin != null && marginEstimate > params.freeMargin) {
    warnings.push(`Estimated margin ${marginEstimate.toFixed(2)} exceeds free margin ${params.freeMargin.toFixed(2)}.`);
  }
  if (params.equity != null && riskAmount > params.equity * 0.05) {
    warnings.push('Risking more than 5% of equity on one trade is aggressive.');
  }
  return {
    lots, rawLots,
    riskAmount: lots * slDistance * perUnit,
    slDistance, perUnitValue: perUnit,
    marginEstimate, warnings,
  };
}

/** ATR(14) from real H1 bars — for the suggested stop distance. */
export function atrFromBars(builder: OHLCVBuilder | null, symbol: string): number | null {
  if (!builder) return null;
  try {
    const bars = builder.getAllBars(symbol, '60');
    if (bars.length < 15) return null;
    let sum = 0;
    for (let i = bars.length - 14; i < bars.length; i++) {
      sum += Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close),
      );
    }
    return sum / 14;
  } catch { return null; }
}
