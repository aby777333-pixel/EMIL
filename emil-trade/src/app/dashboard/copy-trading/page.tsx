'use client';

import { useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import StrategyCard from '@/components/portal/copy/StrategyCard';
import { getSeedStrategies } from '@/lib/copy/seed';
import type { RiskScore } from '@/lib/copy/types';

type SortKey = 'roi_30d' | 'roi_all' | 'win_rate' | 'aum';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'roi_30d',  label: '30d ROI' },
  { id: 'roi_all',  label: 'All-time ROI' },
  { id: 'win_rate', label: 'Win rate' },
  { id: 'aum',      label: 'AUM' },
];

const RISK_FILTERS: { id: 'any' | RiskScore; label: string }[] = [
  { id: 'any',         label: 'Any risk' },
  { id: 'low',         label: 'Low' },
  { id: 'medium',      label: 'Medium' },
  { id: 'high',        label: 'High' },
  { id: 'aggressive',  label: 'Aggressive' },
];

export default function CopyTradingLeaderboard() {
  const allStrategies = useMemo(() => getSeedStrategies(), []);
  const [sort, setSort] = useState<SortKey>('roi_30d');
  const [risk, setRisk] = useState<'any' | RiskScore>('any');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStrategies
      .filter((s) => (risk === 'any' ? true : s.risk === risk))
      .filter((s) => (q ? `${s.name} ${s.tagline}`.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        switch (sort) {
          case 'roi_30d':  return b.roi_30d - a.roi_30d;
          case 'roi_all':  return b.roi_all - a.roi_all;
          case 'win_rate': return b.win_rate - a.win_rate;
          case 'aum':      return Number(b.aum_usd) - Number(a.aum_usd);
        }
      });
  }, [allStrategies, sort, risk, query]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Copy trading
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Mirror approved strategy providers proportionally or with a fixed lot. You stay in
          control — pause or stop any copy at any time.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div
          className="flex items-center gap-2 px-3 rounded-md flex-1 min-w-[200px]"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-soft)',
            height: 38,
          }}
        >
          <Search size={13} style={{ color: 'var(--g-text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search strategies"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--g-text-primary)' }}
          />
        </div>
        <Picker label="Sort" icon={<ArrowUpDown size={13} />} value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT_OPTIONS} />
        <Picker label="Risk" value={risk} onChange={(v) => setRisk(v as RiskScore | 'any')} options={RISK_FILTERS} />
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl px-6 py-12 text-center"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No strategies match these filters.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((s) => <StrategyCard key={s.id} strategy={s} />)}
        </div>
      )}

      <p className="mt-6 text-[11px] text-center" style={{ color: 'var(--g-text-muted)' }}>
        Strategy data shown is from approved providers. Past performance is not indicative of
        future returns. Copy trading carries the same risks as direct trading.
      </p>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 rounded-md"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-soft)',
        height: 38,
      }}
    >
      {icon && <span style={{ color: 'var(--g-text-muted)' }}>{icon}</span>}
      <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] outline-none"
        style={{ color: 'var(--g-text-primary)' }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} style={{ background: '#16161A' }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
