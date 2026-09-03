'use client';

import { motion } from 'framer-motion';
import {
  Radio, Wifi, WifiOff, TrendingUp, TrendingDown,
  Clock, AlertTriangle, BarChart3, Zap, RefreshCw,
} from 'lucide-react';
import type { LiquidityProvider } from '@/types/integrations';

interface LpMonitorProps {
  providers: LiquidityProvider[];
}

export function LpMonitor({ providers }: LpMonitorProps) {
  const connected = providers.filter(p => p.status === 'connected').length;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-[#00dc82]" />
          <div>
            <h3 className="text-sm font-semibold text-white">LP Performance Monitor</h3>
            <p className="text-[11px] text-white/30">{connected}/{providers.length} connected</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
              <th className="text-left px-5 py-2.5 font-medium">Provider</th>
              <th className="text-center px-3 py-2.5 font-medium">Status</th>
              <th className="text-right px-3 py-2.5 font-medium">Fill Rate</th>
              <th className="text-right px-3 py-2.5 font-medium">Avg Slippage</th>
              <th className="text-right px-3 py-2.5 font-medium">Latency</th>
              <th className="text-right px-3 py-2.5 font-medium">Uptime</th>
              <th className="text-right px-3 py-2.5 font-medium">Volume Today</th>
              <th className="text-right px-3 py-2.5 font-medium">Rejects</th>
              <th className="text-right px-5 py-2.5 font-medium">Requotes</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((lp, i) => (
              <motion.tr key={lp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <div className="text-xs font-medium text-white">{lp.name}</div>
                  <div className="text-[9px] text-white/20">{lp.connector} · {lp.symbols} symbols</div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    lp.status === 'connected' ? 'bg-[#00dc82]' :
                    lp.status === 'error' ? 'bg-[#ef4444]' : 'bg-white/15'
                  }`} />
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-mono text-xs ${lp.fillRate >= 98 ? 'text-[#00dc82]' : lp.fillRate >= 95 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                    {lp.fillRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-mono text-xs ${lp.avgSlippage <= 0.5 ? 'text-[#00dc82]' : lp.avgSlippage <= 1.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                    {lp.avgSlippage.toFixed(2)}p
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-mono text-xs ${lp.avgLatencyMs <= 20 ? 'text-[#00dc82]' : lp.avgLatencyMs <= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                    {lp.avgLatencyMs}ms
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-white/40">{lp.uptimePct.toFixed(2)}%</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-white/40">
                  ${(lp.volumeToday / 1_000_000).toFixed(1)}M
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-mono text-xs ${lp.rejectsToday === 0 ? 'text-white/20' : 'text-[#ef4444]'}`}>
                    {lp.rejectsToday}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-mono text-xs ${lp.requotesToday === 0 ? 'text-white/20' : 'text-[#f59e0b]'}`}>
                    {lp.requotesToday}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
