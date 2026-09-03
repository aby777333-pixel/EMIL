'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-accent',
  success: 'bg-profit',
  warning: 'bg-gold',
  error: 'bg-loss',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
    } catch {
      // Silently fail
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
    } catch {
      // Silently fail
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-loss px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-strong bg-elevated shadow-2xl',
            'animate-[slide-in_200ms_ease-out]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] text-accent transition-colors hover:text-accent/80"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto hide-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface/50',
                    !n.read && 'bg-surface/20',
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TYPE_COLORS[n.type] ?? 'bg-accent')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-medium', n.read ? 'text-secondary' : 'text-foreground')}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                </button>
              ))
            )}
          </div>

          <style>{`
            @keyframes slide-in {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
