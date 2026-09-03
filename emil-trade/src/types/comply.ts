// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 17: RAPTOR COMPLY Types
// Responsible trading + regulatory reporting
// ═══════════════════════════════════════════════════════════

// ─── Responsible Trading (B2C) ──────────────────────────────

export interface ResponsibleTradingSettings {
  userId: string;
  depositLimitDaily: number | null;
  depositLimitWeekly: number | null;
  depositLimitMonthly: number | null;
  lossLimitDaily: number | null;
  lossLimitWeekly: number | null;
  sessionTimeLimitMinutes: number | null;
  realityCheckIntervalMinutes: number | null;
  coolingOffUntil: string | null;
  coolingOffPeriod: '24h' | '7d' | '30d' | 'permanent' | null;
  selfExcluded: boolean;
  selfExcludedAt: string | null;
  lastUpdated: string;
}

export interface RealityCheck {
  sessionMinutes: number;
  depositsToday: number;
  lossesToday: number;
  tradesPlaced: number;
  message: string;
}

export interface AtRiskClient {
  id: string;
  clientName: string;
  riskLevel: 'moderate' | 'high' | 'critical';
  signals: string[];
  lossesToday: number;
  sessionHours: number;
  depositsThisWeek: number;
  recommendedAction: string;
  flaggedAt: string;
}

// ─── Regulatory Reporting ───────────────────────────────────

export type Jurisdiction = 'mifid2' | 'emir' | 'asic' | 'fsca' | 'cysec' | 'bvi' | 'fca' | 'cayman' | 'custom';

export interface RegulatoryReport {
  id: string;
  jurisdiction: Jurisdiction;
  reportName: string;
  reportType: string;
  period: string;
  status: 'draft' | 'generating' | 'ready' | 'submitted' | 'acknowledged';
  format: 'xml' | 'csv' | 'pdf' | 'json';
  recordCount: number;
  fileSize: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  deadline: string;
  daysUntilDeadline: number;
  generatedAt: string;
}

export interface RegulatoryDeadline {
  id: string;
  jurisdiction: Jurisdiction;
  reportName: string;
  deadline: string;
  daysRemaining: number;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'submitted';
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

export interface JurisdictionConfig {
  code: Jurisdiction;
  name: string;
  regulator: string;
  reports: { name: string; frequency: string; format: string }[];
  isActive: boolean;
}

export const JURISDICTION_CONFIGS: JurisdictionConfig[] = [
  { code: 'mifid2', name: 'MiFID II', regulator: 'ESMA / NCAs', reports: [{ name: 'Transaction Reporting (ARM)', frequency: 'Daily (T+1)', format: 'XML' }, { name: 'Best Execution (RTS 27/28)', frequency: 'Quarterly', format: 'CSV/PDF' }, { name: 'Product Governance', frequency: 'Annual', format: 'PDF' }], isActive: true },
  { code: 'emir', name: 'EMIR', regulator: 'ESMA', reports: [{ name: 'Trade Reporting to TR', frequency: 'Daily (T+1)', format: 'XML' }, { name: 'Clearing Obligation', frequency: 'On occurrence', format: 'XML' }, { name: 'Margin Requirements', frequency: 'Daily', format: 'CSV' }], isActive: true },
  { code: 'asic', name: 'ASIC (Australia)', regulator: 'ASIC', reports: [{ name: 'RG 227 OTC CFD', frequency: 'Quarterly', format: 'CSV' }, { name: 'DDO Compliance', frequency: 'Quarterly', format: 'PDF' }], isActive: true },
  { code: 'fsca', name: 'FSCA (South Africa)', regulator: 'FSCA', reports: [{ name: 'ODP License Reporting', frequency: 'Quarterly', format: 'PDF' }], isActive: true },
  { code: 'cysec', name: 'CySEC (Cyprus)', regulator: 'CySEC', reports: [{ name: 'AML Quarterly', frequency: 'Quarterly', format: 'PDF' }, { name: 'Financial Statements', frequency: 'Annual', format: 'PDF' }], isActive: true },
  { code: 'fca', name: 'FCA (UK)', regulator: 'FCA', reports: [{ name: 'CASS Client Money', frequency: 'Monthly', format: 'XML' }, { name: 'SUP 17 Transactions', frequency: 'Daily', format: 'XML' }], isActive: false },
  { code: 'bvi', name: 'BVI', regulator: 'BVI FSC', reports: [{ name: 'Annual Filing', frequency: 'Annual', format: 'PDF' }], isActive: false },
  { code: 'cayman', name: 'Cayman Islands', regulator: 'CIMA', reports: [{ name: 'Annual Return', frequency: 'Annual', format: 'PDF' }], isActive: false },
];
