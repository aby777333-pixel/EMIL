'use client';

import { useState, useMemo } from 'react';
import { PieChart, Search, ArrowUpDown, Briefcase, BarChart3 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import FundCard from '@/components/pamm/FundCard';
import InvestModal from '@/components/pamm/InvestModal';
import MyInvestments from '@/components/pamm/MyInvestments';
import FundManagerDashboard from '@/components/pamm/FundManagerDashboard';
import { mockFunds } from '@/components/pamm/mockFunds';
import type { PAMMFund } from '@/components/pamm/mockFunds';

type Tab = 'funds' | 'investments' | 'manager';
type SortBy = 'return' | 'min_investment' | 'risk' | 'aum';

export default function PAMMPage() {
  const [activeTab, setActiveTab] = useState<Tab>('funds');
  const [sortBy, setSortBy] = useState<SortBy>('return');
  const [search, setSearch] = useState('');
  const [selectedFund, setSelectedFund] = useState<PAMMFund | null>(null);

  const filteredFunds = useMemo(() => {
    let list = [...mockFunds];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.manager.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'return':
          return b.ytdReturn - a.ytdReturn;
        case 'min_investment':
          return a.minInvestment - b.minInvestment;
        case 'risk': {
          const riskOrder = { Conservative: 1, Moderate: 2, Aggressive: 3 };
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        case 'aum':
          return b.totalAUM - a.totalAUM;
        default:
          return 0;
      }
    });

    return list;
  }, [search, sortBy]);

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
            <PieChart size={18} color="#000" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PAMM Funds</h1>
            <p className="text-xs text-white/40">
              Invest in professionally managed funds
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
            { key: 'funds', label: 'Available Funds', icon: <Search size={13} /> },
            { key: 'investments', label: 'My Investments', icon: <Briefcase size={13} /> },
            { key: 'manager', label: 'Fund Manager Dashboard', icon: <BarChart3 size={13} /> },
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
        {activeTab === 'funds' && (
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
                  placeholder="Search funds or managers..."
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
                    { key: 'return', label: 'Return' },
                    { key: 'min_investment', label: 'Min Investment' },
                    { key: 'risk', label: 'Risk Level' },
                    { key: 'aum', label: 'AUM' },
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
            </div>

            {/* Fund Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFunds.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  onInvest={setSelectedFund}
                />
              ))}
            </div>

            {filteredFunds.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">
                No funds found matching your search
              </div>
            )}
          </>
        )}

        {activeTab === 'investments' && <MyInvestments />}
        {activeTab === 'manager' && <FundManagerDashboard />}
      </div>

      {/* Invest Modal */}
      {selectedFund && (
        <InvestModal
          fund={selectedFund}
          onClose={() => setSelectedFund(null)}
          onConfirm={() => {
            setSelectedFund(null);
            setActiveTab('investments');
          }}
        />
      )}
    </div>
  );
}
