'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import {
  Trophy, Target, DollarSign, Shield, Clock, TrendingUp,
  CheckCircle, XCircle, Play, ChevronRight,
} from 'lucide-react';

const challenges = [
  {
    id: 'rapid-10k',
    name: 'Rapid 10K',
    accountSize: 10000,
    targetProfit: 8,
    maxDrawdown: 10,
    dailyDrawdown: 5,
    minTradingDays: 5,
    maxDuration: 30,
    leverage: 100,
    profitSplit: 80,
    price: 99,
    color: '#0091D5',
  },
  {
    id: 'standard-25k',
    name: 'Standard 25K',
    accountSize: 25000,
    targetProfit: 8,
    maxDrawdown: 10,
    dailyDrawdown: 5,
    minTradingDays: 5,
    maxDuration: 30,
    leverage: 100,
    profitSplit: 80,
    price: 199,
    color: '#00C853',
  },
  {
    id: 'pro-50k',
    name: 'Pro 50K',
    accountSize: 50000,
    targetProfit: 8,
    maxDrawdown: 8,
    dailyDrawdown: 4,
    minTradingDays: 10,
    maxDuration: 45,
    leverage: 50,
    profitSplit: 85,
    price: 349,
    color: '#F0A500',
  },
  {
    id: 'elite-100k',
    name: 'Elite 100K',
    accountSize: 100000,
    targetProfit: 10,
    maxDrawdown: 8,
    dailyDrawdown: 4,
    minTradingDays: 10,
    maxDuration: 60,
    leverage: 50,
    profitSplit: 90,
    price: 549,
    color: '#FF4560',
  },
];

const rules = [
  { icon: <Target size={16} />, label: 'Hit profit target within the timeframe' },
  { icon: <Shield size={16} />, label: 'Do not exceed daily or max drawdown limits' },
  { icon: <Clock size={16} />, label: 'Trade the minimum required number of days' },
  { icon: <XCircle size={16} />, label: 'No overnight holding during news events (optional)' },
  { icon: <CheckCircle size={16} />, label: 'Consistent strategy with risk management' },
];

export default function PropTradingPage() {
  const [selectedChallenge, setSelectedChallenge] = useState(challenges[1]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={24} style={{ color: '#F0A500' }} />
              <h1 className="text-2xl font-bold">Prop Trading Challenges</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Prove your skills and get funded. Trade with our capital and keep up to 90% of the profits.
            </p>
          </div>

          {/* Challenge Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {challenges.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChallenge(ch)}
                className="text-left rounded-xl border p-5 transition-all"
                style={{
                  backgroundColor: selectedChallenge.id === ch.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  borderColor: selectedChallenge.id === ch.id ? ch.color + '60' : 'var(--border)',
                  boxShadow: selectedChallenge.id === ch.id ? `0 0 20px ${ch.color}20` : 'none',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: ch.color }}>
                  {ch.name}
                </div>
                <div className="text-2xl font-bold mb-1 font-mono">
                  ${ch.accountSize.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {ch.profitSplit}% profit split
                </div>
                <div className="mt-3 text-lg font-bold" style={{ color: ch.color }}>
                  ${ch.price}
                </div>
              </button>
            ))}
          </div>

          {/* Selected Challenge Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Challenge Stats */}
            <div className="lg:col-span-2 rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={16} style={{ color: selectedChallenge.color }} />
                {selectedChallenge.name} — Challenge Parameters
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Account Size', value: `$${selectedChallenge.accountSize.toLocaleString()}`, icon: <DollarSign size={14} /> },
                  { label: 'Profit Target', value: `${selectedChallenge.targetProfit}%`, icon: <Target size={14} /> },
                  { label: 'Max Drawdown', value: `${selectedChallenge.maxDrawdown}%`, icon: <Shield size={14} /> },
                  { label: 'Daily Drawdown', value: `${selectedChallenge.dailyDrawdown}%`, icon: <Shield size={14} /> },
                  { label: 'Min Trading Days', value: `${selectedChallenge.minTradingDays}`, icon: <Clock size={14} /> },
                  { label: 'Max Duration', value: `${selectedChallenge.maxDuration} days`, icon: <Clock size={14} /> },
                  { label: 'Leverage', value: `1:${selectedChallenge.leverage}`, icon: <TrendingUp size={14} /> },
                  { label: 'Profit Split', value: `${selectedChallenge.profitSplit}%`, icon: <DollarSign size={14} /> },
                  { label: 'Entry Fee', value: `$${selectedChallenge.price}`, icon: <DollarSign size={14} /> },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div className="flex items-center gap-1.5 text-[10px] opacity-50 mb-1">{stat.icon}{stat.label}</div>
                    <div className="text-sm font-bold font-mono">{stat.value}</div>
                  </div>
                ))}
              </div>

              <button
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all hover:brightness-110"
                style={{ backgroundColor: selectedChallenge.color, color: '#000' }}
              >
                <Play size={16} />
                Start {selectedChallenge.name} Challenge — ${selectedChallenge.price}
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Rules */}
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold mb-4">Challenge Rules</h2>
              <div className="space-y-3">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="opacity-60 mt-0.5">{rule.icon}</span>
                    {rule.label}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-3 rounded-lg text-[11px]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="font-bold mb-1">Scaling Plan</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  After 3 consecutive profitable months, your account size doubles automatically up to $400K.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
