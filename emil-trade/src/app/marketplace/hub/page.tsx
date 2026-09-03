'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Bot, BarChart3, Puzzle, TrendingUp, Users,
  Star, Download, Zap, Filter, SortDesc, Shield,
  ArrowLeft, Store, Sparkles, Award,
} from 'lucide-react';
import Link from 'next/link';
import { SignalProviderGrid } from '@/components/marketplace/SignalProviderGrid';
import { PluginGrid } from '@/components/marketplace/PluginGrid';
import type { EaListing, SignalProviderListing, PluginListing, MarketplaceStats } from '@/types/marketplace';

const MOCK_STATS: MarketplaceStats = {
  totalListings: 342, totalInstalls: 89_420, totalDevelopers: 156, totalRevenue: 234_500, trendingCount: 12, newThisWeek: 8,
};

const MOCK_EA_LISTINGS: EaListing[] = [
  { id: 'ea1', name: 'Trend Rider Pro', shortDescription: 'Multi-timeframe trend following EA with AI-optimized parameters', fullDescription: '', category: 'trend', scriptKind: 'ea', tier: 'paid', price: 149, monthlyPrice: null, revenueSharePct: null, status: 'published', developerId: 'd1', developerName: 'AlgoWorks', developerAvatar: null, badges: [{ type: 'live_tested', label: 'Live Tested', awardedAt: '2026-01-15' }, { type: 'ai_reviewed', label: 'AI Reviewed', awardedAt: '2026-02-01' }], rating: 4.7, reviewCount: 89, installCount: 1245, activeUsers: 342, version: '3.2.1', changelog: '', screenshots: [], tags: ['trend', 'multi-tf', 'AI'], instruments: ['EURUSD', 'GBPUSD', 'USDJPY'], timeframes: ['H1', 'H4'], performanceStats: { totalTrades: 2340, winRate: 62.3, profitFactor: 1.87, maxDrawdown: 8.2, sharpeRatio: 2.1, liveMonths: 14 }, createdAt: '2025-03-01', updatedAt: '2026-03-15' },
  { id: 'ea2', name: 'Gold Scalper X', shortDescription: 'Sub-minute gold scalping with dynamic spread filter and news avoidance', fullDescription: '', category: 'scalping', scriptKind: 'ea', tier: 'subscription', price: null, monthlyPrice: 49, revenueSharePct: null, status: 'published', developerId: 'd2', developerName: 'FX Labs', developerAvatar: null, badges: [{ type: 'live_tested', label: 'Live Tested', awardedAt: '2026-02-10' }, { type: 'trending', label: 'Trending', awardedAt: '2026-03-20' }], rating: 4.5, reviewCount: 67, installCount: 890, activeUsers: 234, version: '2.0.0', changelog: '', screenshots: [], tags: ['scalping', 'gold', 'news filter'], instruments: ['XAUUSD'], timeframes: ['M1', 'M5'], performanceStats: { totalTrades: 8900, winRate: 71.2, profitFactor: 1.45, maxDrawdown: 15.3, sharpeRatio: 1.6, liveMonths: 8 }, createdAt: '2025-08-01', updatedAt: '2026-03-20' },
  { id: 'ea3', name: 'RSI Divergence Suite', shortDescription: 'Complete indicator suite: RSI divergence scanner with multi-pair alerts', fullDescription: '', category: 'indicator_suite', scriptKind: 'indicator', tier: 'free', price: null, monthlyPrice: null, revenueSharePct: null, status: 'published', developerId: 'd3', developerName: 'ChartMaster', developerAvatar: null, badges: [{ type: 'signal_parity', label: 'Signal Parity', awardedAt: '2026-01-01' }], rating: 4.8, reviewCount: 234, installCount: 5670, activeUsers: 1890, version: '1.5.0', changelog: '', screenshots: [], tags: ['RSI', 'divergence', 'scanner'], instruments: [], timeframes: [], performanceStats: null, createdAt: '2025-01-01', updatedAt: '2026-02-15' },
  { id: 'ea4', name: 'Smart Grid Trader', shortDescription: 'Adaptive grid EA with drawdown protection and equity trailing stop', fullDescription: '', category: 'grid', scriptKind: 'ea', tier: 'revenue_share', price: null, monthlyPrice: null, revenueSharePct: 20, status: 'published', developerId: 'd1', developerName: 'AlgoWorks', developerAvatar: null, badges: [{ type: 'ai_reviewed', label: 'AI Reviewed', awardedAt: '2026-03-01' }], rating: 4.2, reviewCount: 45, installCount: 567, activeUsers: 123, version: '1.1.0', changelog: '', screenshots: [], tags: ['grid', 'adaptive', 'protection'], instruments: ['EURUSD', 'GBPUSD', 'AUDUSD'], timeframes: ['H1'], performanceStats: { totalTrades: 4500, winRate: 78.5, profitFactor: 1.32, maxDrawdown: 22.1, sharpeRatio: 0.9, liveMonths: 6 }, createdAt: '2025-10-01', updatedAt: '2026-03-10' },
  { id: 'ea5', name: 'Risk Calculator Pro', shortDescription: 'Position sizing calculator with Kelly criterion and portfolio heat analysis', fullDescription: '', category: 'risk_tool', scriptKind: 'script', tier: 'free', price: null, monthlyPrice: null, revenueSharePct: null, status: 'published', developerId: 'd4', developerName: 'RiskLab', developerAvatar: null, badges: [{ type: 'top_rated', label: 'Top Rated', awardedAt: '2026-02-15' }], rating: 4.9, reviewCount: 312, installCount: 8900, activeUsers: 4560, version: '2.3.0', changelog: '', screenshots: [], tags: ['risk', 'position sizing', 'Kelly'], instruments: [], timeframes: [], performanceStats: null, createdAt: '2024-06-01', updatedAt: '2026-03-01' },
  { id: 'ea6', name: 'Ichimoku Cloud Scanner', shortDescription: 'Multi-timeframe Ichimoku cloud analysis with TK cross, Kumo breakout, and Chikou confirmation', fullDescription: '', category: 'indicator_suite', scriptKind: 'indicator', tier: 'paid', price: 39, monthlyPrice: null, revenueSharePct: null, status: 'published', developerId: 'd5', developerName: 'JapanFX', developerAvatar: null, badges: [{ type: 'signal_parity', label: 'Signal Parity', awardedAt: '2026-01-20' }], rating: 4.6, reviewCount: 78, installCount: 2340, activeUsers: 890, version: '1.8.0', changelog: '', screenshots: [], tags: ['ichimoku', 'scanner', 'multi-tf'], instruments: [], timeframes: ['H1', 'H4', 'D1'], performanceStats: null, createdAt: '2025-04-01', updatedAt: '2026-02-28' },
];

const MOCK_SIGNAL_PROVIDERS: SignalProviderListing[] = [
  { id: 'sp1', providerId: 'p1', name: 'Alpha Trend', avatar: null, bio: 'Systematic trend following', strategy: 'Trend Following', tradingStyle: 'Swing', totalReturn: 142.5, monthlyAvgReturn: 8.3, maxDrawdown: 12.1, sharpeRatio: 2.1, calmarRatio: 11.8, profitFactor: 1.87, winRate: 58.4, totalTrades: 1245, followers: 342, aum: 2_400_000, riskRating: 3, isVerified: true, liveMonths: 18, performanceFee: 20, monthlyFee: 0, instruments: ['EURUSD','GBPUSD','USDJPY'], equityCurveData: Array.from({ length: 30 }, (_, i) => ({ date: `2026-03-${i+1}`, value: 10000 + i * 470 + (Math.random()-0.3)*300 })), monthlyReturns: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${i+1}`, returnPct: (Math.random()-0.2)*15 })), ranking: 1, createdAt: '2024-10-01' },
  { id: 'sp2', providerId: 'p2', name: 'Steady Eddie', avatar: null, bio: 'Conservative position trading', strategy: 'Position', tradingStyle: 'Position', totalReturn: 67.8, monthlyAvgReturn: 3.2, maxDrawdown: 5.4, sharpeRatio: 3.1, calmarRatio: 12.6, profitFactor: 2.34, winRate: 52.1, totalTrades: 234, followers: 567, aum: 5_200_000, riskRating: 1, isVerified: true, liveMonths: 24, performanceFee: 15, monthlyFee: 0, instruments: ['EURUSD','GBPUSD','USDJPY','USDCHF'], equityCurveData: Array.from({ length: 30 }, (_, i) => ({ date: `2026-03-${i+1}`, value: 10000 + i * 220 + (Math.random()-0.3)*100 })), monthlyReturns: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${i+1}`, returnPct: (Math.random()-0.1)*6 })), ranking: 2, createdAt: '2024-04-01' },
  { id: 'sp3', providerId: 'p3', name: 'Gold Rush AI', avatar: null, bio: 'AI-powered gold scalping', strategy: 'Scalping', tradingStyle: 'Scalping', totalReturn: 89.2, monthlyAvgReturn: 12.1, maxDrawdown: 18.5, sharpeRatio: 1.6, calmarRatio: 4.8, profitFactor: 1.45, winRate: 71.2, totalTrades: 4567, followers: 189, aum: 890_000, riskRating: 4, isVerified: true, liveMonths: 8, performanceFee: 30, monthlyFee: 0, instruments: ['XAUUSD'], equityCurveData: Array.from({ length: 30 }, (_, i) => ({ date: `2026-03-${i+1}`, value: 10000 + i * 300 + (Math.random()-0.4)*800 })), monthlyReturns: Array.from({ length: 8 }, (_, i) => ({ month: `2025-${i+5}`, returnPct: (Math.random()-0.2)*20 })), ranking: 3, createdAt: '2025-08-15' },
];

const MOCK_PLUGINS: PluginListing[] = [
  { id: 'pl1', name: 'TradingDiary Pro', description: 'Advanced trade journaling with AI-powered analysis and pattern detection', category: 'analytics_tool', developer: 'TradingDiary', developerUrl: null, tier: 'paid', price: 29, status: 'published', rating: 4.7, reviewCount: 156, installCount: 3400, iconUrl: null, tags: ['journal', 'analytics', 'AI'], compatibility: ['v2.0+'], version: '3.1.0', docsUrl: null, createdAt: '2025-05-01' },
  { id: 'pl2', name: 'Edgewonk Connector', description: 'Sync your RAPTOR trades to Edgewonk for advanced performance analytics', category: 'analytics_tool', developer: 'Edgewonk', developerUrl: null, tier: 'free', price: null, status: 'published', rating: 4.5, reviewCount: 89, installCount: 2100, iconUrl: null, tags: ['edgewonk', 'sync', 'analytics'], compatibility: ['v1.5+'], version: '1.2.0', docsUrl: null, createdAt: '2025-08-15' },
  { id: 'pl3', name: 'Custom Risk Rules Engine', description: 'Build custom risk rules with no-code editor for broker-specific compliance needs', category: 'risk_management', developer: 'RAPTOR Labs', developerUrl: null, tier: 'subscription', price: null, status: 'published', rating: 4.8, reviewCount: 34, installCount: 890, iconUrl: null, tags: ['risk', 'compliance', 'no-code'], compatibility: ['v2.0+'], version: '2.0.0', docsUrl: null, createdAt: '2025-11-01' },
  { id: 'pl4', name: 'Udemy Course Importer', description: 'Import Udemy trading courses directly into your RAPTOR Academy', category: 'education', developer: 'EduBridge', developerUrl: null, tier: 'free', price: null, status: 'published', rating: 4.2, reviewCount: 23, installCount: 560, iconUrl: null, tags: ['education', 'udemy', 'courses'], compatibility: ['v1.8+'], version: '1.0.1', docsUrl: null, createdAt: '2026-01-15' },
  { id: 'pl5', name: 'WhatsApp Business PSP', description: 'Accept payments via WhatsApp Pay in supported markets', category: 'psp_adapter', developer: 'PayTech', developerUrl: null, tier: 'revenue_share', price: null, status: 'published', rating: 4.0, reviewCount: 12, installCount: 230, iconUrl: null, tags: ['whatsapp', 'payments', 'emerging markets'], compatibility: ['v2.0+'], version: '1.1.0', docsUrl: null, createdAt: '2026-02-01' },
  { id: 'pl6', name: 'Advanced Report Templates', description: '50+ pre-built report templates for regulatory, financial, and operational reporting', category: 'reporting', developer: 'RAPTOR Labs', developerUrl: null, tier: 'paid', price: 99, status: 'published', rating: 4.6, reviewCount: 67, installCount: 1200, iconUrl: null, tags: ['reports', 'regulatory', 'templates'], compatibility: ['v1.5+'], version: '2.3.0', docsUrl: null, createdAt: '2025-06-01' },
];

type MarketplaceTab = 'ea' | 'signals' | 'plugins';

export default function MarketplaceHubPage() {
  const [tab, setTab] = useState<MarketplaceTab>('ea');
  const [search, setSearch] = useState('');

  const filteredEa = MOCK_EA_LISTINGS.filter(ea =>
    !search || ea.name.toLowerCase().includes(search.toLowerCase()) || ea.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#00b4ff]/20 to-[#8b5cf6]/20">
                <Store className="h-5 w-5 text-[#00b4ff]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">RAPTOR Marketplace</h1>
                <p className="text-xs text-white/30">EAs, Indicators, Signal Providers, Plugins & Extensions</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-4 text-[10px] text-white/25">
            <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> {MOCK_STATS.totalListings} listings</span>
            <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {MOCK_STATS.totalInstalls.toLocaleString()} installs</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {MOCK_STATS.totalDevelopers} developers</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-[#f59e0b]" /> {MOCK_STATS.trendingCount} trending</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-[#00dc82]" /> {MOCK_STATS.newThisWeek} new this week</span>
          </div>

          {/* Search + Tabs */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input type="text" placeholder="Search marketplace..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:border-[#00b4ff] focus:outline-none" />
            </div>

            <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
              {([
                { key: 'ea', label: 'EAs & Indicators', icon: <Bot className="h-3.5 w-3.5" /> },
                { key: 'signals', label: 'Signal Providers', icon: <TrendingUp className="h-3.5 w-3.5" /> },
                { key: 'plugins', label: 'Plugins & Extensions', icon: <Puzzle className="h-3.5 w-3.5" /> },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
                  }`}>{t.icon}{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* EA Tab */}
        {tab === 'ea' && (
          <div className="grid grid-cols-3 gap-5">
            {filteredEa.map((ea, i) => (
              <motion.div key={ea.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${ea.scriptKind === 'ea' ? 'bg-[#00b4ff]/10' : ea.scriptKind === 'indicator' ? 'bg-[#00dc82]/10' : 'bg-[#f59e0b]/10'}`}>
                      {ea.scriptKind === 'ea' ? <Bot className="h-5 w-5 text-[#00b4ff]" /> :
                       ea.scriptKind === 'indicator' ? <BarChart3 className="h-5 w-5 text-[#00dc82]" /> :
                       <Zap className="h-5 w-5 text-[#f59e0b]" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-[#00b4ff] transition-colors">{ea.name}</h3>
                      <p className="text-[10px] text-white/25">{ea.developerName} · v{ea.version}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-white/35 line-clamp-2 mb-3">{ea.shortDescription}</p>

                {/* Badges */}
                {ea.badges.length > 0 && (
                  <div className="flex gap-1 mb-3">
                    {ea.badges.map(b => (
                      <span key={b.type} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-[#00dc82]/10 text-[#00dc82]">
                        <Award className="h-2 w-2" />{b.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Performance */}
                {ea.performanceStats && (
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04] mb-3">
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-[#00dc82]">{ea.performanceStats.winRate.toFixed(0)}%</div>
                      <div className="text-[8px] text-white/15">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-white/50">{ea.performanceStats.profitFactor.toFixed(2)}</div>
                      <div className="text-[8px] text-white/15">PF</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-[#ef4444]">{ea.performanceStats.maxDrawdown.toFixed(1)}%</div>
                      <div className="text-[8px] text-white/15">Max DD</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-white/25">
                    <span className="flex items-center gap-1 text-[#f59e0b]"><Star className="h-3 w-3 fill-current" />{ea.rating.toFixed(1)}</span>
                    <span><Download className="h-3 w-3 inline" /> {ea.installCount}</span>
                    <span><Users className="h-3 w-3 inline" /> {ea.activeUsers}</span>
                  </div>
                  <span className="text-xs font-medium">
                    {ea.tier === 'free' ? <span className="text-[#00dc82]">Free</span> :
                     ea.tier === 'paid' ? <span className="text-white">${ea.price}</span> :
                     ea.tier === 'subscription' ? <span className="text-white">${ea.monthlyPrice}<span className="text-white/25">/mo</span></span> :
                     <span className="text-[#8b5cf6]">{ea.revenueSharePct}% rev</span>}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Signals Tab */}
        {tab === 'signals' && (
          <SignalProviderGrid providers={MOCK_SIGNAL_PROVIDERS} onFollow={(id) => console.log('Follow', id)} />
        )}

        {/* Plugins Tab */}
        {tab === 'plugins' && (
          <PluginGrid plugins={MOCK_PLUGINS} onInstall={(id) => console.log('Install', id)} />
        )}
      </div>
    </div>
  );
}
