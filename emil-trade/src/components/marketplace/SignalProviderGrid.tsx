'use client';

import { motion } from 'framer-motion';
import {
  Shield, Users, TrendingUp, TrendingDown, Star,
  BarChart3, Copy, ChevronRight,
} from 'lucide-react';
import type { SignalProviderListing } from '@/types/marketplace';

function MiniEquityCurve({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-12" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#00b4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProviderCard({ provider, onFollow }: { provider: SignalProviderListing; onFollow: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00b4ff]/20 to-[#8b5cf6]/20 flex items-center justify-center text-sm font-bold text-white/60">
          {provider.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{provider.name}</span>
            {provider.isVerified && <Shield className="h-3.5 w-3.5 text-[#00dc82]" />}
            <span className="text-[9px] bg-white/5 text-white/20 px-1.5 py-0.5 rounded">#{provider.ranking}</span>
          </div>
          <p className="text-[10px] text-white/30">{provider.tradingStyle} · {provider.liveMonths}mo live</p>
        </div>
        <div className="flex">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1 h-4 rounded-sm mx-[1px] ${i <= provider.riskRating ? 'bg-[#f59e0b]' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>

      {/* Equity Curve */}
      <div className="mb-3 rounded-lg overflow-hidden bg-white/[0.01] border border-white/[0.03] p-1">
        <MiniEquityCurve data={provider.equityCurveData} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className={`text-sm font-mono font-bold ${provider.totalReturn >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
            {provider.totalReturn >= 0 ? '+' : ''}{provider.totalReturn.toFixed(1)}%
          </div>
          <div className="text-[8px] text-white/20">Total Return</div>
        </div>
        <div>
          <div className="text-sm font-mono font-bold text-[#ef4444]">{provider.maxDrawdown.toFixed(1)}%</div>
          <div className="text-[8px] text-white/20">Max DD</div>
        </div>
        <div>
          <div className="text-sm font-mono font-bold text-[#00b4ff]">{provider.sharpeRatio.toFixed(2)}</div>
          <div className="text-[8px] text-white/20">Sharpe</div>
        </div>
        <div>
          <div className="text-xs font-mono text-white/50">{provider.winRate.toFixed(0)}%</div>
          <div className="text-[8px] text-white/20">Win Rate</div>
        </div>
        <div>
          <div className="text-xs font-mono text-white/50">{provider.profitFactor.toFixed(2)}</div>
          <div className="text-[8px] text-white/20">PF</div>
        </div>
        <div>
          <div className="text-xs font-mono text-white/50">{provider.calmarRatio.toFixed(2)}</div>
          <div className="text-[8px] text-white/20">Calmar</div>
        </div>
      </div>

      {/* Monthly Returns Mini */}
      {provider.monthlyReturns.length > 0 && (
        <div className="flex gap-[2px] mb-3">
          {provider.monthlyReturns.slice(-12).map((mr, i) => (
            <div key={i} className="flex-1 h-5 rounded-sm"
              style={{ backgroundColor: mr.returnPct >= 0 ? `rgba(0,220,130,${Math.min(Math.abs(mr.returnPct)/10,0.6)})` : `rgba(239,68,68,${Math.min(Math.abs(mr.returnPct)/10,0.6)})` }}
              title={`${mr.month}: ${mr.returnPct >= 0 ? '+' : ''}${mr.returnPct.toFixed(1)}%`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 text-[10px] text-white/25">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{provider.followers}</span>
          <span>{provider.performanceFee > 0 ? `${provider.performanceFee}% fee` : 'Free'}</span>
        </div>
        <button onClick={() => onFollow(provider.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-xs font-medium transition-colors">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
    </motion.div>
  );
}

interface SignalProviderGridProps {
  providers: SignalProviderListing[];
  onFollow: (id: string) => void;
}

export function SignalProviderGrid({ providers, onFollow }: SignalProviderGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {providers.map(p => <ProviderCard key={p.id} provider={p} onFollow={onFollow} />)}
    </div>
  );
}
