'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight, Server, Users, CheckCircle2, XCircle,
  Clock, AlertTriangle, Mail, BarChart3, ArrowRight,
  Radio, Globe, Zap, RefreshCw, Search,
} from 'lucide-react';
import type { PlatformMigration, ClientMigrationStatus, TerminalConnection, LegacyPlatform, MigrationPhase } from '@/types/connect';
import { formatCompact } from '@/lib/utils/format';

const PLATFORM_LABELS: Record<LegacyPlatform, string> = {
  mt5: 'MetaTrader 5', ctrader: 'cTrader', acttrader: 'ActTrader',
  vertexfx: 'VertexFX', custom_csv: 'CSV Import', custom_api: 'API Import',
};

const PHASE_CONFIG: Record<MigrationPhase, { label: string; color: string; step: number }> = {
  planning: { label: 'Planning', color: '#6b7280', step: 1 },
  data_import: { label: 'Data Import', color: '#00b4ff', step: 2 },
  dual_run: { label: 'Dual Run', color: '#8b5cf6', step: 3 },
  traffic_shift: { label: 'Traffic Shift', color: '#f59e0b', step: 4 },
  validation: { label: 'Validation', color: '#06b6d4', step: 5 },
  cutover: { label: 'Cutover', color: '#00dc82', step: 6 },
  complete: { label: 'Complete', color: '#00dc82', step: 7 },
};

function ProgressBar({ label, current, total }: { label: string; current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-0.5">
        <span className="text-white/25">{label}</span>
        <span className="text-white/30 font-mono">{formatCompact(current)}/{formatCompact(total)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          className="h-full rounded-full bg-gradient-to-r from-[#00b4ff] to-[#00dc82]" />
      </div>
    </div>
  );
}

interface MigrationCenterProps {
  migrations: PlatformMigration[];
  clientStatuses: ClientMigrationStatus[];
  terminals: TerminalConnection[];
  onCutover: (migrationId: string) => void;
  onSendEmails: (migrationId: string) => void;
}

export function MigrationCenter({ migrations, clientStatuses, terminals, onCutover, onSendEmails }: MigrationCenterProps) {
  const [tab, setTab] = useState<'migrations' | 'clients' | 'terminals'>('migrations');
  const [search, setSearch] = useState('');

  const filteredClients = clientStatuses.filter(c =>
    !search || c.clientName.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'migrations', label: 'Platform Migrations', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
          { key: 'clients', label: `Client Status (${clientStatuses.length})`, icon: <Users className="h-3.5 w-3.5" /> },
          { key: 'terminals', label: `Terminals (${terminals.length})`, icon: <Radio className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Migrations */}
      {tab === 'migrations' && (
        <div className="space-y-5">
          {migrations.map(mig => {
            const phase = PHASE_CONFIG[mig.phase];
            return (
              <div key={mig.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-[#00b4ff]" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">{mig.serverName}</h4>
                      <p className="text-[10px] text-white/25">{PLATFORM_LABELS[mig.platform]} → RAPTOR</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#f59e0b]">{mig.trafficSplitPct}% → RAPTOR</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${phase.color}15`, color: phase.color }}>
                      {phase.label}
                    </span>
                  </div>
                </div>

                {/* Phase Progress */}
                <div className="flex items-center gap-1 mb-4">
                  {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex-1 flex items-center gap-1">
                      <div className={`flex-1 h-1 rounded-full ${cfg.step <= phase.step ? 'bg-[#00dc82]' : 'bg-white/5'}`} />
                    </div>
                  ))}
                </div>

                {/* Progress Bars */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <ProgressBar label="Clients" current={mig.migratedClients} total={mig.totalClients} />
                  <ProgressBar label="Accounts" current={mig.migratedAccounts} total={mig.totalAccounts} />
                  <ProgressBar label="Trade History" current={mig.migratedHistory} total={mig.totalHistory} />
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <ProgressBar label="Open Positions" current={mig.syncedPositions} total={mig.openPositions} />
                  <ProgressBar label="EA/Script Conversion" current={mig.convertedScripts} total={mig.eaScripts} />
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-white/25">Migration Emails</span>
                      <span className="text-white/30 font-mono">{mig.emailsSent} sent · {mig.emailsPending} pending</span>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {mig.errors.filter(e => !e.resolved).length > 0 && (
                  <div className="mb-3 space-y-1">
                    {mig.errors.filter(e => !e.resolved).slice(0, 3).map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-[#ef4444]">
                        <AlertTriangle className="h-2.5 w-2.5" />{err.type}: {err.message} ({err.clientRef})
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {mig.emailsPending > 0 && (
                    <button onClick={() => onSendEmails(mig.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00b4ff]/10 text-[#00b4ff] text-[10px] font-medium hover:bg-[#00b4ff]/20">
                      <Mail className="h-3 w-3" /> Send Migration Emails
                    </button>
                  )}
                  {mig.phase !== 'complete' && (
                    <button onClick={() => onCutover(mig.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00dc82] text-white text-[10px] font-medium hover:bg-[#00dc82]/80">
                      <ArrowRight className="h-3 w-3" /> Advance Phase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Status */}
      {tab === 'clients' && (
        <div className="space-y-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
            <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white focus:border-[#00b4ff] focus:outline-none" />
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px] text-white/25 uppercase border-b border-white/[0.04]">
                  <th className="text-left px-4 py-2 font-medium">Client</th>
                  <th className="text-left px-3 py-2 font-medium">Platform</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                  <th className="text-center px-3 py-2 font-medium">Accounts</th>
                  <th className="text-center px-3 py-2 font-medium">History</th>
                  <th className="text-center px-3 py-2 font-medium">Positions</th>
                  <th className="text-center px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Migrated</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.slice(0, 20).map(c => (
                  <tr key={c.clientId} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                    <td className="px-4 py-2">
                      <div className="text-white/60">{c.clientName}</div>
                      <div className="text-[9px] text-white/15">{c.email}</div>
                    </td>
                    <td className="px-3 py-2 text-[9px] text-white/25">{PLATFORM_LABELS[c.platform]}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        c.status === 'migrated' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                        c.status === 'in_progress' || c.status === 'dual_run' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
                        c.status === 'failed' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                        'bg-white/5 text-white/20'
                      }`}>{c.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-white/30">{c.accountsMigrated}/{c.totalAccounts}</td>
                    <td className="px-3 py-2 text-center">{c.historyImported ? <CheckCircle2 className="h-3 w-3 text-[#00dc82] mx-auto" /> : <XCircle className="h-3 w-3 text-white/10 mx-auto" />}</td>
                    <td className="px-3 py-2 text-center">{c.positionsSynced ? <CheckCircle2 className="h-3 w-3 text-[#00dc82] mx-auto" /> : <XCircle className="h-3 w-3 text-white/10 mx-auto" />}</td>
                    <td className="px-3 py-2 text-center">{c.emailSent ? <CheckCircle2 className="h-3 w-3 text-[#00dc82] mx-auto" /> : <Clock className="h-3 w-3 text-white/10 mx-auto" />}</td>
                    <td className="px-4 py-2 text-[9px] text-white/15">{c.migratedAt ? new Date(c.migratedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terminals */}
      {tab === 'terminals' && (
        <div className="space-y-3">
          {terminals.length === 0 ? (
            <div className="text-center py-16"><Radio className="h-10 w-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/20">No third-party terminals connected</p></div>
          ) : terminals.map(term => (
            <div key={term.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-3 flex items-center gap-4">
              <Radio className={`h-4 w-4 ${term.status === 'active' ? 'text-[#00dc82]' : term.status === 'error' ? 'text-[#ef4444]' : 'text-white/15'}`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{term.name}</div>
                <div className="text-[10px] text-white/25">{term.clientName} · {term.type.toUpperCase()}{term.fixVersion ? ` ${term.fixVersion}` : ''}</div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/25">
                <span>{term.ordersToday} orders</span>
                <span>{term.volumeToday.toFixed(0)} lots</span>
                <span>{term.latencyMs}ms</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                term.status === 'active' ? 'bg-[#00dc82]/10 text-[#00dc82]' : term.status === 'error' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-white/5 text-white/20'
              }`}>{term.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
