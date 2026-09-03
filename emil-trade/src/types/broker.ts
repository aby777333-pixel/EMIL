// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 1: Broker Command Center Types
// B2B only — traders never see these types
// ═══════════════════════════════════════════════════════════

// ─── Dashboard KPIs ─────────────────────────────────────────

export interface BrokerKPIs {
  totalClients: number;
  liveClients: number;
  demoClients: number;
  propClients: number;
  fundedClients: number;
  aum: number;
  todayPnl: number;
  spreadRevenue: number;
  commissionRevenue: number;
  swapRevenue: number;
  netLongExposure: number;
  netShortExposure: number;
  liveTradeCount: number;
  volumeLots: number;
  volumeUsd: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  failedKyc: number;
  marginCallAlerts: number;
  bridgeStatus: BridgeStatus[];
  systemHealth: SystemHealth;
}

export interface BridgeStatus {
  lpName: string;
  status: 'green' | 'amber' | 'red';
  latencyMs: number;
  lastHeartbeat: string;
}

export interface SystemHealth {
  apiLatencyP99: number;
  wsConnections: number;
  errorRate: number;
  uptimePercent: number;
}

// ─── CRM Types ──────────────────────────────────────────────

export type CrmStage = 'lead' | 'contacted' | 'demo' | 'documents' | 'live' | 'active' | 'vip';

export interface CrmLead {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  stage: CrmStage;
  assignedAgent: string | null;
  assignedAgentName: string | null;
  source: string;
  campaign: string;
  landingPage: string;
  tags: string[];
  score: number;
  lastActivity: string;
  stageEnteredAt: string;
  slaHoursRemaining: number | null;
  aiSuggestedAction: string | null;
  totalDeposits: number;
  totalWithdrawals: number;
  netPnl: number;
  totalVolume: number;
  accountCount: number;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected' | 'expired';
  riskCategory: 'low' | 'medium' | 'high' | 'very_high';
  createdAt: string;
}

export interface CrmPipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
  slaHours: number | null;
  leads: CrmLead[];
  count: number;
}

export interface CrmActivity {
  id: string;
  clientId: string;
  agentId: string | null;
  agentName: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'chat' | 'call' | 'note' | 'system';
  direction: 'inbound' | 'outbound' | 'internal';
  subject: string;
  body: string;
  sentimentScore: number | null;
  isInternal: boolean;
  createdAt: string;
}

// ─── Client 360° Profile ────────────────────────────────────

export interface Client360 {
  id: string;
  personal: ClientPersonal;
  kyc: ClientKyc;
  riskProfile: ClientRiskProfile;
  accounts: ClientAccount[];
  financialSummary: ClientFinancialSummary;
  tradingSummary: ClientTradingSummary;
  ibTree: IbNode;
  activities: CrmActivity[];
  tags: string[];
  complianceFlags: string[];
  supportTickets: number;
  marketing: ClientMarketing;
}

export interface ClientPersonal {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  country: string;
  city: string;
  address: string;
  avatarUrl: string | null;
}

export interface ClientKyc {
  status: 'none' | 'pending' | 'verified' | 'rejected' | 'expired';
  level: number;
  documents: KycDocument[];
  lastVerified: string | null;
  nextReview: string | null;
  pepScreening: 'clear' | 'match' | 'pending';
  sanctionsScreening: 'clear' | 'match' | 'pending';
}

export interface KycDocument {
  id: string;
  type: 'id_front' | 'id_back' | 'passport' | 'proof_of_address' | 'selfie' | 'source_of_funds' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  fileName: string;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  expiryDate: string | null;
  aiConfidence: number | null;
}

export interface ClientRiskProfile {
  category: 'low' | 'medium' | 'high' | 'very_high';
  maxLeverage: number;
  restrictedInstruments: string[];
  marginCallLevel: number;
  stopOutLevel: number;
  negativeBalanceProtection: boolean;
}

export interface ClientAccount {
  id: string;
  accountNumber: string;
  type: 'live' | 'demo' | 'prop' | 'pamm' | 'funded';
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  openPositions: number;
  isActive: boolean;
  createdAt: string;
}

export interface ClientFinancialSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;
  totalPnl: number;
  currentEquity: number;
  lifetimeVolumeLots: number;
  lifetimeCommissions: number;
  lifetimeSwaps: number;
}

export interface ClientTradingSummary {
  totalTrades: number;
  winRate: number;
  avgHoldTime: string;
  mostTradedInstruments: { symbol: string; count: number }[];
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  lastTradeAt: string | null;
}

export interface ClientMarketing {
  source: string;
  campaign: string;
  landingPage: string;
  utmMedium: string;
  utmContent: string;
  firstVisit: string | null;
  referredBy: string | null;
}

// ─── Risk Management ────────────────────────────────────────

export interface ExposureData {
  symbol: string;
  assetClass: string;
  netLongLots: number;
  netShortLots: number;
  netExposureUsd: number;
  clientCount: number;
  exposurePct: number;
  var95: number;
  var99: number;
  cvar: number;
}

export interface AbRoutingRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
    value: string | number | string[];
  }[];
  action: 'a_book' | 'b_book' | 'hybrid';
  aBookPct: number;
}

export interface RoutingDecision {
  id: string;
  orderId: string;
  clientName: string;
  symbol: string;
  volume: number;
  decision: 'a_book' | 'b_book' | 'hybrid';
  aBookPct: number;
  ruleName: string;
  reason: string;
  decidedAt: string;
}

export type ToxicFlowAlertType =
  | 'latency_arb' | 'news_scalping' | 'reverse_trading'
  | 'vpn_detected' | 'coordinated_accounts' | 'behavior_deviation';

export interface ToxicFlowAlert {
  id: string;
  clientId: string;
  clientName: string;
  alertType: ToxicFlowAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, unknown>;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ─── Finance & Treasury ─────────────────────────────────────

export interface RevenueBreakdown {
  date: string;
  spread: number;
  commission: number;
  swap: number;
  inactivityFee: number;
  withdrawalFee: number;
  other: number;
  total: number;
}

export interface RevenueBySymbol {
  symbol: string;
  spread: number;
  commission: number;
  totalRevenue: number;
  tradeCount: number;
  volumeLots: number;
}

export interface IbCommission {
  ibId: string;
  ibName: string;
  level: number;
  commissionType: 'per_lot' | 'per_pip' | 'pct_spread' | 'cpa' | 'revshare';
  rate: number;
  accrued: number;
  paid: number;
  pending: number;
  clientCount: number;
  volumeLots: number;
  lastPayout: string | null;
}

export interface IbNode {
  id: string;
  name: string;
  email: string;
  level: number;
  commission: number;
  clientCount: number;
  children: IbNode[];
}

// ─── Symbol Config ──────────────────────────────────────────

export interface SymbolConfig {
  id: string;
  symbol: string;
  displayName: string;
  assetClass: 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks' | 'bonds' | 'etf';
  isEnabled: boolean;
  spreadType: 'fixed' | 'variable';
  spreadMarkup: number;
  minSpread: number;
  maxSpread: number | null;
  swapLong: number;
  swapShort: number;
  maxLeverage: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  contractSize: number;
  sessionOpen: string | null;
  sessionClose: string | null;
  restrictedCountries: string[];
}

// ─── White-Label Brand ──────────────────────────────────────

export interface BrandConfig {
  id: string;
  brokerId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgPrimary: string;
  bgSecondary: string;
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  customCss: string | null;
  customDomain: string | null;
  smtpHost: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

// ─── Staff & Roles ──────────────────────────────────────────

export type StaffPermission =
  | 'dashboard.view' | 'clients.view' | 'clients.edit' | 'clients.delete'
  | 'trading.view' | 'trading.execute' | 'trading.force_close'
  | 'risk.view' | 'risk.edit' | 'risk.ab_routing'
  | 'finance.view' | 'finance.approve_withdrawal' | 'finance.approve_large'
  | 'compliance.view' | 'compliance.edit' | 'compliance.kyc_review'
  | 'ib.view' | 'ib.edit' | 'ib.payout'
  | 'settings.view' | 'settings.edit' | 'settings.symbols' | 'settings.brand'
  | 'reports.view' | 'reports.create' | 'reports.export'
  | 'staff.view' | 'staff.edit' | 'staff.roles'
  | 'support.view' | 'support.respond' | 'marketing.view' | 'marketing.edit';

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: StaffPermission[];
  isSystem: boolean;
  staffCount: number;
}

export interface StaffMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  lastLogin: string | null;
  actionsToday: number;
  isOnline: boolean;
  assignedAt: string;
}

export interface AdminAction {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// ─── Reporting ──────────────────────────────────────────────

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  reportType: string;
  config: ReportConfig;
  scheduleCron: string | null;
  deliveryEmails: string[];
  isShared: boolean;
  sharedRoles: string[];
  lastRunAt: string | null;
  createdAt: string;
}

export interface ReportConfig {
  dataSource: 'clients' | 'trades' | 'revenue' | 'payments' | 'ib' | 'compliance';
  columns: string[];
  filters: { field: string; operator: string; value: unknown }[];
  groupBy: string | null;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  chartType: 'line' | 'bar' | 'pie' | 'heatmap' | 'funnel' | 'sankey' | 'none';
  dateRange: { from: string; to: string } | null;
}
