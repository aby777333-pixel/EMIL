'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Brain, TrendingDown, AlertTriangle, Eye,
  Target, Clock, Users, ChevronRight, BarChart3,
} from 'lucide-react';
import type { ClientRiskScore, PredictiveRiskAlert, ChurnPrediction } from '@/types/ai';

const BAND_COLORS = {
  conservative: '#00dc82', moderate: '#00b4ff', aggressive: '#f59e0b', erratic: '#ff6b35', abusive: '#ef4444',
};

const TRAJECTORY_ICONS = {
  improving: <TrendingDown className="h-3 w-3 text-[#00dc82] rotate-180" />,
  stable: <BarChart3 className="h-3 w-3 text-white/20" />,
  deteriorating: <TrendingDown className="h-3 w-3 text-[#ef4444]" />,
};

interface GuardianPanelProps {
  riskScores: ClientRiskScore[];
  predictiveAlerts: PredictiveRiskAlert[];
  churnPredictions: ChurnPrediction[];
}

export function GuardianPanel({ riskScores, predictiveAlerts, churnPredictions }: GuardianPanelProps) {
  const [tab, setTab] = useState<'risk_scores' | 'predictive' | 'churn'>('risk_scores');

  const highRisk = riskScores.filter(r => r.band === 'aggressive' || r.band === 'erratic' || r.band === 'abusive');
  const criticalAlerts = predictiveAlerts.filter(a => a.probability > 70);
  const highChurn = churnPredictions.filter(c => c.churnProbability > 60);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#ef4444]/10 to-[#f59e0b]/10">
          <ShieldAlert className="h-5 w-5 text-[#ef4444]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">RAPTOR GUARDIAN</h3>
          <p className="text-[11px] text-white/30">AI Risk Intelligence — Predictive Alerts, Scoring, Churn</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">High Risk Clients</div>
          <div className="text-xl font-mono font-bold text-[#ef4444]">{highRisk.length}</div>
          <div className="text-[9px] text-white/15">{riskScores.length} total scored</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Critical Predictions</div>
          <div className="text-xl font-mono font-bold text-[#f59e0b]">{criticalAlerts.length}</div>
          <div className="text-[9px] text-white/15">{predictiveAlerts.length} total alerts</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">High Churn Risk</div>
          <div className="text-xl font-mono font-bold text-[#ff6b35]">{highChurn.length}</div>
          <div className="text-[9px] text-white/15">{churnPredictions.length} tracked</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'risk_scores', label: 'Risk Scores' },
          { key: 'predictive', label: 'Predictive Alerts' },
          { key: 'churn', label: 'Churn Predictions' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Risk Scores */}
      {tab === 'risk_scores' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 font-medium">Client</th>
                <th className="text-center px-3 py-2.5 font-medium">Score</th>
                <th className="text-left px-3 py-2.5 font-medium">Band</th>
                <th className="text-center px-3 py-2.5 font-medium">Trend</th>
                <th className="text-center px-3 py-2.5 font-medium">Percentile</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {riskScores.map(score => (
                <tr key={score.clientId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-xs text-white/70">{score.clientName}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-sm font-mono font-bold" style={{ color: BAND_COLORS[score.band] }}>
                      {score.overallScore}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                      style={{ backgroundColor: `${BAND_COLORS[score.band]}15`, color: BAND_COLORS[score.band] }}>
                      {score.band}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">{TRAJECTORY_ICONS[score.trajectory]}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-mono text-white/30">P{score.cohortPercentile}</td>
                  <td className="px-4 py-2.5 text-[10px] text-white/30">{score.recommendedActions[0] ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Predictive Alerts */}
      {tab === 'predictive' && (
        <div className="space-y-2">
          {predictiveAlerts.map(alert => (
            <div key={alert.id} className={`bg-white/[0.02] border rounded-xl px-4 py-3 ${
              alert.probability > 70 ? 'border-red-500/20' : 'border-white/[0.06]'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg mt-0.5 ${alert.probability > 70 ? 'bg-red-500/10' : 'bg-[#f59e0b]/10'}`}>
                  <Brain className={`h-3.5 w-3.5 ${alert.probability > 70 ? 'text-red-400' : 'text-[#f59e0b]'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white">{alert.clientName}</span>
                    <span className="text-[9px] text-white/20 capitalize">{alert.alertType.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[11px] text-white/40">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <span className={`font-mono font-bold ${alert.probability > 70 ? 'text-red-400' : 'text-[#f59e0b]'}`}>
                      {alert.probability.toFixed(0)}% probability
                    </span>
                    <span className="text-white/20">{alert.timeHorizon}</span>
                    <span className="text-white/20">Confidence: {alert.confidence?.toFixed(0) ?? '-'}%</span>
                  </div>
                  {alert.recommendedAction && (
                    <div className="mt-1.5 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04]">
                      <span className="text-[9px] text-[#00b4ff]">Recommended: {alert.recommendedAction}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Churn Predictions */}
      {tab === 'churn' && (
        <div className="space-y-2">
          {churnPredictions.map(cp => (
            <div key={cp.clientId} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-medium text-white">{cp.clientName}</span>
                  <span className="text-[10px] text-white/20 ml-2">LTV: ${cp.ltv.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-mono font-bold ${
                    cp.churnProbability > 70 ? 'text-[#ef4444]' : cp.churnProbability > 40 ? 'text-[#f59e0b]' : 'text-[#00dc82]'
                  }`}>{cp.churnProbability.toFixed(0)}%</div>
                  <div className="text-[9px] text-white/15">churn risk</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {cp.signals.slice(0, 4).map(s => (
                  <span key={s.signal} className={`px-1.5 py-0.5 rounded text-[8px] ${
                    s.trend === 'increasing' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/25'
                  }`}>{s.signal}</span>
                ))}
              </div>
              <div className="text-[10px] text-[#00b4ff]">{cp.recommendedAction}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
