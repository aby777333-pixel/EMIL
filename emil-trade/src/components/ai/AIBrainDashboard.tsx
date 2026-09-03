'use client';

import { motion } from 'framer-motion';
import {
  Brain, Cpu, Zap, DollarSign, Clock, Activity,
  CheckCircle2, AlertTriangle, BarChart3,
} from 'lucide-react';
import type { AIModel, AIUsageStats } from '@/types/ai';

interface AIBrainDashboardProps {
  models: AIModel[];
  usage: AIUsageStats;
}

export function AIBrainDashboard({ models, usage }: AIBrainDashboardProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#8b5cf6]/20 to-[#00b4ff]/20">
          <Brain className="h-5 w-5 text-[#8b5cf6]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">RAPTOR BRAIN</h3>
          <p className="text-[11px] text-white/30">AI Orchestration & Model Management</p>
        </div>
      </div>

      {/* Usage KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Inferences', value: usage.totalInferences.toLocaleString(), icon: <Zap className="h-3.5 w-3.5" />, color: '#00b4ff' },
          { label: 'Total Tokens', value: `${(usage.totalTokens / 1_000_000).toFixed(1)}M`, icon: <Cpu className="h-3.5 w-3.5" />, color: '#8b5cf6' },
          { label: 'Total Cost', value: `$${usage.totalCost.toFixed(2)}`, icon: <DollarSign className="h-3.5 w-3.5" />, color: '#f59e0b' },
          { label: 'Avg Latency', value: `${usage.avgLatencyMs}ms`, icon: <Clock className="h-3.5 w-3.5" />, color: usage.avgLatencyMs < 500 ? '#00dc82' : '#f59e0b' },
          { label: 'Success Rate', value: `${usage.successRate.toFixed(1)}%`, icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: usage.successRate > 98 ? '#00dc82' : '#f59e0b' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color }}>{icon}<span className="text-[10px] text-white/25">{label}</span></div>
            <div className="text-lg font-mono font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Usage by Feature Chart */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-medium text-white/50 mb-3">Usage by Feature</h4>
        <div className="space-y-2">
          {usage.byFeature.map(f => {
            const maxCount = Math.max(...usage.byFeature.map(x => x.count));
            return (
              <div key={f.feature} className="flex items-center gap-3">
                <span className="text-[10px] text-white/30 w-32 truncate capitalize">{f.feature.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(f.count / maxCount) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#00b4ff]" />
                </div>
                <span className="text-[10px] font-mono text-white/25 w-12 text-right">{f.count}</span>
                <span className="text-[10px] font-mono text-white/15 w-16 text-right">${f.cost.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Registry */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h4 className="text-xs font-medium text-white/50">Model Registry</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
              <th className="text-left px-4 py-2 font-medium">Model</th>
              <th className="text-left px-3 py-2 font-medium">Provider</th>
              <th className="text-left px-3 py-2 font-medium">Feature</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Latency</th>
              <th className="text-right px-3 py-2 font-medium">Tokens</th>
              <th className="text-right px-4 py-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{model.name}</span>
                    {model.isPrimary && <span className="text-[8px] px-1 py-0.5 rounded bg-[#00b4ff]/10 text-[#00b4ff]">PRIMARY</span>}
                  </div>
                  <div className="text-[9px] text-white/15 font-mono">{model.modelId}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-white/40 capitalize">{model.provider}</td>
                <td className="px-3 py-2.5 text-[10px] text-white/30 capitalize">{model.feature.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    model.status === 'active' ? 'bg-[#00dc82]' :
                    model.status === 'standby' ? 'bg-[#f59e0b]' : 'bg-white/10'
                  }`} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[10px] text-white/30">{model.avgLatencyMs}ms</td>
                <td className="px-3 py-2.5 text-right font-mono text-[10px] text-white/25">{(model.totalTokensUsed / 1_000_000).toFixed(1)}M</td>
                <td className="px-4 py-2.5 text-right font-mono text-[10px] text-white/25">${model.totalCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-medium text-white/50 mb-3">Daily Usage (30 days)</h4>
        <div className="h-24 flex items-end gap-[2px]">
          {usage.byDay.map((day, i) => {
            const maxCost = Math.max(...usage.byDay.map(d => d.cost));
            return (
              <motion.div key={day.date} initial={{ height: 0 }}
                animate={{ height: `${(day.cost / maxCost) * 100}%` }}
                transition={{ delay: i * 0.01 }}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-[#8b5cf6]/60 to-[#00b4ff]/60 min-w-[2px]"
                title={`${day.date}: $${day.cost.toFixed(2)} (${day.count} calls)`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
