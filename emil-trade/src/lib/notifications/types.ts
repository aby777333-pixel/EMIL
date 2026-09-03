/**
 * Notification taxonomy — every event type produced by the platform
 * maps to one of seven UI categories. The taxonomy mirrors the spec
 * (deposit / withdraw / position / margin / kyc / account / ib / pamm
 * / system) but groups them into the seven user-facing filters so the
 * filter strip stays scannable.
 */

export type NotificationCategory =
  | 'trading'
  | 'wallet'
  | 'kyc'
  | 'security'
  | 'ib'
  | 'pamm'
  | 'system';

export interface PortalNotification {
  id: string;
  type: string;        // dotted enum from the server e.g. 'deposit.completed'
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  /** the canonical category derived from `type` */
  category: NotificationCategory;
}

/**
 * Map a backend notification type (or notification_type column) to the
 * front-end category. Falls back to `system` when the prefix is unknown
 * so legacy rows still surface in the bell.
 */
export function categorize(type: string | null | undefined): NotificationCategory {
  if (!type) return 'system';
  const prefix = type.split('.')[0]?.toLowerCase() ?? '';
  switch (prefix) {
    case 'position':
    case 'margin':
    case 'order':
    case 'trade':
      return 'trading';
    case 'deposit':
    case 'withdraw':
    case 'withdrawal':
    case 'transfer':
    case 'convert':
      return 'wallet';
    case 'kyc':
    case 'compliance':
      return 'kyc';
    case 'account':
    case 'auth':
    case 'security':
    case 'session':
      return 'security';
    case 'ib':
    case 'referral':
    case 'commission':
      return 'ib';
    case 'pamm':
    case 'investment':
      return 'pamm';
    case 'system':
    case 'platform':
    case 'maintenance':
    case 'terms':
    default:
      return 'system';
  }
}

/**
 * Stable ordering used by every filter strip on the portal. Adding a
 * new category here surfaces it everywhere the strip renders.
 */
export const CATEGORY_ORDER: NotificationCategory[] = [
  'trading',
  'wallet',
  'kyc',
  'security',
  'ib',
  'pamm',
  'system',
];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  trading:  'Trading',
  wallet:   'Wallet',
  kyc:      'KYC',
  security: 'Security',
  ib:       'IB',
  pamm:     'PAMM',
  system:   'System',
};

/**
 * "Margin call" + "stopout" are the only events the portal treats with
 * sticky-top urgency per spec. Surface checks against this list when
 * deciding whether to render the prominent crimson alert at the top
 * of the canvas instead of inside the list.
 */
export function isMarginCall(type: string | null | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === 'margin.call_warning' || t === 'margin.stopout' || t.startsWith('margin.');
}
