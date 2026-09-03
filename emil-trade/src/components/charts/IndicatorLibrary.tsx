'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Star, BarChart3, TrendingUp,
  Activity, Zap, Brain, Sparkles, CheckCircle2,
  ChevronDown, Layers, Eye,
} from 'lucide-react';
import { INDICATOR_REGISTRY, DRAWING_TOOLS, type IndicatorCategory } from '@/types/charts';

const CATEGORY_ICONS: Record<IndicatorCategory, React.ReactNode> = {
  trend: <TrendingUp className="h-3.5 w-3.5" />,
  oscillator: <Activity className="h-3.5 w-3.5" />,
  volatility: <BarChart3 className="h-3.5 w-3.5" />,
  volume: <Layers className="h-3.5 w-3.5" />,
  channel: <BarChart3 className="h-3.5 w-3.5" />,
  market_structure: <Layers className="h-3.5 w-3.5" />,
  statistical: <Sparkles className="h-3.5 w-3.5" />,
  gio_custom: <Star className="h-3.5 w-3.5" />,
  raptor_exclusive: <Zap className="h-3.5 w-3.5" />,
  nexus_ai: <Brain className="h-3.5 w-3.5" />,
};

interface IndicatorLibraryProps {
  onAddIndicator: (shortName: string) => void;
  activeIndicators: string[];
}

export function IndicatorLibrary({ onAddIndicator, activeIndicators }: IndicatorLibraryProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<IndicatorCategory | 'all'>('all');
  const [tab, setTab] = useState<'indicators' | 'drawings'>('indicators');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const totalIndicators = INDICATOR_REGISTRY.reduce((s, c) => s + c.indicators.length, 0);
  const totalDrawings = DRAWING_TOOLS.reduce((s, c) => s + c.tools.length, 0);

  const filteredRegistry = INDICATOR_REGISTRY
    .filter(cat => filterCategory === 'all' || cat.category === filterCategory)
    .map(cat => ({
      ...cat,
      indicators: cat.indicators.filter(ind =>
        !search || ind.name.toLowerCase().includes(search.toLowerCase()) || ind.shortName.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(cat => cat.indicators.length > 0);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center gap-4 text-[10px] text-white/25">
        <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{totalIndicators} indicators</span>
        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{totalDrawings} drawing tools</span>
        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-[#f5c518]" />15 GIO custom</span>
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-[#ff6b35]" />8 RAPTOR exclusive</span>
        <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-[#8b5cf6]" />5 NEXUS AI</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          <button onClick={() => setTab('indicators')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'indicators' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            Indicators ({totalIndicators})
          </button>
          <button onClick={() => setTab('drawings')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'drawings' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            Drawing Tools ({totalDrawings})
          </button>
        </div>

        {tab === 'indicators' && (
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
            <input type="text" placeholder="Search indicators..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none" />
          </div>
        )}
      </div>

      {/* Category Filter */}
      {tab === 'indicators' && (
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {[{ key: 'all' as const, label: 'All', color: '#6b7280' }, ...INDICATOR_REGISTRY.map(c => ({ key: c.category, label: c.label, color: c.color }))].map(cat => (
            <button key={cat.key} onClick={() => setFilterCategory(cat.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap transition-colors ${
                filterCategory === cat.key ? 'text-white' : 'text-white/30 hover:text-white/50'
              }`}
              style={filterCategory === cat.key ? { backgroundColor: `${cat.color}15`, color: cat.color } : {}}>
              {cat.key !== 'all' && CATEGORY_ICONS[cat.key as IndicatorCategory]}
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Indicators */}
      {tab === 'indicators' && (
        <div className="space-y-3">
          {filteredRegistry.map(cat => (
            <div key={cat.category} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <button onClick={() => setExpandedCat(expandedCat === cat.category ? null : cat.category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <div style={{ color: cat.color }}>{CATEGORY_ICONS[cat.category]}</div>
                  <span className="text-xs font-semibold text-white">{cat.label}</span>
                  <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full">{cat.indicators.length}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-white/20 transition-transform ${expandedCat === cat.category ? 'rotate-180' : ''}`} />
              </button>

              {(expandedCat === cat.category || search) && (
                <div className="border-t border-white/[0.04] divide-y divide-white/[0.02]">
                  {cat.indicators.map(ind => {
                    const isActive = activeIndicators.includes(ind.shortName);
                    return (
                      <div key={ind.shortName} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] font-mono w-14 shrink-0" style={{ color: cat.color }}>{ind.shortName}</span>
                        <span className="text-xs text-white/50 flex-1">{ind.name}</span>
                        {ind.isExclusive && (
                          <span className="text-[7px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                            {cat.category === 'nexus_ai' ? 'AI' : cat.category === 'gio_custom' ? 'GIO' : 'RAPTOR'}
                          </span>
                        )}
                        <button onClick={() => onAddIndicator(ind.shortName)}
                          className={`p-1 rounded transition-colors ${
                            isActive ? 'text-[#00dc82]' : 'text-white/15 hover:text-white/40'
                          }`}>
                          {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drawing Tools */}
      {tab === 'drawings' && (
        <div className="grid grid-cols-2 gap-3">
          {DRAWING_TOOLS.map(cat => (
            <div key={cat.category} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-white mb-3">{cat.label}</h4>
              <div className="space-y-1">
                {cat.tools.map(tool => (
                  <div key={tool.name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <CheckCircle2 className="h-3 w-3 text-[#00dc82]" />
                    <span className="text-[11px] text-white/50">{tool.name}</span>
                    <span className="text-[8px] text-white/15 ml-auto">{tool.points > 0 ? `${tool.points}pt` : 'free'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
