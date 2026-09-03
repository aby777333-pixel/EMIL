'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Heart, TrendingUp, TrendingDown, Trophy,
  Star, Shield, ThumbsUp, ThumbsDown, Bookmark, Share2,
  Users, Award, Calendar, Radio, Search, ChevronUp,
  ChevronDown, Sparkles, BarChart3, Target, Eye,
} from 'lucide-react';
import type {
  FeedPost, LeaderboardEntry, CommunityEvent,
  PostType, ReactionType, LeaderboardType, LeaderboardPeriod,
} from '@/types/social';
import { pnlColor, formatRelativeTime } from '@/lib/utils/format';

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  trade_share: { label: 'Trade', color: '#00dc82' },
  market_opinion: { label: 'Opinion', color: '#00b4ff' },
  chart_idea: { label: 'Chart Idea', color: '#8b5cf6' },
  nexus_insight: { label: 'NEXUS', color: '#f59e0b' },
};

const REACTION_ICONS: Record<ReactionType, React.ReactNode> = {
  like: <Heart className="h-3 w-3" />,
  insightful: <Sparkles className="h-3 w-3" />,
  risky: <Shield className="h-3 w-3" />,
  agree: <ThumbsUp className="h-3 w-3" />,
  disagree: <ThumbsDown className="h-3 w-3" />,
};

function PostCard({ post, onReact, onBookmark }: { post: FeedPost; onReact: (postId: string, type: ReactionType) => void; onBookmark: (postId: string) => void }) {
  const typeConfig = POST_TYPE_CONFIG[post.type];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
      {/* Author */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b4ff]/20 to-[#8b5cf6]/20 flex items-center justify-center text-[10px] font-bold text-white/50">
          {post.authorName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white">{post.authorName}</span>
            {post.authorVerified && <Shield className="h-3 w-3 text-[#00dc82]" />}
            <span className="text-[9px] text-white/15">· {formatRelativeTime(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}>{typeConfig.label}</span>
            {post.symbol && <span className="text-[9px] font-mono text-white/25">{post.symbol}</span>}
            {post.direction && (
              <span className={`text-[8px] px-1 py-0.5 rounded ${post.direction === 'buy' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                {post.direction.toUpperCase()}
              </span>
            )}
            {post.pnl !== null && (
              <span className={`text-[9px] font-mono font-bold ${pnlColor(post.pnl)}`}>
                {post.pnl >= 0 ? '+' : ''}${post.pnl.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onBookmark(post.id)} className={`p-1 ${post.isBookmarked ? 'text-[#f59e0b]' : 'text-white/10 hover:text-white/30'}`}>
          <Bookmark className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <p className="text-[11px] text-white/50 leading-relaxed mb-3">{post.body}</p>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        {post.reactions.map(r => (
          <button key={r.type} onClick={() => onReact(post.id, r.type)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] transition-colors ${
              r.isReacted ? 'bg-[#00b4ff]/10 text-[#00b4ff]' : 'bg-white/[0.03] text-white/20 hover:text-white/40'
            }`}>
            {REACTION_ICONS[r.type]} {r.count > 0 && r.count}
          </button>
        ))}
        <span className="flex items-center gap-1 text-[9px] text-white/15 ml-auto">
          <MessageCircle className="h-3 w-3" />{post.commentCount}
        </span>
      </div>
    </motion.div>
  );
}

function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const rankChange = entry.previousRank - entry.rank;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
      <span className={`w-6 text-center text-xs font-mono font-bold ${entry.rank <= 3 ? 'text-[#f59e0b]' : 'text-white/20'}`}>
        {entry.rank}
      </span>
      {rankChange !== 0 && (
        <span className={`text-[8px] ${rankChange > 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
          {rankChange > 0 ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </span>
      )}
      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/40">
        {entry.displayName.charAt(0)}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white">{entry.displayName}</span>
          {entry.isVerified && <Shield className="h-3 w-3 text-[#00dc82]" />}
        </div>
        <span className="text-[9px] text-white/15">{entry.totalTrades} trades · {entry.winRate.toFixed(0)}% WR</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono font-bold text-[#00dc82]">{entry.valueLabel}</div>
        <div className="text-[8px] text-white/15">Sharpe: {entry.sharpeRatio.toFixed(2)}</div>
      </div>
    </div>
  );
}

interface SocialPlatformProps {
  feed: FeedPost[];
  leaderboard: LeaderboardEntry[];
  events: CommunityEvent[];
  onReact: (postId: string, type: ReactionType) => void;
  onBookmark: (postId: string) => void;
  onRegisterEvent: (eventId: string) => void;
}

export function SocialPlatform({ feed, leaderboard, events, onReact, onBookmark, onRegisterEvent }: SocialPlatformProps) {
  const [tab, setTab] = useState<'feed' | 'leaderboard' | 'community'>('feed');
  const [lbType, setLbType] = useState<LeaderboardType>('return');
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>('monthly');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'feed', label: 'Social Feed', icon: <MessageCircle className="h-3.5 w-3.5" /> },
          { key: 'leaderboard', label: 'Leaderboards', icon: <Trophy className="h-3.5 w-3.5" /> },
          { key: 'community', label: 'Community', icon: <Users className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Feed */}
      {tab === 'feed' && (
        <div className="max-w-2xl mx-auto space-y-3">
          {feed.map(post => <PostCard key={post.id} post={post} onReact={onReact} onBookmark={onBookmark} />)}
          {feed.length === 0 && (
            <div className="text-center py-16"><MessageCircle className="h-10 w-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/20">No posts yet — be the first to share</p></div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
              {(['return', 'win_rate', 'consistency', 'prop_challenge'] as LeaderboardType[]).map(lt => (
                <button key={lt} onClick={() => setLbType(lt)}
                  className={`px-2.5 py-1 rounded-md text-[10px] capitalize transition-colors ${lbType === lt ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                  {lt.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
              {(['weekly', 'monthly', 'quarterly', 'all_time'] as LeaderboardPeriod[]).map(lp => (
                <button key={lp} onClick={() => setLbPeriod(lp)}
                  className={`px-2 py-1 rounded-md text-[10px] capitalize transition-colors ${lbPeriod === lp ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                  {lp.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.03]">
            {leaderboard.map(entry => <LeaderboardCard key={entry.traderId} entry={entry} />)}
          </div>
        </div>
      )}

      {/* Community */}
      {tab === 'community' && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-white flex items-center gap-2"><Calendar className="h-4 w-4 text-[#00b4ff]" /> Upcoming Events</h4>
          <div className="grid grid-cols-3 gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  {event.isLive && <span className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]"><Radio className="h-2 w-2 animate-pulse" />LIVE</span>}
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/25 capitalize">{event.type.replace('_', ' ')}</span>
                </div>
                <h5 className="text-xs font-semibold text-white mb-1">{event.title}</h5>
                <p className="text-[10px] text-white/30 line-clamp-2 mb-2">{event.description}</p>
                <div className="flex items-center justify-between text-[9px] text-white/20">
                  <span>{event.hostName}</span>
                  <span>{new Date(event.scheduledAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[9px] text-white/15"><Users className="h-3 w-3 inline mr-1" />{event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
                  <button onClick={() => onRegisterEvent(event.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                      event.isRegistered ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#00b4ff] text-white hover:bg-[#00b4ff]/80'
                    }`}>{event.isRegistered ? 'Registered' : 'Register'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
