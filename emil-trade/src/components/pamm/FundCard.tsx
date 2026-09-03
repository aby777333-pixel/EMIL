'use client';

import { Users, TrendingUp } from 'lucide-react';
import type { PAMMFund } from './mockFunds';

interface FundCardProps {
  fund: PAMMFund;
  onInvest: (fund: PAMMFund) => void;
}

function getRiskStyle(level: PAMMFund['riskLevel']) {
  switch (level) {
    case 'Conservative':
      return { bg: 'rgba(0,200,83,0.15)', color: '#00C853' };
    case 'Moderate':
      return { bg: 'rgba(255,193,7,0.15)', color: '#FFC107' };
    case 'Aggressive':
      return { bg: 'rgba(255,82,82,0.15)', color: '#FF5252' };
  }
}

function MiniSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 120;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id="pammSparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0091D5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0091D5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill="url(#pammSparkGrad)"
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

function formatAUM(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function FundCard({ fund, onInvest }: FundCardProps) {
  const riskStyle = getRiskStyle(fund.riskLevel);

  return (
    <div
      className="rounded-lg border p-5 transition-all hover:border-[#0091D5]/30"
      style={{
        backgroundColor: '#111118',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: '#0091D5', color: '#000' }}
          >
            {fund.managerAvatar}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{fund.name}</h3>
            <p className="text-[11px] text-white/40">Managed by {fund.manager}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: riskStyle.bg, color: riskStyle.color }}
        >
          {fund.riskLevel}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCell
          label="YTD Return"
          value={`${fund.ytdReturn >= 0 ? '+' : ''}${fund.ytdReturn}%`}
          color={fund.ytdReturn >= 0 ? '#00C853' : '#FF5252'}
        />
        <StatCell
          label="Max Drawdown"
          value={`${fund.maxDrawdown}%`}
          color="#FF5252"
        />
        <StatCell label="Sharpe" value={fund.sharpe.toFixed(2)} />
        <StatCell label="NAV/Share" value={`$${fund.navPerShare.toFixed(3)}`} />
        <StatCell label="Total AUM" value={formatAUM(fund.totalAUM)} />
        <StatCell label="Investors" value={fund.investors.toString()} />
      </div>

      {/* Equity Curve */}
      <div className="mb-4 flex justify-center">
        <MiniSparkline data={fund.equityCurve} />
      </div>

      {/* Fee Info */}
      <div
        className="grid grid-cols-3 gap-2 mb-4 text-center text-[10px] py-2 rounded"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        <div>
          <div className="text-white/30">Perf. Fee</div>
          <div className="text-white/70 font-medium">{fund.performanceFee}%</div>
        </div>
        <div>
          <div className="text-white/30">Mgmt. Fee</div>
          <div className="text-white/70 font-medium">{fund.managementFee}%/yr</div>
        </div>
        <div>
          <div className="text-white/30">Lock-up</div>
          <div className="text-white/70 font-medium">{fund.lockupDays} days</div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="text-[11px] text-white/40">
          Min: <span className="text-white/60 font-medium">${fund.minInvestment.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <Users size={11} />
          <span>{fund.investors} investors</span>
        </div>
        <button
          onClick={() => onInvest(fund)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: '#0091D5', color: '#000' }}
        >
          <TrendingUp size={12} />
          Invest
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
