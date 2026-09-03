export interface AgentMeta {
  name: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// The specialised agents that make up the GIO Raptor AI Strategy Lab pipeline.
// Ordered as the research → generation → validation → deployment flow runs.
export const AGENTS: AgentMeta[] = [
  { name: 'MarketDataAgent', label: 'Market Data', icon: '📊', color: '#00d4ff', description: 'Fetches OHLCV, ticks, order-book depth & funding across global venues' },
  { name: 'ScannerAgent', label: 'Global Scanner', icon: '🛰️', color: '#22d3ee', description: 'Ranks every enabled instrument by momentum, breakout & unusual volume' },
  { name: 'ResearchAgent', label: 'Research', icon: '📚', color: '#a78bfa', description: 'Mines quant papers & filings for alpha signals, with source attribution' },
  { name: 'SentimentAgent', label: 'News & Sentiment', icon: '💬', color: '#f472b6', description: 'Scores news, filings & social sentiment by reliability and impact' },
  { name: 'FundamentalAgent', label: 'Fundamentals', icon: '🏦', color: '#c084fc', description: 'Analyses earnings, valuation, macro, rates & currency exposure' },
  { name: 'RegimeDetectionAgent', label: 'Market Regime', icon: '🧭', color: '#facc15', description: 'Classifies trending / ranging / volatile / risk-on-off regimes with evidence' },
  { name: 'TechnicalIndicatorAgent', label: 'Indicators', icon: '📈', color: '#00ff88', description: 'Computes SMA, RSI, MACD, ATR, Bollinger, Supertrend, VWAP & more' },
  { name: 'StrategyGenerationAgent', label: 'Strategy Gen', icon: '🧠', color: '#00d4ff', description: 'Synthesises rule-based, factor & ML strategy hypotheses' },
  { name: 'BacktestingAgent', label: 'Backtest', icon: '⚙️', color: '#38bdf8', description: 'Tick/bar backtests with spread, slippage, swap & commission modelling' },
  { name: 'RobustnessAgent', label: 'Robustness', icon: '🔬', color: '#818cf8', description: 'Walk-forward, Monte Carlo, stress & parameter-sensitivity testing' },
  { name: 'RiskCheckAgent', label: 'Risk Check', icon: '🛡️', color: '#ffaa00', description: 'Validates drawdown, leverage, exposure & tail-risk limits' },
  { name: 'RankingAgent', label: 'Ranking', icon: '🏆', color: '#fbbf24', description: 'Weighted multi-metric scoring — never return alone' },
  { name: 'VotingAgent', label: 'Debate & Vote', icon: '🗳️', color: '#00ff88', description: 'Aggregates multi-agent debate into a final consensus vote' },
  { name: 'ExecutionAgent', label: 'Execution', icon: '⚡', color: '#34d399', description: 'Deterministic order routing, reconciliation & duplicate-order guards' },
  { name: 'MonitoringAgent', label: 'Monitoring', icon: '📡', color: '#2dd4bf', description: 'Watches P&L, drawdown, drift, data-feed & broker health in real time' },
];

export const AGENT_MAP: Record<string, AgentMeta> = Object.fromEntries(
  AGENTS.map((a) => [a.name, a]),
);

export function agentMeta(name: string): AgentMeta {
  return (
    AGENT_MAP[name] || {
      name,
      label: name,
      icon: '🤖',
      color: '#00d4ff',
      description: '',
    }
  );
}
