'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, XCircle, Edit3, Shield, Eye, Search,
  Filter, AlertTriangle, CheckCircle2, ArrowUpDown,
  Zap, Radio, Clock, ChevronDown, MessageCircle,
} from 'lucide-react';
import type { DealerPosition, LiveOrder, DealerAction } from '@/types/dealing-desk';
import { pnlColor, formatCurrencyCompact } from '@/lib/utils/format';

interface DealerWorkstationProps {
  positions: DealerPosition[];
  orders: LiveOrder[];
  recentActions: DealerAction[];
  onForceClose: (positionId: string, reason: string) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onRequote: (orderId: string, newPrice: number) => void;
}

export function DealerWorkstation({ positions, orders, recentActions, onForceClose, onRejectOrder, onRequote }: DealerWorkstationProps) {
  const [tab, setTab] = useState<'positions' | 'orders' | 'actions'>('positions');
  const [searchPos, setSearchPos] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');

  const totalLong = positions.filter(p => p.direction === 'buy').reduce((s, p) => s + p.volume, 0);
  const totalShort = positions.filter(p => p.direction === 'sell').reduce((s, p) => s + p.volume, 0);
  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  const filteredPositions = positions.filter(p => {
    if (searchPos && !p.clientName.toLowerCase().includes(searchPos.toLowerCase()) && !p.accountNumber.includes(searchPos)) return false;
    if (filterSymbol && p.symbol !== filterSymbol) return false;
    return true;
  });

  const symbols = [...new Set(positions.map(p => p.symbol))].sort();

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25">Positions</div>
          <div className="text-lg font-mono font-bold text-white">{positions.length}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25">Net Long</div>
          <div className="text-lg font-mono font-bold text-[#00dc82]">{totalLong.toFixed(2)} lots</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25">Net Short</div>
          <div className="text-lg font-mono font-bold text-[#ef4444]">{totalShort.toFixed(2)} lots</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25">Unrealized P&L</div>
          <div className={`text-lg font-mono font-bold ${pnlColor(totalPnl)}`}>{formatCurrencyCompact(totalPnl)}</div>
        </div>
        <div className={`bg-white/[0.02] border rounded-lg p-3 ${pendingOrders > 0 ? 'border-[#f59e0b]/20' : 'border-white/[0.06]'}`}>
          <div className="text-[10px] text-white/25">Pending Orders</div>
          <div className="text-lg font-mono font-bold text-[#f59e0b]">{pendingOrders}</div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {([
            { key: 'positions', label: 'Positions', icon: <Activity className="h-3.5 w-3.5" />, count: positions.length },
            { key: 'orders', label: 'Order Flow', icon: <Zap className="h-3.5 w-3.5" />, count: orders.length },
            { key: 'actions', label: 'Dealer Log', icon: <Eye className="h-3.5 w-3.5" />, count: recentActions.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
              }`}>{t.icon}{t.label} ({t.count})</button>
          ))}
        </div>
        {tab === 'positions' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
              <input type="text" placeholder="Client or account..." value={searchPos} onChange={e => setSearchPos(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white w-44 focus:border-[#00b4ff] focus:outline-none" />
            </div>
            <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/50 focus:outline-none">
              <option value="">All Symbols</option>
              {symbols.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Positions Table */}
      {tab === 'positions' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-3 py-2 font-medium">Client</th>
                <th className="text-left px-2 py-2 font-medium">Symbol</th>
                <th className="text-center px-2 py-2 font-medium">Dir</th>
                <th className="text-right px-2 py-2 font-medium">Volume</th>
                <th className="text-right px-2 py-2 font-medium">Open</th>
                <th className="text-right px-2 py-2 font-medium">Current</th>
                <th className="text-right px-2 py-2 font-medium">SL</th>
                <th className="text-right px-2 py-2 font-medium">TP</th>
                <th className="text-right px-2 py-2 font-medium">P&L</th>
                <th className="text-left px-2 py-2 font-medium">Risk</th>
                <th className="text-left px-2 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map(pos => (
                <tr key={pos.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2">
                    <div className="text-white/60">{pos.clientName}</div>
                    <div className="text-[9px] text-white/20">{pos.accountNumber}</div>
                  </td>
                  <td className="px-2 py-2 font-mono font-medium text-white">{pos.symbol}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      pos.direction === 'buy' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                    }`}>{pos.direction.toUpperCase()}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{pos.volume.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/40">{pos.openPrice.toFixed(5)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{pos.currentPrice.toFixed(5)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/25">{pos.stopLoss?.toFixed(5) ?? '—'}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/25">{pos.takeProfit?.toFixed(5) ?? '—'}</td>
                  <td className={`px-2 py-2 text-right font-mono font-medium ${pnlColor(pos.unrealizedPnl)}`}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-[9px] px-1 py-0.5 rounded capitalize ${
                      pos.riskBand === 'high' || pos.riskBand === 'very_high' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-white/5 text-white/25'
                    }`}>{pos.riskBand}</span>
                  </td>
                  <td className="px-2 py-2 text-[9px] text-white/20">{pos.accountGroup}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => onForceClose(pos.id, 'Dealer override')} title="Force Close"
                        className="p-1 rounded hover:bg-[#ef4444]/10 text-white/15 hover:text-[#ef4444] transition-colors">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                      <button title="Modify" className="p-1 rounded hover:bg-white/5 text-white/15 hover:text-white/40 transition-colors">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {pos.isHedged && <span title="Hedged"><Shield className="h-3.5 w-3.5 text-[#00b4ff]/40 mt-0.5" /></span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders Table */}
      {tab === 'orders' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-3 py-2 font-medium">Client</th>
                <th className="text-left px-2 py-2 font-medium">Symbol</th>
                <th className="text-center px-2 py-2 font-medium">Type</th>
                <th className="text-center px-2 py-2 font-medium">Dir</th>
                <th className="text-right px-2 py-2 font-medium">Volume</th>
                <th className="text-right px-2 py-2 font-medium">Req Price</th>
                <th className="text-right px-2 py-2 font-medium">Mkt Price</th>
                <th className="text-right px-2 py-2 font-medium">Slip</th>
                <th className="text-center px-2 py-2 font-medium">Status</th>
                <th className="text-center px-2 py-2 font-medium">Routing</th>
                <th className="text-left px-2 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${
                  order.status === 'pending' ? 'bg-[#f59e0b]/[0.02]' : ''
                }`}>
                  <td className="px-3 py-2 text-white/60">{order.clientName}</td>
                  <td className="px-2 py-2 font-mono font-medium text-white">{order.symbol}</td>
                  <td className="px-2 py-2 text-center text-[9px] text-white/30 capitalize">{order.type}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                      order.direction === 'buy' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                    }`}>{order.direction.toUpperCase()}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{order.volume.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/40">{order.requestedPrice.toFixed(5)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{order.currentPrice.toFixed(5)}</td>
                  <td className={`px-2 py-2 text-right font-mono ${order.slippage > 0.5 ? 'text-[#ef4444]' : 'text-white/20'}`}>
                    {order.slippage.toFixed(1)}p
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      order.status === 'filled' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                      order.status === 'pending' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      order.status === 'rejected' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                      'bg-white/5 text-white/25'
                    }`}>{order.status}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      order.routingDecision === 'a_book' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                      order.routingDecision === 'b_book' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                      'bg-[#f59e0b]/10 text-[#f59e0b]'
                    }`}>{order.routingDecision.replace('_', '-')}</span>
                  </td>
                  <td className="px-2 py-2 text-[9px] text-white/15">{new Date(order.receivedAt).toLocaleTimeString()}</td>
                  <td className="px-3 py-2">
                    {order.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => onRejectOrder(order.id, 'Dealer rejection')}
                          className="p-1 rounded hover:bg-[#ef4444]/10 text-white/15 hover:text-[#ef4444]" title="Reject">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onRequote(order.id, order.currentPrice)}
                          className="p-1 rounded hover:bg-[#f59e0b]/10 text-white/15 hover:text-[#f59e0b]" title="Requote">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dealer Actions Log */}
      {tab === 'actions' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
            {recentActions.map(action => (
              <div key={action.id} className="px-4 py-2.5 flex items-center gap-3 text-[11px]">
                <Clock className="h-3 w-3 text-white/15 shrink-0" />
                <span className="text-white/50 w-24">{action.dealerName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                  action.action === 'force_close' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                  action.action === 'reject_order' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                  action.action === 'requote' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                  'bg-white/5 text-white/25'
                }`}>{action.action.replace(/_/g, ' ')}</span>
                <span className="text-white/25">{action.targetType} {action.targetId.slice(0, 8)}</span>
                <span className="text-white/15 flex-1">{action.reason}</span>
                <span className="text-[9px] text-white/10">{new Date(action.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
