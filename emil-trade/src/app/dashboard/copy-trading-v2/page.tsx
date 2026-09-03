'use client';

import { CopyTradingView } from '@/components/trader/CopyTradingView';
import type { CopyProvider, CopySubscription } from '@/types/trader';

const MOCK_PROVIDERS: CopyProvider[] = [
  { id: 'p1', name: 'Alpha Trend', avatarUrl: null, bio: 'Systematic trend following across major FX pairs with strict risk management.', strategy: 'Trend Following', totalReturn: 142.5, monthlyAvgReturn: 8.3, maxDrawdown: 12.1, sharpeRatio: 2.1, winRate: 58.4, totalTrades: 1245, followers: 342, aum: 2_400_000, riskRating: 3, isVerified: true, liveMonths: 18, performanceFee: 20, monthlyFee: 0, instruments: ['EURUSD','GBPUSD','USDJPY','AUDUSD'], instrumentBreakdown: [{symbol:'EURUSD',pct:35},{symbol:'GBPUSD',pct:28},{symbol:'USDJPY',pct:22},{symbol:'AUDUSD',pct:15}], equityCurve: [], monthlyReturns: [], tradingStyle: 'swing', createdAt: '2024-10-01' },
  { id: 'p2', name: 'Gold Rush AI', avatarUrl: null, bio: 'AI-powered gold and commodities scalping strategy with tight stops.', strategy: 'Scalping', totalReturn: 89.2, monthlyAvgReturn: 12.1, maxDrawdown: 18.5, sharpeRatio: 1.6, winRate: 71.2, totalTrades: 4567, followers: 189, aum: 890_000, riskRating: 4, isVerified: true, liveMonths: 8, performanceFee: 30, monthlyFee: 0, instruments: ['XAUUSD','XAGUSD'], instrumentBreakdown: [{symbol:'XAUUSD',pct:80},{symbol:'XAGUSD',pct:20}], equityCurve: [], monthlyReturns: [], tradingStyle: 'scalping', createdAt: '2025-08-15' },
  { id: 'p3', name: 'Steady Eddie', avatarUrl: null, bio: 'Conservative position trading with 1:3 RR ratio. Slow and steady wins the race.', strategy: 'Position Trading', totalReturn: 67.8, monthlyAvgReturn: 3.2, maxDrawdown: 5.4, sharpeRatio: 3.1, winRate: 52.1, totalTrades: 234, followers: 567, aum: 5_200_000, riskRating: 1, isVerified: true, liveMonths: 24, performanceFee: 15, monthlyFee: 0, instruments: ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD'], instrumentBreakdown: [], equityCurve: [], monthlyReturns: [], tradingStyle: 'position', createdAt: '2024-04-01' },
];

const MOCK_SUBS: CopySubscription[] = [
  { id: 's1', providerId: 'p3', providerName: 'Steady Eddie', allocationPct: 15, allocationAmount: 3000, lotSizing: 'proportional', fixedLotSize: null, maxDrawdown: 10, instrumentFilter: [], isActive: true, totalReturn: 312.50, feesPaid: 46.88, copiedTrades: 12, startDate: '2026-01-15' },
];

export default function CopyTradingV2Page() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Copy Trading</h1>
        <p className="text-xs text-white/30">Follow top traders and auto-copy their strategies</p>
      </div>
      <CopyTradingView
        providers={MOCK_PROVIDERS}
        subscriptions={MOCK_SUBS}
        onFollow={(id) => console.log('Follow', id)}
        onToggleSubscription={(id) => console.log('Toggle', id)}
      />
    </div>
  );
}
