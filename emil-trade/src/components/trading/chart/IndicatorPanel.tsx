'use client';

import { useState, useMemo } from 'react';
import { X, Search, Settings2, TrendingUp, Activity, BarChart3, Volume2, Brain, Star } from 'lucide-react';

// ─── Indicator definitions ─────────────────────────────────────

export type IndicatorId =
  | 'sma9' | 'sma21' | 'sma50' | 'sma200'
  | 'ema9' | 'ema21' | 'ema50'
  | 'rsi14'
  | 'macd'
  | 'bbands'
  | 'atr14'
  | 'stoch'
  | 'vwap'
  // Extended indicators
  | 'aroon'
  | 'adx'
  | 'bullsbears'
  | 'donchian'
  | 'envelope'
  | 'fractals'
  | 'ichimoku'
  | 'momentum'
  | 'psar'
  | 'pivotpoints'
  // GIO custom (ported from the .mq5 sources)
  | 'gio_kalman'
  | 'gio_bluebird'
  | 'gio_equalizer'
  | 'gio_donchian_ribbon';

export type IndicatorCategory = 'Trend' | 'Momentum' | 'Volatility' | 'Volume' | 'Overlay' | 'GIO';

export interface IndicatorConfig {
  id: IndicatorId;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  overlay: boolean;
  defaultParams: Record<string, number>;
  description: string;
}

export const INDICATOR_DEFS: IndicatorConfig[] = [
  // Trend
  { id: 'sma9',   name: 'SMA (9)',            shortName: 'SMA 9',   category: 'Trend', overlay: true,  defaultParams: { period: 9 },   description: 'Simple Moving Average (9 period)' },
  { id: 'sma21',  name: 'SMA (21)',           shortName: 'SMA 21',  category: 'Trend', overlay: true,  defaultParams: { period: 21 },  description: 'Simple Moving Average (21 period)' },
  { id: 'sma50',  name: 'SMA (50)',           shortName: 'SMA 50',  category: 'Trend', overlay: true,  defaultParams: { period: 50 },  description: 'Simple Moving Average (50 period)' },
  { id: 'sma200', name: 'SMA (200)',          shortName: 'SMA 200', category: 'Trend', overlay: true,  defaultParams: { period: 200 }, description: 'Simple Moving Average (200 period)' },
  { id: 'ema9',   name: 'Exponential Moving Average (9)',  shortName: 'EMA 9',   category: 'Trend', overlay: true,  defaultParams: { period: 9 },   description: 'Exponential Moving Average (9 period)' },
  { id: 'ema21',  name: 'Exponential Moving Average (21)', shortName: 'EMA 21',  category: 'Trend', overlay: true,  defaultParams: { period: 21 },  description: 'Exponential Moving Average (21 period)' },
  { id: 'ema50',  name: 'Exponential Moving Average (50)', shortName: 'EMA 50',  category: 'Trend', overlay: true,  defaultParams: { period: 50 },  description: 'Exponential Moving Average (50 period)' },
  { id: 'vwap',   name: 'VWAP',              shortName: 'VWAP',    category: 'Trend', overlay: true,  defaultParams: {},               description: 'Volume Weighted Average Price' },
  { id: 'ichimoku', name: 'Ichimoku Cloud',   shortName: 'Ichimoku', category: 'Trend', overlay: true, defaultParams: { conversion: 9, base: 26, spanB: 52, displacement: 26 }, description: 'Ichimoku Kinko Hyo cloud system' },
  { id: 'psar',    name: 'Parabolic SAR',     shortName: 'PSAR',    category: 'Trend', overlay: true, defaultParams: { step: 0.02, max: 0.2 }, description: 'Parabolic Stop and Reverse' },
  { id: 'envelope', name: 'Envelope',         shortName: 'ENV',     category: 'Trend', overlay: true, defaultParams: { period: 20, percent: 2.5 }, description: 'Moving Average Envelope' },

  // Volatility
  { id: 'bbands', name: 'Bollinger Bands',    shortName: 'BB',      category: 'Volatility', overlay: true, defaultParams: { period: 20, stdDev: 2 }, description: 'Bollinger Bands (20, 2)' },
  { id: 'atr14',  name: 'ATR (14)',           shortName: 'ATR',     category: 'Volatility', overlay: false, defaultParams: { period: 14 }, description: 'Average True Range (14 period)' },
  { id: 'donchian', name: 'Donchian Channel', shortName: 'DC',      category: 'Volatility', overlay: true, defaultParams: { period: 20 }, description: 'Donchian Channel (20 period)' },

  // Momentum
  { id: 'rsi14',  name: 'RSI (14)',           shortName: 'RSI',     category: 'Momentum', overlay: false, defaultParams: { period: 14 }, description: 'Relative Strength Index (14 period)' },
  { id: 'macd',   name: 'MACD (12,26,9)',     shortName: 'MACD',    category: 'Momentum', overlay: false, defaultParams: { fast: 12, slow: 26, signal: 9 }, description: 'Moving Average Convergence Divergence' },
  { id: 'stoch',  name: 'Stochastic (14,3)',  shortName: 'Stoch',   category: 'Momentum', overlay: false, defaultParams: { kPeriod: 14, dPeriod: 3 },       description: 'Stochastic Oscillator' },
  { id: 'aroon',  name: 'Aroon',             shortName: 'Aroon',   category: 'Momentum', overlay: false, defaultParams: { period: 25 }, description: 'Aroon Up / Down oscillator' },
  { id: 'adx',    name: 'Average Directional Index', shortName: 'ADX', category: 'Momentum', overlay: false, defaultParams: { period: 14 }, description: 'Trend strength indicator with +DI/-DI' },
  { id: 'momentum', name: 'Momentum',        shortName: 'MOM',     category: 'Momentum', overlay: false, defaultParams: { period: 10 }, description: 'Price momentum (close - close[n])' },
  { id: 'bullsbears', name: 'Bulls Bears Power', shortName: 'BBP', category: 'Momentum', overlay: false, defaultParams: { period: 13 }, description: 'Bull and Bear power relative to EMA' },

  // Overlay
  { id: 'fractals', name: 'Fractals',        shortName: 'Fractals', category: 'Overlay', overlay: true, defaultParams: {}, description: 'Williams Fractals — swing highs and lows' },
  { id: 'pivotpoints', name: 'Pivot Points',  shortName: 'PP',      category: 'Overlay', overlay: true, defaultParams: {}, description: 'Standard pivot points with R1-R3, S1-S3' },

  // GIO custom — ported from the .mq5 sources, computed & plotted for real
  { id: 'gio_kalman',   name: 'GIO Kalman Trend',        shortName: 'GKALT',  category: 'GIO', overlay: true, defaultParams: { shortLen: 50, longLen: 150 }, description: 'Dual Kalman-filtered trend lines (short + long) with crossover signals' },
  { id: 'gio_bluebird', name: 'GIO BLUEBIRD',            shortName: 'BLUE',   category: 'GIO', overlay: true, defaultParams: { shortLen: 30, longLen: 100 }, description: 'Dual Kalman trend zones (BLUEBIRD) — fast/slow Kalman filter' },
  { id: 'gio_equalizer', name: 'GIO The Equalizer',      shortName: 'EQLZ',   category: 'GIO', overlay: true, defaultParams: { period: 10, atrPeriod: 14, bandMult: 1.5 }, description: 'KAMA baseline with ATR regime bands (regime-aware trend)' },
  { id: 'gio_donchian_ribbon', name: 'GIO Donchian Trend Ribbon', shortName: 'DTR', category: 'GIO', overlay: true, defaultParams: { period: 20 }, description: 'Donchian channel ribbon with trend direction' },
];

export function getIndicatorDef(id: IndicatorId): IndicatorConfig | undefined {
  return INDICATOR_DEFS.find((d) => d.id === id);
}

// ─── Category icons ────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Favorites: <Star size={14} fill="#FFD700" style={{ color: '#FFD700' }} />,
  Trend: <TrendingUp size={14} />,
  Momentum: <Activity size={14} />,
  Volatility: <BarChart3 size={14} />,
  Volume: <Volume2 size={14} />,
  Overlay: <Brain size={14} />,
  GIO: <Star size={14} />,
};

// ─── Component ─────────────────────────────────────────────────

interface IndicatorPanelProps {
  activeIndicators: Set<IndicatorId>;
  indicatorParams: Record<IndicatorId, Record<string, number>>;
  onToggle: (id: IndicatorId) => void;
  onUpdateParams: (id: IndicatorId, params: Record<string, number>) => void;
  onClose: () => void;
}

const FAV_KEY = 'raptor_fav_indicators';

function loadFavs(): Set<IndicatorId> {
  try {
    const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return new Set(Array.isArray(a) ? a : []);
  } catch { return new Set(); }
}

export default function IndicatorPanel({
  activeIndicators,
  indicatorParams,
  onToggle,
  onUpdateParams,
  onClose,
}: IndicatorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<IndicatorId | null>(null);
  // Indicator favorites (§4/§11) — starred indicators float to a Favorites
  // section on top; persisted in localStorage.
  const [favs, setFavs] = useState<Set<IndicatorId>>(() => (typeof window !== 'undefined' ? loadFavs() : new Set()));
  const toggleFav = (id: IndicatorId) => {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const filteredIndicators = useMemo(() => {
    if (!searchQuery.trim()) return INDICATOR_DEFS;
    const q = searchQuery.toLowerCase();
    return INDICATOR_DEFS.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.shortName.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, IndicatorConfig[]>();
    // Favorites float to a section on top (still shown in their category too).
    const favList = filteredIndicators.filter((i) => favs.has(i.id));
    if (favList.length > 0) map.set('Favorites', favList);
    for (const ind of filteredIndicators) {
      const arr = map.get(ind.category) || [];
      arr.push(ind);
      map.set(ind.category, arr);
    }
    return map;
  }, [filteredIndicators, favs]);

  return (
    <div
      className="absolute top-10 left-12 z-50 flex flex-col"
      style={{
        width: 340,
        maxHeight: 500,
        backgroundColor: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Indicators
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/5 transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search indicators..."
            className="bg-transparent text-[12px] outline-none flex-1"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
        </div>
      </div>

      {/* Active indicator count */}
      {activeIndicators.size > 0 && (
        <div className="px-3 py-1.5 text-[10px] shrink-0" style={{ color: '#0091D5', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {activeIndicators.size} indicator{activeIndicators.size !== 1 ? 's' : ''} active
        </div>
      )}

      {/* Indicator list */}
      <div className="flex-1 overflow-y-auto px-1 py-1" style={{ scrollbarWidth: 'thin' }}>
        {Array.from(grouped.entries()).map(([category, indicators]) => (
          <div key={category} className="mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {CATEGORY_ICONS[category]}
              {category}
            </div>

            {indicators.map((ind) => {
              const isActive = activeIndicators.has(ind.id);
              const isEditing = editingId === ind.id;
              const params = indicatorParams[ind.id] || ind.defaultParams;

              return (
                <div key={ind.id}>
                  <div
                    className="flex items-center justify-between px-2 py-1.5 mx-1 rounded transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isActive ? 'rgba(41,171,226,0.08)' : 'transparent',
                    }}
                    onClick={() => onToggle(ind.id)}
                    onMouseOver={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="relative rounded-full transition-colors"
                        style={{
                          width: 28,
                          height: 14,
                          backgroundColor: isActive ? '#0091D5' : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <div
                          className="absolute top-[2px] rounded-full transition-all"
                          style={{
                            width: 10,
                            height: 10,
                            backgroundColor: '#fff',
                            left: isActive ? 16 : 2,
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-[11px]" style={{ color: isActive ? '#0091D5' : 'rgba(255,255,255,0.7)' }}>
                          {ind.name}
                        </div>
                        <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {ind.overlay ? 'Overlay' : 'Separate scale'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFav(ind.id); }}
                        title={favs.has(ind.id) ? 'Remove from favorites' : 'Add to favorites'}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: favs.has(ind.id) ? '#FFD700' : 'rgba(255,255,255,0.25)' }}
                      >
                        <Star size={12} fill={favs.has(ind.id) ? '#FFD700' : 'none'} />
                      </button>
                      {Object.keys(ind.defaultParams).length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(isEditing ? null : ind.id);
                          }}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          style={{ color: isEditing ? '#0091D5' : 'rgba(255,255,255,0.3)' }}
                        >
                          <Settings2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mx-3 mb-1 p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      {Object.entries(params).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between mb-1">
                          <span className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {key}
                          </span>
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const num = parseFloat(e.target.value);
                              if (!isNaN(num) && num > 0) {
                                onUpdateParams(ind.id, { ...params, [key]: num });
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 px-1.5 py-0.5 text-[10px] text-right rounded outline-none"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: 'rgba(255,255,255,0.8)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {filteredIndicators.length === 0 && (
          <div className="text-center py-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No indicators match your search
          </div>
        )}
      </div>
    </div>
  );
}
