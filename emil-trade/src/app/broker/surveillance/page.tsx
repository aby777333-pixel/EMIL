'use client';

import { useState } from 'react';
import {
  ShieldAlert,
  Eye,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  Network,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                         */
/* ------------------------------------------------------------------ */

type Severity = 'critical' | 'warning' | 'watch' | 'cleared';

interface DetectedPattern {
  severity: Severity;
  account: string;
  pattern: string;
  details: string;
  winRate: string;
  avgHold: string;
}

const DETECTED_PATTERNS: DetectedPattern[] = [
  { severity: 'critical', account: 'ACC-10078', pattern: 'Latency Arbitrage', details: '12 scalps <30s, 92% win', winRate: '92%', avgHold: '18s' },
  { severity: 'warning', account: 'ACC-10200', pattern: 'News Front-Running', details: '3 trades within 5s of CPI', winRate: '78%', avgHold: '45s' },
  { severity: 'watch', account: 'ACC-10042', pattern: 'HFT Pattern', details: 'Volume 340% increase', winRate: '61%', avgHold: '120s' },
  { severity: 'watch', account: 'ACC-10115', pattern: 'Sharp Deals', details: 'Precise entry/exit timing', winRate: '71%', avgHold: '25s' },
  { severity: 'cleared', account: 'ACC-10090', pattern: 'Run-Upper (resolved)', details: 'Position pushing detected', winRate: '45%', avgHold: '300s' },
];

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  threshold: string;
  action: string;
  enabled: boolean;
}

const DETECTION_RULES: DetectionRule[] = [
  { id: 'r1', name: 'HFT / Scalping', description: 'Trades < 30s hold, > 10/day', threshold: '30s / 10 trades', action: 'Flag', enabled: true },
  { id: 'r2', name: 'Latency Arbitrage', description: 'Entry timing < 50ms from tick', threshold: '50ms', action: 'A-Book', enabled: true },
  { id: 'r3', name: 'News Trading', description: 'Trades within 60s of event', threshold: '60s', action: 'Widen Spreads', enabled: true },
  { id: 'r4', name: 'Coordinated Accounts', description: 'Same IP + correlated trades', threshold: '90% correlation', action: 'Block', enabled: false },
  { id: 'r5', name: 'Abnormal Profit', description: '> 80% win rate over 7 days', threshold: '80% / 7d', action: 'A-Book', enabled: true },
  { id: 'r6', name: 'Churning', description: '> 50 trades/day with tiny PnL', threshold: '50/day', action: 'Monitor', enabled: true },
];

interface AccountCluster {
  id: number;
  accounts: string[];
  subnet: string;
  correlation: string;
  timing: string;
  combinedVolume: string;
}

const CLUSTERS: AccountCluster[] = [
  { id: 1, accounts: ['ACC-10078', 'ACC-10082', 'ACC-10091'], subnet: '192.168.1.x', correlation: '94%', timing: 'Similar timing', combinedVolume: '45L' },
  { id: 2, accounts: ['ACC-10200', 'ACC-10205'], subnet: '10.0.2.x', correlation: '87%', timing: 'Offset by 2-5s', combinedVolume: '28L' },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

function severityIcon(s: Severity) {
  switch (s) {
    case 'critical': return <span className="text-red-500 blink-danger text-base">&#x1F534;</span>;
    case 'warning': return <span className="text-amber-400 blink-warning text-base">&#x1F7E0;</span>;
    case 'watch': return <span className="text-yellow-400 text-base">&#x1F7E1;</span>;
    case 'cleared': return <span className="text-emerald-400 text-base">&#x2705;</span>;
  }
}

function severityRowClass(s: Severity) {
  switch (s) {
    case 'critical': return 'border-l-2 border-l-red-500 bg-red-500/5';
    case 'warning': return 'border-l-2 border-l-amber-400 bg-amber-400/5';
    case 'watch': return 'border-l-2 border-l-yellow-400 bg-yellow-400/5';
    case 'cleared': return 'border-l-2 border-l-emerald-400/40 bg-emerald-400/5';
  }
}

function severityLabel(s: Severity) {
  const base = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded';
  switch (s) {
    case 'critical': return <span className={`${base} bg-red-500/20 text-red-400 blink-danger`}>CRITICAL</span>;
    case 'warning': return <span className={`${base} bg-amber-400/20 text-amber-300 blink-warning`}>WARNING</span>;
    case 'watch': return <span className={`${base} bg-yellow-400/20 text-yellow-300`}>WATCH</span>;
    case 'cleared': return <span className={`${base} bg-emerald-400/20 text-emerald-300`}>CLEARED</span>;
  }
}

function actionButtons(s: Severity) {
  const btn = 'px-2 py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer';
  switch (s) {
    case 'critical':
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button className={`${btn} border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20`}>A-Book</button>
          <button className={`${btn} border-red-500/40 text-red-300 hover:bg-red-500/20`}>Block</button>
          <button className={`${btn} border-amber-500/40 text-amber-300 hover:bg-amber-500/20`}>Escalate</button>
        </div>
      );
    case 'warning':
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button className={`${btn} border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20`}>A-Book</button>
          <button className={`${btn} border-amber-500/40 text-amber-300 hover:bg-amber-500/20`}>Flag</button>
          <button className={`${btn} border-white/20 text-white/50 hover:bg-white/10`}>Monitor</button>
        </div>
      );
    case 'watch':
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button className={`${btn} border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20`}>A-Book</button>
          <button className={`${btn} border-amber-500/40 text-amber-300 hover:bg-amber-500/20`}>Flag</button>
        </div>
      );
    case 'cleared':
      return (
        <div className="flex gap-1.5">
          <button className={`${btn} border-white/20 text-white/40 hover:bg-white/10`}>Review</button>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                              */
/* ------------------------------------------------------------------ */

export default function SurveillancePage() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState(DETECTION_RULES);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white p-6 space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Compliance &gt; Surveillance</p>
        <h1 className="text-xl font-bold tracking-tight">
          ANTI-FRAUD &amp; ABUSE DETECTION
        </h1>
        <p className="text-xs text-white/40 mt-0.5">Find Who&apos;s Taking From You</p>
      </div>

      {/* ── SECTION 1: Live Threat Dashboard ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Clients Monitored */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#0d1117] p-5">
          <div className="scan-line absolute inset-0 pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Active Clients Monitored</span>
          </div>
          <p className="text-3xl font-mono font-bold text-cyan-300 pulse-cyan">127</p>
        </div>

        {/* Flagged Accounts */}
        <div className="rounded-xl border border-red-500/30 bg-[#0d1117] p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Flagged Accounts</span>
          </div>
          <p className="text-3xl font-mono font-bold text-red-400 blink-danger">3</p>
        </div>

        {/* Toxic Flow Events (24h) */}
        <div className="rounded-xl border border-amber-500/20 bg-[#0d1117] p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Toxic Flow Events (24h)</span>
          </div>
          <p className="text-3xl font-mono font-bold text-amber-400">7</p>
        </div>

        {/* Est. Revenue Saved */}
        <div className="rounded-xl border border-emerald-500/20 bg-[#0d1117] p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Est. Revenue Saved</span>
          </div>
          <p className="text-3xl font-mono font-bold text-emerald-400">$12,400</p>
        </div>
      </div>

      {/* ── SECTION 2: Detected Patterns Table ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold">Detected Patterns</h2>
          <span className="ml-auto text-[10px] text-white/30 font-mono">LIVE</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Pattern</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right font-mono">Win Rate</th>
                <th className="px-4 py-3 text-right font-mono">Avg Hold</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {DETECTED_PATTERNS.map((p, i) => (
                <tr key={i} className={`${severityRowClass(p.severity)} border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {severityIcon(p.severity)}
                      {severityLabel(p.severity)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-cyan-300">{p.account}</td>
                  <td className="px-4 py-3 font-semibold text-white/90">{p.pattern}</td>
                  <td className="px-4 py-3 text-white/50">{p.details}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={parseFloat(p.winRate) >= 80 ? 'text-red-400 font-bold' : parseFloat(p.winRate) >= 60 ? 'text-amber-300' : 'text-white/50'}>
                      {p.winRate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white/50">{p.avgHold}</td>
                  <td className="px-4 py-3 text-right">{actionButtons(p.severity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 3: Detection Rules Configuration ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
        <button
          onClick={() => setRulesOpen(!rulesOpen)}
          className="w-full px-5 py-4 flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <Settings className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold">Detection Rules Configuration</h2>
          <span className="ml-auto text-[10px] text-white/30">{rules.filter((r) => r.enabled).length}/{rules.length} active</span>
          {rulesOpen ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
        </button>

        {rulesOpen && (
          <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
            {rules.map((rule) => (
              <div key={rule.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-cyan-500' : 'bg-white/10'} cursor-pointer`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                </button>

                {/* Rule Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/90">{rule.name}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{rule.description}</p>
                </div>

                {/* Threshold */}
                <div className="hidden sm:block">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Threshold</span>
                  <p className="text-xs font-mono text-white/60">{rule.threshold}</p>
                </div>

                {/* Action */}
                <div className="text-right">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Action</span>
                  <p className="text-xs font-mono">
                    <span className={
                      rule.action === 'Block' ? 'text-red-400' :
                      rule.action === 'A-Book' ? 'text-cyan-400' :
                      rule.action === 'Widen Spreads' ? 'text-amber-400' :
                      rule.action === 'Flag' ? 'text-yellow-300' :
                      'text-white/50'
                    }>
                      {rule.action}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 4: Account Clustering ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <Network className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Account Clustering</h2>
          <span className="text-[10px] text-purple-400 ml-2">{CLUSTERS.length} suspected groups</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {CLUSTERS.map((c) => (
            <div key={c.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white/80 mb-1">
                    <span className="text-purple-400">CLUSTER #{c.id}</span>
                    <span className="text-white/30 ml-2">({c.accounts.length} accounts, same subnet {c.subnet})</span>
                  </p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {c.accounts.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/40">
                    Correlation: <span className="text-white/70 font-mono">{c.correlation}</span>
                    <span className="mx-2">|</span>
                    {c.timing}
                    <span className="mx-2">|</span>
                    Combined volume: <span className="text-white/70 font-mono">{c.combinedVolume}</span>
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="px-2 py-1 rounded text-[10px] font-medium border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer">
                    Investigate
                  </button>
                  <button className="px-2 py-1 rounded text-[10px] font-medium border border-white/20 text-white/40 hover:bg-white/10 transition-colors cursor-pointer">
                    Merge
                  </button>
                  <button className="px-2 py-1 rounded text-[10px] font-medium border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer">
                    Block All
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
