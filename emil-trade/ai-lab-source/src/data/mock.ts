import type {
  DashboardData,
  MarketTick,
  Strategy,
  Position,
  ResearchPaper,
  AuditEvent,
  EquityPoint,
  Trade,
  Regime,
} from '../types';

export const SYMBOL_GROUPS: Record<string, string[]> = {
  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP'],
  Stocks: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'],
  Crypto: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
  Indian: ['NIFTY50', 'SENSEX', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'RELIANCE', 'TCS', 'INFY', 'HDFC'],
  'India MCX': ['GOLDMCX', 'SILVERMCX', 'CRUDEMCX', 'NATGASMCX'],
  Metals: ['GOLD', 'SILVER', 'PLATINUM'],
  Energies: ['CRUDEOIL', 'NATURALGAS'],
  Indices: ['SPX500', 'DJI30', 'NASDAQ', 'FTSE100', 'DAX40', 'NIKKEI225'],
  CFDs: ['UK100', 'GER40', 'FRA40'],
};

const BASE_PRICE: Record<string, number> = {
  EURUSD: 1.085, GBPUSD: 1.27, USDJPY: 149.5, AUDUSD: 0.66, USDCAD: 1.36, NZDUSD: 0.61, EURGBP: 0.854,
  AAPL: 192, MSFT: 415, GOOGL: 168, TSLA: 245, AMZN: 178, NVDA: 880, META: 495,
  BTCUSDT: 67000, ETHUSDT: 3500, BNBUSDT: 590, SOLUSDT: 165, XRPUSDT: 0.52,
  NIFTY50: 22400, SENSEX: 73800, BANKNIFTY: 48200, FINNIFTY: 21050, NIFTYIT: 34200, RELIANCE: 2950, TCS: 3880, INFY: 1470, HDFC: 1680,
  GOLDMCX: 71800, SILVERMCX: 84500, CRUDEMCX: 6850, NATGASMCX: 195,
  GOLD: 2350, SILVER: 28.5, PLATINUM: 975, CRUDEOIL: 82.5, NATURALGAS: 2.35,
  SPX500: 5250, DJI30: 39800, NASDAQ: 18400, FTSE100: 8180, DAX40: 18100, NIKKEI225: 39500,
  UK100: 8180, GER40: 18100, FRA40: 8050,
};

export function groupFor(symbol: string): string {
  for (const [g, syms] of Object.entries(SYMBOL_GROUPS)) {
    if (syms.includes(symbol)) return g;
  }
  return 'Other';
}

export function mockTicks(): MarketTick[] {
  return Object.entries(BASE_PRICE).map(([symbol, base]) => {
    const change = (Math.random() - 0.5) * 4;
    const price = base * (1 + change / 100);
    const digits = base < 5 ? 4 : 2;
    return {
      symbol,
      price: Number(price.toFixed(digits)),
      prev_close: Number(base.toFixed(digits)),
      change_pct: Number(change.toFixed(2)),
      group: groupFor(symbol),
      time: new Date().toISOString(),
    };
  });
}

export function mockCandles(symbol: string, bars = 200) {
  const base = BASE_PRICE[symbol] ?? 100;
  const digits = base < 5 ? 4 : 2;
  const vol = base * 0.01;
  let price = base;
  const out = [];
  const now = Date.now();
  for (let i = bars; i > 0; i--) {
    const open = price;
    const move = (Math.random() - 0.5) * vol * 2;
    const close = Math.max(open + move, 0.0001);
    const high = Math.max(open, close) + Math.random() * vol;
    const low = Math.min(open, close) - Math.random() * vol;
    price = close;
    out.push({
      time: new Date(now - i * 3600_000).toISOString(),
      open: Number(open.toFixed(digits)),
      high: Number(high.toFixed(digits)),
      low: Number(low.toFixed(digits)),
      close: Number(close.toFixed(digits)),
      volume: Number((Math.random() * 10000).toFixed(2)),
    });
  }
  return out;
}

export function mockEquityCurve(seed = 10000): EquityPoint[] {
  const out: EquityPoint[] = [];
  let eq = seed;
  let bench = seed;
  let peak = seed;
  const now = Date.now();
  for (let i = 0; i < 180; i++) {
    eq *= 1 + (Math.random() - 0.45) * 0.02;
    bench *= 1 + (Math.random() - 0.48) * 0.012;
    peak = Math.max(peak, eq);
    out.push({
      time: new Date(now - (180 - i) * 86400_000).toISOString(),
      equity: Number(eq.toFixed(2)),
      benchmark: Number(bench.toFixed(2)),
      drawdown: Number((((eq - peak) / peak) * 100).toFixed(2)),
    });
  }
  return out;
}

export function mockTrades(n = 40): Trade[] {
  const out: Trade[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const pnl = Number(((Math.random() - 0.42) * 400).toFixed(2));
    out.push({
      entry_time: new Date(now - (n - i) * 86400_000).toISOString(),
      exit_time: new Date(now - (n - i) * 86400_000 + 3600_000 * 6).toISOString(),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      entry: Number((100 + Math.random() * 20).toFixed(2)),
      exit: Number((100 + Math.random() * 20).toFixed(2)),
      pnl,
      return_pct: Number((pnl / 100).toFixed(2)),
    });
  }
  return out;
}

const AGENT_NAMES = [
  'MarketDataAgent', 'ResearchAgent', 'SentimentAgent', 'RegimeDetectionAgent',
  'TechnicalIndicatorAgent', 'StrategyGenerationAgent', 'BacktestingAgent',
  'RiskCheckAgent', 'RankingAgent', 'VotingAgent',
];

const STRAT_TEMPLATES = [
  { name: 'Trend Rider SMA', description: 'Fast/slow SMA crossover trend-following system that rides sustained momentum.', markets: ['EURUSD', 'BTCUSDT'], risk_level: 'Medium', best_regime: 'Trending', worst_regime: 'Ranging' },
  { name: 'RSI Mean Reversion', description: 'Fades RSI extremes for short-term reversals in range-bound markets.', markets: ['AAPL', 'NIFTY50'], risk_level: 'Low', best_regime: 'Ranging', worst_regime: 'Trending' },
  { name: 'MACD Momentum', description: 'MACD histogram cross momentum entries with ATR-based exits.', markets: ['NVDA', 'ETHUSDT'], risk_level: 'High', best_regime: 'Volatile', worst_regime: 'Quiet' },
  { name: 'Donchian Breakout', description: '20-bar breakout with volatility-scaled ATR stops for trend capture.', markets: ['GOLD', 'CRUDEOIL'], risk_level: 'Medium', best_regime: 'Breakout', worst_regime: 'Ranging' },
  { name: 'Bollinger Squeeze', description: 'Trades expansion after low-volatility Bollinger Band squeezes.', markets: ['SPX500', 'NASDAQ'], risk_level: 'Medium', best_regime: 'Volatile', worst_regime: 'Trending' },
  { name: 'Momentum Rotation', description: 'Rotates capital into the strongest relative-strength assets each period.', markets: ['MSFT', 'GOOGL'], risk_level: 'Low', best_regime: 'Trending', worst_regime: 'Choppy' },
];

const STATUSES = ['PENDING', 'PAPER', 'APPROVED', 'REJECTED', 'PENDING', 'PAPER'];

function metricsFor(i: number) {
  const rng = (a: number, b: number) => Number((a + Math.random() * (b - a)).toFixed(2));
  return {
    total_return_pct: rng(8, 65),
    cagr_pct: rng(6, 40),
    max_drawdown_pct: rng(4, 22),
    sharpe: rng(0.8, 2.6),
    sortino: rng(1.0, 3.2),
    calmar: rng(0.6, 2.4),
    win_rate_pct: rng(42, 68),
    profit_factor: rng(1.1, 2.5),
    avg_trade: rng(-20, 90),
    num_trades: Math.floor(30 + Math.random() * 200),
    max_consecutive_losses: Math.floor(2 + Math.random() * 8),
    final_equity: rng(10800, 16500),
    initial_capital: 10000,
  };
}

function votesFor(): Strategy['votes'] {
  return AGENT_NAMES.slice(0, 9).map((agent) => {
    const r = Math.random();
    const vote = r > 0.55 ? 'yes' : r > 0.25 ? 'abstain' : 'no';
    return {
      agent,
      vote,
      confidence: Number((0.4 + Math.random() * 0.6).toFixed(2)),
      reasoning: `${agent} evaluated the signal quality and risk-adjusted return profile.`,
    };
  });
}

export function mockStrategies(): Strategy[] {
  return STRAT_TEMPLATES.map((t, i) => ({
    id: i + 1,
    name: t.name,
    description: t.description,
    status: STATUSES[i % STATUSES.length],
    mode: 'demo',
    config: {
      markets: t.markets,
      symbol: t.markets[0],
      timeframe: '1H',
      risk_pct: 0.02,
      sl_atr: 1.5,
      tp_atr: 3,
      risk_level: t.risk_level,
      best_regime: t.best_regime,
      worst_regime: t.worst_regime,
      expected_return: Number((10 + Math.random() * 40).toFixed(1)),
      explanation: `${t.name} exploits ${t.best_regime.toLowerCase()} conditions. It enters on confirmed signals and manages risk with ATR-scaled stops, historically outperforming in ${t.best_regime.toLowerCase()} regimes while underperforming during ${t.worst_regime.toLowerCase()} phases.`,
    },
    created_at: new Date(Date.now() - i * 3600_000).toISOString(),
    approved_at: null,
    approved_by: null,
    backtest: {
      metrics: metricsFor(i),
      equity_curve: mockEquityCurve(),
      trades: mockTrades(),
    },
    votes: votesFor(),
  }));
}

export function mockPositions(): Position[] {
  const syms = ['EURUSD', 'BTCUSDT', 'AAPL', 'GOLD', 'NIFTY50'];
  return syms.map((symbol, i) => {
    const base = BASE_PRICE[symbol] ?? 100;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const entry = base * (1 + (Math.random() - 0.5) * 0.01);
    const current = base * (1 + (Math.random() - 0.5) * 0.02);
    const dir = side === 'buy' ? 1 : -1;
    const qty = Number((Math.random() * 5 + 0.5).toFixed(2));
    return {
      id: i + 1,
      strategy_id: (i % 4) + 1,
      symbol,
      side,
      qty,
      entry_price: Number(entry.toFixed(4)),
      current_price: Number(current.toFixed(4)),
      pnl: Number(((current - entry) * dir * qty * 100).toFixed(2)),
      status: 'open',
      opened_at: new Date(Date.now() - i * 5400_000).toISOString(),
    };
  });
}




export function mockResearch(): ResearchPaper[] {
  const papers = [
    { title: 'Time-Series Momentum Across Asset Classes', authors: 'Moskowitz, Ooi, Pedersen', abstract: 'Documents significant time-series momentum in equity index, currency, commodity, and bond futures, persistent for 1-12 months.', insights: ['12-month lookback captures persistent trends', 'Works across all liquid asset classes', 'Low correlation to traditional factors'], relevance: 0.94 },
    { title: 'Mean Reversion in Short-Horizon Equity Returns', authors: 'Lehmann', abstract: 'Short-term reversal effect where past losers outperform winners over weekly horizons.', insights: ['Weekly reversals exploit overreaction', 'Strongest in high-volatility names', 'Requires tight risk control'], relevance: 0.81 },
    { title: 'Volatility Regime Switching for Strategy Allocation', authors: 'Ang, Bekaert', abstract: 'Regime-switching models improve risk-adjusted returns by adapting exposure to detected volatility states.', insights: ['Detect high/low vol regimes', 'Scale exposure inversely to volatility', 'Improves Calmar ratio materially'], relevance: 0.88 },
    { title: 'Trend Following with Managed Futures', authors: 'Hurst, Ooi, Pedersen', abstract: 'A century of evidence that simple trend-following delivers positive returns across market crises.', insights: ['Crisis alpha in tail events', 'Diversify across timeframes', 'Robust to parameter choice'], relevance: 0.9 },
    { title: 'The Profitability of Technical Trading Rules', authors: 'Brock, Lakonishok, LeBaron', abstract: 'Moving-average and range breakout rules show predictive power inconsistent with random-walk pricing.', insights: ['MA rules add value net of costs', 'Breakouts precede volatility', 'Combine filters to reduce whipsaws'], relevance: 0.76 },
  ];
  return papers.map((p, i) => ({
    id: i + 1,
    title: p.title,
    authors: p.authors,
    abstract: p.abstract,
    insights: p.insights,
    relevance_score: p.relevance,
    created_at: new Date(Date.now() - i * 86400_000).toISOString(),
  }));
}

export function mockEvents(): AuditEvent[] {
  const events = [
    { event_type: 'pipeline_started', message: 'AI agent pipeline started — 15 agents engaged.' },
    { event_type: 'agent_complete', message: 'MarketDataAgent fetched OHLCV across global venues.' },
    { event_type: 'strategy_generated', message: 'StrategyGenerationAgent produced 6 candidate strategies.' },
    { event_type: 'backtest_complete', message: 'BacktestingAgent completed 6 backtests.' },
    { event_type: 'risk_check', message: 'RiskCheckAgent validated 4/6 strategies against risk limits.' },
    { event_type: 'strategy_approved', message: "Strategy 'Trend Rider SMA' approved; moved to PAPER trading." },
    { event_type: 'position_opened', message: 'Opened BUY 1.2 BTCUSDT @ 67,120.' },
    { event_type: 'market_tick', message: 'EURUSD ticked +0.12%.' },
  ];
  return events.map((e, i) => ({
    id: i + 1,
    event_type: e.event_type,
    message: e.message,
    created_at: new Date(Date.now() - i * 300_000).toISOString(),
  }));
}

export const mockRegime: Regime = {
  regime: 'Trending',
  confidence: 0.72,
  description: 'Markets are exhibiting sustained directional momentum with above-average volatility. Trend-following strategies are favored; mean-reversion setups carry elevated risk.',
};

export function mockDashboard(): DashboardData {
  const strategies = mockStrategies();
  const positions = mockPositions();
  return {
    summary: {
      total_strategies: strategies.length,
      pending_approval: strategies.filter((s) => s.status === 'PENDING').length,
      paper_trading: strategies.filter((s) => s.status === 'PAPER').length,
      open_positions: positions.length,
      total_pnl: Number(positions.reduce((a, p) => a + p.pnl, 0).toFixed(2)),
    },
    regime: mockRegime,
    recent_strategies: strategies,
    open_positions: positions,
    market_ticks: mockTicks().slice(0, 12),
    recent_events: mockEvents(),
    agents: AGENT_NAMES.map((name) => ({ name, status: 'idle' })),
  };
}
