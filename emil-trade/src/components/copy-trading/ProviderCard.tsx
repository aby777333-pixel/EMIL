'use client';

import { Users, Star, TrendingUp } from 'lucide-react';
import type { SignalProvider } from './mockProviders';

interface ProviderCardProps {
  provider: SignalProvider;
  onCopy: (provider: SignalProvider) => void;
}

function getRiskColor(score: number): string {
  if (score <= 3) return '#00C853';
  if (score <= 6) return '#FFC107';
  return '#FF5252';
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  return 'High';
}

function MiniSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 100;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0091D5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0091D5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill="url(#sparkGrad)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#0091D5"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function ProviderCard({ provider, onCopy }: ProviderCardProps) {
  const riskColor = getRiskColor(provider.riskScore);

  return (
    <div
      className="rounded-lg border p-4 transition-all hover:border-[#0091D5]/30"
      style={{
        backgroundColor: '#111118',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: '#0091D5', color: '#000' }}
          >
            {provider.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">{provider.name}</span>
              {provider.badge === 'verified' ? (
                <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  <Star size={9} /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  New
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5 max-w-[220px] truncate">
              {provider.description}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded"
          style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
        >
          Risk {provider.riskScore}/10
          <span className="text-[9px] opacity-70">({getRiskLabel(provider.riskScore)})</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCell
          label="Total Return"
          value={`${provider.totalReturn >= 0 ? '+' : ''}${provider.totalReturn}%`}
          color={provider.totalReturn >= 0 ? '#00C853' : '#FF5252'}
        />
        <StatCell label="Win Rate" value={`${provider.winRate}%`} />
        <StatCell
          label="Max Drawdown"
          value={`${provider.maxDrawdown}%`}
          color="#FF5252"
        />
        <StatCell label="Sharpe Ratio" value={provider.sharpeRatio.toFixed(2)} />
        <StatCell label="Avg Duration" value={provider.avgTradeDuration} />
        <StatCell label="Total Trades" value={provider.totalTrades.toLocaleString()} />
      </div>

      {/* Equity Curve */}
      <div className="mb-3 flex justify-center">
        <MiniSparkline data={provider.equityCurve} />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 text-[11px] text-white/50">
          <span>
            {provider.monthlyFee === 0 ? (
              <span className="text-emerald-400 font-medium">Free</span>
            ) : (
              <span>${provider.monthlyFee}/mo</span>
            )}
          </span>
          <span>{provider.performanceFee}% perf. fee</span>
          <span className="flex items-center gap-1">
            <Users size={11} /> {provider.followers}
          </span>
        </div>
        <button
          onClick={() => onCopy(provider)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: '#0091D5', color: '#000' }}
        >
          <TrendingUp size={12} />
          Copy
        </button>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded p-2 text-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
    >
      <div className="text-[10px] text-white/40 mb-0.5">{label}</div>
      <div
        className="text-xs font-mono font-semibold"
        style={{ color: color || '#fff' }}
      >
        {value}
      </div>
    </div>
  );
}
