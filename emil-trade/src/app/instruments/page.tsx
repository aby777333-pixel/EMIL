'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface Instrument {
  symbol: string;
  displayName: string;
  group: string;
  groupIcon: string;
  groupColor: string;
  digits: number;
  contract_size: number;
  pip_size: number;
  pip_value: number;
  margin_pct: number;
  tradable: boolean;
  swap_long: number;
  swap_short: number;
  min_volume: number;
  max_volume: number;
}

const MOCK_INSTRUMENTS: Instrument[] = [
  // ── Forex Majors (8) ──
  { symbol: 'EURUSD', displayName: 'Euro / US Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10, margin_pct: 0.5, tradable: true, swap_long: -6.5, swap_short: 1.2, min_volume: 0.01, max_volume: 100 },
  { symbol: 'GBPUSD', displayName: 'British Pound / US Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10, margin_pct: 0.5, tradable: true, swap_long: -5.8, swap_short: 0.9, min_volume: 0.01, max_volume: 100 },
  { symbol: 'USDJPY', displayName: 'US Dollar / Japanese Yen', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 3, contract_size: 100000, pip_size: 0.01, pip_value: 6.52, margin_pct: 0.5, tradable: true, swap_long: 8.5, swap_short: -12.3, min_volume: 0.01, max_volume: 100 },
  { symbol: 'USDCHF', displayName: 'US Dollar / Swiss Franc', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10.15, margin_pct: 0.5, tradable: true, swap_long: 4.2, swap_short: -8.6, min_volume: 0.01, max_volume: 100 },
  { symbol: 'AUDUSD', displayName: 'Australian Dollar / US Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10, margin_pct: 0.5, tradable: true, swap_long: -4.1, swap_short: 0.6, min_volume: 0.01, max_volume: 100 },
  { symbol: 'USDCAD', displayName: 'US Dollar / Canadian Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 7.30, margin_pct: 0.5, tradable: true, swap_long: -2.8, swap_short: -1.4, min_volume: 0.01, max_volume: 100 },
  { symbol: 'NZDUSD', displayName: 'New Zealand Dollar / US Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10, margin_pct: 0.5, tradable: true, swap_long: -3.5, swap_short: 0.3, min_volume: 0.01, max_volume: 100 },
  { symbol: 'GBPJPY', displayName: 'British Pound / Japanese Yen', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 3, contract_size: 100000, pip_size: 0.01, pip_value: 6.52, margin_pct: 0.5, tradable: true, swap_long: -3.2, swap_short: -1.8, min_volume: 0.01, max_volume: 100 },

  // ── Forex Minors (8) ──
  { symbol: 'EURGBP', displayName: 'Euro / British Pound', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 12.60, margin_pct: 1.0, tradable: true, swap_long: -4.2, swap_short: 0.5, min_volume: 0.01, max_volume: 50 },
  { symbol: 'EURJPY', displayName: 'Euro / Japanese Yen', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 3, contract_size: 100000, pip_size: 0.01, pip_value: 6.52, margin_pct: 1.0, tradable: true, swap_long: -5.0, swap_short: 0.8, min_volume: 0.01, max_volume: 50 },
  { symbol: 'GBPCHF', displayName: 'British Pound / Swiss Franc', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10.15, margin_pct: 1.0, tradable: true, swap_long: 1.1, swap_short: -6.5, min_volume: 0.01, max_volume: 50 },
  { symbol: 'AUDNZD', displayName: 'Australian Dollar / New Zealand Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 5.85, margin_pct: 1.5, tradable: true, swap_long: -3.8, swap_short: -0.2, min_volume: 0.01, max_volume: 50 },
  { symbol: 'CADJPY', displayName: 'Canadian Dollar / Japanese Yen', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 3, contract_size: 100000, pip_size: 0.01, pip_value: 6.52, margin_pct: 1.0, tradable: true, swap_long: 3.4, swap_short: -7.8, min_volume: 0.01, max_volume: 50 },
  { symbol: 'EURAUD', displayName: 'Euro / Australian Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 6.45, margin_pct: 1.0, tradable: true, swap_long: -7.2, swap_short: 1.0, min_volume: 0.01, max_volume: 50 },
  { symbol: 'EURCHF', displayName: 'Euro / Swiss Franc', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 10.15, margin_pct: 1.0, tradable: true, swap_long: -1.5, swap_short: -3.2, min_volume: 0.01, max_volume: 50 },
  { symbol: 'GBPAUD', displayName: 'British Pound / Australian Dollar', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 6.45, margin_pct: 1.0, tradable: true, swap_long: -5.5, swap_short: 0.4, min_volume: 0.01, max_volume: 50 },

  // ── Forex Exotics (6) ──
  { symbol: 'USDTRY', displayName: 'US Dollar / Turkish Lira', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.30, margin_pct: 5.0, tradable: true, swap_long: -350.0, swap_short: 85.0, min_volume: 0.01, max_volume: 20 },
  { symbol: 'USDZAR', displayName: 'US Dollar / South African Rand', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.55, margin_pct: 3.0, tradable: true, swap_long: -180.0, swap_short: 42.0, min_volume: 0.01, max_volume: 20 },
  { symbol: 'USDMXN', displayName: 'US Dollar / Mexican Peso', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.58, margin_pct: 3.0, tradable: true, swap_long: -220.0, swap_short: 55.0, min_volume: 0.01, max_volume: 20 },
  { symbol: 'EURTRY', displayName: 'Euro / Turkish Lira', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.30, margin_pct: 5.0, tradable: true, swap_long: -400.0, swap_short: 70.0, min_volume: 0.01, max_volume: 20 },
  { symbol: 'USDSEK', displayName: 'US Dollar / Swedish Krona', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.94, margin_pct: 2.0, tradable: true, swap_long: -12.0, swap_short: 2.5, min_volume: 0.01, max_volume: 30 },
  { symbol: 'USDNOK', displayName: 'US Dollar / Norwegian Krone', group: 'Forex', groupIcon: '$', groupColor: '#22d3ee', digits: 5, contract_size: 100000, pip_size: 0.0001, pip_value: 0.95, margin_pct: 2.0, tradable: true, swap_long: -14.0, swap_short: 3.0, min_volume: 0.01, max_volume: 30 },

  // ── Metals (4) ──
  { symbol: 'XAUUSD', displayName: 'Gold / US Dollar', group: 'Metals', groupIcon: 'Au', groupColor: '#f59e0b', digits: 2, contract_size: 100, pip_size: 0.01, pip_value: 1, margin_pct: 0.5, tradable: true, swap_long: -15.2, swap_short: 3.1, min_volume: 0.01, max_volume: 50 },
  { symbol: 'XAGUSD', displayName: 'Silver / US Dollar', group: 'Metals', groupIcon: 'Ag', groupColor: '#f59e0b', digits: 3, contract_size: 5000, pip_size: 0.001, pip_value: 5, margin_pct: 1.0, tradable: true, swap_long: -8.4, swap_short: 1.8, min_volume: 0.01, max_volume: 50 },
  { symbol: 'XPTUSD', displayName: 'Platinum / US Dollar', group: 'Metals', groupIcon: 'Pt', groupColor: '#f59e0b', digits: 2, contract_size: 100, pip_size: 0.01, pip_value: 1, margin_pct: 2.0, tradable: true, swap_long: -10.5, swap_short: 2.0, min_volume: 0.01, max_volume: 20 },
  { symbol: 'XPDUSD', displayName: 'Palladium / US Dollar', group: 'Metals', groupIcon: 'Pd', groupColor: '#f59e0b', digits: 2, contract_size: 100, pip_size: 0.01, pip_value: 1, margin_pct: 3.0, tradable: true, swap_long: -12.0, swap_short: 2.5, min_volume: 0.01, max_volume: 10 },

  // ── Energies (3) ──
  { symbol: 'USOIL', displayName: 'WTI Crude Oil', group: 'Energies', groupIcon: 'OL', groupColor: '#ef4444', digits: 2, contract_size: 1000, pip_size: 0.01, pip_value: 10, margin_pct: 5.0, tradable: true, swap_long: -8.5, swap_short: 2.1, min_volume: 0.01, max_volume: 100 },
  { symbol: 'UKOIL', displayName: 'Brent Crude Oil', group: 'Energies', groupIcon: 'OL', groupColor: '#ef4444', digits: 2, contract_size: 1000, pip_size: 0.01, pip_value: 10, margin_pct: 5.0, tradable: true, swap_long: -9.0, swap_short: 2.3, min_volume: 0.01, max_volume: 100 },
  { symbol: 'NATGAS', displayName: 'Natural Gas', group: 'Energies', groupIcon: 'NG', groupColor: '#ef4444', digits: 3, contract_size: 10000, pip_size: 0.001, pip_value: 10, margin_pct: 5.0, tradable: true, swap_long: -5.0, swap_short: 1.0, min_volume: 0.01, max_volume: 50 },

  // ── Crypto (8) ──
  { symbol: 'BTCUSD', displayName: 'Bitcoin / US Dollar', group: 'Crypto', groupIcon: 'B', groupColor: '#8b5cf6', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 10.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 0.01, max_volume: 10 },
  { symbol: 'ETHUSD', displayName: 'Ethereum / US Dollar', group: 'Crypto', groupIcon: 'E', groupColor: '#8b5cf6', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 10.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 0.01, max_volume: 50 },
  { symbol: 'XRPUSD', displayName: 'Ripple / US Dollar', group: 'Crypto', groupIcon: 'X', groupColor: '#8b5cf6', digits: 4, contract_size: 1, pip_size: 0.0001, pip_value: 0.0001, margin_pct: 20.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 1, max_volume: 100000 },
  { symbol: 'SOLUSD', displayName: 'Solana / US Dollar', group: 'Crypto', groupIcon: 'S', groupColor: '#8b5cf6', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 0.1, max_volume: 1000 },
  { symbol: 'ADAUSD', displayName: 'Cardano / US Dollar', group: 'Crypto', groupIcon: 'A', groupColor: '#8b5cf6', digits: 4, contract_size: 1, pip_size: 0.0001, pip_value: 0.0001, margin_pct: 25.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 1, max_volume: 100000 },
  { symbol: 'DOTUSD', displayName: 'Polkadot / US Dollar', group: 'Crypto', groupIcon: 'D', groupColor: '#8b5cf6', digits: 3, contract_size: 1, pip_size: 0.001, pip_value: 0.001, margin_pct: 25.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 1, max_volume: 10000 },
  { symbol: 'LTCUSD', displayName: 'Litecoin / US Dollar', group: 'Crypto', groupIcon: 'L', groupColor: '#8b5cf6', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 15.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 0.1, max_volume: 500 },
  { symbol: 'LINKUSD', displayName: 'Chainlink / US Dollar', group: 'Crypto', groupIcon: 'LK', groupColor: '#8b5cf6', digits: 3, contract_size: 1, pip_size: 0.001, pip_value: 0.001, margin_pct: 25.0, tradable: true, swap_long: -0.05, swap_short: -0.05, min_volume: 1, max_volume: 10000 },

  // ── World Indices (8) ──
  { symbol: 'US500', displayName: 'S&P 500 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 2.0, tradable: true, swap_long: -5.5, swap_short: 0.8, min_volume: 0.1, max_volume: 200 },
  { symbol: 'US30', displayName: 'Dow Jones 30 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 1.0, pip_value: 1.0, margin_pct: 2.0, tradable: true, swap_long: -6.0, swap_short: 0.9, min_volume: 0.1, max_volume: 100 },
  { symbol: 'NAS100', displayName: 'Nasdaq 100 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 2.0, tradable: true, swap_long: -5.8, swap_short: 0.7, min_volume: 0.1, max_volume: 200 },
  { symbol: 'UK100', displayName: 'FTSE 100 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 3.0, tradable: true, swap_long: -3.2, swap_short: 0.4, min_volume: 0.1, max_volume: 200 },
  { symbol: 'GER40', displayName: 'DAX 40 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 3.0, tradable: true, swap_long: -4.0, swap_short: 0.5, min_volume: 0.1, max_volume: 200 },
  { symbol: 'JPN225', displayName: 'Nikkei 225 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 0, contract_size: 1, pip_size: 1.0, pip_value: 1.0, margin_pct: 3.0, tradable: true, swap_long: -2.5, swap_short: 0.3, min_volume: 0.1, max_volume: 100 },
  { symbol: 'AUS200', displayName: 'ASX 200 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 3.0, tradable: true, swap_long: -3.5, swap_short: 0.4, min_volume: 0.1, max_volume: 200 },
  { symbol: 'FRA40', displayName: 'CAC 40 Index', group: 'Indices', groupIcon: 'IX', groupColor: '#06b6d4', digits: 1, contract_size: 1, pip_size: 0.1, pip_value: 0.1, margin_pct: 3.0, tradable: true, swap_long: -3.0, swap_short: 0.3, min_volume: 0.1, max_volume: 200 },

  // ── US Stocks CFDs (6) ──
  { symbol: 'AAPL', displayName: 'Apple Inc.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.2, swap_short: -0.3, min_volume: 1, max_volume: 500 },
  { symbol: 'MSFT', displayName: 'Microsoft Corp.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.1, swap_short: -0.3, min_volume: 1, max_volume: 500 },
  { symbol: 'AMZN', displayName: 'Amazon.com Inc.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.3, swap_short: -0.4, min_volume: 1, max_volume: 500 },
  { symbol: 'GOOGL', displayName: 'Alphabet Inc.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.0, swap_short: -0.2, min_volume: 1, max_volume: 500 },
  { symbol: 'TSLA', displayName: 'Tesla Inc.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.5, swap_short: -0.5, min_volume: 1, max_volume: 300 },
  { symbol: 'NVDA', displayName: 'NVIDIA Corp.', group: 'Stocks', groupIcon: 'EQ', groupColor: '#10b981', digits: 2, contract_size: 1, pip_size: 0.01, pip_value: 0.01, margin_pct: 20.0, tradable: true, swap_long: -1.4, swap_short: -0.4, min_volume: 1, max_volume: 300 },

  // ── Bonds (2) ──
  { symbol: 'USTBOND', displayName: 'US Treasury Bond', group: 'Bonds', groupIcon: 'BD', groupColor: '#a78bfa', digits: 3, contract_size: 1000, pip_size: 0.001, pip_value: 1, margin_pct: 1.0, tradable: true, swap_long: -2.0, swap_short: 0.5, min_volume: 0.1, max_volume: 100 },
  { symbol: 'EURBUND', displayName: 'Euro Bund', group: 'Bonds', groupIcon: 'BD', groupColor: '#a78bfa', digits: 3, contract_size: 1000, pip_size: 0.001, pip_value: 1, margin_pct: 1.0, tradable: true, swap_long: -1.5, swap_short: 0.3, min_volume: 0.1, max_volume: 100 },
];

const GROUP_TABS = ['ALL', 'Forex', 'Metals', 'Energies', 'Crypto', 'Indices', 'Stocks', 'Bonds'];

export default function InstrumentsPage() {
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = MOCK_INSTRUMENTS.filter((inst) => {
    const matchGroup = activeGroup === 'ALL' || inst.group === activeGroup;
    const matchSearch = !search || inst.symbol.toLowerCase().includes(search.toLowerCase()) || inst.displayName.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const groupCounts = GROUP_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab] = tab === 'ALL' ? MOCK_INSTRUMENTS.length : MOCK_INSTRUMENTS.filter((i) => i.group === tab).length;
    return acc;
  }, {});

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
              <span className="text-white/80">Instruments</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/instruments/groups"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Manage Groups
            </Link>
            <Link
              href="/trading-terms"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Trading Terms
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Instruments Registry</h1>
          <p className="text-xs text-white/30 mt-1">Master list of all tradeable instruments and their base configurations</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-[#111116] border border-[#252530] rounded-lg p-1 flex-wrap">
            {GROUP_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveGroup(tab)}
                className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  activeGroup === tab
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab}
                <span className={`text-[10px] font-mono ${activeGroup === tab ? 'text-cyan-400/70' : 'text-white/20'}`}>
                  {groupCounts[tab]}
                </span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-[#111116] border border-[#252530] rounded-lg px-3 py-2 text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 w-56"
          />
          <span className="text-xs text-white/30 ml-auto">{filtered.length} instruments</span>
        </div>

        {/* Table */}
        <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530] text-white/40">
                  <th className="text-left px-4 py-3 font-medium">Symbol</th>
                  <th className="text-left px-4 py-3 font-medium">Group</th>
                  <th className="text-right px-4 py-3 font-medium">Digits</th>
                  <th className="text-right px-4 py-3 font-medium">Contract Size</th>
                  <th className="text-right px-4 py-3 font-medium">Pip Size</th>
                  <th className="text-right px-4 py-3 font-medium">Pip Value</th>
                  <th className="text-right px-4 py-3 font-medium">Margin%</th>
                  <th className="text-center px-4 py-3 font-medium">Tradable</th>
                  <th className="text-right px-4 py-3 font-medium">Swap L</th>
                  <th className="text-right px-4 py-3 font-medium">Swap S</th>
                  <th className="text-right px-4 py-3 font-medium">Min Vol</th>
                  <th className="text-right px-4 py-3 font-medium">Max Vol</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => (
                  <tr key={inst.symbol} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-semibold text-white">{inst.symbol}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{inst.displayName}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: inst.groupColor + '20', color: inst.groupColor }}
                        >
                          {inst.groupIcon}
                        </span>
                        <span className="text-white/60">{inst.group}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.digits}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.contract_size.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.pip_size}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">${inst.pip_value}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.margin_pct}%</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${inst.tradable ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${inst.swap_long >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {inst.swap_long}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${inst.swap_short >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {inst.swap_short}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.min_volume}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.max_volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
