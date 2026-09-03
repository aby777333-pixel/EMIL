'use client';

import { ArrowDownRight } from 'lucide-react';
import { mockInvestments } from './mockFunds';

export default function MyInvestments() {
  const totalValue = mockInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalInvested = mockInvestments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalPnl = mockInvestments.reduce((sum, inv) => sum + inv.pnl, 0);

  return (
    <div>
      {/* Portfolio Summary */}
      <div
        className="rounded-lg border p-5 mb-5 grid grid-cols-4 gap-6"
        style={{
          backgroundColor: '#111118',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <div className="text-xs text-white/40 mb-1">Total Portfolio Value</div>
          <div className="text-xl font-bold font-mono text-white">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Total Invested</div>
          <div className="text-xl font-bold font-mono text-white/70">
            ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Total P/L</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: totalPnl >= 0 ? '#00C853' : '#FF5252' }}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Return</div>
          <div
            className="text-xl font-bold font-mono"
            style={{ color: totalPnl >= 0 ? '#00C853' : '#FF5252' }}
          >
            {totalInvested > 0
              ? `${totalPnl >= 0 ? '+' : ''}${((totalPnl / totalInvested) * 100).toFixed(1)}%`
              : '0.0%'}
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: '#111118',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr
              className="text-left text-white/40 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <th className="px-4 py-3 font-medium">Fund</th>
              <th className="px-4 py-3 font-medium text-right">Shares</th>
              <th className="px-4 py-3 font-medium text-right">Current Value</th>
              <th className="px-4 py-3 font-medium text-right">Invested</th>
              <th className="px-4 py-3 font-medium text-right">P/L</th>
              <th className="px-4 py-3 font-medium">Invested At</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockInvestments.map((inv) => (
              <tr
                key={inv.id}
                className="border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <td className="px-4 py-3 font-medium text-white">{inv.fundName}</td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  {inv.shares.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  ${inv.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/50">
                  ${inv.investedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono font-medium"
                  style={{ color: inv.pnl >= 0 ? '#00C853' : '#FF5252' }}
                >
                  {inv.pnl >= 0 ? '+' : ''}${inv.pnl.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-white/50">{inv.investedAt}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-medium transition-all hover:opacity-80 ml-auto"
                    style={{
                      backgroundColor: 'rgba(255,82,82,0.15)',
                      color: '#FF5252',
                    }}
                  >
                    <ArrowDownRight size={10} />
                    Redeem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
