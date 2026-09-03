'use client';

import { useState } from 'react';
import { GuardianPanel } from '@/components/ai/GuardianPanel';
import { AIBrainDashboard } from '@/components/ai/AIBrainDashboard';
import type { ClientRiskScore, PredictiveRiskAlert, ChurnPrediction, AIModel, AIUsageStats } from '@/types/ai';

const MOCK_RISK_SCORES: ClientRiskScore[] = [
  { clientId: 'c1', clientName: 'High Volume Trader', overallScore: 82, band: 'aggressive', dimensions: { volatilityTolerance: 90, positionSizing: 85, lossReaction: 70, drawdownBehavior: 75, overnightRisk: 80, newsTrading: 88 }, trajectory: 'stable', cohortPercentile: 92, recommendedActions: ['Monitor position sizing', 'Review leverage limits'], updatedAt: new Date().toISOString() },
  { clientId: 'c2', clientName: 'Pattern Scalper', overallScore: 91, band: 'erratic', dimensions: { volatilityTolerance: 95, positionSizing: 92, lossReaction: 88, drawdownBehavior: 90, overnightRisk: 60, newsTrading: 95 }, trajectory: 'deteriorating', cohortPercentile: 97, recommendedActions: ['Restrict to A-book', 'Increase margin', 'Compliance review'], updatedAt: new Date().toISOString() },
  { clientId: 'c3', clientName: 'Swing Trader Pro', overallScore: 35, band: 'conservative', dimensions: { volatilityTolerance: 30, positionSizing: 25, lossReaction: 20, drawdownBehavior: 40, overnightRisk: 50, newsTrading: 15 }, trajectory: 'improving', cohortPercentile: 22, recommendedActions: [], updatedAt: new Date().toISOString() },
  { clientId: 'c4', clientName: 'News Trader X', overallScore: 78, band: 'aggressive', dimensions: { volatilityTolerance: 70, positionSizing: 65, lossReaction: 80, drawdownBehavior: 72, overnightRisk: 40, newsTrading: 98 }, trajectory: 'stable', cohortPercentile: 88, recommendedActions: ['Flag for news window monitoring'], updatedAt: new Date().toISOString() },
];

const MOCK_PRED_ALERTS: PredictiveRiskAlert[] = [
  { id: 'pa1', clientId: 'c2', clientName: 'Pattern Scalper', alertType: 'margin_call_prediction', probability: 78, timeHorizon: '24 hours', confidence: 85, description: 'Client is overleveraged on XAUUSD with 92% margin usage. If gold drops 1.5%, margin call will trigger.', recommendedAction: 'Call client to suggest position reduction', createdAt: new Date().toISOString() },
  { id: 'pa2', clientId: 'c1', clientName: 'High Volume Trader', alertType: 'revenge_trading', probability: 65, timeHorizon: 'Current session', confidence: 72, description: 'After 3 consecutive losses totaling -$2,340, client has increased position size by 3x. Historical pattern shows 78% probability of continued losses.', recommendedAction: 'Send automated risk awareness notification', createdAt: new Date().toISOString() },
  { id: 'pa3', clientId: 'c4', clientName: 'News Trader X', alertType: 'over_leverage', probability: 55, timeHorizon: '72 hours', confidence: 68, description: 'Leverage usage trending up 40% over past week. NFP release Friday creates elevated risk.', recommendedAction: 'Pre-event margin increase for this client', createdAt: new Date().toISOString() },
];

const MOCK_CHURN: ChurnPrediction[] = [
  { clientId: 'c5', clientName: 'Dormant Trader A', churnProbability: 85, predictedChurnDate: '2026-04-18', signals: [{ signal: 'No login 14 days', weight: 0.35, trend: 'increasing' }, { signal: 'Withdrawal request', weight: 0.25, trend: 'stable' }, { signal: 'Negative P&L streak', weight: 0.20, trend: 'increasing' }], churnReason: 'performance', recommendedAction: 'Offer 1-on-1 coaching session', ltv: 12400, ltvTrajectory: 'declining' },
  { clientId: 'c6', clientName: 'Trader B', churnProbability: 62, predictedChurnDate: '2026-04-25', signals: [{ signal: 'Declining volume', weight: 0.30, trend: 'increasing' }, { signal: 'Support complaint', weight: 0.20, trend: 'stable' }], churnReason: 'service', recommendedAction: 'Assign dedicated account manager', ltv: 34500, ltvTrajectory: 'declining' },
];

const MOCK_MODELS: AIModel[] = [
  { id: 'm1', name: 'Claude Sonnet', provider: 'anthropic', modelId: 'claude-sonnet-4-6', feature: 'copilot_chat', isPrimary: true, status: 'active', avgLatencyMs: 340, costPer1kTokens: 0.003, totalTokensUsed: 45_000_000, totalCost: 135.00, successRate: 99.7 },
  { id: 'm2', name: 'Claude Haiku', provider: 'anthropic', modelId: 'claude-haiku-4-5', feature: 'support_chatbot', isPrimary: true, status: 'active', avgLatencyMs: 120, costPer1kTokens: 0.00025, totalTokensUsed: 120_000_000, totalCost: 30.00, successRate: 99.9 },
  { id: 'm3', name: 'Embedding Large', provider: 'openai', modelId: 'text-embedding-3-large', feature: 'vector_search', isPrimary: true, status: 'active', avgLatencyMs: 45, costPer1kTokens: 0.00013, totalTokensUsed: 80_000_000, totalCost: 10.40, successRate: 99.99 },
  { id: 'm4', name: 'Risk Scorer v2', provider: 'internal', modelId: 'risk-scorer-v2-prod', feature: 'risk_scoring', isPrimary: true, status: 'active', avgLatencyMs: 25, costPer1kTokens: 0, totalTokensUsed: 0, totalCost: 0, successRate: 99.5 },
  { id: 'm5', name: 'Pattern Detector', provider: 'internal', modelId: 'pattern-cnn-v3', feature: 'pattern_detection', isPrimary: true, status: 'active', avgLatencyMs: 180, costPer1kTokens: 0, totalTokensUsed: 0, totalCost: 0, successRate: 98.2 },
  { id: 'm6', name: 'Sentiment BERT', provider: 'internal', modelId: 'finbert-sentiment-v2', feature: 'sentiment_analysis', isPrimary: true, status: 'active', avgLatencyMs: 65, costPer1kTokens: 0, totalTokensUsed: 0, totalCost: 0, successRate: 97.8 },
];

const MOCK_USAGE: AIUsageStats = {
  totalInferences: 1_234_567,
  totalTokens: 245_000_000,
  totalCost: 175.40,
  avgLatencyMs: 185,
  successRate: 99.4,
  byFeature: [
    { feature: 'copilot_chat', count: 45000, cost: 135, avgLatency: 340 },
    { feature: 'support_chatbot', count: 89000, cost: 30, avgLatency: 120 },
    { feature: 'sentiment_analysis', count: 234000, cost: 0, avgLatency: 65 },
    { feature: 'pattern_detection', count: 178000, cost: 0, avgLatency: 180 },
    { feature: 'risk_scoring', count: 56000, cost: 0, avgLatency: 25 },
    { feature: 'content_generation', count: 12000, cost: 10.40, avgLatency: 450 },
  ],
  byDay: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    count: 35000 + Math.floor(Math.random() * 15000),
    cost: 4 + Math.random() * 3,
  })),
};

export default function AIGuardianPage() {
  const [tab, setTab] = useState<'guardian' | 'brain'>('guardian');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI Intelligence Center</h1>
          <p className="text-xs text-white/30">RAPTOR GUARDIAN risk intelligence + BRAIN model management</p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['guardian', 'brain'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-white/10 text-white' : 'text-white/40'
              }`}>{t === 'guardian' ? 'RAPTOR GUARDIAN' : 'RAPTOR BRAIN'}</button>
          ))}
        </div>
      </div>
      {tab === 'guardian' ? (
        <GuardianPanel riskScores={MOCK_RISK_SCORES} predictiveAlerts={MOCK_PRED_ALERTS} churnPredictions={MOCK_CHURN} />
      ) : (
        <AIBrainDashboard models={MOCK_MODELS} usage={MOCK_USAGE} />
      )}
    </div>
  );
}
