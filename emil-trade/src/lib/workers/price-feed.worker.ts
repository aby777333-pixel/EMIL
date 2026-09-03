// price-feed.worker.ts
// Simulated price feed Web Worker for EMIL TRADE dealing desk.
export {}; // ensure this file is treated as a module
// Generates random-walk price ticks every 500ms for 6 FX/commodity/crypto symbols.
// Uses native JS number math with toFixed() rounding (no Decimal.js dependency).

interface SymbolConfig {
  symbol: string;
  baseBid: number;
  spread: number;
  volatility: number;
  decimals: number;
  pipSize: number;
  currentBid: number;
}

interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;      // spread in pips
  timestamp: number;
}

const symbols: SymbolConfig[] = [
  {
    symbol: 'EURUSD',
    baseBid: 1.08450,
    spread: 0.00008,
    volatility: 0.00003,
    decimals: 5,
    pipSize: 0.00010,
    currentBid: 1.08450,
  },
  {
    symbol: 'XAUUSD',
    baseBid: 2345.50,
    spread: 0.30,
    volatility: 0.15,
    decimals: 2,
    pipSize: 0.01,
    currentBid: 2345.50,
  },
  {
    symbol: 'BTCUSD',
    baseBid: 67800.00,
    spread: 50,
    volatility: 25,
    decimals: 2,
    pipSize: 0.01,
    currentBid: 67800.00,
  },
  {
    symbol: 'GBPJPY',
    baseBid: 193.450,
    spread: 0.015,
    volatility: 0.008,
    decimals: 3,
    pipSize: 0.001,
    currentBid: 193.450,
  },
  {
    symbol: 'USDJPY',
    baseBid: 154.230,
    spread: 0.007,
    volatility: 0.004,
    decimals: 3,
    pipSize: 0.001,
    currentBid: 154.230,
  },
  {
    symbol: 'GBPUSD',
    baseBid: 1.26840,
    spread: 0.00010,
    volatility: 0.00004,
    decimals: 5,
    pipSize: 0.00010,
    currentBid: 1.26840,
  },
];

let newsSpike = false;

function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals));
}

function generateTicks(): PriceTick[] {
  const now = Date.now();

  return symbols.map((cfg) => {
    const vol = newsSpike ? cfg.volatility * 4 : cfg.volatility;
    const move = (Math.random() - 0.5) * vol * 2;

    cfg.currentBid = round(cfg.currentBid + move, cfg.decimals);

    const bid = cfg.currentBid;
    const ask = round(bid + cfg.spread, cfg.decimals);
    const spreadPips = round(cfg.spread / cfg.pipSize, 1);

    return {
      symbol: cfg.symbol,
      bid,
      ask,
      spread: spreadPips,
      timestamp: now,
    };
  });
}

// Tick loop - fires every 500ms
let intervalId: ReturnType<typeof setInterval> | null = null;

function startFeed(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    const ticks = generateTicks();
    self.postMessage({ type: 'ticks', data: ticks });
  }, 500);
}

// Listen for control messages
self.onmessage = (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === 'set_news_spike') {
    newsSpike = Boolean(msg.value);
  }
};

// Auto-start the feed when the worker loads
startFeed();
