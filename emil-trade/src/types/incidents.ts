// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 5: Incident & Operations Types
// Broker-only — traders never see this
// ═══════════════════════════════════════════════════════════

// ─── Incident Management ────────────────────────────────────

export type IncidentType =
  | 'flash_crash' | 'lp_connectivity' | 'mass_margin_call' | 'cyber_breach'
  | 'regulatory_investigation' | 'psp_outage' | 'aml_alert' | 'social_crisis'
  | 'key_person_risk' | 'custom';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
export type IncidentStatus = 'triggered' | 'acknowledged' | 'investigating' | 'mitigating' | 'resolved' | 'post_mortem';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  trigger: string;
  autoActionsExecuted: string[];
  owner: string | null;
  ownerName: string | null;
  notifiedRoles: string[];
  timeline: IncidentEvent[];
  playbookId: string | null;
  rootCause: string | null;
  prevention: string | null;
  isDrill: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface IncidentEvent {
  id: string;
  type: 'auto_action' | 'comment' | 'escalation' | 'status_change' | 'notification' | 'resolution';
  message: string;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface IncidentPlaybook {
  id: string;
  incidentType: IncidentType;
  name: string;
  description: string;
  triggerCondition: string;
  autoActions: string[];
  notifyRoles: string[];
  steps: PlaybookStep[];
  isActive: boolean;
}

export interface PlaybookStep {
  order: number;
  action: string;
  responsible: string;
  timeLimit: string | null;
  isAutomated: boolean;
}

// ─── System Health ──────────────────────────────────────────

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'maintenance';
export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

export interface ServiceHealth {
  id: string;
  name: string;
  category: 'core' | 'bridge' | 'database' | 'queue' | 'api' | 'websocket' | 'storage' | 'external';
  status: ServiceStatus;
  latencyMs: number;
  errorRate: number;
  uptime: number;
  connections: number;
  cpuUsage: number;
  memoryUsage: number;
  lastCheck: string;
  details: Record<string, string | number>;
}

export interface OperationalAlert {
  id: string;
  level: AlertLevel;
  service: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  runbookUrl: string | null;
  isSuppressed: boolean;
  acknowledgedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  services: string[];
  startAt: string;
  endAt: string;
  suppressAlerts: boolean;
  createdBy: string;
}
