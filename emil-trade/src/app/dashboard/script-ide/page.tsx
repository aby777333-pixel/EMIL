'use client';

import { ScriptIDE } from '@/components/raptor-script/ScriptIDE';
import type { ScriptFile, RuntimeInstance, BacktestResult } from '@/types/raptor-script';

const MOCK_SCRIPTS: ScriptFile[] = [
  { id: 's1', name: 'Trend Rider EA', fileName: 'TrendRider.raptor.ts', decorator: '@ea', hooks: ['onInit', 'onTick', 'onBar', 'onDeinit'], version: 3, isValid: true, errors: [], warnings: [], lastSaved: new Date().toISOString(), lastRun: new Date(Date.now() - 3600000).toISOString(),
    params: [{ name: 'fastPeriod', type: 'number', defaultValue: 8, label: 'Fast MA', min: 2, max: 100, step: 1 }, { name: 'slowPeriod', type: 'number', defaultValue: 21, label: 'Slow MA', min: 5, max: 200, step: 1 }, { name: 'lotSize', type: 'number', defaultValue: 0.1, label: 'Lot Size', min: 0.01, max: 10, step: 0.01 }, { name: 'stopLoss', type: 'number', defaultValue: 50, label: 'Stop Loss (pts)', min: 10, max: 500, step: 5 }],
    code: `@ea\nexport default class TrendRider {\n  @param({ label: 'Fast MA', default: 8 }) fastPeriod: number;\n  @param({ label: 'Slow MA', default: 21 }) slowPeriod: number;\n  @param({ label: 'Lot Size', default: 0.1 }) lotSize: number;\n  @param({ label: 'Stop Loss', default: 50 }) stopLoss: number;\n\n  private fastMA: number = 0;\n  private slowMA: number = 0;\n\n  onInit() {\n    log('TrendRider initialized');\n  }\n\n  onBar(bar: OHLCV) {\n    this.fastMA = sma(close, this.fastPeriod);\n    this.slowMA = sma(close, this.slowPeriod);\n\n    if (crossOver(this.fastMA, this.slowMA)) {\n      place({\n        type: 'market',\n        direction: 'buy',\n        volume: this.lotSize,\n        stopLoss: bid() - this.stopLoss * point(),\n        takeProfit: bid() + this.stopLoss * 2 * point(),\n      });\n    }\n\n    if (crossUnder(this.fastMA, this.slowMA)) {\n      place({\n        type: 'market',\n        direction: 'sell',\n        volume: this.lotSize,\n        stopLoss: ask() + this.stopLoss * point(),\n        takeProfit: ask() - this.stopLoss * 2 * point(),\n      });\n    }\n  }\n\n  onDeinit() {\n    log('TrendRider stopped');\n  }\n}` },
  { id: 's2', name: 'RSI Divergence Indicator', fileName: 'RSIDivergence.raptor.ts', decorator: '@indicator', hooks: ['onInit', 'onBar'], version: 1, isValid: true, errors: [], warnings: [], lastSaved: new Date().toISOString(), lastRun: null, params: [{ name: 'rsiPeriod', type: 'number', defaultValue: 14, label: 'RSI Period', min: 5, max: 50 }],
    code: `@indicator\nexport default class RSIDivergence {\n  @param({ label: 'RSI Period', default: 14 }) rsiPeriod: number;\n\n  onBar(bar: OHLCV) {\n    const rsiVal = rsi(close, this.rsiPeriod);\n    // Detect bullish/bearish divergence\n    plotLine('RSI', rsiVal, { color: '#00b4ff' });\n  }\n}` },
];

const MOCK_RUNTIMES: RuntimeInstance[] = [
  { id: 'rt1', scriptId: 's1', scriptName: 'Trend Rider EA', status: 'running', instrument: 'EURUSD', timeframe: 'H1', params: {}, cpuUsage: 12, memoryMb: 24, apiCallsPerMin: 45, uptime: '4h 23m', lastTick: new Date().toISOString(), errorMessage: null, tradesExecuted: 12, pnl: 342.50 },
];

const MOCK_BACKTEST: BacktestResult = {
  id: 'bt1', config: { scriptId: 's1', symbol: 'EURUSD', timeframe: 'H1', startDate: '2025-01-01', endDate: '2025-12-31', params: { fastPeriod: 8, slowPeriod: 21, lotSize: 0.1, stopLoss: 50 }, initialBalance: 10000, leverage: 100, spreadModel: 'historical', fixedSpread: null, slippageModel: 'variable', fixedSlippage: null, executionDelay: 50, swapEnabled: true, commissionPerLot: 7 },
  status: 'completed', progress: 100,
  metrics: { netProfit: 4230, grossProfit: 8900, grossLoss: -4670, profitFactor: 1.91, winRate: 62.3, totalTrades: 187, winningTrades: 116, losingTrades: 71, avgWin: 76.72, avgLoss: -65.77, largestWin: 534.20, largestLoss: -312.50, maxConsecutiveWins: 8, maxConsecutiveLosses: 4, maxDrawdown: 1240, maxDrawdownPct: 8.7, maxDrawdownDuration: '12d', recoveryFactor: 3.41, sharpeRatio: 1.92, sortinoRatio: 2.45, calmarRatio: 3.41, ulcerIndex: 4.2, expectancy: 22.62, avgHoldTime: '6.4h', totalCommission: 130.90, totalSwap: -89.40 },
  equityCurve: Array.from({ length: 100 }, (_, i) => ({ timestamp: new Date(2025, 0, 1 + i * 3.65).toISOString(), equity: 10000 + i * 42.3 + (Math.random() - 0.35) * 300, balance: 10000 + i * 40, drawdown: Math.random() * 500 })),
  trades: [], monthlyReturns: Array.from({ length: 12 }, (_, i) => ({ year: 2025, month: i + 1, returnPct: (Math.random() - 0.2) * 8, trades: 12 + Math.floor(Math.random() * 10), pnl: (Math.random() - 0.2) * 800 })),
  startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 45000,
};

export default function ScriptIDEPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR SCRIPT IDE</h1>
        <p className="text-xs text-white/30">Write, test, and deploy trading strategies — TypeScript-native scripting runtime</p>
      </div>
      <ScriptIDE scripts={MOCK_SCRIPTS} runtimes={MOCK_RUNTIMES} backtestResults={[MOCK_BACKTEST]}
        onSave={s => console.log('Save', s.name)} onRun={id => console.log('Run', id)}
        onStop={id => console.log('Stop', id)} onBacktest={id => console.log('Backtest', id)} />
    </div>
  );
}
