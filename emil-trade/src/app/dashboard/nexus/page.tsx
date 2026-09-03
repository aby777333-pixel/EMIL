'use client';

import { NexusCompanion } from '@/components/nexus/NexusCompanion';
import type { PreTradeBrief, NexusSignal, PsychologyAlert, TradeAlert, WeeklyReport } from '@/types/nexus';

const MOCK_BRIEF: PreTradeBrief = {
  chartAnalysis: 'EURUSD H4 showing bullish flag continuation pattern. Price above 21 EMA and 50 EMA. RSI at 58 — room to run. Volume increasing on up-candles.',
  trendDirection: 'bullish', keyLevels: [{ type: 'support', price: 1.0830, strength: 85 }, { type: 'resistance', price: 1.0900, strength: 78 }],
  existingPositions: [{ symbol: 'EURUSD', direction: 'long', count: 1 }],
  marginImpact: { freeMarginAfter: 8420, marginLevelAfter: 342 },
  marketContext: ['NFP release in 47 minutes — consider waiting', 'USD sentiment weakening across all pairs', 'ECB rate decision tomorrow — potential volatility'],
  suggestedSl: 1.08150, suggestedTp: 1.09050, rrRatio: 2.1, riskPct: 1.8,
  historicalPerformance: { setupType: 'Bullish Flag + EMA Confluence', winRate: 68, avgRr: 1.9, sampleSize: 47 },
  verdict: 'consider_waiting', verdictReason: 'NFP in 47 minutes could cause volatility. Setup is valid but timing adds risk.', confidence: 72,
};

const MOCK_SIGNALS: NexusSignal[] = [
  { id: 'ns1', symbol: 'GBPUSD', timeframe: 'H4', setupName: 'Bullish Order Block + RSI Oversold Confluence', direction: 'buy', confidence: 78, supportingFactors: ['Trend aligned on D1', 'Volume confirmation', 'H4 close above EMA'], riskFactors: ['News event in 2 hours', 'Wide spread during Asian'], suggestedEntry: 1.26450, suggestedSl: 1.26100, suggestedTp: [1.26900, 1.27200], historicalWinRate: 64, historicalSampleSize: 34, status: 'active', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 14400000).toISOString() },
  { id: 'ns2', symbol: 'XAUUSD', timeframe: 'H1', setupName: 'Bearish Engulfing at Resistance + MACD Divergence', direction: 'sell', confidence: 71, supportingFactors: ['Strong resistance zone', 'MACD bearish divergence', 'Volume climax'], riskFactors: ['Overall uptrend on D1'], suggestedEntry: 2358.50, suggestedSl: 2365.00, suggestedTp: [2345.00, 2335.00], historicalWinRate: 58, historicalSampleSize: 22, status: 'active', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString() },
];

const MOCK_PSYCH: PsychologyAlert[] = [
  { id: 'pa1', pattern: 'overtrading', severity: 'firm', message: "You've placed 9 trades today — your daily average is 4. Your win rate drops 22% on high-trade days. Quality over quantity.", suggestion: 'Consider closing the platform for 30 minutes. Return with fresh eyes.', dataPoints: [{ metric: 'Trades today', value: '9', normal: '4' }, { metric: 'Win rate today', value: '33%', normal: '62%' }], timestamp: new Date().toISOString() },
  { id: 'pa2', pattern: 'early_profit_taking', severity: 'gentle', message: "Your last 3 winners were closed at less than 50% of the original TP. You're leaving profit on the table consistently.", suggestion: 'Try using a trailing stop instead of manually closing. Let winners run.', dataPoints: [{ metric: 'Avg TP reached', value: '42%', normal: '78%' }], timestamp: new Date(Date.now() - 3600000).toISOString() },
];

const MOCK_ALERTS: TradeAlert[] = [
  { id: 'ta1', positionId: 'p1', type: 'sentiment_shift', message: 'USD sentiment has shifted negative in the last 30 minutes. Your EURUSD long may benefit from this move.', severity: 'info', timestamp: new Date().toISOString() },
  { id: 'ta2', positionId: 'p2', type: 'long_hold', message: "Your XAUUSD position has been open for 18 hours — 3x your average hold time. Was this the plan, or has the thesis changed?", severity: 'warning', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

const MOCK_REPORT: WeeklyReport = {
  id: 'wr1', weekStart: 'Mar 28', weekEnd: 'Apr 3',
  pnl: 1247.30, trades: 23, winRate: 65.2, avgRr: 1.8,
  bestTrade: { symbol: 'XAUUSD', pnl: 534.20, lesson: 'Held through pullback per plan — patience rewarded with full TP hit' },
  worstTrade: { symbol: 'GBPUSD', pnl: -312.50, lesson: 'Entered against daily trend. The H1 setup looked good but D1 context was bearish.' },
  psychologyInsight: 'Your Tuesday performance was notably strong (4/4 wins). Wednesday showed signs of overconfidence — position sizes increased 40% and win rate dropped. Consider keeping position sizing constant after winning streaks.',
  marketOutlook: 'NFP week ahead. Expect range compression Monday-Wednesday followed by volatility spike Friday. Key events: ECB rate decision Thursday, US NFP Friday.',
  weeklyGoal: 'This week focus on: No more than 5 trades per day. Quality setups only. Let at least 2 winners hit full TP without manual intervention.',
  motivationalMessage: "You're up 12% this month — your best month since September. The discipline is showing. Keep going.",
  comparedToAverage: [{ metric: 'Win Rate', thisWeek: 65.2, average: 62.3, trend: 'up' }, { metric: 'Avg R:R', thisWeek: 1.8, average: 1.5, trend: 'up' }, { metric: 'Max DD', thisWeek: 3.2, average: 5.1, trend: 'up' }],
};

export default function NexusPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">NEXUS — AI Companion</h1>
        <p className="text-xs text-white/30">Your most trusted advisor, honest critic, and caring trading partner</p>
      </div>
      <div className="max-w-lg mx-auto h-[calc(100vh-200px)]">
        <NexusCompanion
          preTradeBrief={MOCK_BRIEF}
          signals={MOCK_SIGNALS}
          psychologyAlerts={MOCK_PSYCH}
          tradeAlerts={MOCK_ALERTS}
          weeklyReport={MOCK_REPORT}
          onDismissAlert={id => console.log('Dismiss', id)}
          onAcceptSignal={id => console.log('Accept signal', id)}
          onAskNexus={q => console.log('Ask NEXUS:', q)}
        />
      </div>
    </div>
  );
}
