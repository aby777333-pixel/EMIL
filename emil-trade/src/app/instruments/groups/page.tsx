'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

interface InstrumentGroup {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  color: string;
  symbol_count: number;
  is_active: boolean;
  sort_order: number;
}

const MOCK_GROUPS: InstrumentGroup[] = [
  { id: 'g1', name: 'Forex',         display_name: 'Forex Majors',     icon: '$',  color: '#22d3ee', symbol_count: 7,  is_active: true,  sort_order: 1 },
  { id: 'g2', name: 'ForexMinors',   display_name: 'Forex Minors',     icon: 'Fx', color: '#06b6d4', symbol_count: 12, is_active: true,  sort_order: 2 },
  { id: 'g3', name: 'ForexExotics',  display_name: 'Forex Exotics',    icon: 'Ex', color: '#0891b2', symbol_count: 18, is_active: true,  sort_order: 3 },
  { id: 'g4', name: 'Metals',        display_name: 'Precious Metals',  icon: 'Au', color: '#f59e0b', symbol_count: 4,  is_active: true,  sort_order: 4 },
  { id: 'g5', name: 'Energies',      display_name: 'Energies',         icon: 'En', color: '#ef4444', symbol_count: 3,  is_active: true,  sort_order: 5 },
  { id: 'g6', name: 'CryptoCurrency',display_name: 'Crypto Currency',  icon: 'B',  color: '#8b5cf6', symbol_count: 8,  is_active: true,  sort_order: 6 },
  { id: 'g7', name: 'WorldIndices',  display_name: 'World Indices',    icon: 'Ix', color: '#10b981', symbol_count: 15, is_active: true,  sort_order: 7 },
  { id: 'g8', name: 'USStocks',      display_name: 'US Stocks',        icon: 'St', color: '#3b82f6', symbol_count: 50, is_active: false, sort_order: 8 },
  { id: 'g9', name: 'Bonds',         display_name: 'Bonds',            icon: 'Bd', color: '#64748b', symbol_count: 6,  is_active: false, sort_order: 9 },
];

export default function InstrumentGroupsPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      {/* Header */}
      <header className="border-b border-[#252530] bg-[#0B0B0D]/95 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/broker/overview">
              <Logo height={26} theme="dark" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Link href="/broker/overview" className="hover:text-white/70 transition-colors">Market Configuration</Link>
              <span>/</span>
              <Link href="/instruments" className="hover:text-white/70 transition-colors">Instruments</Link>
              <span>/</span>
              <span className="text-white/80">Groups</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Instrument Groups</h1>
          <p className="text-xs text-white/30 mt-1">Organize instruments into asset class groups for session and holiday management</p>
        </div>

        <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
          {MOCK_GROUPS.map((group, idx) => (
            <div
              key={group.id}
              className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#161620] transition-colors ${
                idx < MOCK_GROUPS.length - 1 ? 'border-b border-[#1a1a22]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Icon badge */}
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: group.color + '20', color: group.color }}
                >
                  {group.icon}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{group.display_name}</span>
                    <span className="text-[10px] text-white/25 font-mono">{group.name}</span>
                  </div>
                  <span className="text-[11px] text-white/40 font-mono">{group.symbol_count} symbols</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    group.is_active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {group.is_active ? 'Active' : 'Inactive'}
                </span>
                <button className="text-xs px-3 py-1.5 rounded bg-[#1a1a22] text-white/50 hover:text-white/80 hover:bg-[#252530] transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
