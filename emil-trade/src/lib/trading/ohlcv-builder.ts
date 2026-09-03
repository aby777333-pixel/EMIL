// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — OHLCV Candle Builder
// Builds OHLCV candles from incoming price ticks
// ═══════════════════════════════════════════════════════════════

import type { PriceTick, OHLCVBar } from '@/types/trading';
import { PriceEngine } from './price-engine';

export type Resolution =
  | '5S' | '10S' | '15S' | '30S'
  | '1' | '2' | '3' | '5' | '10' | '15' | '20' | '30' | '45'
  | '60' | '120' | '180' | '240' | '360' | '480' | '720'
  | '1D' | '1W' | '1MN';

export const RESOLUTION_MS: Record<Resolution, number> = {
  '5S': 5_000,
  '10S': 10_000,
  '15S': 15_000,
  '30S': 30_000,
  '1': 60_000,
  '2': 120_000,
  '3': 180_000,
  '5': 300_000,
  '10': 600_000,
  '15': 900_000,
  '20': 1_200_000,
  '30': 1_800_000,
  '45': 2_700_000,
  '60': 3_600_000,
  '120': 7_200_000,
  '180': 10_800_000,
  '240': 14_400_000,
  '360': 21_600_000,
  '480': 28_800_000,
  '720': 43_200_000,
  '1D': 86_400_000,
  '1W': 604_800_000,
  '1MN': 2_592_000_000, // ~30 days
};

/** Map user-facing timeframe label to resolution key */
export const TF_TO_RESOLUTION: Record<string, Resolution> = {
  '5s': '5S',
  '10s': '10S',
  '15s': '15S',
  '30s': '30S',
  '1m': '1',
  '2m': '2',
  '3m': '3',
  '5m': '5',
  '10m': '10',
  '15m': '15',
  '20m': '20',
  '30m': '30',
  '45m': '45',
  '1H': '60',
  '2H': '120',
  '3H': '180',
  '4H': '240',
  '6H': '360',
  '8H': '480',
  '12H': '720',
  '1D': '1D',
  '1W': '1W',
  '1Mo': '1MN',
};

function getBarOpenTime(ts: number, resolutionMs: number): number {
  return Math.floor(ts / resolutionMs) * resolutionMs;
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class OHLCVBuilder {
  /** bars[symbol][resolution] = OHLCVBar[] (sorted by time ascending) */
  private bars: Map<string, Map<Resolution, OHLCVBar[]>> = new Map();
  /** currentBar[symbol][resolution] = in-progress bar */
  private currentBars: Map<string, Map<Resolution, OHLCVBar>> = new Map();

  constructor(priceEngine: PriceEngine) {
    this.generateHistoricalData(priceEngine);
  }

  /** Generate 500 historical bars per symbol per resolution for demo */
  private generateHistoricalData(engine: PriceEngine): void {
    const symbols = engine.getSymbols();
    const now = Date.now();

    for (const symbol of symbols) {
      const cfg = engine.getConfig(symbol);
      if (!cfg) continue;

      const symbolBars = new Map<Resolution, OHLCVBar[]>();
      const symbolCurrentBars = new Map<Resolution, OHLCVBar>();

      for (const res of Object.keys(RESOLUTION_MS) as Resolution[]) {
        const resMs = RESOLUTION_MS[res];
        const barCount = 500;
        const bars: OHLCVBar[] = [];

        let price = cfg.basePrice;
        const startTime = getBarOpenTime(now, resMs) - barCount * resMs;

        for (let i = 0; i < barCount; i++) {
          const barTime = startTime + i * resMs;

          // Scale volatility to the bar period (sqrt of time ratio)
          const ticksPerBar = resMs / 500; // assume ~500ms ticks
          const barVolatility = cfg.volatility * Math.sqrt(ticksPerBar) * 0.4;

          const open = price;
          const close = open + gaussianRandom() * barVolatility;

          // High and low extend beyond open/close
          const range = Math.abs(close - open);
          const wickExtension = range * (0.3 + Math.random() * 0.7);
          const high = Math.max(open, close) + Math.abs(gaussianRandom() * wickExtension * 0.5);
          const low = Math.min(open, close) - Math.abs(gaussianRandom() * wickExtension * 0.5);

          // Volume proportional to volatility (random)
          const volume = Math.floor(50 + Math.random() * 500);

          bars.push({
            // lightweight-charts expects time in seconds for UTCTimestamp
            time: Math.floor(barTime / 1000),
            open: parseFloat(open.toFixed(cfg.decimals)),
            high: parseFloat(high.toFixed(cfg.decimals)),
            low: parseFloat(low.toFixed(cfg.decimals)),
            close: parseFloat(close.toFixed(cfg.decimals)),
            volume,
          });

          // Next bar opens at this bar's close (continuity)
          price = close;

          // Mean revert gently
          price += (cfg.basePrice - price) * 0.001;
        }

        symbolBars.set(res, bars);

        // Initialize current bar from the latest bar's close
        const lastBar = bars[bars.length - 1];
        const currentBarTime = getBarOpenTime(now, resMs);
        symbolCurrentBars.set(res, {
          time: Math.floor(currentBarTime / 1000),
          open: lastBar.close,
          high: lastBar.close,
          low: lastBar.close,
          close: lastBar.close,
          volume: 0,
        });
      }

      this.bars.set(symbol, symbolBars);
      this.currentBars.set(symbol, symbolCurrentBars);
    }
  }

  /** Process an incoming price tick, updating or creating candles */
  processTick(tick: PriceTick): void {
    const { symbol, mid, ts } = tick;

    if (!this.bars.has(symbol)) {
      this.bars.set(symbol, new Map());
      this.currentBars.set(symbol, new Map());
    }

    const symbolBars = this.bars.get(symbol)!;
    const symbolCurrentBars = this.currentBars.get(symbol)!;

    for (const res of Object.keys(RESOLUTION_MS) as Resolution[]) {
      const resMs = RESOLUTION_MS[res];
      const barOpenTime = getBarOpenTime(ts, resMs);
      const barTimeSec = Math.floor(barOpenTime / 1000);

      if (!symbolBars.has(res)) {
        symbolBars.set(res, []);
      }
      if (!symbolCurrentBars.has(res)) {
        symbolCurrentBars.set(res, {
          time: barTimeSec,
          open: mid,
          high: mid,
          low: mid,
          close: mid,
          volume: 0,
        });
        continue;
      }

      const currentBar = symbolCurrentBars.get(res)!;

      if (barTimeSec > currentBar.time) {
        // Close old bar and push to history
        symbolBars.get(res)!.push({ ...currentBar });

        // Keep max 1000 bars in history
        const arr = symbolBars.get(res)!;
        if (arr.length > 1000) {
          arr.splice(0, arr.length - 1000);
        }

        // Open new bar
        symbolCurrentBars.set(res, {
          time: barTimeSec,
          open: mid,
          high: mid,
          low: mid,
          close: mid,
          volume: 1,
        });
      } else {
        // Update current bar
        currentBar.close = mid;
        if (mid > currentBar.high) currentBar.high = mid;
        if (mid < currentBar.low) currentBar.low = mid;
        currentBar.volume += 1;
      }
    }
  }

  /** Get historical bars for a symbol and resolution within a time range */
  getBars(symbol: string, resolution: Resolution, from: number, to: number): OHLCVBar[] {
    const symbolBars = this.bars.get(symbol);
    if (!symbolBars) return [];

    const bars = symbolBars.get(resolution);
    if (!bars) return [];

    // from and to are in seconds
    return bars.filter((b) => b.time >= from && b.time <= to);
  }

  /** Get all historical bars plus the current bar */
  getAllBars(symbol: string, resolution: Resolution): OHLCVBar[] {
    const symbolBars = this.bars.get(symbol);
    if (!symbolBars) return [];

    const bars = symbolBars.get(resolution) ?? [];
    const current = this.getCurrentBar(symbol, resolution);

    if (current) {
      return [...bars, current];
    }
    return [...bars];
  }

  /** Get the in-progress (current) bar */
  getCurrentBar(symbol: string, resolution: Resolution): OHLCVBar | null {
    const symbolCurrentBars = this.currentBars.get(symbol);
    if (!symbolCurrentBars) return null;
    return symbolCurrentBars.get(resolution) ?? null;
  }
}
