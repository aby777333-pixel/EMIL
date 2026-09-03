// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — Simulated Price Engine (with live data support)
// Generates realistic forex/crypto/metal/index tick data
// Falls back to simulation when Twelve Data API is unavailable
// ═══════════════════════════════════════════════════════════════

import type { PriceTick, InstrumentType } from '@/types/trading';
import {
  fetchMultipleQuotes,
  type TwelveDataQuote,
} from './twelve-data';

interface InstrumentConfig {
  symbol: string;
  type: InstrumentType;
  basePrice: number;
  /** Typical single-tick volatility (absolute) */
  volatility: number;
  /** Half-spread in price units */
  halfSpread: number;
  /** Price decimal precision */
  decimals: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  // Forex majors
  { symbol: 'EURUSD', type: 'forex', basePrice: 1.0845, volatility: 0.00015, halfSpread: 0.00006, decimals: 5 },
  { symbol: 'GBPUSD', type: 'forex', basePrice: 1.2650, volatility: 0.00020, halfSpread: 0.00009, decimals: 5 },
  { symbol: 'USDJPY', type: 'forex', basePrice: 154.50, volatility: 0.015, halfSpread: 0.008, decimals: 3 },
  { symbol: 'USDCHF', type: 'forex', basePrice: 0.8820, volatility: 0.00012, halfSpread: 0.00008, decimals: 5 },
  { symbol: 'AUDUSD', type: 'forex', basePrice: 0.6550, volatility: 0.00012, halfSpread: 0.00006, decimals: 5 },
  { symbol: 'USDCAD', type: 'forex', basePrice: 1.3650, volatility: 0.00014, halfSpread: 0.00008, decimals: 5 },
  { symbol: 'NZDUSD', type: 'forex', basePrice: 0.6120, volatility: 0.00010, halfSpread: 0.00006, decimals: 5 },
  // Forex crosses
  { symbol: 'EURGBP', type: 'forex', basePrice: 0.8570, volatility: 0.00012, halfSpread: 0.00008, decimals: 5 },
  { symbol: 'EURJPY', type: 'forex', basePrice: 167.50, volatility: 0.020, halfSpread: 0.012, decimals: 3 },
  { symbol: 'GBPJPY', type: 'forex', basePrice: 195.40, volatility: 0.025, halfSpread: 0.015, decimals: 3 },
  // Metals
  { symbol: 'XAUUSD', type: 'metal', basePrice: 2340.0, volatility: 0.80, halfSpread: 0.15, decimals: 2 },
  { symbol: 'XAGUSD', type: 'metal', basePrice: 27.50, volatility: 0.025, halfSpread: 0.012, decimals: 3 },
  // Crypto
  { symbol: 'BTCUSD', type: 'crypto', basePrice: 67500.0, volatility: 35.0, halfSpread: 12.0, decimals: 1 },
  { symbol: 'ETHUSD', type: 'crypto', basePrice: 3450.0, volatility: 2.5, halfSpread: 1.0, decimals: 2 },
  // Indices
  { symbol: 'US30', type: 'index', basePrice: 39800.0, volatility: 8.0, halfSpread: 1.5, decimals: 1 },
  { symbol: 'NAS100', type: 'index', basePrice: 17950.0, volatility: 6.0, halfSpread: 1.0, decimals: 1 },
  { symbol: 'SPX500', type: 'index', basePrice: 5280.0, volatility: 1.5, halfSpread: 0.4, decimals: 1 },
  // Energy
  { symbol: 'USOIL', type: 'energy', basePrice: 78.50, volatility: 0.04, halfSpread: 0.025, decimals: 2 },
  { symbol: 'UKOIL', type: 'energy', basePrice: 82.30, volatility: 0.04, halfSpread: 0.025, decimals: 2 },
  { symbol: 'NATGAS', type: 'energy', basePrice: 2.15, volatility: 0.003, halfSpread: 0.002, decimals: 3 },
];

/** Symbols that Twelve Data supports via forex pairs */
const LIVE_CAPABLE_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY',
  'XAUUSD', 'XAGUSD',
  'BTCUSD', 'ETHUSD',
];

// Free Twelve Data tier allows 8 credits/min (1 credit per symbol). Fetching
// all symbols in one call (14 credits) returns 429 and breaks live data, so
// we round-robin through chunks of 7 — one chunk per fetch interval.
const LIVE_FETCH_CHUNK_SIZE = 7;
const LIVE_FETCH_INTERVAL_MS = 60_000;

function gaussianRandom(): number {
  // Box-Muller transform for normally distributed random numbers
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export class PriceEngine {
  private prices: Map<string, PriceTick> = new Map();
  private configs: Map<string, InstrumentConfig> = new Map();
  private midPrices: Map<string, number> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private liveIntervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Whether the engine is currently using live API data as the price base */
  public isLiveData = false;

  /** Timestamp of last successful live data fetch */
  private lastLiveFetch = 0;

  /** Round-robin index into chunked LIVE_CAPABLE_SYMBOLS */
  private liveChunkIndex = 0;

  constructor() {
    for (const cfg of INSTRUMENTS) {
      this.configs.set(cfg.symbol, cfg);
      this.midPrices.set(cfg.symbol, cfg.basePrice);

      const mid = cfg.basePrice;
      const bid = round(mid - cfg.halfSpread, cfg.decimals);
      const ask = round(mid + cfg.halfSpread, cfg.decimals);

      this.prices.set(cfg.symbol, {
        symbol: cfg.symbol,
        bid,
        ask,
        mid: round(mid, cfg.decimals),
        spread: round(ask - bid, cfg.decimals + 1),
        ts: Date.now(),
      });
    }
  }

  /**
   * Try to fetch real prices from Twelve Data and update the base mid prices.
   * Only fetches symbols that Twelve Data supports.
   *
   * Fetches one chunk (LIVE_FETCH_CHUNK_SIZE symbols) per call to stay within
   * the 8-credit/min free-tier budget. Successive calls round-robin through
   * the symbol list, so every symbol refreshes once per full cycle.
   */
  async fetchRealPrices(): Promise<boolean> {
    try {
      const totalChunks = Math.max(
        1,
        Math.ceil(LIVE_CAPABLE_SYMBOLS.length / LIVE_FETCH_CHUNK_SIZE)
      );
      const start = (this.liveChunkIndex % totalChunks) * LIVE_FETCH_CHUNK_SIZE;
      const chunk = LIVE_CAPABLE_SYMBOLS.slice(start, start + LIVE_FETCH_CHUNK_SIZE);
      this.liveChunkIndex = (this.liveChunkIndex + 1) % totalChunks;

      if (chunk.length === 0) return this.isLiveData;

      const quotes = await fetchMultipleQuotes(chunk);
      let updatedCount = 0;

      for (const [symbol, quote] of Object.entries(quotes)) {
        const price = parseFloat(quote.close);
        if (!isNaN(price) && price > 0) {
          this.midPrices.set(symbol, price);

          // Also update the base price on the config so mean reversion
          // targets the real market level
          const cfg = this.configs.get(symbol);
          if (cfg) {
            cfg.basePrice = price;
          }
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        this.isLiveData = true;
        this.lastLiveFetch = Date.now();
        return true;
      }
    } catch {
      // Silent fail - will continue with simulated data
    }

    return this.isLiveData;
  }

  /**
   * Apply a single Twelve Data quote to update the mid price for a symbol.
   */
  applyQuote(symbol: string, quote: TwelveDataQuote): void {
    const price = parseFloat(quote.close);
    if (isNaN(price) || price <= 0) return;

    this.midPrices.set(symbol, price);
    const cfg = this.configs.get(symbol);
    if (cfg) {
      cfg.basePrice = price;
    }
  }

  start(callback: (ticks: PriceTick[]) => void, intervalMs: number = 500): void {
    if (this.running) return;
    this.running = true;

    // Start the simulated tick interval (sub-second updates with small noise)
    this.intervalId = setInterval(() => {
      const ticks = this.generateTicks();
      callback(ticks);
    }, intervalMs);

    // Try live data regardless of key check. The chunked round-robin keeps
    // every refresh within the free-tier credit budget, so we always start the
    // recurring interval if the first call succeeded — subsequent chunks pick
    // up the remaining symbols.
    this.fetchRealPrices().then(success => {
      if (success && this.running && this.liveIntervalId === null) {
        this.liveIntervalId = setInterval(() => {
          this.fetchRealPrices();
        }, LIVE_FETCH_INTERVAL_MS);
      }
    });
  }

  stop(): void {
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.liveIntervalId !== null) {
      clearInterval(this.liveIntervalId);
      this.liveIntervalId = null;
    }
  }

  getPrice(symbol: string): PriceTick | null {
    return this.prices.get(symbol) ?? null;
  }

  getAllPrices(): Record<string, PriceTick> {
    const result: Record<string, PriceTick> = {};
    for (const [symbol, tick] of this.prices) {
      result[symbol] = tick;
    }
    return result;
  }

  /** Generate one tick for every instrument */
  private generateTicks(): PriceTick[] {
    const now = Date.now();
    const ticks: PriceTick[] = [];

    for (const cfg of INSTRUMENTS) {
      let mid = this.midPrices.get(cfg.symbol)!;

      // Random walk with mean reversion toward base price
      const drift = (cfg.basePrice - mid) * 0.0002; // gentle pull toward base
      const shock = gaussianRandom() * cfg.volatility;
      mid = mid + drift + shock;

      // Ensure price never goes negative
      if (mid < cfg.basePrice * 0.5) mid = cfg.basePrice * 0.5;
      if (mid > cfg.basePrice * 1.5) mid = cfg.basePrice * 1.5;

      this.midPrices.set(cfg.symbol, mid);

      // Vary spread slightly (widen/narrow randomly)
      const spreadJitter = 1 + (Math.random() - 0.5) * 0.3; // 0.85x to 1.15x
      const halfSpread = cfg.halfSpread * spreadJitter;

      const bid = round(mid - halfSpread, cfg.decimals);
      const ask = round(mid + halfSpread, cfg.decimals);

      const tick: PriceTick = {
        symbol: cfg.symbol,
        bid,
        ask,
        mid: round(mid, cfg.decimals),
        spread: round(ask - bid, cfg.decimals + 1),
        ts: now,
      };

      this.prices.set(cfg.symbol, tick);
      ticks.push(tick);
    }

    return ticks;
  }

  /** Generate a single historical tick for a given symbol at a given mid price */
  generateHistoricalTick(symbol: string, mid: number, ts: number): PriceTick {
    const cfg = this.configs.get(symbol);
    if (!cfg) throw new Error(`Unknown symbol: ${symbol}`);

    const bid = round(mid - cfg.halfSpread, cfg.decimals);
    const ask = round(mid + cfg.halfSpread, cfg.decimals);

    return {
      symbol,
      bid,
      ask,
      mid: round(mid, cfg.decimals),
      spread: round(ask - bid, cfg.decimals + 1),
      ts,
    };
  }

  getConfig(symbol: string): InstrumentConfig | undefined {
    return this.configs.get(symbol);
  }

  getSymbols(): string[] {
    return INSTRUMENTS.map((i) => i.symbol);
  }
}
