'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Clock, Calendar, FileText,
  Download, CheckCircle2, XCircle, Upload, Globe,
  Heart, Users, BarChart3, Eye, Bell,
} from 'lucide-react';
import type { AtRiskClient, RegulatoryReport, RegulatoryDeadline, JurisdictionConfig } from '@/types/comply';
import { JURISDICTION_CONFIGS } from '@/types/comply';

interface ComplianceSuiteProps {
  atRiskClients: AtRiskClient[];
  reports: RegulatoryReport[];
  deadlines: RegulatoryDeadline[];
  onGenerateReport: (jurisdiction: string, reportType: string) => void;
  onSubmitReport: (reportId: string) => void;
  onContactClient: (clientId: string) => void;
}

export function ComplianceSuite({ atRiskClients, reports, deadlines, onGenerateReport, onSubmitReport, onContactClient }: ComplianceSuiteProps) {
  const [tab, setTab] = useState<'responsible' | 'reports' | 'deadlines' | 'jurisdictions'>('responsible');

  const urgentDeadlines = deadlines.filter(d => d.daysRemaining <= 7 && d.status !== 'submitted');
  const criticalClients = atRiskClients.filter(c => c.riskLevel === 'critical');

  return (
    <div className="space-y-5">
      {/* Alert Banner */}
      {(urgentDeadlines.length > 0 || criticalClients.length > 0) && (
        <div className="px-4 py-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#ef4444]" />
          <div className="flex-1 text-xs text-[#ef4444]">
            {urgentDeadlines.length > 0 && <span>{urgentDeadlines.length} regulatory deadline{urgentDeadlines.length !== 1 ? 's' : ''} due within 7 days. </span>}
            {criticalClients.length > 0 && <span>{criticalClients.length} client{criticalClients.length !== 1 ? 's' : ''} flagged as critical risk.</span>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'responsible', label: 'Responsible Trading', icon: <Heart className="h-3.5 w-3.5" /> },
          { key: 'reports', label: 'Regulatory Reports', icon: <FileText className="h-3.5 w-3.5" /> },
          { key: 'deadlines', label: 'Deadline Calendar', icon: <Calendar className="h-3.5 w-3.5" /> },
          { key: 'jurisdictions', label: 'Jurisdictions', icon: <Globe className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Responsible Trading */}
      {tab === 'responsible' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">At-Risk Clients</div>
              <div className="text-xl font-mono font-bold text-[#ef4444]">{atRiskClients.length}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Critical</div>
              <div className="text-xl font-mono font-bold text-[#ef4444]">{criticalClients.length}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Self-Excluded</div>
              <div className="text-xl font-mono font-bold text-white/40">3</div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h4 className="text-xs font-medium text-white/50 flex items-center gap-2"><Heart className="h-4 w-4 text-[#ef4444]" /> Clients At Risk — NEXUS Flagged</h4>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {atRiskClients.map(client => (
                <div key={client.id} className="px-5 py-3 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    client.riskLevel === 'critical' ? 'bg-[#ef4444]' : client.riskLevel === 'high' ? 'bg-[#ff6b35]' : 'bg-[#f59e0b]'
                  }`} />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{client.clientName}</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {client.signals.map(s => (
                        <span key={s} className="text-[8px] px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-white/25">
                    <span>Loss: ${client.lossesToday.toFixed(0)}</span>
                    <span>Session: {client.sessionHours.toFixed(1)}h</span>
                    <span>Deposits: ${client.depositsThisWeek.toFixed(0)}/wk</span>
                  </div>
                  <div className="text-[10px] text-[#00b4ff] max-w-48 truncate">{client.recommendedAction}</div>
                  <button onClick={() => onContactClient(client.id)}
                    className="px-2 py-1 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-medium hover:bg-[#f59e0b]/20">
                    Contact
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-3 flex items-center gap-4">
              <FileText className="h-4 w-4 text-white/20" />
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{report.reportName}</div>
                <div className="text-[10px] text-white/25">{report.jurisdiction.toUpperCase()} · {report.period} · {report.recordCount} records</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                report.status === 'submitted' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                report.status === 'ready' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
                report.status === 'generating' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                'bg-white/5 text-white/25'
              }`}>{report.status}</span>
              <span className="text-[9px] text-white/15">{report.format.toUpperCase()}</span>
              {report.status === 'ready' && (
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg bg-white/5 text-white/25 hover:text-white/50"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={() => onSubmitReport(report.id)}
                    className="px-2 py-1 rounded-lg bg-[#00dc82] text-white text-[10px] font-medium hover:bg-[#00dc82]/80">Submit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Deadline Calendar */}
      {tab === 'deadlines' && (
        <div className="space-y-2">
          {deadlines.map(dl => (
            <div key={dl.id} className={`bg-white/[0.02] border rounded-lg px-4 py-3 flex items-center gap-3 ${
              dl.status === 'overdue' ? 'border-[#ef4444]/20' : dl.daysRemaining <= 7 ? 'border-[#f59e0b]/20' : 'border-white/[0.06]'
            }`}>
              <Clock className={`h-4 w-4 ${
                dl.status === 'overdue' ? 'text-[#ef4444]' : dl.daysRemaining <= 7 ? 'text-[#f59e0b]' : 'text-white/15'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{dl.reportName}</div>
                <div className="text-[10px] text-white/25">{dl.jurisdiction.toUpperCase()} · {dl.frequency}</div>
              </div>
              <span className="text-xs font-mono text-white/30">{new Date(dl.deadline).toLocaleDateString()}</span>
              <span className={`text-xs font-mono font-bold ${
                dl.status === 'overdue' ? 'text-[#ef4444]' : dl.daysRemaining <= 7 ? 'text-[#f59e0b]' : 'text-white/25'
              }`}>
                {dl.status === 'submitted' ? '✓ Submitted' : dl.status === 'overdue' ? 'OVERDUE' : `${dl.daysRemaining}d`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Jurisdictions */}
      {tab === 'jurisdictions' && (
        <div className="grid grid-cols-2 gap-4">
          {JURISDICTION_CONFIGS.map(jc => (
            <div key={jc.code} className={`bg-white/[0.02] border rounded-xl p-5 ${jc.isActive ? 'border-[#00dc82]/10' : 'border-white/[0.06] opacity-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">{jc.name}</h4>
                  <p className="text-[10px] text-white/25">{jc.regulator}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded ${jc.isActive ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-white/5 text-white/20'}`}>
                  {jc.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1.5">
                {jc.reports.map(r => (
                  <div key={r.name} className="flex items-center justify-between text-[10px]">
                    <span className="text-white/40">{r.name}</span>
                    <span className="text-white/20">{r.frequency} · {r.format}</span>
                  </div>
                ))}
              </div>
              {jc.isActive && (
                <button onClick={() => onGenerateReport(jc.code, jc.reports[0]?.name ?? '')}
                  className="mt-3 w-full py-1.5 rounded-lg bg-white/5 text-white/30 text-[10px] hover:bg-white/10">Generate Latest Report</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
