'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

interface TradingTerm {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  leverage_default: number;
  margin_call_level: number;
  stop_out_level: number;
  hedging_allowed: boolean;
  max_open_positions: number;
  execution_mode: string;
  requote_allowed: boolean;
  is_active: boolean;
}

const MOCK_TERMS: TradingTerm[] = [
  {
    id: 'tt-standard',
    name: 'GIO Standard',
    description: 'Standard trading conditions for retail traders.',
    is_default: true,
    leverage_default: 200,
    margin_call_level: 100,
    stop_out_level: 50,
    hedging_allowed: true,
    max_open_positions: 200,
    execution_mode: 'market',
    requote_allowed: false,
    is_active: true,
  },
  {
    id: 'tt-premium',
    name: 'GIO Premium',
    description: 'Premium conditions with tighter spreads and priority execution.',
    is_default: false,
    leverage_default: 300,
    margin_call_level: 100,
    stop_out_level: 40,
    hedging_allowed: true,
    max_open_positions: 500,
    execution_mode: 'market',
    requote_allowed: false,
    is_active: true,
  },
  {
    id: 'tt-vip',
    name: 'GIO VIP',
    description: 'VIP institutional-grade conditions. Lowest spreads, highest leverage.',
    is_default: false,
    leverage_default: 500,
    margin_call_level: 80,
    stop_out_level: 30,
    hedging_allowed: true,
    max_open_positions: 1000,
    execution_mode: 'market',
    requote_allowed: false,
    is_active: true,
  },
  {
    id: 'tt-islamic',
    name: 'GIO Islamic',
    description: 'Swap-free account compliant with Islamic finance principles.',
    is_default: false,
    leverage_default: 200,
    margin_call_level: 100,
    stop_out_level: 50,
    hedging_allowed: false,
    max_open_positions: 200,
    execution_mode: 'market',
    requote_allowed: false,
    is_active: true,
  },
  {
    id: 'tt-test',
    name: 'GIO TEST',
    description: 'Internal testing environment. Do not assign to live clients.',
    is_default: false,
    leverage_default: 1000,
    margin_call_level: 100,
    stop_out_level: 20,
    hedging_allowed: true,
    max_open_positions: 9999,
    execution_mode: 'instant',
    requote_allowed: true,
    is_active: false,
  },
];

export default function TradingTermsPage() {
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
              <span className="text-white/80">Trading Terms</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/instruments"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Instruments
            </Link>
            <Link
              href="/trading-sessions"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Sessions
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Trading Terms</h1>
          <p className="text-xs text-white/30 mt-1">
            Manage trading conditions, leverage policies, and execution rules for account groups
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_TERMS.map((term) => (
            <div
              key={term.id}
              className="bg-[#111116] border border-[#252530] rounded-lg p-5 hover:border-[#353545] transition-colors group"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{term.name}</h3>
                    {term.is_default && (
                      <span className="text-[10px] font-medium bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{term.description}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    term.is_active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {term.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#252530]">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Leverage</div>
                  <div className="text-sm font-mono font-semibold text-white mt-0.5">
                    1:{term.leverage_default}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Margin Call</div>
                  <div className="text-sm font-mono font-semibold text-amber-400 mt-0.5">
                    {term.margin_call_level}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Stop Out</div>
                  <div className="text-sm font-mono font-semibold text-red-400 mt-0.5">
                    {term.stop_out_level}%
                  </div>
                </div>
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a22] text-white/50">
                  {term.execution_mode}
                </span>
                {term.hedging_allowed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a22] text-white/50">
                    hedging
                  </span>
                )}
                {term.requote_allowed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70">
                    requote
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a22] text-white/50 font-mono">
                  max {term.max_open_positions} pos
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#252530]">
                <Link
                  href={`/trading-terms/${term.id}`}
                  className="text-xs px-3 py-1.5 rounded bg-[#1a1a22] text-white/70 hover:text-white hover:bg-[#252530] transition-colors"
                >
                  Edit
                </Link>
                <button className="text-xs px-3 py-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                  Spread Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
