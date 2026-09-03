// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 18: RAPTOR CONNECT Types
// Bridge migration + third-party terminal support
// ═══════════════════════════════════════════════════════════

export type LegacyPlatform = 'mt5' | 'ctrader' | 'acttrader' | 'vertexfx' | 'custom_csv' | 'custom_api';
export type MigrationPhase = 'planning' | 'data_import' | 'dual_run' | 'traffic_shift' | 'validation' | 'cutover' | 'complete';

export interface PlatformMigration {
  id: string;
  platform: LegacyPlatform;
  serverName: string;
  phase: MigrationPhase;
  totalClients: number;
  migratedClients: number;
  totalAccounts: number;
  migratedAccounts: number;
  totalHistory: number;
  migratedHistory: number;
  openPositions: number;
  syncedPositions: number;
  eaScripts: number;
  convertedScripts: number;
  trafficSplitPct: number;
  dualRunActive: boolean;
  emailsSent: number;
  emailsPending: number;
  errors: MigrationError[];
  startedAt: string;
  estimatedCompletion: string | null;
}

export interface MigrationError {
  type: 'account' | 'position' | 'history' | 'script' | 'balance';
  message: string;
  clientRef: string;
  timestamp: string;
  resolved: boolean;
}

export interface ClientMigrationStatus {
  clientId: string;
  clientName: string;
  email: string;
  platform: LegacyPlatform;
  status: 'pending' | 'in_progress' | 'migrated' | 'dual_run' | 'failed' | 'opted_out';
  accountsMigrated: number;
  totalAccounts: number;
  historyImported: boolean;
  positionsSynced: boolean;
  emailSent: boolean;
  emailOpenedAt: string | null;
  migratedAt: string | null;
  errorMessage: string | null;
}

export interface TerminalConnection {
  id: string;
  name: string;
  type: 'fix' | 'rest_api' | 'websocket';
  clientName: string;
  status: 'active' | 'inactive' | 'error';
  fixVersion: string | null;
  ordersToday: number;
  volumeToday: number;
  latencyMs: number;
  lastActivity: string | null;
  connectedSince: string | null;
}
