// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 9: RAPTOR CRM Types
// Fully indigenous — purpose-built for forex/CFD brokerages
// ═══════════════════════════════════════════════════════════

// ─── Lead Management ────────────────────────────────────────

export type LeadSource = 'organic' | 'google_ads' | 'meta_ads' | 'ib_referral' | 'affiliate' | 'event' | 'cold_call' | 'csv_import' | 'api' | 'landing_page';

export interface LeadCapture {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  source: LeadSource;
  campaign: string;
  utmMedium: string;
  utmContent: string;
  utmTerm: string;
  landingPage: string;
  referralCode: string | null;
  score: number;
  scoreFactors: ScoreFactor[];
  isDuplicate: boolean;
  duplicateOf: string | null;
  assignedAgent: string | null;
  assignedAgentName: string | null;
  routingReason: string;
  nurturSequenceId: string | null;
  createdAt: string;
}

export interface ScoreFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

export interface LeadRoutingRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: { field: string; operator: string; value: string }[];
  action: 'round_robin' | 'geography' | 'language' | 'expertise' | 'ib_source' | 'specific_agent';
  targetAgents: string[];
}

export interface NurtureSequence {
  id: string;
  name: string;
  triggerStage: string;
  steps: NurtureStep[];
  isActive: boolean;
  enrolledCount: number;
  conversionRate: number;
}

export interface NurtureStep {
  order: number;
  channel: 'email' | 'sms' | 'whatsapp';
  delayHours: number;
  templateId: string;
  templateName: string;
  subject: string | null;
}

// ─── Contact 360° ───────────────────────────────────────────

export interface Contact360Full {
  id: string;
  personal: {
    fullName: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    language: string;
    timezone: string;
    avatarUrl: string | null;
  };
  contact: {
    email: string;
    emailVerified: boolean;
    phone: string;
    phoneVerified: boolean;
    whatsapp: string | null;
    telegram: string | null;
  };
  address: {
    residential: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    jurisdiction: string;
  };
  employment: {
    occupation: string;
    incomeBracket: string;
    tradingExperience: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'professional';
  };
  kyc: {
    status: 'none' | 'pending' | 'level1' | 'level2' | 'level3' | 'rejected' | 'expired';
    documents: { type: string; status: string; expiryDate: string | null }[];
    verificationLevel: number;
  };
  riskProfile: {
    band: 'low' | 'medium' | 'high' | 'very_high';
    maxLeverage: number;
    amlScore: number;
    pepStatus: 'clear' | 'match' | 'pending';
    sanctionsStatus: 'clear' | 'match' | 'pending';
    openInvestigations: number;
  };
  financial: {
    lifetimeDeposits: number;
    totalWithdrawals: number;
    netPnl: number;
    currentEquity: number;
    lifetimeVolumeLots: number;
    lifetimeCommissions: number;
  };
  accounts: { id: string; number: string; type: string; balance: number; equity: number; status: string }[];
  ibChain: { referredBy: string | null; referredByName: string | null; referralsCount: number; ibTier: number };
  tags: string[];
  complianceFlags: string[];
  behavioralInsight: string | null;
  marketing: {
    firstTouch: string | null;
    lastTouch: string | null;
    source: string;
    campaign: string;
    landingPage: string;
  };
  stage: string;
  lastActivity: string;
  createdAt: string;
}

// ─── Pipeline ───────────────────────────────────────────────

export interface PipelineConfig {
  id: string;
  brokerId: string;
  stages: PipelineStageConfig[];
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  slaHours: number | null;
  entryConditions: string[];
  exitConditions: string[];
  automationTriggers: AutomationTrigger[];
}

export interface AutomationTrigger {
  event: string;
  condition: string;
  action: 'move_stage' | 'send_email' | 'create_task' | 'tag_client' | 'notify_agent' | 'update_field';
  targetStage: string | null;
  templateId: string | null;
  notifyRole: string | null;
}

export interface PipelineAnalytics {
  stages: {
    name: string;
    count: number;
    avgTimeHours: number;
    conversionRate: number;
    dropoffRate: number;
  }[];
  totalConversion: number;
  avgLifecycleDays: number;
  bottleneckStage: string;
}

// ─── Tasks & Activities ─────────────────────────────────────

export type TaskType = 'call' | 'email' | 'follow_up' | 'document_request' | 'account_review' | 'meeting' | 'custom';

export interface CrmTask {
  id: string;
  clientId: string;
  clientName: string;
  type: TaskType;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  reminderAt: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  outcome: string | null;
  callDuration: number | null;
  callRecordingUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Communication Hub ──────────────────────────────────────

export type CommChannel = 'email' | 'sms' | 'whatsapp' | 'in_app_chat' | 'telegram' | 'call';

export interface UnifiedThread {
  id: string;
  clientId: string;
  clientName: string;
  channel: CommChannel;
  subject: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  slaMinutesRemaining: number | null;
  tags: string[];
  assignedAgent: string | null;
  isResolved: boolean;
}

export interface ThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound' | 'internal';
  channel: CommChannel;
  senderName: string;
  body: string;
  isInternal: boolean;
  attachments: { name: string; url: string; size: number }[];
  sentimentScore: number | null;
  createdAt: string;
}

// ─── Email Marketing ────────────────────────────────────────

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  templateId: string | null;
  segmentId: string | null;
  segmentName: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  conversionCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  abTest: { variant: string; subjectLine: string; openRate: number }[] | null;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'activation' | 're_engagement' | 'event' | 'deposit' | 'kyc' | 'general' | 'custom';
  subject: string;
  htmlBody: string;
  personalizationTokens: string[];
  languages: string[];
  usageCount: number;
}

export interface CampaignSegment {
  id: string;
  name: string;
  description: string;
  conditions: { field: string; operator: string; value: string }[];
  matchCount: number;
  isActive: boolean;
}

// ─── IB & Affiliate ────────────────────────────────────────

export interface IbProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  tier: number;
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'terminated';
  commissionStructure: CommissionStructure;
  referredClients: number;
  activeTraders: number;
  totalVolumeLots: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingPayout: number;
  subIbCount: number;
  ibManagerId: string | null;
  ibManagerName: string | null;
  performanceScore: number;
  isAtRisk: boolean;
  atRiskReason: string | null;
  joinedAt: string;
  lastActivityAt: string;
}

export interface CommissionStructure {
  type: 'per_lot' | 'per_pip' | 'pct_spread' | 'cpa' | 'revshare' | 'hybrid';
  perLotRate: number | null;
  perPipRate: number | null;
  spreadPct: number | null;
  cpaAmount: number | null;
  revsharePct: number | null;
  volumeTiers: { minLots: number; rate: number }[];
  subIbSplit: number;
}

export interface IbPayout {
  id: string;
  ibId: string;
  amount: number;
  currency: string;
  period: string;
  status: 'pending' | 'approved' | 'paid' | 'disputed' | 'adjusted';
  method: string;
  clientBreakdown: { clientName: string; volume: number; commission: number }[];
  approvedBy: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface IbTreeNode {
  id: string;
  name: string;
  tier: number;
  referrals: number;
  volume: number;
  commission: number;
  isActive: boolean;
  children: IbTreeNode[];
}
