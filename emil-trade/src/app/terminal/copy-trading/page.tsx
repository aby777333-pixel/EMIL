'use client';

import { useState, useMemo } from 'react';
import { Users, Search, SlidersHorizontal, ArrowUpDown, Clock, UserPlus } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import ProviderCard from '@/components/copy-trading/ProviderCard';
import CopySettings from '@/components/copy-trading/CopySettings';
import MySubscriptions from '@/components/copy-trading/MySubscriptions';
import { mockProviders } from '@/components/copy-trading/mockProviders';
import type { SignalProvider } from '@/components/copy-trading/mockProviders';

type Tab = 'marketplace' | 'subscriptions' | 'become_provider';
type SortBy = 'return' | 'winrate' | 'drawdown' | 'followers';
type Timeframe = '1m' | '3m' | '6m' | 'all';

export default function CopyTradingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [sortBy, setSortBy] = useState<SortBy>('return');
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<SignalProvider | null>(null);

  const getReturnForTimeframe = (p: SignalProvider): number => {
    switch (timeframe) {
      case '1m': return p.returns1m;
      case '3m': return p.returns3m;
      case '6m': return p.returns6m;
      default: return p.returnsAll;
    }
  };

  const filteredProviders = useMemo(() => {
    let list = [...mockProviders];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'return':
          return getReturnForTimeframe(b) - getReturnForTimeframe(a);
        case 'winrate':
          return b.winRate - a.winRate;
        case 'drawdown':
          return Math.abs(a.maxDrawdown) - Math.abs(b.maxDrawdown);
        case 'followers':
          return b.followers - a.followers;
        default:
          return 0;
      }
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, timeframe]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      {/* Header */}
      <div
        className="border-b px-6 py-5 shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#0091D5' }}
          >
            <Users size={18} color="#000" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Copy Trading</h1>
            <p className="text-xs text-white/40">
              Follow top traders and copy their strategies
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="border-b px-6 flex gap-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {(
          [
            { key: 'marketplace', label: 'Marketplace', icon: <Search size={13} /> },
            { key: 'subscriptions', label: 'My Subscriptions', icon: <SlidersHorizontal size={13} /> },
            { key: 'become_provider', label: 'Become a Provider', icon: <UserPlus size={13} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-all border-b-2"
            style={{
              borderColor: activeTab === tab.key ? '#0091D5' : 'transparent',
              color: activeTab === tab.key ? '#0091D5' : 'rgba(255,255,255,0.4)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-5">
        {activeTab === 'marketplace' && (
          <>
            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs text-white border outline-none focus:border-[#0091D5]/50 transition-colors"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={12} className="text-white/30" />
                <span className="text-[10px] text-white/30">Sort:</span>
                {(
                  [
                    { key: 'return', label: 'Profit %' },
                    { key: 'winrate', label: 'Win Rate' },
                    { key: 'drawdown', label: 'Drawdown' },
                    { key: 'followers', label: 'Followers' },
                  ] as { key: SortBy; label: string }[]
                ).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key)}
                    className="px-2.5 py-1 rounded text-[10px] font-medium transition-all border"
                    style={{
                      backgroundColor:
                        sortBy === s.key ? '#0091D5' : 'rgba(255,255,255,0.03)',
                      color: sortBy === s.key ? '#000' : 'rgba(255,255,255,0.5)',
                      borderColor:
                        sortBy === s.key ? '#0091D5' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Timeframe */}
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-white/30" />
                <span className="text-[10px] text-white/30">Period:</span>
                {(
                  [
                    { key: '1m', label: '1M' },
                    { key: '3m', label: '3M' },
                    { key: '6m', label: '6M' },
                    { key: 'all', label: 'All Time' },
                  ] as { key: Timeframe; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTimeframe(t.key)}
                    className="px-2.5 py-1 rounded text-[10px] font-medium transition-all border"
                    style={{
                      backgroundColor:
                        timeframe === t.key
                          ? 'rgba(41,171,226,0.15)'
                          : 'rgba(255,255,255,0.03)',
                      color:
                        timeframe === t.key ? '#0091D5' : 'rgba(255,255,255,0.5)',
                      borderColor:
                        timeframe === t.key
                          ? 'rgba(41,171,226,0.3)'
                          : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onCopy={setSelectedProvider}
                />
              ))}
            </div>

            {filteredProviders.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">
                No providers found matching your search
              </div>
            )}
          </>
        )}

        {activeTab === 'subscriptions' && <MySubscriptions />}

        {activeTab === 'become_provider' && (
          <div
            className="rounded-lg border p-8 text-center max-w-lg mx-auto"
            style={{
              backgroundColor: '#111118',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(41,171,226,0.15)' }}
            >
              <UserPlus size={24} className="text-[#0091D5]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Become a Signal Provider
            </h3>
            <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
              Share your trading strategies and earn from subscriptions and performance fees.
              Minimum 3 months track record with verified results required.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-lg font-bold text-[#0091D5]">70%</div>
                <div className="text-[10px] text-white/40">Revenue Share</div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-lg font-bold text-white">$0</div>
                <div className="text-[10px] text-white/40">Setup Cost</div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-lg font-bold text-white">24/7</div>
                <div className="text-[10px] text-white/40">Support</div>
              </div>
            </div>
            <button
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#0091D5', color: '#000' }}
            >
              Apply Now
            </button>
          </div>
        )}
      </div>

      {/* Copy Settings Modal */}
      {selectedProvider && (
        <CopySettings
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onStart={() => {
            setSelectedProvider(null);
            setActiveTab('subscriptions');
          }}
        />
      )}
    </div>
  );
}
