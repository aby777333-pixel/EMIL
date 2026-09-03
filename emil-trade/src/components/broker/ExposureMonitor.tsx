'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ExposureData } from '@/types/broker';

interface ExposureMonitorProps {
  exposures: ExposureData[];
  brokerCapital: number;
}

export function ExposureMonitor({ exposures, brokerCapital }: ExposureMonitorProps) {
  const [sortBy, setSortBy] = useState<'exposure' | 'var' | 'clients'>('exposure');

  const sorted = [...exposures].sort((a, b) => {
    switch (sortBy) {
      case 'var': return b.var95 - a.var95;
      case 'clients': return b.clientCount - a.clientCount;
      default: return Math.abs(b.netExposureUsd) - Math.abs(a.netExposureUsd);
    }
  });

  const totalExposure = exposures.reduce((sum, e) => sum + Math.abs(e.netExposureUsd), 0);
  const totalVar95 = exposures.reduce((sum, e) => sum + e.var95, 0);

  function getExposureColor(pct: number): string {
    if (pct > 25) return '#ef4444';
    if (pct > 15) return '#f59e0b';
    if (pct > 5) return '#00b4ff';
    return '#00dc82';
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[#8b5cf6]" />
          <div>
            <h3 className="text-sm font-semibold text-white">Real-Time Exposure Monitor</h3>
            <p className="text-[11px] text-white/30">
              Total: ${(totalExposure / 1_000_000).toFixed(2)}M · VaR 95%: ${(totalVar95 / 1_000).toFixed(0)}K
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['exposure', 'var', 'clients'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sortBy === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {s === 'var' ? 'VaR' : s === 'clients' ? 'Clients' : 'Exposure'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
              <th className="text-left px-5 py-2.5 font-medium">Symbol</th>
              <th className="text-right px-3 py-2.5 font-medium">Net Long</th>
              <th className="text-right px-3 py-2.5 font-medium">Net Short</th>
              <th className="text-right px-3 py-2.5 font-medium">Net Exposure</th>
              <th className="text-right px-3 py-2.5 font-medium">% Capital</th>
              <th className="text-right px-3 py-2.5 font-medium">VaR 95%</th>
              <th className="text-right px-3 py-2.5 font-medium">Clients</th>
              <th className="px-5 py-2.5 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((exp, i) => {
              const pct = brokerCapital > 0 ? (Math.abs(exp.netExposureUsd) / brokerCapital) * 100 : 0;
              const riskColor = getExposureColor(pct);
              const isLong = exp.netExposureUsd > 0;

              return (
                <motion.tr
                  key={exp.symbol}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{exp.symbol}</span>
                      <span className="text-[10px] text-white/20 capitalize">{exp.assetClass}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-3 font-mono text-xs text-[#00dc82]">
                    {exp.netLongLots > 0 ? exp.netLongLots.toFixed(2) : '-'}
                  </td>
                  <td className="text-right px-3 py-3 font-mono text-xs text-[#ef4444]">
                    {exp.netShortLots > 0 ? exp.netShortLots.toFixed(2) : '-'}
                  </td>
                  <td className="text-right px-3 py-3">
                    <span className={`font-mono text-xs font-medium ${isLong ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
                      {isLong ? '+' : ''}{(exp.netExposureUsd / 1000).toFixed(1)}K
                    </span>
                  </td>
                  <td className="text-right px-3 py-3">
                    <span className="font-mono text-xs" style={{ color: riskColor }}>
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-3 font-mono text-xs text-white/50">
                    ${(exp.var95 / 1000).toFixed(1)}K
                  </td>
                  <td className="text-right px-3 py-3 text-xs text-white/50">
                    {exp.clientCount}
                  </td>
                  <td className="px-5 py-3">
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct * 4)}%`, backgroundColor: riskColor }}
                      />
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
