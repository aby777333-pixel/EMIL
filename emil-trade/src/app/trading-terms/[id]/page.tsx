'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface TradingTermDetail {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  base_currency: string;
  leverage_default: number;
  margin_call_level: number;
  stop_out_level: number;
  hedging_allowed: boolean;
  max_open_positions: number;
  max_pending_orders: number;
  trailing_stop_allowed: boolean;
  expert_advisors_allowed: boolean;
  execution_mode: string;
  instant_execution_deviation: number;
  requote_allowed: boolean;
  is_active: boolean;
}

interface InstrumentPolicy {
  symbol: string;
  spread_type: string;
  spread_value: number;
  markup_value: number;
  leverage_override: number | null;
  margin_pct_override: number | null;
  swap_long: number;
  swap_short: number;
  min_volume: number;
  max_volume: number;
  commission_type: string;
  commission_value: number;
  tradability: string;
}

const MOCK_TERMS: Record<string, TradingTermDetail> = {
  'tt-standard': {
    id: 'tt-standard', name: 'GIO Standard', description: 'Standard trading conditions for retail traders.', is_default: true,
    base_currency: 'USD', leverage_default: 200, margin_call_level: 100, stop_out_level: 50, hedging_allowed: true,
    max_open_positions: 200, max_pending_orders: 200, trailing_stop_allowed: true, expert_advisors_allowed: true,
    execution_mode: 'market', instant_execution_deviation: 0, requote_allowed: false, is_active: true,
  },
  'tt-premium': {
    id: 'tt-premium', name: 'GIO Premium', description: 'Premium conditions with tighter spreads and priority execution.', is_default: false,
    base_currency: 'USD', leverage_default: 300, margin_call_level: 100, stop_out_level: 40, hedging_allowed: true,
    max_open_positions: 500, max_pending_orders: 500, trailing_stop_allowed: true, expert_advisors_allowed: true,
    execution_mode: 'market', instant_execution_deviation: 0, requote_allowed: false, is_active: true,
  },
  'tt-vip': {
    id: 'tt-vip', name: 'GIO VIP', description: 'VIP institutional-grade conditions. Lowest spreads, highest leverage.', is_default: false,
    base_currency: 'USD', leverage_default: 500, margin_call_level: 80, stop_out_level: 30, hedging_allowed: true,
    max_open_positions: 1000, max_pending_orders: 1000, trailing_stop_allowed: true, expert_advisors_allowed: true,
    execution_mode: 'market', instant_execution_deviation: 0, requote_allowed: false, is_active: true,
  },
  'tt-islamic': {
    id: 'tt-islamic', name: 'GIO Islamic', description: 'Swap-free account compliant with Islamic finance principles.', is_default: false,
    base_currency: 'USD', leverage_default: 200, margin_call_level: 100, stop_out_level: 50, hedging_allowed: false,
    max_open_positions: 200, max_pending_orders: 200, trailing_stop_allowed: true, expert_advisors_allowed: false,
    execution_mode: 'market', instant_execution_deviation: 0, requote_allowed: false, is_active: true,
  },
  'tt-test': {
    id: 'tt-test', name: 'GIO TEST', description: 'Internal testing environment. Do not assign to live clients.', is_default: false,
    base_currency: 'USD', leverage_default: 1000, margin_call_level: 100, stop_out_level: 20, hedging_allowed: true,
    max_open_positions: 9999, max_pending_orders: 9999, trailing_stop_allowed: true, expert_advisors_allowed: true,
    execution_mode: 'instant', instant_execution_deviation: 5, requote_allowed: true, is_active: false,
  },
};

const MOCK_INSTRUMENTS: Record<string, InstrumentPolicy[]> = {
  'tt-standard': [
    { symbol: 'EURUSD', spread_type: 'variable', spread_value: 1.2, markup_value: 0.3, leverage_override: null, margin_pct_override: null, swap_long: -6.5, swap_short: 1.2, min_volume: 0.01, max_volume: 100, commission_type: 'none', commission_value: 0, tradability: 'full' },
    { symbol: 'GBPUSD', spread_type: 'variable', spread_value: 1.5, markup_value: 0.5, leverage_override: null, margin_pct_override: null, swap_long: -5.8, swap_short: 0.9, min_volume: 0.01, max_volume: 100, commission_type: 'none', commission_value: 0, tradability: 'full' },
    { symbol: 'XAUUSD', spread_type: 'variable', spread_value: 25, markup_value: 2.0, leverage_override: 200, margin_pct_override: 0.5, swap_long: -15.2, swap_short: 3.1, min_volume: 0.01, max_volume: 50, commission_type: 'none', commission_value: 0, tradability: 'full' },
    { symbol: 'USDJPY', spread_type: 'variable', spread_value: 1.0, markup_value: 0.2, leverage_override: null, margin_pct_override: null, swap_long: 8.5, swap_short: -12.3, min_volume: 0.01, max_volume: 100, commission_type: 'none', commission_value: 0, tradability: 'full' },
    { symbol: 'BTCUSD', spread_type: 'fixed', spread_value: 50, markup_value: 0, leverage_override: 20, margin_pct_override: 5.0, swap_long: -0.05, swap_short: -0.05, min_volume: 0.01, max_volume: 10, commission_type: 'per_lot', commission_value: 15, tradability: 'full' },
    { symbol: 'GBPJPY', spread_type: 'variable', spread_value: 2.5, markup_value: 0.8, leverage_override: null, margin_pct_override: null, swap_long: -3.2, swap_short: -1.8, min_volume: 0.01, max_volume: 100, commission_type: 'none', commission_value: 0, tradability: 'full' },
  ],
  'tt-premium': [
    { symbol: 'EURUSD', spread_type: 'variable', spread_value: 0.6, markup_value: 0.1, leverage_override: null, margin_pct_override: null, swap_long: -5.5, swap_short: 1.5, min_volume: 0.01, max_volume: 200, commission_type: 'per_lot', commission_value: 3.5, tradability: 'full' },
    { symbol: 'GBPUSD', spread_type: 'variable', spread_value: 0.8, markup_value: 0.2, leverage_override: null, margin_pct_override: null, swap_long: -4.8, swap_short: 1.1, min_volume: 0.01, max_volume: 200, commission_type: 'per_lot', commission_value: 3.5, tradability: 'full' },
    { symbol: 'XAUUSD', spread_type: 'variable', spread_value: 15, markup_value: 1.0, leverage_override: 200, margin_pct_override: 0.5, swap_long: -12.0, swap_short: 4.0, min_volume: 0.01, max_volume: 100, commission_type: 'per_lot', commission_value: 5, tradability: 'full' },
    { symbol: 'USDJPY', spread_type: 'variable', spread_value: 0.5, markup_value: 0.1, leverage_override: null, margin_pct_override: null, swap_long: 9.0, swap_short: -11.0, min_volume: 0.01, max_volume: 200, commission_type: 'per_lot', commission_value: 3.5, tradability: 'full' },
    { symbol: 'BTCUSD', spread_type: 'fixed', spread_value: 35, markup_value: 0, leverage_override: 20, margin_pct_override: 5.0, swap_long: -0.04, swap_short: -0.04, min_volume: 0.01, max_volume: 20, commission_type: 'per_lot', commission_value: 10, tradability: 'full' },
    { symbol: 'GBPJPY', spread_type: 'variable', spread_value: 1.5, markup_value: 0.3, leverage_override: null, margin_pct_override: null, swap_long: -2.8, swap_short: -1.5, min_volume: 0.01, max_volume: 200, commission_type: 'per_lot', commission_value: 3.5, tradability: 'full' },
  ],
};

// Fallback for terms not in detailed mock
function getInstruments(id: string): InstrumentPolicy[] {
  return MOCK_INSTRUMENTS[id] || MOCK_INSTRUMENTS['tt-standard'] || [];
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-white hover:bg-[#161620] transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 border-t border-[#252530]">{children}</div>}
    </div>
  );
}

function FieldRow({ label, value, color }: { label: string; value: string | number | boolean; color?: string }) {
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a1a22] last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs font-mono font-medium ${color || 'text-white/80'}`}>{display}</span>
    </div>
  );
}

export default function TradingTermDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const term = MOCK_TERMS[id] || MOCK_TERMS['tt-standard'];
  const instruments = getInstruments(id);

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
              <Link href="/trading-terms" className="hover:text-white/70 transition-colors">Trading Terms</Link>
              <span>/</span>
              <span className="text-white/80">{term.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${term.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {term.is_active ? 'Active' : 'Inactive'}
            </span>
            {term.is_default && (
              <span className="text-[10px] font-medium bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded">DEFAULT</span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">{term.name}</h1>
          <p className="text-xs text-white/40 mt-1">{term.description}</p>
        </div>

        {/* General */}
        <CollapsibleSection title="General">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="Name" value={term.name} />
              <FieldRow label="Description" value={term.description} />
            </div>
            <div>
              <FieldRow label="Base Currency" value={term.base_currency} />
              <FieldRow label="Status" value={term.is_active ? 'Active' : 'Inactive'} color={term.is_active ? 'text-emerald-400' : 'text-red-400'} />
              <FieldRow label="Default" value={term.is_default} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Trading Policies */}
        <CollapsibleSection title="Trading Policies">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="Default Leverage" value={`1:${term.leverage_default}`} />
              <FieldRow label="Margin Call Level" value={`${term.margin_call_level}%`} color="text-amber-400" />
              <FieldRow label="Stop Out Level" value={`${term.stop_out_level}%`} color="text-red-400" />
            </div>
            <div>
              <FieldRow label="Hedging Allowed" value={term.hedging_allowed} />
              <FieldRow label="Max Open Positions" value={term.max_open_positions} />
              <FieldRow label="Max Pending Orders" value={term.max_pending_orders} />
              <FieldRow label="Trailing Stop" value={term.trailing_stop_allowed} />
              <FieldRow label="Expert Advisors" value={term.expert_advisors_allowed} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Execution Policies */}
        <CollapsibleSection title="Execution Policies">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="Execution Mode" value={term.execution_mode} />
              <FieldRow label="Requote Allowed" value={term.requote_allowed} />
            </div>
            <div>
              <FieldRow label="Instant Execution Deviation" value={`${term.instant_execution_deviation} pips`} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Instruments Policies */}
        <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#252530]">
            <h2 className="text-sm font-semibold text-white">Instruments Policies</h2>
            <p className="text-[10px] text-white/30 mt-0.5">Per-symbol spread, margin, and swap overrides for this term</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530] text-white/40">
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Spread</th>
                  <th className="text-right px-4 py-2.5 font-medium">Markup</th>
                  <th className="text-right px-4 py-2.5 font-medium">Leverage</th>
                  <th className="text-right px-4 py-2.5 font-medium">Margin%</th>
                  <th className="text-right px-4 py-2.5 font-medium">Swap L</th>
                  <th className="text-right px-4 py-2.5 font-medium">Swap S</th>
                  <th className="text-right px-4 py-2.5 font-medium">Min Vol</th>
                  <th className="text-right px-4 py-2.5 font-medium">Max Vol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Commission</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tradability</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((inst) => (
                  <tr key={inst.symbol} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-white">{inst.symbol}</td>
                    <td className="px-4 py-2.5 text-white/60">
                      <span className="font-mono">{inst.spread_value}</span>
                      <span className="text-white/30 ml-1">{inst.spread_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/60">{inst.markup_value}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/60">
                      {inst.leverage_override ? `1:${inst.leverage_override}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/60">
                      {inst.margin_pct_override != null ? `${inst.margin_pct_override}%` : '-'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${inst.swap_long >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {inst.swap_long}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${inst.swap_short >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      {inst.swap_short}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.min_volume}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{inst.max_volume}</td>
                    <td className="px-4 py-2.5 text-white/50">
                      {inst.commission_type === 'none' ? '-' : `$${inst.commission_value}/${inst.commission_type.replace('_', ' ')}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        inst.tradability === 'full' ? 'bg-emerald-500/15 text-emerald-400' :
                        inst.tradability === 'close_only' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {inst.tradability}
                      </span>
                    </td>
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
