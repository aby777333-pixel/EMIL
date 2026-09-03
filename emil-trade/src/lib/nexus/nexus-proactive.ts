// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Proactive Intelligence Engine
// NEXUS voluntarily provides advice, warnings, predictions
// WITHOUT being asked — context-aware, role-aware
// ═══════════════════════════════════════════════════════════

import type { NexusSentiment } from '@/types/nexus';

export interface ProactiveMessage {
  id: string;
  trigger: string;
  message: string;
  sentiment: NexusSentiment;
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'trade' | 'risk' | 'psychology' | 'market' | 'education' | 'health' | 'broker_risk' | 'broker_growth' | 'broker_compliance';
  layer: 'b2c' | 'b2b';
  dismissable: boolean;
  actionLabel: string | null;
  actionTarget: string | null;
  expiresInMs: number;
}

// ─── B2C Proactive Triggers ─────────────────────────────────

export function evaluateTraderProactiveMessages(context: {
  openPositions: { symbol: string; pnl: number; direction: string; volume: number; openTime: string; stopLoss: number | null }[];
  sessionMinutes: number;
  tradesToday: number;
  avgTradesPerDay: number;
  consecutiveLosses: number;
  lastPositionSize: number;
  avgPositionSize: number;
  currentDrawdownPct: number;
  watchlist: string[];
  upcomingEvents: { name: string; minutesUntil: number; impact: string }[];
  dayOfWeek: number;
  hour: number;
}): ProactiveMessage[] {
  const messages: ProactiveMessage[] = [];
  const now = Date.now();

  // ── Overtrading Detection ──
  if (context.tradesToday > context.avgTradesPerDay * 2 && context.tradesToday >= 8) {
    messages.push({
      id: `overtrade-${now}`, trigger: 'overtrading',
      message: `You've placed ${context.tradesToday} trades today — your daily average is ${context.avgTradesPerDay}. Quality over quantity. Consider stepping back and only taking A+ setups.`,
      sentiment: 'warning', priority: 'high', category: 'psychology', layer: 'b2c',
      dismissable: true, actionLabel: null, actionTarget: null, expiresInMs: 3600000,
    });
  }

  // ── Revenge Trading Detection ──
  if (context.consecutiveLosses >= 3 && context.lastPositionSize > context.avgPositionSize * 1.5) {
    messages.push({
      id: `revenge-${now}`, trigger: 'revenge_trading',
      message: `${context.consecutiveLosses} consecutive losses and your last position was ${((context.lastPositionSize / context.avgPositionSize - 1) * 100).toFixed(0)}% larger than normal. This looks like revenge trading. Take a break — the market will be here when you're ready.`,
      sentiment: 'urgent', priority: 'critical', category: 'psychology', layer: 'b2c',
      dismissable: true, actionLabel: 'Take a Break', actionTarget: null, expiresInMs: 7200000,
    });
  }

  // ── Session Time Warning ──
  if (context.sessionMinutes >= 240) {
    const hours = Math.floor(context.sessionMinutes / 60);
    messages.push({
      id: `session-${hours}h`, trigger: 'session_time',
      message: `You've been trading for ${hours} hours. Take a short break — stretch, hydrate, rest your eyes. Fatigue leads to poor decisions.`,
      sentiment: 'supportive', priority: 'normal', category: 'health', layer: 'b2c',
      dismissable: true, actionLabel: null, actionTarget: null, expiresInMs: 3600000,
    });
  }

  // ── No Stop Loss Warning ──
  const noSlPositions = context.openPositions.filter(p => p.stopLoss === null || p.stopLoss === 0);
  if (noSlPositions.length > 0) {
    const symbols = noSlPositions.map(p => p.symbol).join(', ');
    messages.push({
      id: `nosl-${now}`, trigger: 'no_stop_loss',
      message: `${noSlPositions.length} position${noSlPositions.length > 1 ? 's' : ''} without stop loss: ${symbols}. Unprotected positions can lead to unlimited downside. Consider adding protection.`,
      sentiment: 'warning', priority: 'high', category: 'risk', layer: 'b2c',
      dismissable: true, actionLabel: 'View Positions', actionTarget: '/dashboard/positions', expiresInMs: 1800000,
    });
  }

  // ── Drawdown Warning ──
  if (context.currentDrawdownPct > 5) {
    messages.push({
      id: `drawdown-${now}`, trigger: 'drawdown',
      message: context.currentDrawdownPct > 10
        ? `Your account is in ${context.currentDrawdownPct.toFixed(1)}% drawdown. This is significant. Consider reducing position sizes until you recover. Protecting capital is the priority right now.`
        : `Current drawdown: ${context.currentDrawdownPct.toFixed(1)}%. Still manageable, but stay disciplined with position sizing. Don't try to recover it all at once.`,
      sentiment: context.currentDrawdownPct > 10 ? 'urgent' : 'warning',
      priority: context.currentDrawdownPct > 10 ? 'critical' : 'high',
      category: 'risk', layer: 'b2c',
      dismissable: true, actionLabel: null, actionTarget: null, expiresInMs: 3600000,
    });
  }

  // ── Upcoming Economic Event ──
  const highImpactSoon = context.upcomingEvents.filter(e => e.impact === 'high' && e.minutesUntil <= 30 && e.minutesUntil > 0);
  if (highImpactSoon.length > 0) {
    const event = highImpactSoon[0];
    messages.push({
      id: `event-${event.name}`, trigger: 'economic_event',
      message: `${event.name} in ${event.minutesUntil} minutes. This is a high-impact event — expect volatility. Review your open positions and consider tightening stops or reducing exposure.`,
      sentiment: 'warning', priority: 'high', category: 'market', layer: 'b2c',
      dismissable: true, actionLabel: 'View Calendar', actionTarget: '/dashboard/calendar', expiresInMs: event.minutesUntil * 60 * 1000,
    });
  }

  // ── Position Size Anomaly ──
  if (context.lastPositionSize > context.avgPositionSize * 2.5 && context.consecutiveLosses === 0) {
    messages.push({
      id: `size-${now}`, trigger: 'position_size_spike',
      message: `Your last position was ${((context.lastPositionSize / context.avgPositionSize) * 100).toFixed(0)}% of your average size. Was this intentional? Larger positions amplify both gains and losses.`,
      sentiment: 'informational', priority: 'normal', category: 'risk', layer: 'b2c',
      dismissable: true, actionLabel: null, actionTarget: null, expiresInMs: 3600000,
    });
  }

  return messages;
}

// ─── B2B Proactive Triggers ─────────────────────────────────

export function evaluateBrokerProactiveMessages(context: {
  netExposurePct: number;
  exposureLimit: number;
  marginCallClients: number;
  lpFillRates: { name: string; fillRate: number }[];
  churnRiskClients: { name: string; probability: number }[];
  revenueToday: number;
  revenueYesterdaySameTime: number;
  pendingWithdrawals: number;
  regulatoryDeadlines: { name: string; daysRemaining: number }[];
  ibDeclines: { name: string; declinePct: number }[];
  toxicFlowAlerts: number;
}): ProactiveMessage[] {
  const messages: ProactiveMessage[] = [];
  const now = Date.now();

  // ── Exposure Warning ──
  if (context.netExposurePct > 60) {
    messages.push({
      id: `exposure-${now}`, trigger: 'exposure_high',
      message: `Net exposure at ${context.netExposurePct.toFixed(0)}% of limit. ${context.netExposurePct > 80 ? 'CRITICAL — consider immediate hedging.' : 'Consider adjusting A/B book routing or placing a hedge.'}`,
      sentiment: context.netExposurePct > 80 ? 'urgent' : 'warning',
      priority: context.netExposurePct > 80 ? 'critical' : 'high',
      category: 'broker_risk', layer: 'b2b',
      dismissable: false, actionLabel: 'View Exposure', actionTarget: '/broker/command-center', expiresInMs: 1800000,
    });
  }

  // ── Margin Call Queue ──
  if (context.marginCallClients > 0) {
    messages.push({
      id: `margin-${now}`, trigger: 'margin_calls',
      message: `${context.marginCallClients} client${context.marginCallClients > 1 ? 's' : ''} approaching margin call. Review positions and prepare stop-out sequence if needed.`,
      sentiment: 'warning', priority: 'high', category: 'broker_risk', layer: 'b2b',
      dismissable: true, actionLabel: 'View Risk', actionTarget: '/broker/command-center', expiresInMs: 3600000,
    });
  }

  // ── LP Degradation ──
  const degradedLps = context.lpFillRates.filter(lp => lp.fillRate < 95);
  if (degradedLps.length > 0) {
    const lpNames = degradedLps.map(lp => `${lp.name} (${lp.fillRate.toFixed(1)}%)`).join(', ');
    messages.push({
      id: `lp-${now}`, trigger: 'lp_degraded',
      message: `LP fill rate degraded: ${lpNames}. Consider routing to backup LPs for affected symbols.`,
      sentiment: 'warning', priority: 'high', category: 'broker_risk', layer: 'b2b',
      dismissable: true, actionLabel: 'LP Monitor', actionTarget: '/broker/integrations', expiresInMs: 1800000,
    });
  }

  // ── Churn Risk ──
  const highChurn = context.churnRiskClients.filter(c => c.probability > 70);
  if (highChurn.length > 0) {
    messages.push({
      id: `churn-${now}`, trigger: 'churn_risk',
      message: `${highChurn.length} client${highChurn.length > 1 ? 's' : ''} with >70% churn probability. Top at risk: ${highChurn[0].name} (${highChurn[0].probability}%). Recommended: personal outreach within 48 hours.`,
      sentiment: 'warning', priority: 'normal', category: 'broker_growth', layer: 'b2b',
      dismissable: true, actionLabel: 'View CRM', actionTarget: '/broker/crm', expiresInMs: 86400000,
    });
  }

  // ── Revenue Alert ──
  if (context.revenueYesterdaySameTime > 0) {
    const revDiff = ((context.revenueToday - context.revenueYesterdaySameTime) / context.revenueYesterdaySameTime) * 100;
    if (revDiff < -15) {
      messages.push({
        id: `revenue-${now}`, trigger: 'revenue_decline',
        message: `Revenue ${Math.abs(revDiff).toFixed(0)}% below yesterday at this time. Primary driver may be volume decline — check active trader count and spread performance.`,
        sentiment: 'informational', priority: 'normal', category: 'broker_growth', layer: 'b2b',
        dismissable: true, actionLabel: 'View Intel', actionTarget: '/broker/intel', expiresInMs: 43200000,
      });
    }
  }

  // ── Regulatory Deadline ──
  const urgentDeadlines = context.regulatoryDeadlines.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 0);
  if (urgentDeadlines.length > 0) {
    messages.push({
      id: `deadline-${now}`, trigger: 'regulatory_deadline',
      message: `${urgentDeadlines.length} regulatory deadline${urgentDeadlines.length > 1 ? 's' : ''} within 7 days: ${urgentDeadlines.map(d => `${d.name} (${d.daysRemaining}d)`).join(', ')}`,
      sentiment: 'warning', priority: 'high', category: 'broker_compliance', layer: 'b2b',
      dismissable: false, actionLabel: 'View Deadlines', actionTarget: '/broker/comply', expiresInMs: 86400000,
    });
  }

  // ── Toxic Flow ──
  if (context.toxicFlowAlerts > 0) {
    messages.push({
      id: `toxic-${now}`, trigger: 'toxic_flow',
      message: `${context.toxicFlowAlerts} new toxic flow alert${context.toxicFlowAlerts > 1 ? 's' : ''} detected. Review evidence and consider routing changes for flagged clients.`,
      sentiment: 'urgent', priority: 'high', category: 'broker_risk', layer: 'b2b',
      dismissable: true, actionLabel: 'Review Alerts', actionTarget: '/broker/command-center', expiresInMs: 3600000,
    });
  }

  // ── IB Decline ──
  const decliningIbs = context.ibDeclines.filter(ib => ib.declinePct > 30);
  if (decliningIbs.length > 0) {
    messages.push({
      id: `ib-${now}`, trigger: 'ib_decline',
      message: `${decliningIbs.length} IB${decliningIbs.length > 1 ? 's' : ''} showing declining referrals: ${decliningIbs.map(ib => `${ib.name} (-${ib.declinePct}%)`).join(', ')}. Consider outreach.`,
      sentiment: 'informational', priority: 'normal', category: 'broker_growth', layer: 'b2b',
      dismissable: true, actionLabel: 'View IBs', actionTarget: '/broker/ib-management', expiresInMs: 86400000,
    });
  }

  return messages;
}
