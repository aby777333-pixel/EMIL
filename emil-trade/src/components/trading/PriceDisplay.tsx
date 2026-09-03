'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/format';

interface PriceDisplayProps {
  bid: number;
  ask: number;
  symbol: string;
  pipDigits?: number;
}

function formatPrice(price: number, digits: number): string {
  return price.toFixed(digits);
}

function usePriceFlash(price: number): string | null {
  const prevRef = useRef(price);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (price > prevRef.current) {
      setFlash('flash-up');
    } else if (price < prevRef.current) {
      setFlash('flash-down');
    }
    prevRef.current = price;

    const timeout = setTimeout(() => setFlash(null), 200);
    return () => clearTimeout(timeout);
  }, [price]);

  return flash;
}

export function PriceDisplay({ bid, ask, symbol, pipDigits = 5 }: PriceDisplayProps) {
  const bidFlash = usePriceFlash(bid);
  const askFlash = usePriceFlash(ask);

  // Calculate spread in pips
  const pipMultiplier = Math.pow(10, pipDigits - 1); // e.g., for 5 digits, 1 pip = 0.0001
  const spread = ((ask - bid) * pipMultiplier).toFixed(1);

  return (
    <div className="flex items-center gap-4">
      {/* Symbol */}
      <div className="text-xs font-semibold uppercase text-secondary">
        {symbol}
      </div>

      {/* Bid */}
      <div className="flex flex-col items-end">
        <span className="text-[9px] uppercase tracking-wider text-muted">Bid</span>
        <span
          className={cn(
            'mono rounded px-1.5 py-0.5 text-lg font-semibold text-sell transition-colors',
            bidFlash,
          )}
        >
          {formatPrice(bid, pipDigits)}
        </span>
      </div>

      {/* Spread */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] uppercase tracking-wider text-muted">Spread</span>
        <span className="mono text-xs text-secondary">{spread}</span>
      </div>

      {/* Ask */}
      <div className="flex flex-col items-start">
        <span className="text-[9px] uppercase tracking-wider text-muted">Ask</span>
        <span
          className={cn(
            'mono rounded px-1.5 py-0.5 text-lg font-semibold text-buy transition-colors',
            askFlash,
          )}
        >
          {formatPrice(ask, pipDigits)}
        </span>
      </div>
    </div>
  );
}
