// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 19: RAPTOR APP (Mobile Expanded) Types
// Indigenous mobile — iOS + Android
// ═══════════════════════════════════════════════════════════

// ─── Mobile Trading Features ────────────────────────────────

export interface MobileTraderConfig {
  nexusVoiceEnabled: boolean;
  biometricForOrders: boolean;
  liveActivitiesEnabled: boolean;
  dynamicIslandEnabled: boolean;
  lockScreenWidgets: boolean;
  homeScreenWidgets: MobileWidgetConfig[];
  watchAppEnabled: boolean;
  shakeToNexus: boolean;
  offlineMode: boolean;
  appClipsEnabled: boolean;
  pushTradingEnabled: boolean;
  darkModeForced: boolean;
  morningBriefTime: string | null;
  eveningDebriefEnabled: boolean;
  crisisModePush: boolean;
}

export interface MobileWidgetConfig {
  id: string;
  type: 'pnl' | 'watchlist' | 'nexus_signal' | 'balance' | 'quick_trade' | 'alerts';
  size: 'small' | 'medium' | 'large';
  position: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

// ─── Live Activities (iOS Dynamic Island) ───────────────────

export interface LiveActivityData {
  type: 'open_position' | 'pending_order' | 'alert_active';
  symbol: string;
  direction: 'buy' | 'sell' | null;
  currentPnl: number;
  entryPrice: number;
  currentPrice: number;
  volume: number | null;
  alertPrice: number | null;
  updatedAt: string;
}

// ─── Watch App ──────────────────────────────────────────────

export interface WatchComplication {
  type: 'pnl_total' | 'top_position' | 'nexus_alert' | 'balance';
  data: { label: string; value: string; color: string };
}

export interface WatchQuickAction {
  type: 'confirm_order' | 'dismiss_alert' | 'nexus_respond';
  orderId: string | null;
  alertId: string | null;
  message: string;
}

// ─── NEXUS Mobile ───────────────────────────────────────────

export interface NexusMobileBrief {
  type: 'morning' | 'evening';
  greeting: string;
  summary: string;
  keyPoints: string[];
  tradeCount: number | null;
  pnlToday: number | null;
  topSignal: { symbol: string; direction: string; confidence: number } | null;
  upcomingEvents: string[];
  mood: 'positive' | 'neutral' | 'cautious' | 'supportive';
}

// ─── Broker Mobile ──────────────────────────────────────────

export interface BrokerMobileDashboard {
  revenueToday: number;
  clientsActive: number;
  pendingWithdrawals: number;
  marginCallAlerts: number;
  topExposures: { symbol: string; netUsd: number; pct: number }[];
  criticalAlerts: { title: string; severity: string; time: string }[];
  nexusInsightPriority: string;
}

export interface EmergencyControl {
  type: 'disable_symbol' | 'disable_group' | 'disable_all' | 'force_close_symbol';
  target: string;
  isActive: boolean;
  activatedBy: string | null;
  activatedAt: string | null;
  reason: string;
}

// ─── Notification Actions ───────────────────────────────────

export interface PushNotificationAction {
  notificationId: string;
  title: string;
  body: string;
  category: 'price_alert' | 'margin_call' | 'order_fill' | 'nexus' | 'withdrawal' | 'signal';
  actions: { label: string; action: string; destructive: boolean }[];
  data: Record<string, unknown>;
  timestamp: string;
}
