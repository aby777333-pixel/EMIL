'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import ManagerCard from '@/components/portal/pamm/ManagerCard';
import { getSeedManagers } from '@/lib/pamm/seed';
import type { RiskScore } from '@/lib/copy/types';

type SortKey = 'roi_ytd' | 'roi_all' | 'aum' | 'sharpe';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'roi_ytd', label: 'ROI YTD' },
  { id: 'roi_all', label: 'ROI all-time' },
  { id: 'aum',     label: 'AUM' },
  { id: 'sharpe',  label: 'Sharpe' },
];

const RISK_FILTERS: { id: 'any' | RiskScore; label: string }[] = [
  { id: 'any',         label: 'Any risk' },
  { id: 'low',         label: 'Low' },
  { id: 'medium',      label: 'Medium' },
  { id: 'high',        label: 'High' },
  { id: 'aggressive',  label: 'Aggressive' },
];

export default function PammListPage() {
  const all = useMemo(() => getSeedManagers(), []);
  const [sort, setSort] = useState<SortKey>('roi_ytd');
  const [risk, setRisk] = useState<'any' | RiskScore>('any');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((m) => (risk === 'any' ? true : m.risk === risk))
      .filter((m) => (q ? `${m.name} ${m.bio} ${m.manager_name}`.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        switch (sort) {
          case 'roi_ytd': return b.roi_ytd - a.roi_ytd;
          case 'roi_all': return b.roi_all - a.roi_all;
          case 'aum':     return Number(b.aum_usd) - Number(a.aum_usd);
          case 'sharpe':  return b.sharpe - a.sharpe;
        }
      });
  }, [all, sort, risk, query]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          PAMM / managed accounts
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Allocate to vetted managers running discretionary or systematic strategies. Monthly NAV
          strikes, lockup periods, and high-water marks apply per manager.
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
            placeholder="Search managers"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--g-text-primary)' }}
          />
        </div>
        <Picker label="Sort" value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT_OPTIONS} />
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
            No managers match these filters.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((m) => <ManagerCard key={m.id} manager={m} />)}
        </div>
      )}

      <p className="mt-6 text-[11px] text-center" style={{ color: 'var(--g-text-muted)' }}>
        All managers shown have been onboarded and approved by the partner ops team. Past
        performance does not guarantee future returns.
      </p>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
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
