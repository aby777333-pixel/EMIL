'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import type { RevenueBreakdown } from '@/types/broker';

interface RevenueChartProps {
  data: RevenueBreakdown[];
}

const REVENUE_COLORS: Record<string, string> = {
  spread: '#00b4ff',
  commission: '#00dc82',
  swap: '#8b5cf6',
  inactivityFee: '#f59e0b',
  withdrawalFee: '#ff6b35',
  other: '#6b7280',
};

export function RevenueChart({ data }: RevenueChartProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const slicedData = data.slice(0, period === '7d' ? 7 : period === '30d' ? 30 : 90);
  const totalRevenue = slicedData.reduce((s, d) => s + d.total, 0);
  const avgDaily = slicedData.length > 0 ? totalRevenue / slicedData.length : 0;

  const maxTotal = Math.max(...slicedData.map(d => d.total), 1);

  // Revenue type breakdown totals
  const breakdownTotals = {
    spread: slicedData.reduce((s, d) => s + d.spread, 0),
    commission: slicedData.reduce((s, d) => s + d.commission, 0),
    swap: slicedData.reduce((s, d) => s + d.swap, 0),
    inactivityFee: slicedData.reduce((s, d) => s + d.inactivityFee, 0),
    withdrawalFee: slicedData.reduce((s, d) => s + d.withdrawalFee, 0),
    other: slicedData.reduce((s, d) => s + d.other, 0),
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-[#00dc82]" />
          <div>
            <h3 className="text-sm font-semibold text-white">Revenue Waterfall</h3>
            <p className="text-[11px] text-white/30">
              Total: ${(totalRevenue / 1000).toFixed(1)}K · Avg/day: ${avgDaily.toFixed(0)}
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                period === p ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Stacked Bar Chart */}
        <div className="flex items-end gap-[2px] h-40 mb-4">
          {slicedData.map((day, i) => {
            const heights = {
              spread: (day.spread / maxTotal) * 100,
              commission: (day.commission / maxTotal) * 100,
              swap: (day.swap / maxTotal) * 100,
              other: ((day.inactivityFee + day.withdrawalFee + day.other) / maxTotal) * 100,
            };

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col-reverse gap-[1px] group relative"
                title={`${day.date}: $${day.total.toFixed(0)}`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heights.spread}%` }}
                  transition={{ delay: i * 0.01, duration: 0.3 }}
                  className="rounded-t-sm min-h-[1px]"
                  style={{ backgroundColor: REVENUE_COLORS.spread }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heights.commission}%` }}
                  transition={{ delay: i * 0.01 + 0.05, duration: 0.3 }}
                  className="min-h-[1px]"
                  style={{ backgroundColor: REVENUE_COLORS.commission }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heights.swap}%` }}
                  transition={{ delay: i * 0.01 + 0.1, duration: 0.3 }}
                  className="min-h-[1px]"
                  style={{ backgroundColor: REVENUE_COLORS.swap }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heights.other}%` }}
                  transition={{ delay: i * 0.01 + 0.15, duration: 0.3 }}
                  className="rounded-t-sm min-h-[1px]"
                  style={{ backgroundColor: REVENUE_COLORS.other }}
                />
              </div>
            );
          })}
        </div>

        {/* Breakdown Legend */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(breakdownTotals).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: REVENUE_COLORS[key] }} />
              <span className="text-[10px] text-white/40 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-[10px] font-mono text-white/60 ml-auto">${(val / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
