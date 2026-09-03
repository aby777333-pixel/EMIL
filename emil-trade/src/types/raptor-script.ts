// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 13: RAPTOR SCRIPT Runtime Types
// Indigenous scripting language replacing MQL5/cAlgo
// ═══════════════════════════════════════════════════════════

// ─── Script Language ────────────────────────────────────────

export type ScriptDecorator = '@indicator' | '@ea' | '@signal' | '@risk' | '@session';
export type LifecycleHook = 'onInit' | 'onTick' | 'onBar' | 'onOrder' | 'onPosition' | 'onDeinit';

export interface ScriptFile {
  id: string;
  name: string;
  fileName: string;
  code: string;
  decorator: ScriptDecorator;
  hooks: LifecycleHook[];
  params: ScriptParam[];
  version: number;
  isValid: boolean;
  errors: ScriptError[];
  warnings: ScriptWarning[];
  lastSaved: string;
  lastRun: string | null;
}

export interface ScriptParam {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  defaultValue: number | string | boolean;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface ScriptError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ScriptWarning {
  line: number;
  message: string;
  suggestion: string;
}

// ─── Runtime ────────────────────────────────────────────────

export interface RuntimeInstance {
  id: string;
  scriptId: string;
  scriptName: string;
  status: 'running' | 'paused' | 'stopped' | 'error' | 'initializing';
  instrument: string;
  timeframe: string;
  params: Record<string, number | string | boolean>;
  cpuUsage: number;
  memoryMb: number;
  apiCallsPerMin: number;
  uptime: string;
  lastTick: string | null;
  errorMessage: string | null;
  tradesExecuted: number;
  pnl: number;
}

export interface RuntimeLimits {
  maxCpuMs: number;
  maxMemoryMb: number;
  maxApiCallsPerMin: number;
  maxConcurrentScripts: number;
  wasmEnabled: boolean;
  zeroCopyEnabled: boolean;
}

// ─── Backtest Engine ────────────────────────────────────────

export interface BacktestConfig {
  scriptId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  params: Record<string, number | string | boolean>;
  initialBalance: number;
  leverage: number;
  spreadModel: 'fixed' | 'variable' | 'historical';
  fixedSpread: number | null;
  slippageModel: 'none' | 'fixed' | 'variable' | 'market_impact';
  fixedSlippage: number | null;
  executionDelay: number;
  swapEnabled: boolean;
  commissionPerLot: number;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  metrics: BacktestMetrics | null;
  equityCurve: { timestamp: string; equity: number; balance: number; drawdown: number }[];
  trades: BacktestTrade[];
  monthlyReturns: { year: number; month: number; returnPct: number; trades: number; pnl: number }[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
}

export interface BacktestMetrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  maxDrawdownDuration: string;
  recoveryFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  ulcerIndex: number;
  expectancy: number;
  avgHoldTime: string;
  totalCommission: number;
  totalSwap: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnl: number;
  pnlPct: number;
  commission: number;
  swap: number;
  slippage: number;
  duration: string;
  maePoints: number;
  mfePoints: number;
}

// ─── Optimization ───────────────────────────────────────────

export interface OptimizationConfig {
  backtestConfig: BacktestConfig;
  paramRanges: { param: string; from: number; to: number; step: number }[];
  method: 'grid_search' | 'monte_carlo' | 'walk_forward';
  optimizeFor: 'profit_factor' | 'sharpe' | 'net_profit' | 'drawdown';
  monteCarloRuns: number | null;
  walkForwardPeriods: number | null;
}

export interface OptimizationResult {
  id: string;
  totalCombinations: number;
  completedCombinations: number;
  bestResult: BacktestMetrics & { params: Record<string, number> };
  allResults: (BacktestMetrics & { params: Record<string, number> })[];
  status: 'running' | 'completed';
  startedAt: string;
}

// ─── Code Snippets ──────────────────────────────────────────

export interface CodeSnippet {
  id: string;
  name: string;
  category: 'entry' | 'exit' | 'risk' | 'indicator' | 'utility' | 'template';
  description: string;
  code: string;
  tags: string[];
}

export const BUILT_IN_SNIPPETS: CodeSnippet[] = [
  { id: 's1', name: 'MA Crossover Entry', category: 'entry', description: 'Enter on fast MA crossing above slow MA', code: `const fastMA = sma(close, params.fastPeriod);\nconst slowMA = sma(close, params.slowPeriod);\nif (crossOver(fastMA, slowMA)) place({ type: 'market', direction: 'buy', volume: params.lotSize });`, tags: ['ma', 'crossover', 'trend'] },
  { id: 's2', name: 'RSI Overbought/Oversold', category: 'entry', description: 'Enter on RSI extremes', code: `const rsiVal = rsi(close, params.rsiPeriod);\nif (rsiVal < params.oversold) place({ type: 'market', direction: 'buy', volume: params.lotSize });\nif (rsiVal > params.overbought) place({ type: 'market', direction: 'sell', volume: params.lotSize });`, tags: ['rsi', 'oscillator', 'mean-reversion'] },
  { id: 's3', name: 'ATR Trailing Stop', category: 'exit', description: 'Trail stop loss using ATR multiplier', code: `const atrVal = atr(params.atrPeriod);\nfor (const pos of positions()) {\n  const trail = pos.direction === 'buy' ? bid() - atrVal * params.atrMultiplier : ask() + atrVal * params.atrMultiplier;\n  modify(pos.id, { stopLoss: trail });\n}`, tags: ['atr', 'trailing', 'risk'] },
  { id: 's4', name: 'Risk Per Trade', category: 'risk', description: 'Calculate lot size based on risk percentage', code: `function calcLotSize(riskPct: number, slPoints: number): number {\n  const riskAmount = equity() * (riskPct / 100);\n  return Math.max(0.01, riskAmount / (slPoints * pointValue()));\n}`, tags: ['position-sizing', 'risk-management'] },
  { id: 's5', name: 'Session Filter', category: 'utility', description: 'Only trade during specific session hours', code: `function isLondonSession(): boolean {\n  const hour = new Date().getUTCHours();\n  return hour >= 7 && hour < 16;\n}`, tags: ['session', 'time-filter'] },
  { id: 's6', name: 'Full EA Template', category: 'template', description: 'Complete EA skeleton with all lifecycle hooks', code: `@ea\nexport default class MyStrategy {\n  @param({ label: 'Period', default: 14 }) period: number;\n\n  onInit() { log('Strategy initialized'); }\n  onTick(tick: Tick) { /* your logic */ }\n  onBar(bar: OHLCV) { /* your logic */ }\n  onDeinit() { log('Strategy stopped'); }\n}`, tags: ['template', 'ea', 'skeleton'] },
];
