'use client';

import { useState } from 'react';
import { Siren, Activity } from 'lucide-react';
import { IncidentCenter } from '@/components/incidents/IncidentCenter';
import { SystemHealth } from '@/components/incidents/SystemHealth';
import type { Incident, IncidentPlaybook, ServiceHealth, OperationalAlert, MaintenanceWindow } from '@/types/incidents';

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-1', type: 'lp_connectivity', severity: 'critical', status: 'investigating',
    title: 'Integral OCX FIX Session Dropped', description: 'FIX session to Integral OCX lost at 14:23 UTC. Fill rate dropped to 0%. Orders auto-routed to PrimeXM failover.',
    trigger: 'FIX session heartbeat timeout after 3 missed intervals',
    autoActionsExecuted: ['Route to failover LP', 'Alert risk desk', 'Widen spreads on affected symbols'],
    owner: 'u1', ownerName: 'Tom Risk', notifiedRoles: ['risk_manager', 'broker_admin'],
    timeline: [
      { id: 'e1', type: 'auto_action', message: 'FIX heartbeat timeout detected on INT_001', userId: null, userName: null, createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'e2', type: 'auto_action', message: 'All orders auto-routed to PrimeXM XCore (failover)', userId: null, userName: null, createdAt: new Date(Date.now() - 1790000).toISOString() },
      { id: 'e3', type: 'notification', message: 'Risk Manager and Broker Admin notified via PagerDuty', userId: null, userName: null, createdAt: new Date(Date.now() - 1780000).toISOString() },
      { id: 'e4', type: 'status_change', message: 'Status changed to Investigating', userId: 'u1', userName: 'Tom Risk', createdAt: new Date(Date.now() - 1500000).toISOString() },
      { id: 'e5', type: 'comment', message: 'Contacted Integral support. They report network maintenance on their LD4 cluster. ETA 30 min.', userId: 'u1', userName: 'Tom Risk', createdAt: new Date(Date.now() - 900000).toISOString() },
    ],
    playbookId: 'pb-2', rootCause: null, prevention: null, isDrill: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(), acknowledgedAt: new Date(Date.now() - 1500000).toISOString(), resolvedAt: null,
  },
  {
    id: 'inc-2', type: 'aml_alert', severity: 'high', status: 'acknowledged',
    title: 'Large Suspicious Deposit — Client #8472', description: '$78,000 wire deposit from new client with mismatched country of origin. Source of funds documentation not provided.',
    trigger: 'Single transaction >$50,000 from unverified source',
    autoActionsExecuted: ['Account frozen pending review', 'Compliance team notified'],
    owner: 'u2', ownerName: 'Jane Compliance', notifiedRoles: ['compliance_officer'],
    timeline: [
      { id: 'e6', type: 'auto_action', message: 'Account ACC-8472 frozen pending compliance review', userId: null, userName: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'e7', type: 'status_change', message: 'Acknowledged by Jane Compliance', userId: 'u2', userName: 'Jane Compliance', createdAt: new Date(Date.now() - 6900000).toISOString() },
    ],
    playbookId: 'pb-7', rootCause: null, prevention: null, isDrill: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(), acknowledgedAt: new Date(Date.now() - 6900000).toISOString(), resolvedAt: null,
  },
  {
    id: 'inc-3', type: 'flash_crash', severity: 'critical', status: 'resolved',
    title: 'GBPJPY Flash Crash — 3.2% in 45 seconds', description: 'Sudden liquidity vacuum caused GBPJPY to drop 3.2% during Asian session. 12 clients hit stop-out.',
    trigger: 'Price moved >3% in <60 seconds',
    autoActionsExecuted: ['Spreads widened to 50 pips', 'Margin requirements doubled', 'New orders paused for 5 minutes'],
    owner: 'u1', ownerName: 'Tom Risk', notifiedRoles: ['risk_manager', 'broker_admin', 'ceo'],
    timeline: [
      { id: 'e8', type: 'auto_action', message: 'Flash crash detected: GBPJPY -3.2% in 45s', userId: null, userName: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'e9', type: 'resolution', message: 'Market stabilized. Spreads normalized. Stop-out clients notified.', userId: 'u1', userName: 'Tom Risk', createdAt: new Date(Date.now() - 82800000).toISOString() },
    ],
    playbookId: 'pb-1', rootCause: 'Thin liquidity during early Asian session combined with BoJ policy rumor',
    prevention: 'Implement pre-market spread floor for JPY crosses. Add Asian session margin buffer.',
    isDrill: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(), acknowledgedAt: new Date(Date.now() - 86300000).toISOString(), resolvedAt: new Date(Date.now() - 82800000).toISOString(),
  },
];

const MOCK_PLAYBOOKS: IncidentPlaybook[] = [
  { id: 'pb-1', incidentType: 'flash_crash', name: 'Flash Crash Response', description: 'Automated response to extreme price movements', triggerCondition: 'Price moves >5% in <60 seconds on any major pair', autoActions: ['Widen spreads', 'Increase margin', 'Pause new orders'], notifyRoles: ['risk_manager', 'broker_admin', 'ceo'], steps: [{ order: 1, action: 'Assess net exposure on affected symbols', responsible: 'Risk Manager', timeLimit: '5 min', isAutomated: false }, { order: 2, action: 'Contact LPs for pricing confirmation', responsible: 'Dealing Desk', timeLimit: '10 min', isAutomated: false }], isActive: true },
  { id: 'pb-2', incidentType: 'lp_connectivity', name: 'LP Session Loss', description: 'Handle FIX session drops and LP connectivity issues', triggerCondition: 'FIX heartbeat timeout or fill rate <50%', autoActions: ['Route to failover LP', 'Alert risk desk', 'Widen affected spreads'], notifyRoles: ['risk_manager'], steps: [{ order: 1, action: 'Contact LP account manager', responsible: 'Dealing Desk', timeLimit: '5 min', isAutomated: false }], isActive: true },
  { id: 'pb-3', incidentType: 'mass_margin_call', name: 'Mass Margin Call', description: 'Handle simultaneous margin calls across many clients', triggerCondition: '>50 clients approaching margin call simultaneously', autoActions: ['Increase monitoring frequency', 'Prepare batch stop-out'], notifyRoles: ['risk_manager', 'broker_admin'], steps: [], isActive: true },
  { id: 'pb-4', incidentType: 'cyber_breach', name: 'Security Breach Response', description: 'Incident response for suspected cyber security breaches', triggerCondition: 'Unusual admin activity, mass login failures, anomalous data access', autoActions: ['Lock affected accounts', 'Enable forensic logging', 'Isolate service'], notifyRoles: ['broker_admin', 'compliance_officer'], steps: [], isActive: true },
  { id: 'pb-5', incidentType: 'psp_outage', name: 'PSP Outage', description: 'Handle payment processing system failures', triggerCondition: 'PSP error rate >20%', autoActions: ['Route to backup PSP', 'Pause withdrawals on affected PSP', 'Notify finance'], notifyRoles: ['finance_officer'], steps: [], isActive: true },
  { id: 'pb-6', incidentType: 'social_crisis', name: 'Social Media Crisis', description: 'Respond to negative social media spikes', triggerCondition: 'AI detects spike in negative mentions', autoActions: ['Alert marketing', 'Alert senior management'], notifyRoles: ['broker_admin'], steps: [], isActive: true },
  { id: 'pb-7', incidentType: 'aml_alert', name: 'Large Suspicious Transaction', description: 'Handle AML-flagged large transactions', triggerCondition: 'Single transaction >$50,000 or ML-flagged pattern', autoActions: ['Freeze account', 'Escalate to compliance'], notifyRoles: ['compliance_officer'], steps: [], isActive: true },
];

const MOCK_SERVICES: ServiceHealth[] = [
  { id: 's1', name: 'API Gateway', category: 'api', status: 'healthy', latencyMs: 12, errorRate: 0.01, uptime: 99.99, connections: 4521, cpuUsage: 23, memoryUsage: 45, lastCheck: new Date().toISOString(), details: {} },
  { id: 's2', name: 'WebSocket Server', category: 'websocket', status: 'healthy', latencyMs: 3, errorRate: 0, uptime: 99.99, connections: 3842, cpuUsage: 18, memoryUsage: 38, lastCheck: new Date().toISOString(), details: {} },
  { id: 's3', name: 'PostgreSQL Primary', category: 'database', status: 'healthy', latencyMs: 5, errorRate: 0, uptime: 99.99, connections: 120, cpuUsage: 35, memoryUsage: 62, lastCheck: new Date().toISOString(), details: {} },
  { id: 's4', name: 'Redis Cache', category: 'database', status: 'healthy', latencyMs: 1, errorRate: 0, uptime: 99.99, connections: 89, cpuUsage: 8, memoryUsage: 44, lastCheck: new Date().toISOString(), details: {} },
  { id: 's5', name: 'LMAX Bridge', category: 'bridge', status: 'healthy', latencyMs: 8, errorRate: 0.02, uptime: 99.98, connections: 4, cpuUsage: 12, memoryUsage: 28, lastCheck: new Date().toISOString(), details: {} },
  { id: 's6', name: 'Integral Bridge', category: 'bridge', status: 'down', latencyMs: 0, errorRate: 100, uptime: 97.5, connections: 0, cpuUsage: 0, memoryUsage: 0, lastCheck: new Date().toISOString(), details: {} },
  { id: 's7', name: 'PrimeXM Bridge', category: 'bridge', status: 'healthy', latencyMs: 14, errorRate: 0.05, uptime: 99.95, connections: 6, cpuUsage: 15, memoryUsage: 32, lastCheck: new Date().toISOString(), details: {} },
  { id: 's8', name: 'Price Engine', category: 'core', status: 'healthy', latencyMs: 2, errorRate: 0, uptime: 99.99, connections: 0, cpuUsage: 42, memoryUsage: 55, lastCheck: new Date().toISOString(), details: {} },
  { id: 's9', name: 'Order Router', category: 'core', status: 'healthy', latencyMs: 4, errorRate: 0.01, uptime: 99.99, connections: 0, cpuUsage: 28, memoryUsage: 40, lastCheck: new Date().toISOString(), details: {} },
  { id: 's10', name: 'Background Jobs', category: 'queue', status: 'degraded', latencyMs: 450, errorRate: 2.1, uptime: 99.8, connections: 0, cpuUsage: 65, memoryUsage: 72, lastCheck: new Date().toISOString(), details: {} },
  { id: 's11', name: 'Object Storage', category: 'storage', status: 'healthy', latencyMs: 25, errorRate: 0, uptime: 99.99, connections: 0, cpuUsage: 5, memoryUsage: 78, lastCheck: new Date().toISOString(), details: {} },
  { id: 's12', name: 'Sumsub KYC', category: 'external', status: 'healthy', latencyMs: 340, errorRate: 0.1, uptime: 99.9, connections: 0, cpuUsage: 0, memoryUsage: 0, lastCheck: new Date().toISOString(), details: {} },
];

const MOCK_ALERTS: OperationalAlert[] = [
  { id: 'oa1', level: 'critical', service: 'Integral Bridge', message: 'FIX session INT_001 disconnected — no heartbeat for 30 minutes', metric: 'heartbeat_age_s', threshold: 30, currentValue: 1800, runbookUrl: '#', isSuppressed: false, acknowledgedBy: 'u1', createdAt: new Date(Date.now() - 1800000).toISOString(), resolvedAt: null },
  { id: 'oa2', level: 'warning', service: 'Background Jobs', message: 'Queue depth exceeding threshold — 450 pending jobs', metric: 'queue_depth', threshold: 200, currentValue: 450, runbookUrl: '#', isSuppressed: false, acknowledgedBy: null, createdAt: new Date(Date.now() - 600000).toISOString(), resolvedAt: null },
  { id: 'oa3', level: 'info', service: 'PostgreSQL Primary', message: 'Connection pool utilization at 60% — approaching recommended limit', metric: 'pool_usage_pct', threshold: 75, currentValue: 60, runbookUrl: null, isSuppressed: false, acknowledgedBy: null, createdAt: new Date(Date.now() - 300000).toISOString(), resolvedAt: null },
];

const MOCK_MAINTENANCE: MaintenanceWindow[] = [
  { id: 'mw1', title: 'PostgreSQL Minor Version Upgrade', services: ['PostgreSQL Primary', 'PostgreSQL Replica'], startAt: new Date(Date.now() + 172800000).toISOString(), endAt: new Date(Date.now() + 176400000).toISOString(), suppressAlerts: true, createdBy: 'u1' },
];

export default function IncidentsPage() {
  const [view, setView] = useState<'incidents' | 'health'>('incidents');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Incident & Operations Center</h1>
          <p className="text-xs text-white/30">Real-time incident management and system health monitoring</p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {([
            { key: 'incidents', label: 'Incidents', icon: <Siren className="h-3.5 w-3.5" /> },
            { key: 'health', label: 'System Health', icon: <Activity className="h-3.5 w-3.5" /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === t.key ? 'bg-white/10 text-white' : 'text-white/40'
              }`}>{t.icon}{t.label}</button>
          ))}
        </div>
      </div>

      {view === 'incidents' ? (
        <IncidentCenter
          incidents={MOCK_INCIDENTS}
          playbooks={MOCK_PLAYBOOKS}
          onAcknowledge={(id) => console.log('ACK', id)}
          onEscalate={(id) => console.log('Escalate', id)}
          onResolve={(id) => console.log('Resolve', id)}
          onRunDrill={(id) => console.log('Run drill', id)}
        />
      ) : (
        <SystemHealth
          services={MOCK_SERVICES}
          alerts={MOCK_ALERTS}
          maintenanceWindows={MOCK_MAINTENANCE}
          onAcknowledgeAlert={(id) => console.log('ACK alert', id)}
        />
      )}
    </div>
  );
}
