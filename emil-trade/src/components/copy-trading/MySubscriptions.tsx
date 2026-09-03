'use client';

import { useState } from 'react';
import { Square, Pause, Play } from 'lucide-react';
import { mockSubscriptions } from './mockProviders';
import type { CopySubscription } from './mockProviders';

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>(mockSubscriptions);

  const handleStop = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'stopped' } : s))
    );
  };

  const handleTogglePause = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, status: s.status === 'paused' ? 'active' : 'paused' };
      })
    );
  };

  const totalPnl = subscriptions.reduce((sum, s) => sum + s.pnl, 0);

  return (
    <div>
      {/* Summary */}
      <div
        className="rounded-lg border p-4 mb-4 flex items-center justify-between"
        style={{
          backgroundColor: '#111118',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <div className="text-xs text-white/40">Active Subscriptions</div>
          <div className="text-lg font-semibold text-white">
            {subscriptions.filter((s) => s.status === 'active').length}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40">Total Copied Trades</div>
          <div className="text-lg font-semibold text-white">
            {subscriptions.reduce((sum, s) => sum + s.copiedTrades, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40">Total P/L</div>
          <div
            className="text-lg font-semibold font-mono"
            style={{ color: totalPnl >= 0 ? '#00C853' : '#FF5252' }}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Table */}
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
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Copied Trades</th>
              <th className="px-4 py-3 font-medium text-right">P/L</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className="border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <td className="px-4 py-3 font-medium text-white">{sub.providerName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  {sub.copiedTrades}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono font-medium"
                  style={{ color: sub.pnl >= 0 ? '#00C853' : '#FF5252' }}
                >
                  {sub.pnl >= 0 ? '+' : ''}${sub.pnl.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-white/50">{sub.startedAt}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {sub.status !== 'stopped' && (
                      <>
                        <button
                          onClick={() => handleTogglePause(sub.id)}
                          className="p-1.5 rounded hover:bg-white/5 transition-colors"
                          title={sub.status === 'paused' ? 'Resume' : 'Pause'}
                        >
                          {sub.status === 'paused' ? (
                            <Play size={13} className="text-emerald-400" />
                          ) : (
                            <Pause size={13} className="text-amber-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStop(sub.id)}
                          className="p-1.5 rounded hover:bg-white/5 transition-colors"
                          title="Stop"
                        >
                          <Square size={13} className="text-red-400" />
                        </button>
                      </>
                    )}
                    {sub.status === 'stopped' && (
                      <span className="text-[10px] text-white/30">Stopped</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CopySubscription['status'] }) {
  const styles = {
    active: { bg: 'rgba(0,200,83,0.15)', color: '#00C853', label: 'Active' },
    paused: { bg: 'rgba(255,193,7,0.15)', color: '#FFC107', label: 'Paused' },
    stopped: { bg: 'rgba(255,82,82,0.15)', color: '#FF5252', label: 'Stopped' },
  };
  const s = styles[status];

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
      />
      {s.label}
    </span>
  );
}
