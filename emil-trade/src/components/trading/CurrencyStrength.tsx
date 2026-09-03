'use client';

import { useMemo } from 'react';
import { useTradingStore } from '@/stores/trading';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Base prices for % change calculation (same as price-engine defaults)
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0845, GBPUSD: 1.2650, USDJPY: 154.50, USDCHF: 0.8820,
  AUDUSD: 0.6550, USDCAD: 1.3650, NZDUSD: 0.6120, EURGBP: 0.8570,
  EURJPY: 167.50, GBPJPY: 195.40, XAUUSD: 2340.0, XAGUSD: 27.50,
};

// Pairs each currency participates in: [pair, isBase]
const CURRENCY_PAIRS: Record<string, [string, boolean][]> = {
  USD: [
    ['EURUSD', false], ['GBPUSD', false], ['USDJPY', true], ['USDCHF', true],
    ['AUDUSD', false], ['USDCAD', true], ['NZDUSD', false],
  ],
  EUR: [['EURUSD', true], ['EURGBP', true], ['EURJPY', true]],
  GBP: [['GBPUSD', true], ['EURGBP', false], ['GBPJPY', true]],
  JPY: [['USDJPY', false], ['EURJPY', false], ['GBPJPY', false]],
  CHF: [['USDCHF', false]],
  CAD: [['USDCAD', false]],
  AUD: [['AUDUSD', true]],
  NZD: [['NZDUSD', true]],
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

export default function CurrencyStrength() {
  const prices = useTradingStore(s => s.prices);

  const strengths = useMemo(() => {
    const raw: Record<string, number> = {};

    for (const ccy of CURRENCIES) {
      let totalPctChange = 0;
      let pairCount = 0;
      const pairs = CURRENCY_PAIRS[ccy] ?? [];

      for (const [pair, isBase] of pairs) {
        const tick = prices[pair];
        const base = BASE_PRICES[pair];
        if (!tick || !base) continue;

        const pctChange = ((tick.mid - base) / base) * 100;
        // If currency is the base of the pair, a rising pair means the currency is strengthening
        // If currency is the quote of the pair, a rising pair means it is weakening
        totalPctChange += isBase ? pctChange : -pctChange;
        pairCount++;
      }

      raw[ccy] = pairCount > 0 ? totalPctChange / pairCount : 0;
    }

    // Normalize to 0-100 scale
    const values = Object.values(raw);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const normalized: { currency: string; strength: number; rawChange: number }[] = CURRENCIES.map(ccy => ({
      currency: ccy,
      strength: ((raw[ccy] - min) / range) * 100,
      rawChange: raw[ccy],
    }));

    normalized.sort((a, b) => b.strength - a.strength);
    return normalized;
  }, [prices]);

  const strongest = strengths[0];
  const weakest = strengths[strengths.length - 1];

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">Currency Strength Meter</div>

      <div className="flex-1 p-3 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {strengths.map(({ currency, strength }) => {
          const isStrong = strength >= 60;
          const isWeak = strength <= 40;
          const barColor = isStrong
            ? `rgba(0,194,122,${0.3 + (strength / 100) * 0.5})`
            : isWeak
            ? `rgba(193,18,31,${0.3 + ((100 - strength) / 100) * 0.5})`
            : 'rgba(255,255,255,0.15)';
          const textColor = isStrong ? '#00C27A' : isWeak ? '#C1121F' : 'var(--text-secondary)';

          return (
            <div key={currency} className="flex items-center gap-2">
              <span className="text-[12px] font-mono font-bold w-8 shrink-0" style={{ color: textColor }}>
                {currency}
              </span>
              <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${strength}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="text-[11px] font-mono w-8 text-right" style={{ color: textColor }}>
                {strength.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Strongest pair suggestion */}
      {strongest && weakest && strongest.currency !== weakest.currency && (
        <div
          className="mx-3 mb-3 px-3 py-2 rounded"
          style={{ backgroundColor: 'rgba(41,171,226,0.08)', border: '1px solid rgba(41,171,226,0.15)' }}
        >
          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Strongest Pair</div>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#00C27A' }} />
            <span className="text-[13px] font-mono font-bold" style={{ color: '#0091D5' }}>
              Buy {strongest.currency}/{weakest.currency}
            </span>
            <TrendingDown size={14} style={{ color: '#C1121F' }} />
          </div>
        </div>
      )}
    </div>
  );
}
