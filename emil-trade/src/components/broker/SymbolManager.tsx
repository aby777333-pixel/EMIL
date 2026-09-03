'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ToggleLeft, ToggleRight, Edit3, ChevronDown,
  DollarSign, TrendingUp, Bitcoin, BarChart3, Gem, Globe,
} from 'lucide-react';
import type { SymbolConfig } from '@/types/broker';

const ASSET_ICONS: Record<string, React.ReactNode> = {
  forex: <DollarSign className="h-3.5 w-3.5" />,
  indices: <BarChart3 className="h-3.5 w-3.5" />,
  commodities: <Gem className="h-3.5 w-3.5" />,
  crypto: <Bitcoin className="h-3.5 w-3.5" />,
  stocks: <TrendingUp className="h-3.5 w-3.5" />,
  bonds: <Globe className="h-3.5 w-3.5" />,
  etf: <Globe className="h-3.5 w-3.5" />,
};

const ASSET_COLORS: Record<string, string> = {
  forex: '#00b4ff', indices: '#8b5cf6', commodities: '#f59e0b',
  crypto: '#ff6b35', stocks: '#00dc82', bonds: '#6b7280', etf: '#10b981',
};

interface SymbolManagerProps {
  symbols: SymbolConfig[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (symbol: SymbolConfig) => void;
}

export function SymbolManager({ symbols, onToggle, onEdit }: SymbolManagerProps) {
  const [search, setSearch] = useState('');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const assetClasses = ['all', ...new Set(symbols.map(s => s.assetClass))];

  const filtered = symbols.filter(s => {
    if (filterAsset !== 'all' && s.assetClass !== filterAsset) return false;
    if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) &&
        !s.displayName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const enabledCount = filtered.filter(s => s.isEnabled).length;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white mb-3">Symbol Manager</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/20 focus:border-[#00b4ff] focus:outline-none"
            />
          </div>
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            {assetClasses.map(ac => (
              <button
                key={ac}
                onClick={() => setFilterAsset(ac)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors capitalize ${
                  filterAsset === ac ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {ac}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-white/25 mt-2">{enabledCount}/{filtered.length} enabled</p>
      </div>

      {/* Symbol List */}
      <div className="divide-y divide-white/[0.03] max-h-[600px] overflow-y-auto">
        {filtered.map(sym => {
          const isExpanded = expandedId === sym.id;
          const color = ASSET_COLORS[sym.assetClass] ?? '#6b7280';
          return (
            <div key={sym.id}>
              <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
                <button onClick={() => onToggle(sym.id, !sym.isEnabled)}>
                  {sym.isEnabled
                    ? <ToggleRight className="h-4.5 w-4.5 text-[#00dc82]" />
                    : <ToggleLeft className="h-4.5 w-4.5 text-white/15" />
                  }
                </button>
                <div className="p-1 rounded" style={{ backgroundColor: `${color}15` }}>
                  <div style={{ color }}>{ASSET_ICONS[sym.assetClass]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold text-white">{sym.symbol}</span>
                  {sym.displayName && <span className="text-[10px] text-white/25 ml-2">{sym.displayName}</span>}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
                  <span>{sym.spreadType} · +{sym.spreadMarkup}p</span>
                  <span>1:{sym.maxLeverage}</span>
                  <span>{sym.minLot}-{sym.maxLot} lots</span>
                </div>
                <button
                  onClick={() => onEdit(sym)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sym.id)}
                  className="p-1 text-white/15 hover:text-white/40 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-white/[0.01] border-t border-white/[0.03]"
                  >
                    <div className="px-5 py-3 grid grid-cols-4 gap-4 text-[11px]">
                      <div>
                        <div className="text-white/25 mb-1">Spread</div>
                        <div className="text-white/60">{sym.spreadType} · Min: {sym.minSpread} · Max: {sym.maxSpread ?? '∞'}</div>
                        <div className="text-white/40">Markup: +{sym.spreadMarkup} points</div>
                      </div>
                      <div>
                        <div className="text-white/25 mb-1">Swap</div>
                        <div className="text-white/60">Long: {sym.swapLong} · Short: {sym.swapShort}</div>
                      </div>
                      <div>
                        <div className="text-white/25 mb-1">Contract</div>
                        <div className="text-white/60">Size: {sym.contractSize.toLocaleString()}</div>
                        <div className="text-white/40">Step: {sym.lotStep}</div>
                      </div>
                      <div>
                        <div className="text-white/25 mb-1">Sessions</div>
                        <div className="text-white/60">{sym.sessionOpen ?? 'Sun 22:00'} - {sym.sessionClose ?? 'Fri 22:00'}</div>
                        <div className="text-white/40">{sym.restrictedCountries.length} restricted</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
