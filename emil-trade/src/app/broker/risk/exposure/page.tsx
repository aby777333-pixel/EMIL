'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Activity,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type ExposureStatus = 'CRITICAL' | 'WARNING' | 'WATCH' | 'OK';

interface ExposureRow {
  symbol: string;
  group: string;
  netLots: number;
  longLots: number;
  shortLots: number;
  longUsd: number;
  shortUsd: number;
  netUsd: number;
  threshold: number;
  usedPct: number;
  status: ExposureStatus;
}

interface RiskAccount {
  account: string;
  client: string;
  symbol: string;
  position: string;
  pnl: number;
  marginUsed: number;
  marginLevel: number;
  status: string;
}

interface MarginPressureRow {
  account: string;
  marginLevel: number;
  status: 'OK' | 'WATCH' | 'DANGER';
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */

const EXPOSURE_DATA: ExposureRow[] = [
  { symbol: 'EURUSD', group: 'Forex', netLots: 13.1, longLots: 45.2, shortLots: 32.1, longUsd: 4900000, shortUsd: 3480000, netUsd: 1420000, threshold: 5000000, usedPct: 92.4, status: 'CRITICAL' },
  { symbol: 'XAUUSD', group: 'Metals', netLots: -3.5, longLots: 8.5, shortLots: 12.0, longUsd: 19900000, shortUsd: 28100000, netUsd: -8200000, threshold: 20000000, usedPct: 82.0, status: 'WARNING' },
  { symbol: 'BTCUSD', group: 'Crypto', netLots: 1.6, longLots: 2.1, shortLots: 0.5, longUsd: 142000, shortUsd: 34000, netUsd: 108000, threshold: 500000, usedPct: 52.0, status: 'WATCH' },
  { symbol: 'GBPJPY', group: 'Forex', netLots: -3.4, longLots: 15.3, shortLots: 18.7, longUsd: 2966000, shortUsd: 3624000, netUsd: -658000, threshold: 5000000, usedPct: 68.0, status: 'WATCH' },
  { symbol: 'USDJPY', group: 'Forex', netLots: 2.5, longLots: 22.0, shortLots: 19.5, longUsd: 3388000, shortUsd: 3003000, netUsd: 385000, threshold: 5000000, usedPct: 69.2, status: 'WATCH' },
  { symbol: 'GBPUSD', group: 'Forex', netLots: 2.3, longLots: 11.2, shortLots: 8.9, longUsd: 1422000, shortUsd: 1130000, netUsd: 292000, threshold: 2000000, usedPct: 50.3, status: 'OK' },
];

const RISK_ACCOUNTS: RiskAccount[] = [
  { account: 'ACC-10078', client: 'Toxic Trader', symbol: 'XAUUSD', position: '+4.2L', pnl: 4280, marginUsed: 19800, marginLevel: 124, status: 'Near MC' },
  { account: 'ACC-10042', client: 'John Adeyemi', symbol: 'EURUSD', position: '-8.0L', pnl: -1200, marginUsed: 8640, marginLevel: 287, status: 'OK' },
];

const MARGIN_PRESSURE: MarginPressureRow[] = [
  { account: 'ACC-10078', marginLevel: 124, status: 'WATCH' },
  { account: 'ACC-10315', marginLevel: 108, status: 'DANGER' },
  { account: 'ACC-10200', marginLevel: 342, status: 'OK' },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function fmtUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtUsdK(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

const STATUS_CONFIG: Record<ExposureStatus, { icon: string; color: string; bg: string; border: string }> = {
  CRITICAL: { icon: '\uD83D\uDD34', color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/40' },
  WARNING:  { icon: '\uD83D\uDFE0', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  WATCH:    { icon: '\uD83D\uDFE1', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30' },
  OK:       { icon: '\u2705', color: 'text-profit', bg: 'bg-profit/10', border: 'border-profit/30' },
};

function usedPctBarColor(pct: number): string {
  if (pct >= 90) return 'bg-loss';
  if (pct >= 75) return 'bg-orange-500';
  if (pct >= 50) return 'bg-gold';
  return 'bg-profit';
}

function marginStatusColor(status: string): string {
  if (status === 'DANGER') return 'text-loss';
  if (status === 'WATCH') return 'text-gold';
  return 'text-profit';
}

function marginBarColor(status: string): string {
  if (status === 'DANGER') return 'bg-loss';
  if (status === 'WATCH') return 'bg-gold';
  return 'bg-profit';
}

/* ------------------------------------------------------------------ */
/*  PAGE COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function ExposurePage() {
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [bookFilter, setBookFilter] = useState('ALL');

  const groups = ['ALL', ...Array.from(new Set(EXPOSURE_DATA.map((r) => r.group)))];

  const filtered = EXPOSURE_DATA.filter((r) => {
    if (groupFilter !== 'ALL' && r.group !== groupFilter) return false;
    return true;
  });

  const totalGross = EXPOSURE_DATA.reduce((s, r) => s + r.longUsd + r.shortUsd, 0);
  const totalNet = EXPOSURE_DATA.reduce((s, r) => s + r.netUsd, 0);
  const bBookNet = 542000;
  const marginCallCount = MARGIN_PRESSURE.filter((r) => r.status === 'DANGER').length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-[10px] text-secondary font-mono uppercase tracking-wider mb-2">
          <Link href="/broker/risk" className="hover:text-accent transition-colors">Risk</Link>
          <span className="text-muted">/</span>
          <span className="text-foreground">Exposure</span>
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          EXPOSURE & MARGIN CONTROL
        </h1>
        <p className="text-xs text-secondary mt-0.5">
          Catch the Shift Before It Breaks the Book
        </p>
      </div>

      {/* ── Section 1: KPI Bar ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Gross */}
        <div className="rounded-lg border border-border bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-[10px] text-secondary uppercase tracking-wider">Total Gross Exposure</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{fmtUsd(totalGross)}</p>
        </div>

        {/* Total Net */}
        <div className="rounded-lg border border-border bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-accent" />
            <span className="text-[10px] text-secondary uppercase tracking-wider">Total Net Exposure</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${totalNet >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalNet >= 0 ? '+' : ''}{fmtUsdK(totalNet)}
          </p>
        </div>

        {/* B-Book Net */}
        <div className="rounded-lg border border-border bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-teal" />
            <span className="text-[10px] text-secondary uppercase tracking-wider">B-Book Net</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${bBookNet >= 0 ? 'text-profit' : 'text-loss'}`}>
            +{fmtUsdK(bBookNet)}
          </p>
        </div>

        {/* Margin Call Accounts */}
        <div className={`rounded-lg border p-4 ${marginCallCount > 0 ? 'border-loss/50 bg-loss/5 border-pulse-red' : 'border-border bg-[var(--bg-surface)]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`h-4 w-4 ${marginCallCount > 0 ? 'text-loss' : 'text-secondary'}`} />
            <span className="text-[10px] text-secondary uppercase tracking-wider">Accounts at Margin Call</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${marginCallCount > 0 ? 'text-loss blink-danger' : 'text-foreground'}`}>
            {marginCallCount}
          </p>
        </div>
      </div>

      {/* ── Section 2: Full Exposure Table ─────────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-secondary uppercase tracking-wider">Group:</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-[var(--bg-elevated)] text-foreground text-xs rounded px-2 py-1 border border-border focus:outline-none focus:border-accent"
            >
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-secondary uppercase tracking-wider">Book:</label>
            <select
              value={bookFilter}
              onChange={(e) => setBookFilter(e.target.value)}
              className="bg-[var(--bg-elevated)] text-foreground text-xs rounded px-2 py-1 border border-border focus:outline-none focus:border-accent"
            >
              <option value="ALL">ALL</option>
              <option value="A-BOOK">A-BOOK</option>
              <option value="B-BOOK">B-BOOK</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1 text-xs text-secondary hover:text-accent transition-colors px-3 py-1.5 rounded border border-border hover:border-accent/40">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
            <button className="flex items-center gap-1 text-xs text-secondary hover:text-accent transition-colors px-3 py-1.5 rounded border border-border hover:border-accent/40">
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-left px-3 py-3">Group</th>
                <th className="text-right px-3 py-3">Net Lots</th>
                <th className="text-right px-3 py-3">Long</th>
                <th className="text-right px-3 py-3">Short</th>
                <th className="text-right px-3 py-3">Long USD</th>
                <th className="text-right px-3 py-3">Short USD</th>
                <th className="text-right px-3 py-3">Net USD</th>
                <th className="text-right px-3 py-3">Threshold</th>
                <th className="text-center px-3 py-3">Used%</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const cfg = STATUS_CONFIG[row.status];
                const isCritical = row.status === 'CRITICAL';
                return (
                  <tr
                    key={row.symbol}
                    className={`border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors ${isCritical ? 'border-pulse-red' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{row.symbol}</td>
                    <td className="px-3 py-3 text-secondary">{row.group}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${row.netLots >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {row.netLots >= 0 ? '+' : ''}{row.netLots.toFixed(1)}L
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">{row.longLots.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">{row.shortLots.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-profit">{fmtUsdK(row.longUsd)}</td>
                    <td className="px-3 py-3 text-right font-mono text-loss">{fmtUsdK(row.shortUsd)}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${row.netUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {row.netUsd >= 0 ? '+' : ''}{fmtUsdK(row.netUsd)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-secondary">{fmtUsdK(row.threshold)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usedPctBarColor(row.usedPct)} transition-all`}
                            style={{ width: `${Math.min(row.usedPct, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-foreground w-10 text-right">{row.usedPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.icon} {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Top Risk Accounts ───────────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Users className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Top Risk Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-3 py-3">Client</th>
                <th className="text-left px-3 py-3">Symbol</th>
                <th className="text-right px-3 py-3">Position</th>
                <th className="text-right px-3 py-3">PnL</th>
                <th className="text-right px-3 py-3">Margin Used</th>
                <th className="text-right px-3 py-3">Margin Level</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {RISK_ACCOUNTS.map((row) => {
                const isNearMC = row.status === 'Near MC';
                return (
                  <tr
                    key={row.account}
                    className={`border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors ${isNearMC ? 'bg-gold/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-accent">{row.account}</td>
                    <td className="px-3 py-3 text-foreground">{row.client}</td>
                    <td className="px-3 py-3 font-mono text-foreground">{row.symbol}</td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">{row.position}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${row.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {row.pnl >= 0 ? '+' : ''}{fmtUsd(row.pnl)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">${row.marginUsed.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${row.marginLevel < 150 ? 'text-gold' : 'text-profit'}`}>
                      {row.marginLevel}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isNearMC ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gold/10 text-gold border border-gold/30 blink-warning">
                          Near MC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-profit/10 text-profit border border-profit/30">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 4: Margin Pressure Monitor ─────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-loss" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Margin Pressure Monitor</h2>
        </div>

        <div className="space-y-3">
          {MARGIN_PRESSURE.map((row) => {
            const barWidth = Math.min((row.marginLevel / 500) * 100, 100);
            const statusIcon = row.status === 'DANGER' ? '\uD83D\uDD34' : row.status === 'WATCH' ? '\u26A0\uFE0F' : '\u2705';
            return (
              <div key={row.account} className="flex items-center gap-4">
                <span className="font-mono text-xs text-accent w-24 shrink-0">{row.account}</span>
                <span className="text-[10px] text-secondary w-28 shrink-0">
                  Margin Level{' '}
                  <span className={`font-bold font-mono ${marginStatusColor(row.status)}`}>
                    {row.marginLevel}%
                  </span>
                </span>
                <div className="flex-1 h-3 rounded bg-[var(--bg-primary)] overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${marginBarColor(row.status)}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-20 text-right ${marginStatusColor(row.status)} ${row.status === 'DANGER' ? 'blink-danger' : ''}`}>
                  {statusIcon} {row.status}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-loss" /> Danger &lt;120%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gold" /> Watch &lt;150%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-profit" /> OK &gt;150%
          </span>
        </div>
      </div>
    </div>
  );
}
