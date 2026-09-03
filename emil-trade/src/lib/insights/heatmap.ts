// ═══════════════════════════════════════════════════════════════
// Market Heat Map (enhancement prompt §2) — computed ONLY from data the
// platform actually streams: live quotes + the OHLCV builder's real bars.
// No symbols are invented; coverage equals the streamed watchlist.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';

export type AssetClass = 'Forex' | 'Metals' | 'Crypto' | 'Indices' | 'Energy';

const CLASS_MAP: Record<string, AssetClass> = {
  EURUSD: 'Forex', GBPUSD: 'Forex', USDJPY: 'Forex', USDCHF: 'Forex',
  AUDUSD: 'Forex', USDCAD: 'Forex', NZDUSD: 'Forex', EURGBP: 'Forex',
  EURJPY: 'Forex', GBPJPY: 'Forex',
  XAUUSD: 'Metals', XAGUSD: 'Metals',
  BTCUSD: 'Crypto', ETHUSD: 'Crypto',
  US30: 'Indices', NAS100: 'Indices', SPX500: 'Indices',
  USOIL: 'Energy', UKOIL: 'Energy', NATGAS: 'Energy',
};

export interface HeatCell {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  /** % change over the lookback window (last vs first close of window). */
  changePct: number;
  /** ATR(14) as % of price — volatility. */
  atrPct: number;
  /** Rate-of-change over the last 5 bars, % — momentum. */
  momentumPct: number;
  /** Sum of bar volume over the window (platform feed volume). */
  volume: number;
  bars: number;
}

function atr14(highs: number[], lows: number[], closes: number[]): number {
  const n = highs.length;
  if (n < 15) return 0;
  let sum = 0;
  for (let i = n - 14; i < n; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    sum += tr;
  }
  return sum / 14;
}

/** Build heat cells for every streamed symbol with enough real bars.
 *  Returns cells + the honest count of symbols skipped for lack of data. */
export function computeHeatmap(
  prices: Record<string, { bid: number; ask: number }>,
  builder: OHLCVBuilder | null,
  lookbackBars = 24,
): { cells: HeatCell[]; skipped: number } {
  const cells: HeatCell[] = [];
  let skipped = 0;
  for (const [symbol, q] of Object.entries(prices)) {
    try {
      const bars = builder ? builder.getAllBars(symbol, '60') : [];
      if (bars.length < 16) { skipped++; continue; }
      const win = bars.slice(-Math.max(lookbackBars, 16));
      const closes = win.map((b) => b.close);
      const highs = win.map((b) => b.high);
      const lows = win.map((b) => b.low);
      const price = (q.bid + q.ask) / 2;
      const first = closes[0];
      const last = closes[closes.length - 1];
      const roc5 = closes.length >= 6
        ? ((last - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
        : 0;
      cells.push({
        symbol,
        assetClass: CLASS_MAP[symbol] ?? 'Forex',
        price,
        changePct: first > 0 ? ((last - first) / first) * 100 : 0,
        atrPct: price > 0 ? (atr14(highs, lows, closes) / price) * 100 : 0,
        momentumPct: roc5,
        volume: win.reduce((s, b) => s + (b.volume ?? 0), 0),
        bars: win.length,
      });
    } catch { skipped++; }
  }
  return { cells, skipped };
}

/** Background color for a change% — red↔green diverging scale. */
export function heatColor(changePct: number): string {
  const t = Math.max(-1, Math.min(1, changePct / 1.5)); // ±1.5% saturates
  const alpha = 0.12 + Math.abs(t) * 0.55;
  return t >= 0 ? `rgba(0,194,122,${alpha.toFixed(2)})` : `rgba(255,82,82,${alpha.toFixed(2)})`;
}

/** Per-asset-class rollup: average change, strongest and weakest symbol. */
export function classSummary(cells: HeatCell[]): {
  assetClass: AssetClass; avgChange: number; strongest: HeatCell; weakest: HeatCell; count: number;
}[] {
  const byClass = new Map<AssetClass, HeatCell[]>();
  for (const c of cells) {
    const list = byClass.get(c.assetClass) ?? [];
    list.push(c);
    byClass.set(c.assetClass, list);
  }
  return [...byClass.entries()].map(([assetClass, list]) => {
    const sorted = [...list].sort((a, b) => b.changePct - a.changePct);
    return {
      assetClass,
      avgChange: list.reduce((s, c) => s + c.changePct, 0) / list.length,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      count: list.length,
    };
  }).sort((a, b) => b.avgChange - a.avgChange);
}
