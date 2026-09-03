// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 6: Mobile Applications Types
// ═══════════════════════════════════════════════════════════

// ─── Mobile App Config ──────────────────────────────────────

export interface MobileAppConfig {
  id: string;
  brokerId: string;
  platform: 'ios' | 'android';
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: number;
  status: 'draft' | 'building' | 'testing' | 'submitted' | 'published' | 'rejected';
  storeUrl: string | null;
  iconUrl: string | null;
  splashUrl: string | null;
  primaryColor: string;
  accentColor: string;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockMinutes: number;
  offlineModeEnabled: boolean;
  widgetsEnabled: boolean;
  watchAppEnabled: boolean;
  hapticFeedback: boolean;
  deepLinksEnabled: boolean;
  appClipsEnabled: boolean;
  features: MobileFeatureFlag[];
  lastBuildAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface MobileFeatureFlag {
  key: string;
  label: string;
  enabled: boolean;
  category: 'trading' | 'social' | 'finance' | 'alerts' | 'education' | 'ai';
}

// ─── Device Trust ───────────────────────────────────────────

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  lastLoginAt: string;
  isCurrentDevice: boolean;
  ipAddress: string;
  location: string | null;
  createdAt: string;
}

// ─── Mobile Widget Config ───────────────────────────────────

export type WidgetType = 'pnl' | 'watchlist' | 'balance' | 'alerts' | 'quick_trade';

export interface MobileWidget {
  id: string;
  type: WidgetType;
  size: 'small' | 'medium' | 'large';
  config: Record<string, unknown>;
  platform: 'ios' | 'android';
  isEnabled: boolean;
}

// ─── Push Notification Preferences ──────────────────────────

export interface PushPreferences {
  orderFill: boolean;
  priceAlert: boolean;
  marginCall: boolean;
  depositConfirm: boolean;
  withdrawalUpdate: boolean;
  newsAlert: boolean;
  signalAlert: boolean;
  copyTradeUpdate: boolean;
  propChallengeUpdate: boolean;
  marketingOffers: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// ─── Broker Admin Mobile ────────────────────────────────────

export interface BrokerMobileConfig {
  id: string;
  brokerId: string;
  emergencyActionsEnabled: boolean;
  biometricForApprovals: boolean;
  criticalAlertsPush: boolean;
  withdrawalApprovalLimit: number;
  forceCloseEnabled: boolean;
  globalTradingToggle: boolean;
}

// ─── App Store Submission ───────────────────────────────────

export interface AppStoreSubmission {
  id: string;
  platform: 'ios' | 'android';
  version: string;
  buildNumber: number;
  status: 'preparing' | 'uploaded' | 'in_review' | 'approved' | 'rejected' | 'published';
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  releaseNotes: string;
  screenshots: string[];
}
