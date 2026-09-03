'use client';

import { RaptorAppDashboard } from '@/components/mobile/RaptorAppDashboard';
import type { MobileTraderConfig, NexusMobileBrief, LiveActivityData, BrokerMobileDashboard, EmergencyControl } from '@/types/raptor-app';

const MOCK_CONFIG: MobileTraderConfig = {
  nexusVoiceEnabled: true, biometricForOrders: true, liveActivitiesEnabled: true,
  dynamicIslandEnabled: true, lockScreenWidgets: true,
  homeScreenWidgets: [
    { id: 'w1', type: 'pnl', size: 'medium', position: 0, isEnabled: true, config: {} },
    { id: 'w2', type: 'nexus_signal', size: 'small', position: 1, isEnabled: true, config: {} },
  ],
  watchAppEnabled: true, shakeToNexus: true, offlineMode: true, appClipsEnabled: true,
  pushTradingEnabled: false, darkModeForced: true,
  morningBriefTime: '07:30', eveningDebriefEnabled: true, crisisModePush: true,
};

const MOCK_LIVE: LiveActivityData = {
  type: 'open_position', symbol: 'EURUSD', direction: 'buy',
  currentPnl: 342.50, entryPrice: 1.08420, currentPrice: 1.08762, volume: 2.5, alertPrice: null,
  updatedAt: new Date().toISOString(),
};

const MOCK_BRIEF: NexusMobileBrief = {
  type: 'morning', greeting: 'Good morning! Markets are active today.',
  summary: 'European session opening with USD weakness across the board. Gold pushing higher on geopolitical tension. Key event today: ECB rate decision at 13:45 GMT. Your EURUSD long from yesterday is up $342.',
  keyPoints: ['USD Index down 0.3% — weak dollar theme continues', 'Gold testing 2365 resistance — watch for breakout', 'ECB expected to hold rates — watch press conference for forward guidance', 'Your EURUSD position is near first TP target'],
  tradeCount: null, pnlToday: null,
  topSignal: { symbol: 'GBPUSD', direction: 'buy', confidence: 76 },
  upcomingEvents: ['ECB Rate Decision 13:45 GMT', 'US Jobless Claims 13:30 GMT'],
  mood: 'positive',
};

const MOCK_BROKER: BrokerMobileDashboard = {
  revenueToday: 34520, clientsActive: 2341, pendingWithdrawals: 23, marginCallAlerts: 3,
  topExposures: [{ symbol: 'XAUUSD', netUsd: 10890000, pct: 13.9 }, { symbol: 'EURUSD', netUsd: 4530000, pct: 5.8 }],
  criticalAlerts: [{ title: 'LP Integral disconnected', severity: 'critical', time: '14:23 UTC' }],
  nexusInsightPriority: '3 clients approaching margin call. NFP tomorrow — recommend pre-event spread widening for JPY crosses. IB Alpha Partners referral volume down 40% this week — intervention recommended.',
};

const MOCK_EMERGENCY: EmergencyControl[] = [
  { type: 'disable_symbol', target: 'All Symbols', isActive: false, activatedBy: null, activatedAt: null, reason: '' },
  { type: 'disable_group', target: 'Demo Accounts', isActive: false, activatedBy: null, activatedAt: null, reason: '' },
  { type: 'disable_all', target: 'Global Trading Halt', isActive: false, activatedBy: null, activatedAt: null, reason: '' },
  { type: 'force_close_symbol', target: 'By Symbol', isActive: false, activatedBy: null, activatedAt: null, reason: '' },
];

export default function RaptorAppPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR APP</h1>
        <p className="text-xs text-white/30">Indigenous mobile platform — trader features, NEXUS mobile, and broker emergency controls</p>
      </div>
      <RaptorAppDashboard traderConfig={MOCK_CONFIG} liveActivity={MOCK_LIVE} morningBrief={MOCK_BRIEF}
        brokerDashboard={MOCK_BROKER} emergencyControls={MOCK_EMERGENCY} />
    </div>
  );
}
