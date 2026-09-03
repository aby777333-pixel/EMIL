// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — AI Signal Engine
// Generates realistic trading signals for all instruments
// ═══════════════════════════════════════════════════════════════

import type { InstrumentType, PriceTick } from '@/types/trading';

export interface TradingSignal {
  id: string;
  symbol: string;
  type: InstrumentType;
  direction: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  confidence: number; // 0-100
  timeframe: string;
  reasoning: string;
  timestamp: number;
}

type AssetFilter = 'all' | 'forex' | 'metal' | 'crypto' | 'index';
type SignalFilter = 'all' | 'BUY' | 'SELL';
type ConfidenceFilter = 'all' | 'high' | 'medium';

const TIMEFRAMES = ['M15', 'M30', 'H1', 'H4', 'D1'];

const SIGNAL_REASONS: string[] = [
  'EMA Golden Cross',
  'RSI Divergence',
  'Support/Resistance Bounce',
  'MACD Histogram Reversal',
  'Trend Channel Breakout',
  'Fibonacci 61.8% Retracement',
  'Double Bottom Pattern',
  'Head & Shoulders Formation',
  'Bollinger Band Squeeze',
  'Volume Spike Breakout',
  'Stochastic Oversold Bounce',
  'Trendline Break + Retest',
  'Harmonic Bat Pattern',
  'Ichimoku Cloud Breakout',
  'Pin Bar Reversal',
  'Three White Soldiers',
  'Engulfing Candle Pattern',
  'Order Block Rejection',
];

const CONFLUENCE_EXTRAS: string[] = [
  'RSI oversold',
  'RSI overbought',
  'Volume confirmation',
  'Support bounce',
  'Resistance rejection',
  'EMA 200 alignment',
  'MACD crossover',
  'Stochastic divergence',
  'Key level confluence',
  'Trend continuation',
];

interface InstrumentMeta {
  symbol: string;
  type: InstrumentType;
  decimals: number;
  slMultiplier: number;
  tpMultiplier: number;
}

const INSTRUMENTS_META: InstrumentMeta[] = [
  { symbol: 'EURUSD', type: 'forex', decimals: 5, slMultiplier: 0.0025, tpMultiplier: 0.005 },
  { symbol: 'GBPUSD', type: 'forex', decimals: 5, slMultiplier: 0.003, tpMultiplier: 0.006 },
  { symbol: 'USDJPY', type: 'forex', decimals: 3, slMultiplier: 0.3, tpMultiplier: 0.6 },
  { symbol: 'USDCHF', type: 'forex', decimals: 5, slMultiplier: 0.0025, tpMultiplier: 0.005 },
  { symbol: 'AUDUSD', type: 'forex', decimals: 5, slMultiplier: 0.002, tpMultiplier: 0.004 },
  { symbol: 'USDCAD', type: 'forex', decimals: 5, slMultiplier: 0.0025, tpMultiplier: 0.005 },
  { symbol: 'NZDUSD', type: 'forex', decimals: 5, slMultiplier: 0.002, tpMultiplier: 0.004 },
  { symbol: 'EURGBP', type: 'forex', decimals: 5, slMultiplier: 0.002, tpMultiplier: 0.004 },
  { symbol: 'EURJPY', type: 'forex', decimals: 3, slMultiplier: 0.35, tpMultiplier: 0.7 },
  { symbol: 'GBPJPY', type: 'forex', decimals: 3, slMultiplier: 0.4, tpMultiplier: 0.8 },
  { symbol: 'XAUUSD', type: 'metal', decimals: 2, slMultiplier: 8, tpMultiplier: 16 },
  { symbol: 'XAGUSD', type: 'metal', decimals: 3, slMultiplier: 0.15, tpMultiplier: 0.3 },
  { symbol: 'BTCUSD', type: 'crypto', decimals: 1, slMultiplier: 500, tpMultiplier: 1000 },
  { symbol: 'ETHUSD', type: 'crypto', decimals: 2, slMultiplier: 30, tpMultiplier: 60 },
  { symbol: 'US30', type: 'index', decimals: 1, slMultiplier: 60, tpMultiplier: 120 },
  { symbol: 'NAS100', type: 'index', decimals: 1, slMultiplier: 40, tpMultiplier: 80 },
  { symbol: 'SPX500', type: 'index', decimals: 1, slMultiplier: 12, tpMultiplier: 24 },
  { symbol: 'USOIL', type: 'energy' as InstrumentType, decimals: 2, slMultiplier: 0.4, tpMultiplier: 0.8 },
  { symbol: 'UKOIL', type: 'energy' as InstrumentType, decimals: 2, slMultiplier: 0.4, tpMultiplier: 0.8 },
  { symbol: 'NATGAS', type: 'energy' as InstrumentType, decimals: 3, slMultiplier: 0.02, tpMultiplier: 0.04 },
];

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildReasoning(): { text: string; confluences: number } {
  const primary = randomPick(SIGNAL_REASONS);
  const numExtras = Math.floor(Math.random() * 3); // 0-2 extras
  const extras: string[] = [];
  const used = new Set<number>();

  for (let i = 0; i < numExtras; i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * CONFLUENCE_EXTRAS.length);
    } while (used.has(idx));
    used.add(idx);
    extras.push(CONFLUENCE_EXTRAS[idx]);
  }

  const parts = [primary, ...extras];
  return {
    text: parts.join(' + '),
    confluences: parts.length,
  };
}

export function generateSignal(
  meta: InstrumentMeta,
  prices: Record<string, PriceTick>
): TradingSignal {
  const tick = prices[meta.symbol];
  const mid = tick ? tick.mid : 0;

  const direction: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const timeframe = randomPick(TIMEFRAMES);
  const { text, confluences } = buildReasoning();

  // Higher base confidence for more confluences
  let confidence = 35 + Math.random() * 30; // 35-65 base
  confidence += confluences * 12; // +12 per confluence
  confidence = Math.min(97, Math.max(20, Math.round(confidence)));

  // Vary SL/TP slightly
  const slVariance = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
  const tpVariance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  const slDist = meta.slMultiplier * slVariance;
  const tpDist = meta.tpMultiplier * tpVariance;

  let entry: number;
  let sl: number;
  let tp: number;

  if (direction === 'BUY') {
    entry = mid;
    sl = round(entry - slDist, meta.decimals);
    tp = round(entry + tpDist, meta.decimals);
  } else {
    entry = mid;
    sl = round(entry + slDist, meta.decimals);
    tp = round(entry - tpDist, meta.decimals);
  }

  return {
    id: generateId(),
    symbol: meta.symbol,
    type: meta.type,
    direction,
    entry: round(entry, meta.decimals),
    sl,
    tp,
    confidence,
    timeframe,
    reasoning: text,
    timestamp: Date.now(),
  };
}

export function generateInitialSignals(
  prices: Record<string, PriceTick>,
  count: number = 10
): TradingSignal[] {
  const signals: TradingSignal[] = [];
  const shuffled = [...INSTRUMENTS_META].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  for (const meta of selected) {
    signals.push(generateSignal(meta, prices));
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

export function generateNewSignals(
  prices: Record<string, PriceTick>,
  count: number = 2
): TradingSignal[] {
  const signals: TradingSignal[] = [];
  const shuffled = [...INSTRUMENTS_META].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  for (const meta of selected) {
    signals.push(generateSignal(meta, prices));
  }

  return signals;
}

export function filterSignals(
  signals: TradingSignal[],
  assetFilter: AssetFilter,
  signalFilter: SignalFilter,
  confidenceFilter: ConfidenceFilter
): TradingSignal[] {
  return signals.filter((s) => {
    if (assetFilter !== 'all') {
      const typeMap: Record<string, InstrumentType[]> = {
        forex: ['forex'],
        metal: ['metal'],
        crypto: ['crypto'],
        index: ['index'],
      };
      const allowedTypes = typeMap[assetFilter] || [];
      if (!allowedTypes.includes(s.type) && s.type !== (assetFilter as InstrumentType)) {
        // also check for energy type mapped into the categories
        if (assetFilter === 'index' && s.type === ('energy' as InstrumentType)) {
          // allow energy under index for simplicity or skip
        } else {
          return false;
        }
      }
    }

    if (signalFilter !== 'all' && s.direction !== signalFilter) {
      return false;
    }

    if (confidenceFilter === 'high' && s.confidence < 70) {
      return false;
    }
    if (confidenceFilter === 'medium' && (s.confidence < 40 || s.confidence >= 70)) {
      return false;
    }

    return true;
  });
}

export function sortSignals(
  signals: TradingSignal[],
  sortBy: 'confidence' | 'time' | 'symbol'
): TradingSignal[] {
  const sorted = [...signals];
  switch (sortBy) {
    case 'confidence':
      return sorted.sort((a, b) => b.confidence - a.confidence);
    case 'time':
      return sorted.sort((a, b) => b.timestamp - a.timestamp);
    case 'symbol':
      return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    default:
      return sorted;
  }
}
