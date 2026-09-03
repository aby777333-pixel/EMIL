'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, TrendingUp, TrendingDown, Activity, Brain, Zap,
  BarChart3, Target, AlertTriangle, Shield, Globe, Clock,
} from 'lucide-react';
import type { SentimentData, PatternDetection, RegimeAnalysis, PriceForcast } from '@/types/ai';

function SentimentGauge({ symbol, score, momentum }: { symbol: string; score: number; momentum: number }) {
  const normalized = (score + 100) / 200; // 0 to 1
  const color = score > 30 ? '#00dc82' : score > 0 ? '#00b4ff' : score > -30 ? '#f59e0b' : '#ef4444';
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-white">{symbol}</span>
        <span className={`text-[10px] flex items-center gap-0.5 ${momentum > 0 ? 'text-[#00dc82]' : momentum < 0 ? 'text-[#ef4444]' : 'text-white/20'}`}>
          {momentum > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : momentum < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : null}
          {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-gradient-to-r from-[#ef4444] via-[#f59e0b] via-50% to-[#00dc82] rounded-full relative">
        <motion.div
          initial={{ left: '50%' }}
          animate={{ left: `${normalized * 100}%` }}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white/80 shadow-lg"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[8px] text-white/15">
        <span>Bearish</span><span>Neutral</span><span>Bullish</span>
      </div>
      <div className="text-center mt-1">
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {score > 0 ? '+' : ''}{score}
        </span>
      </div>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: PatternDetection }) {
  const dirColor = pattern.direction === 'bullish' ? '#00dc82' : pattern.direction === 'bearish' ? '#ef4444' : '#6b7280';
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 flex items-center gap-3">
      <div className="p-1.5 rounded" style={{ backgroundColor: `${dirColor}15` }}>
        {pattern.direction === 'bullish' ? <TrendingUp className="h-3.5 w-3.5" style={{ color: dirColor }} /> :
         pattern.direction === 'bearish' ? <TrendingDown className="h-3.5 w-3.5" style={{ color: dirColor }} /> :
         <Activity className="h-3.5 w-3.5" style={{ color: dirColor }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white">{pattern.patternType}</div>
        <div className="text-[10px] text-white/30">{pattern.symbol} · {pattern.timeframe} · {pattern.category}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono" style={{ color: dirColor }}>{pattern.confidence.toFixed(0)}%</div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
          pattern.status === 'confirmed' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
          pattern.status === 'forming' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
          'bg-white/5 text-white/25'
        }`}>{pattern.status}</span>
      </div>
    </div>
  );
}

function ForecastCard({ forecast }: { forecast: PriceForcast }) {
  const dirColor = forecast.direction === 'bullish' ? '#00dc82' : forecast.direction === 'bearish' ? '#ef4444' : '#6b7280';
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white">{forecast.symbol}</span>
          <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{forecast.horizon}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: dirColor }}>{forecast.confidence.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm font-mono font-bold`} style={{ color: dirColor }}>
          {forecast.direction === 'bullish' ? '↑' : forecast.direction === 'bearish' ? '↓' : '→'} {forecast.targetPrice.toFixed(forecast.targetPrice > 100 ? 2 : 5)}
        </span>
        <span className="text-[10px] text-white/20">from {forecast.currentPrice.toFixed(forecast.currentPrice > 100 ? 2 : 5)}</span>
      </div>
      <div className="flex items-center gap-3 text-[9px] text-white/20">
        <span>Move: {forecast.expectedMovePct >= 0 ? '+' : ''}{forecast.expectedMovePct.toFixed(2)}%</span>
        <span>Breakout: {forecast.breakoutProbability.toFixed(0)}%</span>
        <span>Vol: {forecast.volatilityForecast.toFixed(1)}</span>
      </div>
      {/* S/R Levels */}
      <div className="mt-2 flex gap-3">
        <div className="flex-1">
          <div className="text-[8px] text-[#00dc82]/50 mb-0.5">Support</div>
          {forecast.supportLevels.slice(0, 2).map((l, i) => (
            <div key={i} className="text-[9px] font-mono text-[#00dc82]/60">{l.price.toFixed(l.price > 100 ? 2 : 5)} ({l.strength}%)</div>
          ))}
        </div>
        <div className="flex-1">
          <div className="text-[8px] text-[#ef4444]/50 mb-0.5">Resistance</div>
          {forecast.resistanceLevels.slice(0, 2).map((l, i) => (
            <div key={i} className="text-[9px] font-mono text-[#ef4444]/60">{l.price.toFixed(l.price > 100 ? 2 : 5)} ({l.strength}%)</div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SentinelDashboardProps {
  sentiments: SentimentData[];
  patterns: PatternDetection[];
  regimes: RegimeAnalysis[];
  forecasts: PriceForcast[];
}

export function SentinelDashboard({ sentiments, patterns, regimes, forecasts }: SentinelDashboardProps) {
  const [tab, setTab] = useState<'sentiment' | 'patterns' | 'forecasts' | 'regimes'>('sentiment');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#8b5cf6]/10">
            <Eye className="h-5 w-5 text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">RAPTOR SENTINEL</h3>
            <p className="text-[11px] text-white/30">Market Intelligence — Sentiment, Patterns, Forecasts, Regimes</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#00dc82]">
          <Activity className="h-3 w-3 animate-pulse" /> Live
        </div>
      </div>

      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {(['sentiment', 'patterns', 'forecasts', 'regimes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'sentiment' && (
        <div className="grid grid-cols-4 gap-3">
          {sentiments.map(s => <SentimentGauge key={s.symbol} symbol={s.symbol} score={s.score} momentum={s.momentum} />)}
        </div>
      )}

      {tab === 'patterns' && (
        <div className="space-y-2">
          {patterns.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/20">No active pattern detections</div>
          ) : patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
        </div>
      )}

      {tab === 'forecasts' && (
        <div className="grid grid-cols-3 gap-3">
          {forecasts.map(f => <ForecastCard key={f.id} forecast={f} />)}
        </div>
      )}

      {tab === 'regimes' && (
        <div className="grid grid-cols-3 gap-3">
          {regimes.map(r => (
            <div key={r.symbol} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-white">{r.symbol}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${
                  r.riskEnvironment === 'risk_on' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                  r.riskEnvironment === 'risk_off' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                  'bg-white/5 text-white/30'
                }`}>{r.riskEnvironment.replace('_', ' ')}</span>
              </div>
              <div className="text-sm font-medium text-white/70 capitalize mb-2">{r.currentRegime.replace(/_/g, ' ')}</div>
              <div className="space-y-1">
                {r.regimeProbabilities.slice(0, 3).map(rp => (
                  <div key={rp.regime} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/25 w-20 capitalize">{rp.regime.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00b4ff] rounded-full" style={{ width: `${rp.probability * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-white/30">{(rp.probability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              {r.regimeChangeProbability > 0.3 && (
                <div className="mt-2 text-[9px] text-[#f59e0b] flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> Regime shift: {(r.regimeChangeProbability * 100).toFixed(0)}% probability
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
