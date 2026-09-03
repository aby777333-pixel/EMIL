'use client';

import { PropChallengeDashboard } from '@/components/trader/PropChallengeDashboard';
import type { PropEnrollment, EquityPoint } from '@/types/trader';

const MOCK_ENROLLMENT: PropEnrollment = {
  id: 'enr-1',
  challengeId: 'ch-1',
  challengeName: 'RAPTOR Challenge $100K — Phase 1',
  phase: 1,
  totalPhases: 2,
  accountSize: 100000,
  status: 'active',
  currentPnl: 5_430.20,
  currentPnlPct: 5.43,
  profitTarget: 8,
  dailyLossUsed: 2.1,
  dailyLossLimit: 5,
  maxDrawdownUsed: 3.8,
  maxDrawdownLimit: 10,
  tradingDays: 7,
  minTradingDays: 5,
  startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
  endDate: null,
  equityCurve: Array.from({ length: 50 }, (_, i) => ({
    timestamp: new Date(Date.now() - (49 - i) * 3600000).toISOString(),
    equity: 100000 + i * 110 + (Math.random() - 0.35) * 800,
    balance: 100000 + i * 100,
    drawdown: Math.random() * 2000,
  })),
  dailyPnl: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
    pnl: i < 7 ? 0 : (Math.random() - 0.3) * 1500,
  })),
  violationRisk: 'safe',
  violationMessage: null,
};

export default function PropChallengePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Prop Challenge</h1>
        <p className="text-xs text-white/30">Track your challenge progress and manage funded accounts</p>
      </div>
      <PropChallengeDashboard enrollment={MOCK_ENROLLMENT} />
    </div>
  );
}
