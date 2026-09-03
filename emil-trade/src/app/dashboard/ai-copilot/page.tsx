'use client';

import { useState } from 'react';
import { CopilotChat } from '@/components/ai/CopilotChat';
import { SentinelDashboard } from '@/components/ai/SentinelDashboard';
import type { CopilotMessage, PersonalizedInsight, TraderProfile, SentimentData, PatternDetection, RegimeAnalysis, PriceForcast } from '@/types/ai';

const MOCK_MESSAGES: CopilotMessage[] = [
  { id: '1', role: 'assistant', content: "Welcome back! I can see you have 3 open positions and your equity is up 2.1% today. Your EURUSD long is currently your strongest performer. What would you like to analyze?", context: null, createdAt: new Date().toISOString() },
];

const MOCK_INSIGHTS: PersonalizedInsight[] = [
  { id: 'i1', type: 'timing', title: 'Best Trading Hours Detected', body: 'Your win rate is 73% between 8-11am GMT vs 48% in the afternoon. Consider focusing your most aggressive setups during morning sessions.', severity: 'suggestion', metric: 'Morning win rate', metricValue: 73, createdAt: new Date().toISOString() },
  { id: 'i2', type: 'psychology', title: 'Revenge Trading Pattern', body: 'After losing trades, you tend to increase position size by 2.5x within 30 minutes. This pattern has a 34% win rate vs your normal 62%.', severity: 'warning', metric: 'Post-loss win rate', metricValue: 34, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'i3', type: 'instrument', title: 'Instrument Fit Analysis', body: 'Your Sharpe ratio on FX pairs (2.1) is significantly higher than indices (0.7). Consider reducing index exposure.', severity: 'info', metric: 'FX Sharpe', metricValue: 2.1, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const MOCK_SENTIMENTS: SentimentData[] = [
  { symbol: 'EURUSD', score: 35, momentum: 5.2, sources: [], retailSentiment: 28, institutionalSentiment: 42, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'GBPUSD', score: -18, momentum: -3.1, sources: [], retailSentiment: -25, institutionalSentiment: -12, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'XAUUSD', score: 62, momentum: 8.5, sources: [], retailSentiment: 55, institutionalSentiment: 68, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'USDJPY', score: -42, momentum: -7.3, sources: [], retailSentiment: -38, institutionalSentiment: -47, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'BTCUSD', score: 78, momentum: 12.1, sources: [], retailSentiment: 85, institutionalSentiment: 71, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'US30', score: 15, momentum: 1.8, sources: [], retailSentiment: 22, institutionalSentiment: 8, putCallRatio: 0.85, updatedAt: new Date().toISOString() },
  { symbol: 'USDCHF', score: -8, momentum: -0.5, sources: [], retailSentiment: -12, institutionalSentiment: -4, putCallRatio: null, updatedAt: new Date().toISOString() },
  { symbol: 'AUDUSD', score: 25, momentum: 4.2, sources: [], retailSentiment: 30, institutionalSentiment: 20, putCallRatio: null, updatedAt: new Date().toISOString() },
];

const MOCK_PATTERNS: PatternDetection[] = [
  { id: 'p1', symbol: 'EURUSD', timeframe: 'H4', patternType: 'Bullish Flag', category: 'classical', direction: 'bullish', confidence: 82, priceTarget: 1.0920, invalidationLevel: 1.0810, detectedAt: new Date().toISOString(), status: 'confirmed' },
  { id: 'p2', symbol: 'XAUUSD', timeframe: 'D1', patternType: 'Cup & Handle', category: 'classical', direction: 'bullish', confidence: 74, priceTarget: 2450, invalidationLevel: 2320, detectedAt: new Date().toISOString(), status: 'forming' },
  { id: 'p3', symbol: 'GBPUSD', timeframe: 'H1', patternType: 'Bearish Engulfing', category: 'candlestick', direction: 'bearish', confidence: 68, priceTarget: null, invalidationLevel: null, detectedAt: new Date().toISOString(), status: 'confirmed' },
  { id: 'p4', symbol: 'BTCUSD', timeframe: 'H4', patternType: 'Gartley 222', category: 'harmonic', direction: 'bullish', confidence: 71, priceTarget: 72500, invalidationLevel: 67800, detectedAt: new Date().toISOString(), status: 'forming' },
];

const MOCK_REGIMES: RegimeAnalysis[] = [
  { symbol: 'EURUSD', currentRegime: 'uptrend', regimeProbabilities: [{ regime: 'uptrend', probability: 0.65 }, { regime: 'ranging', probability: 0.25 }, { regime: 'volatile', probability: 0.10 }], regimeChangeProbability: 0.15, riskEnvironment: 'risk_on', liquidityRegime: 'regular', updatedAt: new Date().toISOString() },
  { symbol: 'XAUUSD', currentRegime: 'strong_uptrend', regimeProbabilities: [{ regime: 'strong_uptrend', probability: 0.78 }, { regime: 'uptrend', probability: 0.15 }, { regime: 'volatile', probability: 0.07 }], regimeChangeProbability: 0.08, riskEnvironment: 'risk_off', liquidityRegime: 'regular', updatedAt: new Date().toISOString() },
  { symbol: 'BTCUSD', currentRegime: 'volatile', regimeProbabilities: [{ regime: 'volatile', probability: 0.55 }, { regime: 'uptrend', probability: 0.30 }, { regime: 'ranging', probability: 0.15 }], regimeChangeProbability: 0.42, riskEnvironment: 'risk_on', liquidityRegime: 'extended', updatedAt: new Date().toISOString() },
];

const MOCK_FORECASTS: PriceForcast[] = [
  { symbol: 'EURUSD', horizon: '4h', direction: 'bullish', confidence: 72, targetPrice: 1.0895, currentPrice: 1.0852, expectedMove: 0.0043, expectedMovePct: 0.40, supportLevels: [{ price: 1.0830, strength: 85 }, { price: 1.0800, strength: 92 }], resistanceLevels: [{ price: 1.0900, strength: 78 }, { price: 1.0935, strength: 88 }], breakoutProbability: 35, volatilityForecast: 0.45, modelVersion: 'v3.2', generatedAt: new Date().toISOString(), id: 'f1' },
  { symbol: 'XAUUSD', horizon: '1d', direction: 'bullish', confidence: 81, targetPrice: 2385, currentPrice: 2348, expectedMove: 37, expectedMovePct: 1.58, supportLevels: [{ price: 2330, strength: 90 }, { price: 2310, strength: 95 }], resistanceLevels: [{ price: 2390, strength: 75 }, { price: 2410, strength: 82 }], breakoutProbability: 55, volatilityForecast: 1.2, modelVersion: 'v3.2', generatedAt: new Date().toISOString(), id: 'f2' },
  { symbol: 'BTCUSD', horizon: '4h', direction: 'bearish', confidence: 58, targetPrice: 68200, currentPrice: 69500, expectedMove: -1300, expectedMovePct: -1.87, supportLevels: [{ price: 68000, strength: 70 }, { price: 67000, strength: 85 }], resistanceLevels: [{ price: 70000, strength: 90 }, { price: 71500, strength: 78 }], breakoutProbability: 25, volatilityForecast: 2.8, modelVersion: 'v3.2', generatedAt: new Date().toISOString(), id: 'f3' },
];

export default function AICopilotPage() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (msg: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: msg, context: null, createdAt: new Date().toISOString() }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `Based on your current positions and market analysis, here's my assessment:\n\n${msg.toLowerCase().includes('setup') ? 'I see a potential bullish flag forming on EURUSD H4 with 82% confidence. The trend is aligned with the daily uptrend, RSI is at 55 (neutral zone), and sentiment is moderately bullish at +35. Entry around 1.0855, SL at 1.0810, TP at 1.0920 gives you a 1:1.4 R:R ratio.' : 'Let me analyze that for you. Looking at your trading history and current market conditions...'}`,
        context: null, createdAt: new Date().toISOString(),
      }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">AI Intelligence</h1>
        <p className="text-xs text-white/30">RAPTOR ASSIST copilot + SENTINEL market intelligence</p>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-5 h-[calc(100vh-200px)]">
          <CopilotChat messages={messages} insights={MOCK_INSIGHTS} profile={null} onSend={handleSend}
            onUpdateProfile={() => {}} isLoading={isLoading} />
        </div>
        <div className="col-span-7">
          <SentinelDashboard sentiments={MOCK_SENTIMENTS} patterns={MOCK_PATTERNS} regimes={MOCK_REGIMES} forecasts={MOCK_FORECASTS} />
        </div>
      </div>
    </div>
  );
}
