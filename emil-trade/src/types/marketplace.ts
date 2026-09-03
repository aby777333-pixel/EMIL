// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 7: RAPTOR Marketplace Types
// ═══════════════════════════════════════════════════════════

// ─── Shared Marketplace Types ───────────────────────────────

export type ListingTier = 'free' | 'paid' | 'subscription' | 'revenue_share';
export type ListingStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'suspended' | 'rejected';

export interface MarketplaceStats {
  totalListings: number;
  totalInstalls: number;
  totalDevelopers: number;
  totalRevenue: number;
  trendingCount: number;
  newThisWeek: number;
}

export interface PerformanceBadge {
  type: 'live_tested' | 'signal_parity' | 'ai_reviewed' | 'top_rated' | 'trending';
  label: string;
  awardedAt: string;
}

// ─── EA & Indicator Marketplace ─────────────────────────────

export type EaCategory = 'scalping' | 'swing' | 'grid' | 'trend' | 'mean_reversion'
  | 'news' | 'breakout' | 'hedging' | 'indicator_suite' | 'risk_tool' | 'utility';

export interface EaListing {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: EaCategory;
  scriptKind: 'ea' | 'indicator' | 'script' | 'library';
  tier: ListingTier;
  price: number | null;
  monthlyPrice: number | null;
  revenueSharePct: number | null;
  status: ListingStatus;
  developerId: string;
  developerName: string;
  developerAvatar: string | null;
  badges: PerformanceBadge[];
  rating: number;
  reviewCount: number;
  installCount: number;
  activeUsers: number;
  version: string;
  changelog: string;
  screenshots: string[];
  tags: string[];
  instruments: string[];
  timeframes: string[];
  performanceStats: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    liveMonths: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EaReview {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  isLiveUser: boolean;
  helpfulCount: number;
  createdAt: string;
}

// ─── Signal Provider Marketplace ────────────────────────────

export interface SignalProviderListing {
  id: string;
  providerId: string;
  name: string;
  avatar: string | null;
  bio: string;
  strategy: string;
  tradingStyle: string;
  totalReturn: number;
  monthlyAvgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  followers: number;
  aum: number;
  riskRating: 1 | 2 | 3 | 4 | 5;
  isVerified: boolean;
  liveMonths: number;
  performanceFee: number;
  monthlyFee: number;
  instruments: string[];
  equityCurveData: { date: string; value: number }[];
  monthlyReturns: { month: string; returnPct: number }[];
  ranking: number;
  createdAt: string;
}

// ─── Plugin & Extension Marketplace ─────────────────────────

export type PluginCategory = 'risk_management' | 'reporting' | 'psp_adapter' | 'data_provider'
  | 'education' | 'analytics_tool' | 'crm_connector' | 'communication' | 'utility';

export interface PluginListing {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  developer: string;
  developerUrl: string | null;
  tier: ListingTier;
  price: number | null;
  status: ListingStatus;
  rating: number;
  reviewCount: number;
  installCount: number;
  iconUrl: string | null;
  tags: string[];
  compatibility: string[];
  version: string;
  docsUrl: string | null;
  createdAt: string;
}

// ─── Developer Portal ───────────────────────────────────────

export interface DeveloperProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  website: string | null;
  totalListings: number;
  totalInstalls: number;
  totalRevenue: number;
  averageRating: number;
  isVerified: boolean;
  createdAt: string;
}
