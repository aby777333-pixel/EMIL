'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Position {
  id: string;
  account_number: string;
  symbol: string;
  direction: string;
  size: number;
  open_price: number;
  close_price: number | null;
  current_price: number | null;
  sl: number | null;
  tp: number | null;
  swap_accrued: number;
  floating_pnl: number | null;
  realized_pnl: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export default function AdminPositionsPage() {
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('admin_get_positions', {
      p_status: tab,
      p_limit: 100,
    });
    if (data) setPositions(data as Position[]);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const totalPnl = positions.reduce((sum, p) => {
    const pnl = tab === 'open' ? (p.floating_pnl ?? 0) : (p.realized_pnl ?? 0);
    return sum + pnl;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Positions</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/30 mono">{positions.length} positions</span>
          <span className={`text-xs mono font-medium ${totalPnl >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
            P&L: ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111118] border border-white/[0.06] rounded-lg p-1 w-fit">
        {(['open', 'closed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-[#0091D5]/15 text-[#0091D5]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t} Positions
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 font-medium">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">Account</th>
              <th className="text-left px-3 py-2.5 font-medium">Symbol</th>
              <th className="text-left px-3 py-2.5 font-medium">Dir</th>
              <th className="text-right px-3 py-2.5 font-medium">Size</th>
              <th className="text-right px-3 py-2.5 font-medium">Open Price</th>
              <th className="text-right px-3 py-2.5 font-medium">{tab === 'open' ? 'Current' : 'Close Price'}</th>
              <th className="text-right px-3 py-2.5 font-medium">SL</th>
              <th className="text-right px-3 py-2.5 font-medium">TP</th>
              <th className="text-right px-3 py-2.5 font-medium">Swap</th>
              <th className="text-right px-3 py-2.5 font-medium">P&L</th>
              <th className="text-right px-3 py-2.5 font-medium">Opened</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : positions.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-white/30">No {tab} positions</td>
              </tr>
            ) : (
              positions.map((pos) => {
                const pnl = tab === 'open' ? (pos.floating_pnl ?? 0) : (pos.realized_pnl ?? 0);
                const price = tab === 'open' ? pos.current_price : pos.close_price;
                return (
                  <tr key={pos.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2 mono text-white/30 text-[10px]">{pos.id.slice(0, 8)}</td>
                    <td className="px-3 py-2 mono text-white/60">{pos.account_number}</td>
                    <td className="px-3 py-2 text-white/80 font-medium">{pos.symbol}</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${pos.direction === 'BUY' ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                        {pos.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right mono text-white/70">{pos.size}</td>
                    <td className="px-3 py-2 text-right mono text-white/60">{pos.open_price}</td>
                    <td className="px-3 py-2 text-right mono text-white/60">{price ?? '-'}</td>
                    <td className="px-3 py-2 text-right mono text-white/40">{pos.sl ?? '-'}</td>
                    <td className="px-3 py-2 text-right mono text-white/40">{pos.tp ?? '-'}</td>
                    <td className="px-3 py-2 text-right mono text-white/40">{pos.swap_accrued.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right mono font-medium ${pnl >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                      {pnl.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right mono text-white/40 text-[10px]">
                      {new Date(pos.opened_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
