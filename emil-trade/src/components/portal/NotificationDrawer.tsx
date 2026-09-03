'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Bell, CheckCheck } from 'lucide-react';
import { CATEGORY_LABELS, type PortalNotification } from '@/lib/notifications/types';

/**
 * Slide-in notification drawer triggered by the topbar bell. The
 * notifications list is owned by the parent (via useNotifications)
 * so the drawer stays a pure-presentational surface.
 */
export default function NotificationDrawer({
  open,
  onClose,
  notifications,
  loading,
  onMarkAllRead,
  onMarkRead,
}: {
  open: boolean;
  onClose: () => void;
  notifications: PortalNotification[];
  loading: boolean;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const recent = notifications.slice(0, 12);

  return (
    <div className="gentleman fixed inset-0 z-[200]" aria-modal>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Notifications"
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[380px] flex flex-col border-l g-fade-in"
        style={{
          background: 'var(--g-bg-elevated)',
          borderColor: 'var(--g-border-hair)',
        }}
      >
        <header
          className="flex items-center justify-between px-4 border-b"
          style={{ borderColor: 'var(--g-border-hair)', height: 56 }}
        >
          <div className="flex items-center gap-2">
            <Bell size={15} style={{ color: 'var(--g-text-secondary)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              Notifications
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/[0.04]"
              style={{ color: 'var(--g-text-secondary)' }}
            >
              <CheckCheck size={12} /> Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded transition-colors hover:bg-white/[0.04]"
              style={{ color: 'var(--g-text-muted)' }}
            >
              <X size={15} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <Bell size={20} style={{ color: 'var(--g-text-muted)' }} />
              <div className="mt-3 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
                You&apos;re all caught up.
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                Deposits, KYC updates, margin events, and IB commissions land here.
              </div>
            </div>
          ) : (
            <ul className="list-none m-0 p-0">
              {recent.map((n) => (
                <NotificationRow key={n.id} item={n} onMarkRead={onMarkRead} />
              ))}
            </ul>
          )}
        </div>

        <footer
          className="px-4 py-3 border-t text-center"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="text-[12px] hover:underline"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            View all notifications →
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: PortalNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <li
      className="px-4 py-3 border-b flex gap-3"
      style={{
        borderColor: 'var(--g-border-hair)',
        background: item.read ? 'transparent' : 'rgba(220,38,38,0.04)',
      }}
    >
      <span
        className="mt-1 shrink-0"
        style={{
          width: 6, height: 6, borderRadius: 6,
          background: item.read ? 'transparent' : 'var(--g-accent)',
        }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>{item.title}</div>
        {item.body && (
          <div className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--g-text-secondary)' }}>
            {item.body}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2">
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
    <div className="flex gap-3 py-2">
      <div
        className="g-skeleton shrink-0"
        style={{ width: 6, height: 6, borderRadius: 6, marginTop: 6 }}
      />
      <div className="flex-1 space-y-2">
        <div className="g-skeleton" style={{ height: 12, width: '70%' }} />
        <div className="g-skeleton" style={{ height: 10, width: '90%' }} />
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

export type { PortalNotification };
