'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Search, Star, Download, Users, Shield,
  TrendingUp, Filter, SortDesc, Zap, BarChart3, Bot,
} from 'lucide-react';
import Link from 'next/link';
import type { MarketplaceListing, ScriptKind, EAClassification } from '@/types/converter';

const CATEGORIES: { value: ScriptKind | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Zap className="h-3.5 w-3.5" /> },
  { value: 'ea', label: 'Expert Advisors', icon: <Bot className="h-3.5 w-3.5" /> },
  { value: 'indicator', label: 'Indicators', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { value: 'script', label: 'Scripts', icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'installs', label: 'Most Installed' },
  { value: 'newest', label: 'Newest' },
  { value: 'active', label: 'Most Active' },
];

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const stats = listing.performanceStats;

  return (
    <Link href={`/marketplace/${listing.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2, borderColor: 'rgba(0, 180, 255, 0.2)' }}
        className="group bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 transition-all cursor-pointer"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              listing.category === 'ea' ? 'bg-[#00b4ff]/10' :
              listing.category === 'indicator' ? 'bg-[#00dc82]/10' : 'bg-[#f59e0b]/10'
            }`}>
              {listing.category === 'ea' ? <Bot className="h-5 w-5 text-[#00b4ff]" /> :
               listing.category === 'indicator' ? <BarChart3 className="h-5 w-5 text-[#00dc82]" /> :
               <TrendingUp className="h-5 w-5 text-[#f59e0b]" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-[#00b4ff] transition-colors">
                {listing.name}
              </h3>
              <p className="text-xs text-white/40">{listing.authorName}</p>
            </div>
          </div>
          {listing.isVerified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00dc82]/10 text-[#00dc82] border border-[#00dc82]/20">
              <Shield className="h-2.5 w-2.5" /> Verified
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-white/50 line-clamp-2 mb-4">{listing.shortDescription}</p>

        {/* Classification */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/40 capitalize">
            {listing.classification.replace(/_/g, ' ')}
          </span>
          {listing.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/30">
              {tag}
            </span>
          ))}
        </div>

        {/* Performance Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-y border-white/[0.04]">
            <div>
              <div className={`text-sm font-mono font-bold ${stats.winRate >= 60 ? 'text-[#00dc82]' : stats.winRate >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-white/25">Win Rate</div>
            </div>
            <div>
              <div className={`text-sm font-mono font-bold ${stats.profitFactor >= 1.5 ? 'text-[#00dc82]' : 'text-[#f59e0b]'}`}>
                {stats.profitFactor.toFixed(2)}
              </div>
              <div className="text-[10px] text-white/25">Profit Factor</div>
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-white/70">{stats.totalTrades}</div>
              <div className="text-[10px] text-white/25">Total Trades</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-[#f59e0b]">
              <Star className="h-3 w-3 fill-current" />
              {listing.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/30">
              <Download className="h-3 w-3" />
              {listing.installCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/30">
              <Users className="h-3 w-3" />
              {listing.activeUsers}
            </span>
          </div>
          <div className="text-right">
            {listing.monetization === 'free' ? (
              <span className="text-xs font-medium text-[#00dc82]">Free</span>
            ) : listing.monetization === 'one_time' ? (
              <span className="text-xs font-bold text-white">${listing.price}</span>
            ) : listing.monetization === 'monthly' ? (
              <span className="text-xs font-bold text-white">${listing.price}<span className="text-white/30 font-normal">/mo</span></span>
            ) : (
              <span className="text-xs text-[#8b5cf6]">{listing.revenueSharePct}% rev share</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [category, setCategory] = useState<ScriptKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, [category, sort]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('sort', sort);
      if (search) params.set('search', search);

      const res = await fetch(`/api/marketplace?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">RAPTOR Marketplace</h1>
              <p className="text-xs text-white/40">Expert Advisors, Indicators & Scripts — verified and performance-tested</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Search scripts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-[#00b4ff] focus:outline-none"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${category === cat.value ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}
                  `}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <SortDesc className="h-3.5 w-3.5 text-white/30" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/60 focus:outline-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-3 gap-5">
            {filteredListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Filter className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/30">No scripts found matching your criteria</p>
            <p className="text-xs text-white/15 mt-1">Try adjusting your filters or search query</p>
            <Link
              href="/converter"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-sm font-medium transition-colors"
            >
              <Zap className="h-4 w-4" />
              Convert Your Own Script
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
