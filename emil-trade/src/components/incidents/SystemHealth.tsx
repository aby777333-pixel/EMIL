'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Server, Database, Radio, Globe, Cpu,
  HardDrive, Wifi, AlertTriangle, CheckCircle2,
  XCircle, Clock, Bell, RefreshCw, Wrench,
} from 'lucide-react';
import type { ServiceHealth, OperationalAlert, MaintenanceWindow, ServiceStatus, AlertLevel } from '@/types/incidents';

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  healthy: { label: 'Healthy', color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  degraded: { label: 'Degraded', color: '#f59e0b', icon: <AlertTriangle className="h-3 w-3" /> },
  down: { label: 'Down', color: '#ef4444', icon: <XCircle className="h-3 w-3" /> },
  maintenance: { label: 'Maintenance', color: '#8b5cf6', icon: <Wrench className="h-3 w-3" /> },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  core: <Server className="h-3.5 w-3.5" />,
  bridge: <Radio className="h-3.5 w-3.5" />,
  database: <Database className="h-3.5 w-3.5" />,
  queue: <Activity className="h-3.5 w-3.5" />,
  api: <Globe className="h-3.5 w-3.5" />,
  websocket: <Wifi className="h-3.5 w-3.5" />,
  storage: <HardDrive className="h-3.5 w-3.5" />,
  external: <Globe className="h-3.5 w-3.5" />,
};

const ALERT_COLORS: Record<AlertLevel, string> = {
  info: '#00b4ff', warning: '#f59e0b', critical: '#ef4444', emergency: '#dc2626',
};

interface SystemHealthProps {
  services: ServiceHealth[];
  alerts: OperationalAlert[];
  maintenanceWindows: MaintenanceWindow[];
  onAcknowledgeAlert: (id: string) => void;
}

export function SystemHealth({ services, alerts, maintenanceWindows, onAcknowledgeAlert }: SystemHealthProps) {
  const [tab, setTab] = useState<'services' | 'alerts' | 'maintenance'>('services');

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const activeAlerts = alerts.filter(a => !a.resolvedAt && !a.isSuppressed);

  // Group services by category
  const grouped = services.reduce<Record<string, ServiceHealth[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Total Services</div>
          <div className="text-xl font-mono font-bold text-white">{services.length}</div>
        </div>
        <div className="bg-white/[0.02] border border-[#00dc82]/10 rounded-lg p-3">
          <div className="text-[10px] text-[#00dc82]/50 mb-1">Healthy</div>
          <div className="text-xl font-mono font-bold text-[#00dc82]">{healthyCount}</div>
        </div>
        <div className="bg-white/[0.02] border border-[#f59e0b]/10 rounded-lg p-3">
          <div className="text-[10px] text-[#f59e0b]/50 mb-1">Degraded</div>
          <div className="text-xl font-mono font-bold text-[#f59e0b]">{degradedCount}</div>
        </div>
        <div className={`bg-white/[0.02] border rounded-lg p-3 ${downCount > 0 ? 'border-[#ef4444]/20' : 'border-white/[0.06]'}`}>
          <div className="text-[10px] text-white/25 mb-1">Down / Alerts</div>
          <div className="text-xl font-mono font-bold text-[#ef4444]">{downCount} / {activeAlerts.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'services', label: 'Services', count: services.length },
          { key: 'alerts', label: 'Alerts', count: activeAlerts.length },
          { key: 'maintenance', label: 'Maintenance', count: maintenanceWindows.length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.label} ({t.count})</button>
        ))}
      </div>

      {/* Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 text-[11px] text-white/25 uppercase tracking-wider">
                {CATEGORY_ICONS[category]}{category}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categoryServices.map(svc => {
                  const stat = STATUS_CONFIG[svc.status];
                  return (
                    <div key={svc.id} className={`bg-white/[0.02] border rounded-lg px-4 py-3 flex items-center gap-3 ${
                      svc.status === 'down' ? 'border-[#ef4444]/20' :
                      svc.status === 'degraded' ? 'border-[#f59e0b]/10' : 'border-white/[0.06]'
                    }`}>
                      <span style={{ color: stat.color }}>{stat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">{svc.name}</div>
                        <div className="text-[9px] text-white/20">{stat.label}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-white/25">
                        <span title="Latency">{svc.latencyMs}ms</span>
                        <span title="CPU">{svc.cpuUsage.toFixed(0)}%</span>
                        <span title="Memory">{svc.memoryUsage.toFixed(0)}%</span>
                        <span title="Errors" className={svc.errorRate > 1 ? 'text-[#ef4444]' : ''}>
                          {svc.errorRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/20">No operational alerts</p>
            </div>
          ) : alerts.map(alert => (
            <div key={alert.id} className={`bg-white/[0.02] border rounded-lg px-4 py-3 flex items-center gap-3 ${
              alert.resolvedAt ? 'border-white/[0.04] opacity-50' : `border-white/[0.06]`
            }`}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ALERT_COLORS[alert.level] }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70">{alert.message}</div>
                <div className="text-[10px] text-white/20 mt-0.5">{alert.service} · {alert.metric}: {alert.currentValue} (threshold: {alert.threshold})</div>
              </div>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${ALERT_COLORS[alert.level]}15`, color: ALERT_COLORS[alert.level] }}>
                {alert.level}
              </span>
              {!alert.resolvedAt && !alert.acknowledgedBy && (
                <button onClick={() => onAcknowledgeAlert(alert.id)}
                  className="px-2 py-1 rounded bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-medium hover:bg-[#f59e0b]/20">
                  ACK
                </button>
              )}
              {alert.runbookUrl && (
                <span className="text-[9px] text-[#00b4ff] underline cursor-pointer">Runbook</span>
              )}
              <span className="text-[9px] text-white/10">{new Date(alert.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance */}
      {tab === 'maintenance' && (
        <div className="space-y-3">
          {maintenanceWindows.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/20">No scheduled maintenance</p>
            </div>
          ) : maintenanceWindows.map(mw => (
            <div key={mw.id} className="bg-white/[0.02] border border-[#8b5cf6]/10 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  <span className="text-xs font-medium text-white">{mw.title}</span>
                </div>
                {mw.suppressAlerts && <span className="text-[9px] text-[#8b5cf6] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded">Alerts suppressed</span>}
              </div>
              <div className="text-[10px] text-white/30">
                {new Date(mw.startAt).toLocaleString()} → {new Date(mw.endAt).toLocaleString()}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(mw.services as string[]).map(s => (
                  <span key={s} className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-white/25">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
