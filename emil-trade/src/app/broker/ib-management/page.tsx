'use client';

import { useState, useEffect, useCallback } from 'react';
import { IbManagement } from '@/components/crm/IbManagement';
import type { IbProfile, IbPayout, IbTreeNode } from '@/types/crm';
import { Plus, RefreshCw, Download } from 'lucide-react';

// Fallback data for when DB is empty
const FALLBACK_IBS: IbProfile[] = [
  { id: 'ib1', userId: 'u10', name: 'Alpha Partners Ltd', email: 'alpha@partners.com', tier: 1, status: 'active', commissionStructure: { type: 'per_lot', perLotRate: 5, perPipRate: null, spreadPct: null, cpaAmount: null, revsharePct: null, volumeTiers: [{ minLots: 0, rate: 5 }, { minLots: 500, rate: 7 }, { minLots: 2000, rate: 10 }], subIbSplit: 20 }, referredClients: 342, activeTraders: 187, totalVolumeLots: 45230, totalCommissionEarned: 226150, totalCommissionPaid: 198000, pendingPayout: 28150, subIbCount: 12, ibManagerId: 'u1', ibManagerName: 'Admin', performanceScore: 92, isAtRisk: false, atRiskReason: null, joinedAt: '2024-06-01', lastActivityAt: new Date().toISOString() },
  { id: 'ib2', userId: 'u11', name: 'FX Educators Pro', email: 'info@fxeducators.com', tier: 1, status: 'active', commissionStructure: { type: 'revshare', perLotRate: null, perPipRate: null, spreadPct: null, cpaAmount: null, revsharePct: 35, volumeTiers: [], subIbSplit: 15 }, referredClients: 567, activeTraders: 234, totalVolumeLots: 23450, totalCommissionEarned: 145000, totalCommissionPaid: 132000, pendingPayout: 13000, subIbCount: 8, ibManagerId: 'u1', ibManagerName: 'Admin', performanceScore: 85, isAtRisk: false, atRiskReason: null, joinedAt: '2024-03-15', lastActivityAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'ib3', userId: 'u12', name: 'Desert Capital', email: 'ib@desertcapital.ae', tier: 2, status: 'active', commissionStructure: { type: 'cpa', perLotRate: null, perPipRate: null, spreadPct: null, cpaAmount: 200, revsharePct: null, volumeTiers: [], subIbSplit: 10 }, referredClients: 89, activeTraders: 45, totalVolumeLots: 12300, totalCommissionEarned: 17800, totalCommissionPaid: 15000, pendingPayout: 2800, subIbCount: 3, ibManagerId: null, ibManagerName: null, performanceScore: 68, isAtRisk: false, atRiskReason: null, joinedAt: '2025-01-10', lastActivityAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'ib4', userId: 'u13', name: 'TradeSchool Online', email: 'partner@tradeschool.com', tier: 2, status: 'active', commissionStructure: { type: 'hybrid', perLotRate: 3, perPipRate: null, spreadPct: null, cpaAmount: 100, revsharePct: 10, volumeTiers: [], subIbSplit: 10 }, referredClients: 156, activeTraders: 67, totalVolumeLots: 8900, totalCommissionEarned: 42000, totalCommissionPaid: 38500, pendingPayout: 3500, subIbCount: 0, ibManagerId: null, ibManagerName: null, performanceScore: 74, isAtRisk: true, atRiskReason: 'Declining referrals — 60% drop in last 30 days', joinedAt: '2025-06-01', lastActivityAt: new Date(Date.now() - 604800000).toISOString() },
  { id: 'ib5', userId: 'u14', name: 'NewBroker Affiliates', email: 'apply@newbroker.com', tier: 3, status: 'pending', commissionStructure: { type: 'per_lot', perLotRate: 4, perPipRate: null, spreadPct: null, cpaAmount: null, revsharePct: null, volumeTiers: [], subIbSplit: 0 }, referredClients: 0, activeTraders: 0, totalVolumeLots: 0, totalCommissionEarned: 0, totalCommissionPaid: 0, pendingPayout: 0, subIbCount: 0, ibManagerId: null, ibManagerName: null, performanceScore: 0, isAtRisk: false, atRiskReason: null, joinedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() },
];

const FALLBACK_PAYOUTS: IbPayout[] = [
  { id: 'pay1', ibId: 'ib1', amount: 28150, currency: 'USD', period: 'March 2026', status: 'pending', method: 'bank_wire', clientBreakdown: [{ clientName: 'Client A', volume: 450, commission: 2250 }, { clientName: 'Client B', volume: 320, commission: 1600 }], approvedBy: null, paidAt: null, createdAt: new Date().toISOString() },
  { id: 'pay2', ibId: 'ib2', amount: 13000, currency: 'USD', period: 'March 2026', status: 'approved', method: 'bank_wire', clientBreakdown: [], approvedBy: 'u1', paidAt: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'pay3', ibId: 'ib1', amount: 31200, currency: 'USD', period: 'February 2026', status: 'paid', method: 'bank_wire', clientBreakdown: [], approvedBy: 'u1', paidAt: '2026-03-05', createdAt: '2026-03-01' },
];

const FALLBACK_TREE: IbTreeNode = {
  id: 'root', name: 'All IBs', tier: 0, referrals: 0, volume: 0, commission: 0, isActive: true,
  children: [
    { id: 'ib1', name: 'Alpha Partners', tier: 1, referrals: 342, volume: 45230, commission: 226150, isActive: true, children: [
      { id: 'sub1', name: 'Beta Affiliates', tier: 2, referrals: 45, volume: 3200, commission: 16000, isActive: true, children: [] },
      { id: 'sub2', name: 'Gamma Traders', tier: 2, referrals: 23, volume: 1800, commission: 9000, isActive: true, children: [
        { id: 'sub2a', name: 'Delta Group', tier: 3, referrals: 8, volume: 400, commission: 2000, isActive: true, children: [] },
      ]},
    ]},
    { id: 'ib2', name: 'FX Educators Pro', tier: 1, referrals: 567, volume: 23450, commission: 145000, isActive: true, children: [
      { id: 'sub3', name: 'Learn2Trade', tier: 2, referrals: 34, volume: 2100, commission: 10500, isActive: true, children: [] },
    ]},
    { id: 'ib3', name: 'Desert Capital', tier: 2, referrals: 89, volume: 12300, commission: 17800, isActive: true, children: [] },
  ],
};

function mapIbRow(r: Record<string, unknown>): IbProfile {
  return {
    id: r.id as string, userId: r.user_id as string, name: r.name as string, email: r.email as string,
    tier: (r.tier as number) ?? 1, status: (r.status as IbProfile['status']) ?? 'pending',
    commissionStructure: {
      type: (r.commission_type as IbProfile['commissionStructure']['type']) ?? 'per_lot',
      perLotRate: r.per_lot_rate as number | null, perPipRate: r.per_pip_rate as number | null,
      spreadPct: r.spread_pct as number | null, cpaAmount: r.cpa_amount as number | null,
      revsharePct: r.revshare_pct as number | null, volumeTiers: [], subIbSplit: (r.sub_ib_split as number) ?? 20,
    },
    referredClients: (r.referred_clients as number) ?? 0, activeTraders: (r.active_traders as number) ?? 0,
    totalVolumeLots: (r.total_volume_lots as number) ?? 0, totalCommissionEarned: (r.total_commission_earned as number) ?? 0,
    totalCommissionPaid: (r.total_commission_paid as number) ?? 0, pendingPayout: (r.pending_payout as number) ?? 0,
    subIbCount: 0, ibManagerId: null, ibManagerName: null,
    performanceScore: (r.performance_score as number) ?? 50,
    isAtRisk: (r.is_at_risk as boolean) ?? false, atRiskReason: r.at_risk_reason as string | null,
    joinedAt: (r.joined_at as string) ?? new Date().toISOString(),
    lastActivityAt: (r.last_activity_at as string) ?? new Date().toISOString(),
  };
}

export default function IbManagementPage() {
  const [ibs, setIbs] = useState<IbProfile[]>(FALLBACK_IBS);
  const [payouts, setPayouts] = useState<IbPayout[]>(FALLBACK_PAYOUTS);
  const [ibTree, setIbTree] = useState<IbTreeNode>(FALLBACK_TREE);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ibsRes, payoutsRes, treeRes] = await Promise.all([
        fetch('/api/ib?view=list'),
        fetch('/api/ib?view=payouts'),
        fetch('/api/ib?view=tree'),
      ]);
      const ibsData = await ibsRes.json();
      const payoutsData = await payoutsRes.json();
      const treeData = await treeRes.json();

      if (ibsData.ibs?.length > 0) setIbs(ibsData.ibs.map(mapIbRow));
      if (payoutsData.payouts?.length > 0) {
        setPayouts(payoutsData.payouts.map((p: Record<string, unknown>) => ({
          id: p.id, ibId: p.ib_id, amount: p.amount ?? 0, currency: p.currency ?? 'USD',
          period: p.period ?? '', status: p.status ?? 'pending', method: p.method ?? 'bank_wire',
          clientBreakdown: (p.client_breakdown as Record<string, unknown>[]) ?? [],
          approvedBy: p.approved_by ?? null, paidAt: p.paid_at ?? null, createdAt: p.created_at ?? new Date().toISOString(),
        })));
      }
      if (treeData.tree) setIbTree(treeData.tree as IbTreeNode);
    } catch { /* use fallback data */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (ibId: string) => {
    await fetch('/api/ib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', ib_id: ibId }) });
    fetchData();
  };

  const handleApprovePayout = async (payoutId: string) => {
    await fetch('/api/ib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_payout', payout_id: payoutId }) });
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">IB & Affiliate Management</h1>
          <p className="text-xs text-white/30">Manage introducing brokers, commissions, payouts, and network hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <IbManagement ibs={ibs} payouts={payouts} ibTree={ibTree} onApprove={handleApprove} onApprovePayout={handleApprovePayout} />
    </div>
  );
}
