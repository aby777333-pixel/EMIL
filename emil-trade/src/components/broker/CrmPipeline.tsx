'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Phone, Mail, Clock, Tag, ChevronRight,
  DollarSign, AlertCircle, Sparkles, GripVertical,
  LayoutGrid, List,
} from 'lucide-react';
import type { CrmPipelineStage, CrmLead, CrmStage } from '@/types/broker';

const STAGE_COLORS: Record<CrmStage, string> = {
  lead: '#6b7280',
  contacted: '#00b4ff',
  demo: '#8b5cf6',
  documents: '#f59e0b',
  live: '#00dc82',
  active: '#10b981',
  vip: '#f59e0b',
};

// ─── Lead Card ──────────────────────────────────────────────

function LeadCard({ lead, onSelect }: { lead: CrmLead; onSelect: (id: string) => void }) {
  const stageColor = STAGE_COLORS[lead.stage];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onSelect(lead.id)}
      className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 cursor-pointer
        hover:border-white/10 hover:bg-white/[0.05] transition-all group"
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">
          {lead.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{lead.name}</div>
          <div className="text-[10px] text-white/30 truncate">{lead.email}</div>
        </div>
        <GripVertical className="h-3 w-3 text-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/30">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-white/25">
        {lead.totalDeposits > 0 && (
          <span className="flex items-center gap-0.5 text-[#00dc82]">
            <DollarSign className="h-2.5 w-2.5" />
            ${(lead.totalDeposits / 1000).toFixed(1)}K
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {lead.slaHoursRemaining !== null ? `${lead.slaHoursRemaining}h SLA` : 'No SLA'}
        </span>
        {lead.country && <span>{lead.country}</span>}
      </div>

      {/* AI suggestion */}
      {lead.aiSuggestedAction && (
        <div className="mt-2 px-2 py-1 rounded bg-[#8b5cf6]/5 border border-[#8b5cf6]/10">
          <div className="flex items-center gap-1 text-[9px] text-[#8b5cf6]">
            <Sparkles className="h-2.5 w-2.5" />
            {lead.aiSuggestedAction}
          </div>
        </div>
      )}

      {/* Risk / KYC badges */}
      <div className="flex items-center gap-1.5 mt-2">
        {lead.riskCategory === 'high' || lead.riskCategory === 'very_high' ? (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400">
            <AlertCircle className="h-2.5 w-2.5" />
            {lead.riskCategory}
          </span>
        ) : null}
        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
          lead.kycStatus === 'verified' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
          lead.kycStatus === 'pending' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
          lead.kycStatus === 'rejected' ? 'bg-red-500/10 text-red-400' :
          'bg-white/5 text-white/30'
        }`}>
          KYC: {lead.kycStatus}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Pipeline Column ────────────────────────────────────────

function PipelineColumn({ stage, onSelectLead }: { stage: CrmPipelineStage; onSelectLead: (id: string) => void }) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-xs font-semibold text-white/70">{stage.name}</span>
          <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full font-mono">
            {stage.count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 scrollbar-thin">
        {stage.leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
        ))}
        {stage.leads.length === 0 && (
          <div className="py-8 text-center text-[11px] text-white/15">No leads in this stage</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Pipeline ──────────────────────────────────────────

interface CrmPipelineProps {
  stages: CrmPipelineStage[];
  onSelectLead: (id: string) => void;
}

export function CrmPipeline({ stages, onSelectLead }: CrmPipelineProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const totalLeads = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">CRM Pipeline</h3>
          <p className="text-[11px] text-white/30">{totalLeads} total leads across {stages.length} stages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-white/30'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {stages.map(stage => (
            <PipelineColumn key={stage.id} stage={stage} onSelectLead={onSelectLead} />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 font-medium">Client</th>
                <th className="text-left px-3 py-2.5 font-medium">Stage</th>
                <th className="text-left px-3 py-2.5 font-medium">Agent</th>
                <th className="text-right px-3 py-2.5 font-medium">Deposits</th>
                <th className="text-left px-3 py-2.5 font-medium">KYC</th>
                <th className="text-left px-3 py-2.5 font-medium">Risk</th>
                <th className="text-left px-3 py-2.5 font-medium">Source</th>
                <th className="text-right px-4 py-2.5 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {stages.flatMap(s => s.leads).map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-medium text-white">{lead.name}</div>
                    <div className="text-[10px] text-white/30">{lead.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize" style={{
                      backgroundColor: `${STAGE_COLORS[lead.stage]}15`,
                      color: STAGE_COLORS[lead.stage],
                    }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/40">{lead.assignedAgentName ?? 'Unassigned'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-white/50">
                    {lead.totalDeposits > 0 ? `$${(lead.totalDeposits / 1000).toFixed(1)}K` : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] ${
                      lead.kycStatus === 'verified' ? 'text-[#00dc82]' :
                      lead.kycStatus === 'pending' ? 'text-[#f59e0b]' : 'text-white/30'
                    }`}>{lead.kycStatus}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] capitalize ${
                      lead.riskCategory === 'high' || lead.riskCategory === 'very_high' ? 'text-red-400' : 'text-white/30'
                    }`}>{lead.riskCategory}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/30">{lead.source || '-'}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-white/25">
                    {lead.slaHoursRemaining !== null ? `${lead.slaHoursRemaining}h` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
