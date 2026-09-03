'use client';

import { SocialPlatform } from '@/components/social/SocialPlatform';
import type { FeedPost, LeaderboardEntry, CommunityEvent } from '@/types/social';

const MOCK_FEED: FeedPost[] = [
  { id: 'fp1', authorId: 'u1', authorName: 'AlphaTrader', authorAvatar: null, authorReputation: 92, authorVerified: true, type: 'trade_share', symbol: 'EURUSD', direction: 'buy', pnl: 534.20, pnlPct: 3.2, body: 'Caught the bullish flag breakout on H4. Entry was clean off the 21 EMA pullback. Held through the minor pullback and let the TP hit naturally. Key lesson: trust the setup and walk away.', screenshotUrl: null, reactions: [{ type: 'like', count: 24, isReacted: false }, { type: 'insightful', count: 12, isReacted: true }, { type: 'agree', count: 8, isReacted: false }], commentCount: 7, isBookmarked: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'fp2', authorId: 'u2', authorName: 'GoldHunter', authorAvatar: null, authorReputation: 78, authorVerified: true, type: 'market_opinion', symbol: 'XAUUSD', direction: null, pnl: null, pnlPct: null, body: 'Gold looking toppy here at 2360. RSI divergence on H4 + we are at the upper Bollinger Band. I am flat and waiting. If we break above 2365 with volume I will reconsider. Otherwise short setup forming.', screenshotUrl: null, reactions: [{ type: 'like', count: 15, isReacted: false }, { type: 'agree', count: 18, isReacted: false }, { type: 'disagree', count: 5, isReacted: false }, { type: 'risky', count: 3, isReacted: false }], commentCount: 12, isBookmarked: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'fp3', authorId: 'u3', authorName: 'CryptoSam', authorAvatar: null, authorReputation: 65, authorVerified: false, type: 'nexus_insight', symbol: 'BTCUSD', direction: 'buy', pnl: null, pnlPct: null, body: 'NEXUS flagged a bullish order block + RSI oversold confluence on BTC H4. 78% confidence. I am entering with tight stop below the order block. Let us see if the AI nails it again.', screenshotUrl: null, reactions: [{ type: 'like', count: 8, isReacted: false }, { type: 'insightful', count: 5, isReacted: false }], commentCount: 3, isBookmarked: false, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'fp4', authorId: 'u4', authorName: 'SwingMaster', authorAvatar: null, authorReputation: 88, authorVerified: true, type: 'chart_idea', symbol: 'GBPJPY', direction: 'sell', pnl: null, pnlPct: null, body: 'Head and shoulders pattern completing on the daily. Neckline at 192.50. If we close below that on the daily candle, target is 189.00. This is a textbook setup — Ichimoku cloud also confirms resistance above.', screenshotUrl: null, reactions: [{ type: 'like', count: 32, isReacted: true }, { type: 'insightful', count: 21, isReacted: false }, { type: 'agree', count: 14, isReacted: false }], commentCount: 18, isBookmarked: false, createdAt: new Date(Date.now() - 28800000).toISOString() },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = Array.from({ length: 15 }, (_, i) => ({
  rank: i + 1, traderId: `lb${i}`, displayName: ['AlphaTrader', 'SwingMaster', 'GoldHunter', 'FXPro_Mike', 'CryptoSam', 'TrendRider', 'ScalpKing', 'PatientPenny', 'VolumeVictor', 'IchiCloud', 'RangeRanger', 'BreakoutBen', 'MomentumMax', 'SmartEdge', 'QuietQuant'][i],
  avatarUrl: null, isVerified: i < 5, value: 142 - i * 8 + Math.random() * 5, valueLabel: `+${(142 - i * 8 + Math.random() * 5).toFixed(1)}%`,
  totalTrades: 200 - i * 10, winRate: 68 - i * 1.5, sharpeRatio: 2.5 - i * 0.1,
  badges: i < 3 ? ['Top 3'] : [], trend: (i < 5 ? 'up' : i < 10 ? 'stable' : 'down') as 'up' | 'down' | 'stable', previousRank: i + 1 + (i < 5 ? 1 : i > 10 ? -1 : 0),
}));

const MOCK_EVENTS: CommunityEvent[] = [
  { id: 'ev1', title: 'NFP Live Trading Session', type: 'live_room', description: 'Trade NFP release live with analysis and commentary from top traders', hostName: 'AlphaTrader', scheduledAt: new Date(Date.now() + 172800000).toISOString(), durationMinutes: 120, participantCount: 234, maxParticipants: 500, isRegistered: true, isLive: false },
  { id: 'ev2', title: 'Ichimoku Cloud Masterclass', type: 'webinar', description: 'Deep dive into Ichimoku cloud trading — from basics to advanced strategies', hostName: 'IchiCloud', scheduledAt: new Date(Date.now() + 432000000).toISOString(), durationMinutes: 90, participantCount: 89, maxParticipants: 200, isRegistered: false, isLive: false },
  { id: 'ev3', title: 'Weekly Trading Competition', type: 'competition', description: 'Demo account competition — best return in 5 days wins. All skill levels welcome.', hostName: 'RAPTOR', scheduledAt: new Date(Date.now() + 86400000).toISOString(), durationMinutes: 7200, participantCount: 567, maxParticipants: null, isRegistered: false, isLive: false },
  { id: 'ev4', title: 'Price Action Study Group', type: 'study_group', description: 'Weekly study group for intermediate traders focusing on pure price action reading', hostName: 'SwingMaster', scheduledAt: new Date(Date.now() + 259200000).toISOString(), durationMinutes: 60, participantCount: 23, maxParticipants: 30, isRegistered: true, isLive: false },
];

export default function SocialPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR SOCIAL</h1>
        <p className="text-xs text-white/30">Community trading — share ideas, compete on leaderboards, learn together</p>
      </div>
      <SocialPlatform feed={MOCK_FEED} leaderboard={MOCK_LEADERBOARD} events={MOCK_EVENTS}
        onReact={(id, type) => console.log('React', id, type)}
        onBookmark={id => console.log('Bookmark', id)}
        onRegisterEvent={id => console.log('Register', id)} />
    </div>
  );
}
