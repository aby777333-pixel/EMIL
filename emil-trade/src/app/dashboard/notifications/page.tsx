'use client';

import { useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  KeyRound,
  TrendingUp,
  PieChart,
  Users,
  Settings,
} from 'lucide-react';
import { useNotifications } from '@/components/portal/useNotifications';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  isMarginCall,
  type NotificationCategory,
  type PortalNotification,
} from '@/lib/notifications/types';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

type FilterId = 'all' | NotificationCategory | 'unread';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  ...CATEGORY_ORDER.map((c): { id: FilterId; label: string } => ({ id: c, label: CATEGORY_LABELS[c] })),
];

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const counts = useMemo(() => {
    const map: Record<FilterId, number> = {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      trading: 0, wallet: 0, kyc: 0, security: 0, ib: 0, pamm: 0, system: 0,
    };
    for (const n of notifications) map[n.category]++;
    return map;
  }, [notifications]);

  // Pull margin alerts to the top so they can render as the prominent
  // sticky banner per spec instead of a regular row.
  const marginAlerts = notifications.filter((n) => isMarginCall(n.type) && !n.read);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
            Notifications
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            Real-time portal events. Margin calls always surface at the top.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-md transition-colors hover:bg-white/[0.04]"
            style={{
              color: 'var(--g-text-secondary)',
              border: '1px solid var(--g-border-soft)',
            }}
          >
            <CheckCheck size={13} /> Mark all read ({unreadCount})
          </button>
        )}
      </header>

      {marginAlerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {marginAlerts.map((n) => (
            <MarginAlert key={n.id} item={n} onMarkRead={(id) => markRead([id])} />
          ))}
        </div>
      )}

      <FilterStrip value={filter} onChange={setFilter} counts={counts} />

      <DashboardCard padding="none">
        {loading ? (
          <div className="p-5 space-y-4">
            {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="list-none m-0 p-0">
            {filtered.map((n, i) => (
              <NotificationRow
                key={n.id}
                item={n}
                isFirst={i === 0}
                onMarkRead={(id) => markRead([id])}
              />
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}

function FilterStrip({
  value,
  onChange,
  counts,
}: {
  value: FilterId;
  onChange: (next: FilterId) => void;
  counts: Record<FilterId, number>;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-1 overflow-x-auto mb-5 border-b"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(f.id)}
            className="text-[13px] px-3 py-2.5 transition-colors relative whitespace-nowrap"
            style={{ color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)' }}
          >
            <span>{f.label}</span>
            <span className="num text-[10px] ml-1.5" style={{ color: 'var(--g-text-muted)' }}>
              {counts[f.id]}
            </span>
            {active && (
              <span
                aria-hidden
                className="absolute bottom-0 left-2 right-2 h-px"
                style={{ background: 'var(--g-accent)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function MarginAlert({
  item,
  onMarkRead,
}: {
  item: PortalNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        background: 'rgba(220,38,38,0.06)',
        border: '1px solid rgba(220,38,38,0.32)',
        borderLeftWidth: 3,
      }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--g-accent)' }} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
          {item.title || 'Margin call'}
        </div>
        {item.body && (
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
            {item.body}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onMarkRead(item.id)}
        className="text-[11px] uppercase tracking-wider hover:underline shrink-0"
        style={{ color: 'var(--g-accent)' }}
      >
        Acknowledge
      </button>
    </div>
  );
}

function NotificationRow({
  item,
  isFirst,
  onMarkRead,
}: {
  item: PortalNotification;
  isFirst: boolean;
  onMarkRead: (id: string) => void;
}) {
  const Icon = ICON_FOR_CATEGORY[item.category];
  return (
    <li
      className="flex gap-3 px-5 py-4"
      style={{
        borderTop: isFirst ? 'none' : '1px solid var(--g-border-hair)',
        background: item.read ? 'transparent' : 'rgba(220,38,38,0.04)',
      }}
    >
      <span
        className="mt-0.5 shrink-0 flex items-center justify-center"
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          color: item.read ? 'var(--g-text-muted)' : 'var(--g-text-secondary)',
        }}
      >
        <Icon size={14} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
            {item.title}
          </div>
          {!item.read && (
            <span
              aria-hidden
              className="shrink-0 mt-1.5"
              style={{
                width: 6, height: 6, borderRadius: 6,
                background: 'var(--g-accent)',
              }}
            />
          )}
        </div>
        {item.body && (
          <div className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-secondary)' }}>
            {item.body}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
            {CATEGORY_LABELS[item.category]} · {formatRelative(item.created_at)}
          </span>
          {!item.read && (
            <button
              type="button"
              onClick={() => onMarkRead(item.id)}
              className="text-[10px] uppercase tracking-wider hover:underline"
              style={{ color: 'var(--g-accent)' }}
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3">
      <div className="g-skeleton shrink-0" style={{ width: 28, height: 28, borderRadius: 8 }} />
      <div className="flex-1 space-y-2">
        <div className="g-skeleton" style={{ height: 12, width: '40%' }} />
        <div className="g-skeleton" style={{ height: 11, width: '85%' }} />
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterId }) {
  const copy =
    filter === 'all' ? 'No notifications yet.' :
    filter === 'unread' ? 'You\'re all caught up.' :
    `No ${CATEGORY_LABELS[filter as NotificationCategory].toLowerCase()} notifications.`;
  return (
    <div className="px-6 py-16 text-center">
      <Bell size={20} className="mx-auto mb-3" style={{ color: 'var(--g-text-muted)' }} />
      <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>{copy}</div>
      <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
        Deposits, KYC updates, margin events, and IB commissions land here.
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ICON_FOR_CATEGORY: Record<NotificationCategory, React.ComponentType<{ size?: number }>> = {
  trading:  TrendingUp,
  wallet:   ArrowDownToLine,
  kyc:      ShieldCheck,
  security: KeyRound,
  ib:       Users,
  pamm:     PieChart,
  system:   Settings,
};

// Force these into the bundle so tree-shaking doesn't drop them via the
// dynamic Record lookup above.
void [ArrowUpFromLine];
