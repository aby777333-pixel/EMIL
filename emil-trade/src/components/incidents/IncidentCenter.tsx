'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Shield, Clock, User, ChevronDown,
  CheckCircle2, XCircle, Zap, Play, MessageCircle,
  ArrowUpCircle, Radio, Siren, BookOpen, TestTube,
} from 'lucide-react';
import type { Incident, IncidentSeverity, IncidentStatus, IncidentPlaybook } from '@/types/incidents';

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string; bg: string }> = {
  low: { label: 'LOW', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  medium: { label: 'MEDIUM', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  high: { label: 'HIGH', color: '#ff6b35', bg: 'rgba(255,107,53,0.1)' },
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  emergency: { label: 'EMERGENCY', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  triggered: { label: 'Triggered', color: '#ef4444', icon: <Siren className="h-3 w-3" /> },
  acknowledged: { label: 'Acknowledged', color: '#f59e0b', icon: <CheckCircle2 className="h-3 w-3" /> },
  investigating: { label: 'Investigating', color: '#00b4ff', icon: <Radio className="h-3 w-3 animate-pulse" /> },
  mitigating: { label: 'Mitigating', color: '#8b5cf6', icon: <Shield className="h-3 w-3" /> },
  resolved: { label: 'Resolved', color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  post_mortem: { label: 'Post-Mortem', color: '#6b7280', icon: <BookOpen className="h-3 w-3" /> },
};

function IncidentCard({ incident, onAcknowledge, onEscalate, onResolve, onExpand }: {
  incident: Incident;
  onAcknowledge: (id: string) => void;
  onEscalate: (id: string) => void;
  onResolve: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[incident.severity];
  const stat = STATUS_CONFIG[incident.status];
  const isActive = !['resolved', 'post_mortem'].includes(incident.status);
  const elapsed = Math.floor((Date.now() - new Date(incident.createdAt).getTime()) / 60000);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl overflow-hidden ${
        incident.severity === 'emergency' ? 'border-red-500/40 bg-red-500/[0.03]' :
        incident.severity === 'critical' ? 'border-red-500/20 bg-red-500/[0.02]' :
        'border-white/[0.06] bg-white/[0.02]'
      } ${incident.isDrill ? 'ring-1 ring-[#8b5cf6]/30' : ''}`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Severity Indicator */}
          <div className="mt-1">
            {incident.severity === 'emergency' || incident.severity === 'critical' ? (
              <Siren className="h-5 w-5 animate-pulse" style={{ color: sev.color }} />
            ) : (
              <AlertTriangle className="h-5 w-5" style={{ color: sev.color }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-white">{incident.title}</h4>
              {incident.isDrill && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#8b5cf6]/10 text-[#8b5cf6]">
                  <TestTube className="h-2.5 w-2.5" /> DRILL
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/40 line-clamp-1 mb-2">{incident.description}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: sev.bg, color: sev.color }}>
                {sev.label}
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: stat.color }}>
                {stat.icon} {stat.label}
              </span>
              {incident.ownerName && (
                <span className="flex items-center gap-1 text-[10px] text-white/25">
                  <User className="h-2.5 w-2.5" /> {incident.ownerName}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                <Clock className="h-2.5 w-2.5" /> {elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`} ago
              </span>
              <span className="text-[9px] text-white/15 capitalize">{incident.type.replace(/_/g, ' ')}</span>
            </div>

            {/* Auto-actions */}
            {incident.autoActionsExecuted.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {incident.autoActionsExecuted.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] bg-[#00b4ff]/10 text-[#00b4ff]/70">
                    <Zap className="h-2 w-2" /> {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isActive && incident.status === 'triggered' && (
              <button onClick={() => onAcknowledge(incident.id)}
                className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b] text-white text-[10px] font-medium hover:bg-[#f59e0b]/80 transition-colors">
                ACK
              </button>
            )}
            {isActive && (
              <>
                <button onClick={() => onEscalate(incident.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Escalate">
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onResolve(incident.id)}
                  className="p-1.5 rounded-lg bg-[#00dc82]/10 text-[#00dc82] hover:bg-[#00dc82]/20 transition-colors"
                  title="Resolve">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/15 hover:text-white/40 transition-colors">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
              <div className="text-[10px] text-white/25 mb-2 font-medium">TIMELINE</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {incident.timeline.map(evt => (
                  <div key={evt.id} className="flex gap-2.5 text-[11px]">
                    <div className="w-1 rounded-full shrink-0 mt-1" style={{
                      backgroundColor: evt.type === 'auto_action' ? '#00b4ff' :
                        evt.type === 'escalation' ? '#ef4444' :
                        evt.type === 'resolution' ? '#00dc82' :
                        evt.type === 'status_change' ? '#f59e0b' : '#6b7280',
                      height: '12px',
                    }} />
                    <div className="flex-1">
                      <span className="text-white/50">{evt.message}</span>
                      <div className="text-[9px] text-white/15 mt-0.5">
                        {evt.userName && <span>{evt.userName} · </span>}
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Root cause (if resolved) */}
              {incident.rootCause && (
                <div className="mt-3 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[9px] text-white/20 mb-1">ROOT CAUSE</div>
                  <p className="text-[11px] text-white/40">{incident.rootCause}</p>
                </div>
              )}
              {incident.prevention && (
                <div className="mt-2 p-2 rounded bg-[#00dc82]/[0.03] border border-[#00dc82]/10">
                  <div className="text-[9px] text-[#00dc82]/50 mb-1">PREVENTION</div>
                  <p className="text-[11px] text-white/40">{incident.prevention}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface IncidentCenterProps {
  incidents: Incident[];
  playbooks: IncidentPlaybook[];
  onAcknowledge: (id: string) => void;
  onEscalate: (id: string) => void;
  onResolve: (id: string) => void;
  onRunDrill: (playbookId: string) => void;
}

export function IncidentCenter({ incidents, playbooks, onAcknowledge, onEscalate, onResolve, onRunDrill }: IncidentCenterProps) {
  const [tab, setTab] = useState<'active' | 'resolved' | 'playbooks'>('active');
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'all'>('all');

  const active = incidents.filter(i => !['resolved', 'post_mortem'].includes(i.status));
  const resolved = incidents.filter(i => ['resolved', 'post_mortem'].includes(i.status));
  const criticalCount = active.filter(i => i.severity === 'critical' || i.severity === 'emergency').length;

  const displayed = (tab === 'active' ? active : resolved).filter(i =>
    filterSeverity === 'all' || i.severity === filterSeverity
  );

  return (
    <div className="space-y-5">
      {/* Emergency Banner */}
      {criticalCount > 0 && (
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <Siren className="h-5 w-5 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            {criticalCount} critical/emergency incident{criticalCount !== 1 ? 's' : ''} requiring immediate attention
          </span>
        </motion.div>
      )}

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          <button onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'active' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            Active ({active.length})
          </button>
          <button onClick={() => setTab('resolved')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'resolved' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            Resolved ({resolved.length})
          </button>
          <button onClick={() => setTab('playbooks')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'playbooks' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            <BookOpen className="h-3 w-3" /> Playbooks
          </button>
        </div>

        {tab !== 'playbooks' && (
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            {(['all', 'emergency', 'critical', 'high', 'medium', 'low'] as const).map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-colors ${
                  filterSeverity === s ? 'bg-white/10 text-white' : 'text-white/30'
                }`}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Incident List */}
      {tab !== 'playbooks' && (
        <div className="space-y-3">
          {displayed.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="h-10 w-10 text-[#00dc82]/20 mx-auto mb-3" />
              <p className="text-sm text-white/20">
                {tab === 'active' ? 'No active incidents — all clear' : 'No resolved incidents in this filter'}
              </p>
            </div>
          ) : displayed.map(inc => (
            <IncidentCard key={inc.id} incident={inc}
              onAcknowledge={onAcknowledge} onEscalate={onEscalate}
              onResolve={onResolve} onExpand={() => {}} />
          ))}
        </div>
      )}

      {/* Playbooks */}
      {tab === 'playbooks' && (
        <div className="grid grid-cols-2 gap-4">
          {playbooks.map(pb => (
            <motion.div key={pb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">{pb.name}</h4>
                  <p className="text-[10px] text-white/25 capitalize">{pb.incidentType.replace(/_/g, ' ')}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${pb.isActive ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-white/5 text-white/20'}`}>
                  {pb.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[11px] text-white/30 mb-3">{pb.description}</p>
              <div className="text-[9px] text-white/15 mb-2">Trigger: {pb.triggerCondition}</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {pb.autoActions.map((a, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[8px] bg-[#00b4ff]/10 text-[#00b4ff]/60">
                    <Zap className="h-2 w-2 inline mr-0.5" />{a}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/15">{pb.steps.length} steps · {pb.notifyRoles.length} roles notified</span>
                <button onClick={() => onRunDrill(pb.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] font-medium hover:bg-[#8b5cf6]/20 transition-colors">
                  <TestTube className="h-3 w-3" /> Run Drill
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
