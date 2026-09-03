// pnl-engine.worker.ts
// PnL calculation Web Worker for EMIL TRADE dealing desk.
export {}; // ensure this file is treated as a module
// Receives open positions and current price ticks, calculates unrealized PnL.

interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

interface Position {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  openPrice: number;
  lots: number;
  pipSize: number;
  pipValuePerLot: number;
}

interface PnlResult {
  positionId: string;
  unrealizedPnl: number;
  currentPrice: number;
}

function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals));
}

function calculatePnl(
  positions: Position[],
  currentPrices: PriceTick[]
): PnlResult[] {
  // Build a quick lookup map: symbol -> PriceTick
  const priceMap = new Map<string, PriceTick>();
  for (const tick of currentPrices) {
    priceMap.set(tick.symbol, tick);
  }

  return positions
    .map((pos) => {
      const tick = priceMap.get(pos.symbol);
      if (!tick) return null;

      // For buy positions use bid as mark-to-market price (exit price).
      // For sell positions use ask as mark-to-market price (exit price).
      const currentPrice = pos.direction === 'buy' ? tick.bid : tick.ask;

      // Pip difference
      let pipDiff: number;
      if (pos.direction === 'buy') {
        pipDiff = (currentPrice - pos.openPrice) / pos.pipSize;
      } else {
        pipDiff = (pos.openPrice - currentPrice) / pos.pipSize;
      }

      // Round pip diff to 2 decimal places to avoid float drift
      pipDiff = round(pipDiff, 2);

      // PnL = pipDiff * pipValuePerLot * lots
      const unrealizedPnl = round(pipDiff * pos.pipValuePerLot * pos.lots, 2);

      return {
        positionId: pos.id,
        unrealizedPnl,
        currentPrice,
      };
    })
    .filter((r): r is PnlResult => r !== null);
}

// Listen for calculation requests
self.onmessage = (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === 'calculate') {
    const results = calculatePnl(msg.positions ?? [], msg.currentPrices ?? []);
    self.postMessage({ type: 'pnl_update', data: results });
  }
};
