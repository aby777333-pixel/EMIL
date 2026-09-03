// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 16: RAPTOR SOCIAL Types
// Indigenous community platform — opt-in, privacy first
// ═══════════════════════════════════════════════════════════

// ─── Trader Profiles ────────────────────────────────────────

export type VerificationLevel = 'email' | 'phone' | 'kyc' | 'profitable_90d';

export interface TraderPublicProfile {
  id: string;
  displayName: string;
  isPseudonymous: boolean;
  avatarUrl: string | null;
  bio: string;
  verificationLevels: VerificationLevel[];
  isVerifiedProfitable: boolean;
  stats: {
    totalReturn: number | null;
    winRate: number | null;
    sharpeRatio: number | null;
    totalTrades: number | null;
    liveSince: string | null;
  };
  privacySettings: { field: string; visible: boolean }[];
  followers: number;
  following: number;
  reputation: number;
  badges: SocialBadge[];
  isFollowing: boolean;
  joinedAt: string;
}

export interface SocialBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  awardedAt: string;
}

// ─── Social Feed ────────────────────────────────────────────

export type PostType = 'trade_share' | 'market_opinion' | 'chart_idea' | 'nexus_insight';
export type ReactionType = 'like' | 'insightful' | 'risky' | 'agree' | 'disagree';

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorReputation: number;
  authorVerified: boolean;
  type: PostType;
  symbol: string | null;
  direction: 'buy' | 'sell' | null;
  pnl: number | null;
  pnlPct: number | null;
  body: string;
  screenshotUrl: string | null;
  reactions: { type: ReactionType; count: number; isReacted: boolean }[];
  commentCount: number;
  isBookmarked: boolean;
  createdAt: string;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  likes: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── Leaderboards ───────────────────────────────────────────

export type LeaderboardType = 'return' | 'win_rate' | 'consistency' | 'prop_challenge';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  traderId: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  value: number;
  valueLabel: string;
  totalTrades: number;
  winRate: number;
  sharpeRatio: number;
  badges: string[];
  trend: 'up' | 'down' | 'stable';
  previousRank: number;
}

// ─── Community ──────────────────────────────────────────────

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  threadCount: number;
  postCount: number;
  lastActivity: string;
  icon: string;
}

export interface ForumThread {
  id: string;
  categoryId: string;
  title: string;
  authorName: string;
  authorAvatar: string | null;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  lastReplyAt: string;
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  type: 'competition' | 'webinar' | 'live_room' | 'hackathon' | 'study_group';
  description: string;
  hostName: string;
  scheduledAt: string;
  durationMinutes: number;
  participantCount: number;
  maxParticipants: number | null;
  isRegistered: boolean;
  isLive: boolean;
}
