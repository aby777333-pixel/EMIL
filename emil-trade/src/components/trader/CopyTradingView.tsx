'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Star, Users, Shield, TrendingUp, TrendingDown,
  Filter, Copy, Settings, Play, Pause, BarChart3,
} from 'lucide-react';
import type { CopyProvider, CopySubscription } from '@/types/trader';

function ProviderCard({ provider, onFollow }: { provider: CopyProvider; onFollow: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00b4ff]/30 to-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-white/70">
          {provider.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{provider.name}</span>
            {provider.isVerified && <Shield className="h-3.5 w-3.5 text-[#00dc82]" />}
          </div>
          <p className="text-[10px] text-white/30">{provider.tradingStyle} · {provider.liveMonths}mo live</p>
        </div>
        <div className="flex">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1.5 h-5 rounded-sm mx-[1px] ${i <= provider.riskRating ? 'bg-[#f59e0b]' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-white/40 line-clamp-2 mb-3">{provider.bio}</p>

      <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/[0.04] mb-3">
        <div>
          <div className={`text-sm font-mono font-bold ${provider.totalReturn >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
            {provider.totalReturn >= 0 ? '+' : ''}{provider.totalReturn.toFixed(1)}%
          </div>
          <div className="text-[9px] text-white/20">Total Return</div>
        </div>
        <div>
          <div className="text-sm font-mono font-bold text-[#ef4444]">{provider.maxDrawdown.toFixed(1)}%</div>
          <div className="text-[9px] text-white/20">Max DD</div>
        </div>
        <div>
          <div className="text-sm font-mono font-bold text-white/60">{provider.winRate.toFixed(0)}%</div>
          <div className="text-[9px] text-white/20">Win Rate</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-white/25">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{provider.followers}</span>
          <span>{provider.performanceFee > 0 ? `${provider.performanceFee}% perf fee` : 'Free'}</span>
        </div>
        <button
          onClick={() => onFollow(provider.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-xs font-medium transition-colors"
        >
          <Copy className="h-3 w-3" /> Follow
        </button>
      </div>
    </motion.div>
  );
}

function SubscriptionCard({ sub, onToggle }: { sub: CopySubscription; onToggle: (id: string) => void }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{sub.providerName}</div>
        <div className="text-[10px] text-white/30">{sub.allocationPct}% allocation · {sub.lotSizing} · {sub.copiedTrades} trades</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-mono font-bold ${sub.totalReturn >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
          {sub.totalReturn >= 0 ? '+' : ''}${sub.totalReturn.toFixed(2)}
        </div>
        <div className="text-[9px] text-white/20">Fees: ${sub.feesPaid.toFixed(2)}</div>
      </div>
      <button onClick={() => onToggle(sub.id)} className={`p-2 rounded-lg transition-colors ${sub.isActive ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-white/5 text-white/25'}`}>
        {sub.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface CopyTradingViewProps {
  providers: CopyProvider[];
  subscriptions: CopySubscription[];
  onFollow: (providerId: string) => void;
  onToggleSubscription: (subId: string) => void;
}

export function CopyTradingView({ providers, subscriptions, onFollow, onToggleSubscription }: CopyTradingViewProps) {
  const [tab, setTab] = useState<'discover' | 'following'>('discover');
  const [search, setSearch] = useState('');

  const filtered = providers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.strategy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['discover', 'following'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >{t} {t === 'following' && subscriptions.length > 0 ? `(${subscriptions.length})` : ''}</button>
          ))}
        </div>
        {tab === 'discover' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input type="text" placeholder="Search providers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/20 focus:border-[#00b4ff] focus:outline-none" />
          </div>
        )}
      </div>

      {tab === 'discover' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => <ProviderCard key={p.id} provider={p} onFollow={onFollow} />)}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-sm text-white/20">No providers match your criteria</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/20">You are not following any providers yet</div>
          ) : (
            subscriptions.map(sub => <SubscriptionCard key={sub.id} sub={sub} onToggle={onToggleSubscription} />)
          )}
        </div>
      )}
    </div>
  );
}
