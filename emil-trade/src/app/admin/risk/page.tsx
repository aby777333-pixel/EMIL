'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Shield } from 'lucide-react';

interface Exposure {
  symbol: string;
  buy_count: number;
  sell_count: number;
  buy_lots: number;
  sell_lots: number;
  net_lots: number;
  total_pnl: number;
}

export default function AdminRiskPage() {
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data } = await supabase.rpc('admin_get_net_exposure');
      if (data) setExposures(data as Exposure[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalNetPnl = exposures.reduce((s, e) => s + e.total_pnl, 0);
  const totalBuyLots = exposures.reduce((s, e) => s + e.buy_lots, 0);
  const totalSellLots = exposures.reduce((s, e) => s + e.sell_lots, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white/90">Risk Management</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard label="Symbols Exposed" value={exposures.length.toString()} color="#0091D5" />
        <SummaryCard label="Total Buy Lots" value={totalBuyLots.toFixed(2)} color="#00C27A" />
        <SummaryCard label="Total Sell Lots" value={totalSellLots.toFixed(2)} color="#C1121F" />
        <SummaryCard
          label="Net Floating P&L"
          value={`$${totalNetPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          color={totalNetPnl >= 0 ? '#00C27A' : '#C1121F'}
        />
      </div>

      {/* Net Exposure Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Shield size={14} className="text-white/40" />
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Net Exposure by Symbol</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                <th className="text-right px-4 py-2.5 font-medium">Buy Positions</th>
                <th className="text-right px-4 py-2.5 font-medium">Sell Positions</th>
                <th className="text-right px-4 py-2.5 font-medium">Buy Lots</th>
                <th className="text-right px-4 py-2.5 font-medium">Sell Lots</th>
                <th className="text-right px-4 py-2.5 font-medium">Net Lots</th>
                <th className="text-right px-4 py-2.5 font-medium">P&L</th>
                <th className="text-center px-4 py-2.5 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {exposures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/30">No open exposure</td>
                </tr>
              ) : (
                exposures.map((exp) => {
                  const absNet = Math.abs(exp.net_lots);
                  const isHigh = absNet > 10;
                  return (
                    <tr key={exp.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-white/90 font-semibold mono">{exp.symbol}</td>
                      <td className="px-4 py-2.5 text-right mono text-[#00C27A]">{exp.buy_count}</td>
                      <td className="px-4 py-2.5 text-right mono text-[#C1121F]">{exp.sell_count}</td>
                      <td className="px-4 py-2.5 text-right mono text-[#00C27A]">{exp.buy_lots.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right mono text-[#C1121F]">{exp.sell_lots.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right mono font-medium ${exp.net_lots >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                        {exp.net_lots > 0 ? '+' : ''}{exp.net_lots.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 text-right mono font-medium ${exp.total_pnl >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                        {exp.total_pnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isHigh ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C1121F]/15 text-[#C1121F] text-[10px] font-medium">
                            <AlertTriangle size={10} /> HIGH
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#00C27A]/10 text-[#00C27A] text-[10px] font-medium">
                            LOW
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exposure Bar Visualization */}
      {exposures.length > 0 && (
        <div className="bg-[#111118] border border-white/[0.06] rounded-lg p-4">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-4">Exposure Distribution</div>
          <div className="space-y-3">
            {exposures.map((exp) => {
              const maxLots = Math.max(...exposures.map(e => Math.max(e.buy_lots, e.sell_lots)), 1);
              const buyWidth = (exp.buy_lots / maxLots) * 100;
              const sellWidth = (exp.sell_lots / maxLots) * 100;
              return (
                <div key={exp.symbol} className="flex items-center gap-3">
                  <span className="w-20 text-xs mono text-white/70 font-medium shrink-0">{exp.symbol}</span>
                  <div className="flex-1 flex gap-1 items-center">
                    <div className="flex-1 flex justify-end">
                      <div
                        className="h-4 rounded-l bg-[#00C27A]/30 border border-[#00C27A]/20"
                        style={{ width: `${buyWidth}%`, minWidth: exp.buy_lots > 0 ? '2px' : '0' }}
                      />
                    </div>
                    <div className="w-px h-6 bg-white/10 shrink-0" />
                    <div className="flex-1">
                      <div
                        className="h-4 rounded-r bg-[#C1121F]/30 border border-[#C1121F]/20"
                        style={{ width: `${sellWidth}%`, minWidth: exp.sell_lots > 0 ? '2px' : '0' }}
                      />
                    </div>
                  </div>
                  <span className={`w-16 text-right text-xs mono font-medium shrink-0 ${exp.net_lots >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                    {exp.net_lots > 0 ? '+' : ''}{exp.net_lots.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#00C27A]/30" /> Buy</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#C1121F]/30" /> Sell</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#111118] border border-white/[0.06] rounded-lg p-4">
      <div className="text-xs text-white/40 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-xl font-semibold mono" style={{ color }}>{value}</div>
    </div>
  );
}
