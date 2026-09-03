'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, Award, AlertTriangle,
  ChevronRight, Eye, CheckCircle2, XCircle, Clock,
  BarChart3, Network, CreditCard,
} from 'lucide-react';
import type { IbProfile, IbPayout, IbTreeNode } from '@/types/crm';
import { formatCurrencyCompact, pnlColor } from '@/lib/utils/format';

function IbTreeView({ node, depth = 0 }: { node: IbTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <button onClick={() => node.children.length > 0 && setExpanded(!expanded)}
        className="flex items-center gap-2 py-1.5 w-full text-left hover:bg-white/[0.02] rounded px-2 transition-colors">
        {node.children.length > 0 && (
          <ChevronRight className={`h-3 w-3 text-white/20 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        {node.children.length === 0 && <div className="w-3" />}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
          node.isActive ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-white/5 text-white/20'
        }`}>{node.name.charAt(0)}</div>
        <span className="text-xs text-white/70 flex-1">{node.name}</span>
        <span className="text-[9px] text-white/20">T{node.tier}</span>
        <span className="text-[9px] text-white/25 w-12 text-right">{node.referrals} refs</span>
        <span className="text-[9px] font-mono text-white/30 w-16 text-right">{node.volume.toFixed(0)} lots</span>
        <span className={`text-[9px] font-mono w-16 text-right ${pnlColor(node.commission)}`}>${node.commission.toFixed(0)}</span>
      </button>
      {expanded && node.children.map(child => <IbTreeView key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

interface IbManagementProps {
  ibs: IbProfile[];
  payouts: IbPayout[];
  ibTree: IbTreeNode;
  onApprove: (ibId: string) => void;
  onApprovePayout: (payoutId: string) => void;
}

export function IbManagement({ ibs, payouts, ibTree, onApprove, onApprovePayout }: IbManagementProps) {
  const [tab, setTab] = useState<'registry' | 'payouts' | 'tree' | 'analytics'>('registry');

  const activeIbs = ibs.filter(ib => ib.status === 'active').length;
  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalEarned = ibs.reduce((s, ib) => s + ib.totalCommissionEarned, 0);
  const atRiskCount = ibs.filter(ib => ib.isAtRisk).length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Active IBs</div>
          <div className="text-xl font-mono font-bold text-white">{activeIbs}</div>
          <div className="text-[9px] text-white/15">{ibs.length} total</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Total Earned</div>
          <div className="text-xl font-mono font-bold text-[#00dc82]">{formatCurrencyCompact(totalEarned)}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Pending Payouts</div>
          <div className="text-xl font-mono font-bold text-[#f59e0b]">{formatCurrencyCompact(totalPending)}</div>
        </div>
        <div className={`bg-white/[0.02] border rounded-lg p-3 ${atRiskCount > 0 ? 'border-[#ef4444]/20' : 'border-white/[0.06]'}`}>
          <div className="text-[10px] text-white/25 mb-1">At-Risk IBs</div>
          <div className="text-xl font-mono font-bold text-[#ef4444]">{atRiskCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'registry', label: 'IB Registry', icon: <Users className="h-3.5 w-3.5" /> },
          { key: 'payouts', label: 'Payouts', icon: <CreditCard className="h-3.5 w-3.5" /> },
          { key: 'tree', label: 'Network Tree', icon: <Network className="h-3.5 w-3.5" /> },
          { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Registry */}
      {tab === 'registry' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 font-medium">IB</th>
                <th className="text-center px-3 py-2.5 font-medium">Tier</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-right px-3 py-2.5 font-medium">Clients</th>
                <th className="text-right px-3 py-2.5 font-medium">Volume</th>
                <th className="text-right px-3 py-2.5 font-medium">Earned</th>
                <th className="text-right px-3 py-2.5 font-medium">Pending</th>
                <th className="text-center px-3 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ibs.map(ib => (
                <tr key={ib.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {ib.isAtRisk && <AlertTriangle className="h-3 w-3 text-[#ef4444]" />}
                      <div>
                        <div className="text-xs font-medium text-white">{ib.name}</div>
                        <div className="text-[9px] text-white/20">{ib.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00b4ff]/10 text-[#00b4ff]">T{ib.tier}</span></td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      ib.status === 'active' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                      ib.status === 'pending' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      'bg-white/5 text-white/25'
                    }`}>{ib.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-white/40">{ib.referredClients}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-white/40">{ib.totalVolumeLots.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-[#00dc82]">${ib.totalCommissionEarned.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-[#f59e0b]">${ib.pendingPayout.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-mono ${ib.performanceScore >= 70 ? 'text-[#00dc82]' : ib.performanceScore >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                      {ib.performanceScore}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {ib.status === 'pending' && (
                      <button onClick={() => onApprove(ib.id)} className="text-[10px] px-2 py-1 rounded bg-[#00dc82]/10 text-[#00dc82] hover:bg-[#00dc82]/20">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payouts */}
      {tab === 'payouts' && (
        <div className="space-y-2">
          {payouts.map(payout => (
            <div key={payout.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{payout.period}</div>
                <div className="text-[10px] text-white/25">{payout.clientBreakdown.length} clients</div>
              </div>
              <div className="text-lg font-mono font-bold text-white">${payout.amount.toFixed(2)}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                payout.status === 'paid' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                payout.status === 'approved' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
                payout.status === 'disputed' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                'bg-[#f59e0b]/10 text-[#f59e0b]'
              }`}>{payout.status}</span>
              {payout.status === 'pending' && (
                <button onClick={() => onApprovePayout(payout.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#00dc82] text-white text-[10px] font-medium hover:bg-[#00dc82]/80">Approve</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tree */}
      {tab === 'tree' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2"><Network className="h-4 w-4" /> IB Network Hierarchy</h4>
          <IbTreeView node={ibTree} />
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3">Top IBs by Volume</h4>
            <div className="space-y-2">
              {ibs.sort((a, b) => b.totalVolumeLots - a.totalVolumeLots).slice(0, 5).map((ib, i) => (
                <div key={ib.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                  <span className="text-xs text-white/60 flex-1">{ib.name}</span>
                  <span className="text-xs font-mono text-white/40">{ib.totalVolumeLots.toFixed(0)} lots</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3">Top IBs by ROI</h4>
            <div className="space-y-2">
              {ibs.filter(ib => ib.totalCommissionPaid > 0).sort((a, b) => {
                const roiA = (a.totalCommissionEarned - a.totalCommissionPaid) / a.totalCommissionPaid;
                const roiB = (b.totalCommissionEarned - b.totalCommissionPaid) / b.totalCommissionPaid;
                return roiB - roiA;
              }).slice(0, 5).map((ib, i) => {
                const roi = ib.totalCommissionPaid > 0 ? ((ib.totalCommissionEarned - ib.totalCommissionPaid) / ib.totalCommissionPaid * 100) : 0;
                return (
                  <div key={ib.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                    <span className="text-xs text-white/60 flex-1">{ib.name}</span>
                    <span className={`text-xs font-mono ${roi >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>{roi.toFixed(0)}% ROI</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
