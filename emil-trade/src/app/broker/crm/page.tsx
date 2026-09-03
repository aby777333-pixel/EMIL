'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CrmPipeline } from '@/components/broker/CrmPipeline';
import type { CrmPipelineStage, CrmLead } from '@/types/broker';
import {
  Plus, Search, Filter, RefreshCw, Users, TrendingUp, Clock,
  Target, BarChart3, ListChecks, Mail, Download,
} from 'lucide-react';

const STAGE_CONFIG = [
  { name: 'Lead', key: 'lead', color: '#6b7280' },
  { name: 'Contacted', key: 'contacted', color: '#00b4ff' },
  { name: 'Demo', key: 'demo', color: '#8b5cf6' },
  { name: 'Documents', key: 'documents', color: '#f59e0b' },
  { name: 'Live', key: 'live', color: '#00dc82' },
  { name: 'Active', key: 'active', color: '#10b981' },
  { name: 'VIP', key: 'vip', color: '#f59e0b' },
];

function buildStages(leads: CrmLead[]): CrmPipelineStage[] {
  return STAGE_CONFIG.map((s, i) => {
    const stageLeads = leads.filter(l => l.stage === s.key);
    return { id: `stage-${i}`, name: s.name, sortOrder: i, color: s.color, slaHours: null, leads: stageLeads, count: stageLeads.length };
  });
}

export default function CrmPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [stages, setStages] = useState<CrmPipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pipeline' | 'list' | 'tasks'>('pipeline');
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: '', email: '', phone: '', country: '', source: 'organic' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/crm/leads?${params}`);
      const data = await res.json();
      const mapped: CrmLead[] = (data.leads ?? []).map((l: Record<string, unknown>) => ({
        id: l.id, userId: l.user_id, name: l.full_name ?? 'Unknown', email: l.email ?? '',
        phone: l.phone ?? '', country: l.country ?? '', stage: l.stage ?? 'lead',
        assignedAgent: l.assigned_agent, assignedAgentName: l.assigned_agent_name ?? null,
        source: l.source ?? '', campaign: l.campaign ?? '', landingPage: l.landing_page ?? '',
        tags: (l.tags as string[]) ?? [], score: (l.score as number) ?? 0,
        lastActivity: (l.last_activity_at as string) ?? new Date().toISOString(),
        stageEnteredAt: (l.stage_entered_at as string) ?? new Date().toISOString(),
        slaHoursRemaining: l.sla_hours as number | null,
        aiSuggestedAction: l.ai_suggested_action as string | null,
        totalDeposits: (l.total_deposits as number) ?? 0, totalWithdrawals: (l.total_withdrawals as number) ?? 0,
        netPnl: (l.net_pnl as number) ?? 0, totalVolume: (l.total_volume as number) ?? 0,
        accountCount: (l.account_count as number) ?? 0,
        kycStatus: (l.kyc_status as string) ?? 'none', riskCategory: (l.risk_category as string) ?? 'low',
        createdAt: (l.created_at as string) ?? new Date().toISOString(),
      }));
      setLeads(mapped);
      setStages(buildStages(mapped));
    } catch { /* fallback empty */ }
    setLoading(false);
  }, [search]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/tasks?status=pending');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLeads(); fetchTasks(); }, [fetchLeads, fetchTasks]);

  const handleAddLead = async () => {
    if (!newLead.full_name) return;
    await fetch('/api/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newLead }),
    });
    setShowAddLead(false);
    setNewLead({ full_name: '', email: '', phone: '', country: '', source: 'organic' });
    fetchLeads();
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    await fetch('/api/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_stage', lead_id: leadId, new_stage: newStage }),
    });
    fetchLeads();
  };

  const handleSelectLead = (id: string) => {
    router.push(`/broker/clients/${id}`);
  };

  const totalLeads = leads.length;
  const newThisWeek = leads.filter(l => new Date(l.createdAt) > new Date(Date.now() - 7 * 86400000)).length;
  const conversionRate = totalLeads > 0 ? Math.round(leads.filter(l => ['live', 'active', 'vip'].includes(l.stage)).length / totalLeads * 100) : 0;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / totalLeads) : 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">RAPTOR CRM</h1>
          <p className="text-xs text-white/30">Lead to VIP pipeline — {totalLeads} total contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchLeads()} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAddLead(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00b4ff] text-white text-xs font-medium hover:bg-[#00b4ff]/80">
            <Plus className="h-3.5 w-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: totalLeads, icon: <Users className="h-4 w-4" />, color: '#00b4ff' },
          { label: 'New This Week', value: newThisWeek, icon: <TrendingUp className="h-4 w-4" />, color: '#00dc82' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: <Target className="h-4 w-4" />, color: '#8b5cf6' },
          { label: 'Avg Lead Score', value: avgScore, icon: <BarChart3 className="h-4 w-4" />, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] text-white/25">{kpi.label}</span>
            </div>
            <div className="text-xl font-mono font-bold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <input type="text" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none" />
        </div>
        <div className="flex gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['pipeline', 'list', 'tasks'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${view === v ? 'bg-white/10 text-white' : 'text-white/30'}`}>
              {v === 'pipeline' ? 'Pipeline' : v === 'list' ? 'List View' : `Tasks (${tasks.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline View */}
      {view === 'pipeline' && <CrmPipeline stages={stages} onSelectLead={handleSelectLead} />}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-3 py-2.5 font-medium">Email</th>
                <th className="text-left px-3 py-2.5 font-medium">Country</th>
                <th className="text-center px-3 py-2.5 font-medium">Stage</th>
                <th className="text-center px-3 py-2.5 font-medium">Score</th>
                <th className="text-left px-3 py-2.5 font-medium">Source</th>
                <th className="text-left px-3 py-2.5 font-medium">Assigned</th>
                <th className="text-right px-3 py-2.5 font-medium">Deposits</th>
                <th className="text-right px-4 py-2.5 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} onClick={() => handleSelectLead(lead.id)} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium text-white">{lead.name}</td>
                  <td className="px-3 py-2.5 text-xs text-white/40">{lead.email}</td>
                  <td className="px-3 py-2.5 text-xs text-white/40">{lead.country}</td>
                  <td className="px-3 py-2.5 text-center">
                    <select value={lead.stage} onClick={e => e.stopPropagation()}
                      onChange={e => handleStageChange(lead.id, e.target.value)}
                      className="bg-transparent text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/60">
                      {STAGE_CONFIG.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-mono font-bold ${lead.score >= 80 ? 'text-[#00dc82]' : lead.score >= 50 ? 'text-[#f59e0b]' : 'text-white/30'}`}>{lead.score}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/30">{lead.source}</td>
                  <td className="px-3 py-2.5 text-xs text-white/30">{lead.assignedAgentName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-white/40">${lead.totalDeposits.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-white/40">{lead.totalVolume.toFixed(0)} lots</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && !loading && (
            <div className="text-center py-12 text-white/20 text-xs">No leads found. Click "Add Lead" to create one.</div>
          )}
        </div>
      )}

      {/* Tasks View */}
      {view === 'tasks' && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <ListChecks className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/20">No pending tasks</p>
            </div>
          ) : tasks.map(task => (
            <div key={task.id as string} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className={`w-2 h-2 rounded-full ${
                task.priority === 'urgent' ? 'bg-[#ef4444]' : task.priority === 'high' ? 'bg-[#f59e0b]' : 'bg-[#00b4ff]'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{task.title as string}</div>
                <div className="text-[10px] text-white/25">{task.client_name as string} &middot; {task.type as string}</div>
              </div>
              <div className="text-[10px] text-white/20">{task.due_date ? new Date(task.due_date as string).toLocaleDateString() : 'No due date'}</div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                task.priority === 'urgent' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                task.priority === 'high' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-white/5 text-white/30'
              }`}>{(task.priority as string) ?? 'normal'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowAddLead(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl p-6 z-50 space-y-4">
            <h3 className="text-sm font-semibold text-white">Add New Lead</h3>
            {[
              { key: 'full_name', label: 'Full Name', placeholder: 'John Smith' },
              { key: 'email', label: 'Email', placeholder: 'john@example.com' },
              { key: 'phone', label: 'Phone', placeholder: '+1-555-0100' },
              { key: 'country', label: 'Country Code', placeholder: 'US' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] text-white/30 uppercase tracking-wider">{f.label}</label>
                <input type="text" placeholder={f.placeholder}
                  value={newLead[f.key as keyof typeof newLead]}
                  onChange={e => setNewLead(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider">Source</label>
              <select value={newLead.source} onChange={e => setNewLead(prev => ({ ...prev, source: e.target.value }))}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#00b4ff] focus:outline-none">
                {['organic', 'google_ads', 'meta_ads', 'ib_referral', 'affiliate', 'event', 'cold_call', 'csv_import'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddLead(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:bg-white/5">Cancel</button>
              <button onClick={handleAddLead} disabled={!newLead.full_name} className="flex-1 py-2 rounded-lg bg-[#00b4ff] text-xs text-white font-medium hover:bg-[#00b4ff]/80 disabled:opacity-30">Add Lead</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
