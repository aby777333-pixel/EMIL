'use client';

import { motion } from 'framer-motion';
import {
  Target, AlertTriangle, Calendar, TrendingUp,
  CheckCircle2, XCircle, Shield, Trophy, ChevronRight,
} from 'lucide-react';
import type { PropEnrollment } from '@/types/trader';

function ProgressGauge({ label, current, limit, color, danger }: {
  label: string; current: number; limit: number; color: string; danger: boolean;
}) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const displayColor = danger ? '#ef4444' : color;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/40">{label}</span>
        {danger && <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" />}
      </div>
      <div className="relative h-28 w-28 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke={displayColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.64} 264`}
            initial={{ strokeDasharray: '0 264' }}
            animate={{ strokeDasharray: `${pct * 2.64} 264` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-mono font-bold" style={{ color: displayColor }}>{pct.toFixed(1)}%</span>
          <span className="text-[9px] text-white/20">{current.toFixed(1)} / {limit.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

interface PropChallengeDashboardProps {
  enrollment: PropEnrollment;
}

export function PropChallengeDashboard({ enrollment }: PropChallengeDashboardProps) {
  const profitPct = enrollment.profitTarget > 0 ? (enrollment.currentPnlPct / enrollment.profitTarget) * 100 : 0;
  const daysUsed = enrollment.tradingDays;
  const isPassable = enrollment.currentPnlPct >= enrollment.profitTarget && daysUsed >= enrollment.minTradingDays;

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <div className={`rounded-xl p-4 border ${
        enrollment.status === 'funded' ? 'bg-[#00dc82]/5 border-[#00dc82]/20' :
        enrollment.status === 'failed' ? 'bg-red-500/5 border-red-500/20' :
        enrollment.violationRisk === 'danger' ? 'bg-red-500/5 border-red-500/20' :
        enrollment.violationRisk === 'caution' ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20' :
        'bg-white/[0.02] border-white/[0.06]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enrollment.status === 'funded' ? <Trophy className="h-5 w-5 text-[#00dc82]" /> :
             enrollment.status === 'failed' ? <XCircle className="h-5 w-5 text-red-400" /> :
             <Shield className="h-5 w-5 text-[#00b4ff]" />}
            <div>
              <h2 className="text-sm font-semibold text-white">{enrollment.challengeName}</h2>
              <p className="text-[11px] text-white/30">
                Phase {enrollment.phase}/{enrollment.totalPhases} · ${enrollment.accountSize.toLocaleString()} account
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
            enrollment.status === 'active' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
            enrollment.status === 'passed' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
            enrollment.status === 'funded' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
            'bg-red-500/10 text-red-400'
          }`}>
            {enrollment.status.toUpperCase()}
          </span>
        </div>

        {enrollment.violationMessage && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              {enrollment.violationMessage}
            </p>
          </div>
        )}
      </div>

      {/* Progress Gauges */}
      <div className="grid grid-cols-3 gap-4">
        <ProgressGauge
          label="Profit Target"
          current={enrollment.currentPnlPct}
          limit={enrollment.profitTarget}
          color="#00dc82"
          danger={false}
        />
        <ProgressGauge
          label="Daily Loss Used"
          current={enrollment.dailyLossUsed}
          limit={enrollment.dailyLossLimit}
          color="#f59e0b"
          danger={enrollment.dailyLossUsed / enrollment.dailyLossLimit > 0.8}
        />
        <ProgressGauge
          label="Max Drawdown Used"
          current={enrollment.maxDrawdownUsed}
          limit={enrollment.maxDrawdownLimit}
          color="#ef4444"
          danger={enrollment.maxDrawdownUsed / enrollment.maxDrawdownLimit > 0.7}
        />
      </div>

      {/* Trading Days + P&L */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Trading Days
            </span>
            <span className={`text-xs font-mono ${daysUsed >= enrollment.minTradingDays ? 'text-[#00dc82]' : 'text-white/40'}`}>
              {daysUsed} / {enrollment.minTradingDays} min
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((daysUsed / enrollment.minTradingDays) * 100, 100)}%` }}
              className="h-full rounded-full bg-[#00b4ff]"
            />
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <span className="text-xs text-white/40 flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Current P&L
          </span>
          <div className={`text-2xl font-mono font-bold ${enrollment.currentPnl >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
            {enrollment.currentPnl >= 0 ? '+' : ''}${enrollment.currentPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-white/20 mt-0.5">
            {enrollment.currentPnlPct >= 0 ? '+' : ''}{enrollment.currentPnlPct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Daily P&L Calendar */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-xs font-medium text-white/50 mb-3">Profit Calendar</h3>
        <div className="grid grid-cols-7 gap-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-[9px] text-white/15 text-center py-1">{d}</div>
          ))}
          {enrollment.dailyPnl.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-sm aspect-square flex items-center justify-center"
              style={{
                backgroundColor: day.pnl === 0 ? 'rgba(255,255,255,0.02)' :
                  day.pnl > 0 ? `rgba(0, 220, 130, ${Math.min(Math.abs(day.pnl) / 500, 0.5)})` :
                  `rgba(239, 68, 68, ${Math.min(Math.abs(day.pnl) / 500, 0.5)})`,
              }}
              title={`${day.date}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)}`}
            >
              <span className="text-[8px] font-mono text-white/50">
                {day.pnl !== 0 ? `${day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}` : ''}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Equity Curve */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-xs font-medium text-white/50 mb-3">Challenge Equity Curve</h3>
        <div className="h-32 flex items-end gap-[1px]">
          {enrollment.equityCurve.map((point, i) => {
            const max = Math.max(...enrollment.equityCurve.map(p => p.equity));
            const min = Math.min(...enrollment.equityCurve.map(p => p.equity));
            const range = max - min || 1;
            const height = ((point.equity - min) / range) * 100;
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.005 }}
                className="flex-1 rounded-t-sm bg-[#00b4ff]/60 min-w-[1px]"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
