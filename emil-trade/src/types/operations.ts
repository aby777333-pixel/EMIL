// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 20: RAPTOR OPERATIONS Types
// Additional B2B modules — onboarding, multi-entity, loyalty
// ═══════════════════════════════════════════════════════════

// ─── Onboarding Engine ──────────────────────────────────────

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  isRequired: boolean;
  completedAt: string | null;
  fields: OnboardingField[];
}

export interface OnboardingField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'file' | 'color' | 'toggle' | 'multi_select';
  value: string | boolean | string[] | null;
  isRequired: boolean;
  placeholder: string;
  options?: string[];
}

export interface OnboardingProgress {
  brokerId: string;
  brokerName: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  steps: OnboardingStep[];
  startedAt: string;
  estimatedCompletion: string;
  goLiveReady: boolean;
  goLiveChecklist: { item: string; passed: boolean; required: boolean }[];
}

// ─── Multi-Entity ───────────────────────────────────────────

export interface BrokerEntity {
  id: string;
  name: string;
  brand: string;
  jurisdiction: string;
  licenseNumber: string;
  status: 'active' | 'setup' | 'suspended';
  clients: number;
  aum: number;
  revenueThisMonth: number;
  pnlThisMonth: number;
  domain: string;
}

export interface ConsolidatedReport {
  entities: BrokerEntity[];
  totalClients: number;
  totalAum: number;
  totalRevenue: number;
  totalPnl: number;
}

// ─── Islamic Finance ────────────────────────────────────────

export interface IslamicConfig {
  isEnabled: boolean;
  swapFreeAccountType: string;
  adminFeePerLot: number;
  excludedInstruments: string[];
  shariahCertificateUrl: string | null;
  specialTermsUrl: string | null;
}

// ─── Loyalty & Gamification ─────────────────────────────────

export type LoyaltyTier = 'rookie' | 'trader' | 'pro' | 'expert' | 'elite' | 'legend';

export interface LoyaltyProfile {
  userId: string;
  xp: number;
  level: number;
  tier: LoyaltyTier;
  badges: GamificationBadge[];
  activeChallenges: TradingChallenge[];
  referralCount: number;
  referralRewardsEarned: number;
  tierBenefits: string[];
}

export interface GamificationBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'trading' | 'education' | 'community' | 'milestone' | 'streak';
  earnedAt: string;
}

export interface TradingChallenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special';
  target: number;
  progress: number;
  reward: string;
  endsAt: string;
  status: 'active' | 'completed' | 'expired';
}

export interface LoyaltyConfig {
  isEnabled: boolean;
  xpPerTrade: number;
  xpPerLesson: number;
  xpPerReferral: number;
  tierThresholds: { tier: LoyaltyTier; minXp: number; benefits: string[] }[];
  activeChallenges: TradingChallenge[];
  rewards: { name: string; type: 'spread_discount' | 'deposit_bonus' | 'cashback'; value: number }[];
}

// ─── Tax Center ─────────────────────────────────────────────

export type CostBasisMethod = 'fifo' | 'lifo' | 'average';

export interface TaxSummary {
  year: number;
  totalRealizedGains: number;
  totalRealizedLosses: number;
  netCapitalGains: number;
  totalCommissions: number;
  totalSwaps: number;
  totalFees: number;
  tradeCount: number;
  costBasisMethod: CostBasisMethod;
  currency: string;
}

export interface TaxExport {
  id: string;
  year: number;
  format: 'us_1099b' | 'uk_cgt' | 'eu_standard' | 'au_ato' | 'in_itr' | 'csv_raw';
  status: 'generating' | 'ready' | 'downloaded';
  fileSize: string | null;
  generatedAt: string;
}
