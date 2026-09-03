'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { categorize, type PortalNotification } from '@/lib/notifications/types';

interface RawRow {
  id: string;
  user_id?: string;
  notification_type?: string | null;
  type?: string | null;
  title: string | null;
  body?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  read?: boolean | null;
  created_at: string;
}

/** Normalize whatever shape the `notifications` table actually has. */
function normalize(row: RawRow): PortalNotification {
  const type = row.notification_type ?? row.type ?? '';
  return {
    id: row.id,
    type,
    title: row.title ?? '',
    body: row.body ?? row.message ?? null,
    read: Boolean(row.is_read ?? row.read ?? false),
    created_at: row.created_at,
    category: categorize(type),
  };
}

/**
 * Single source of truth for notifications across the portal — used by
 * the topbar bell + drawer (Phase B) and the full-page list (Phase I).
 *
 * Loads the latest 50 on mount, then subscribes to a Realtime channel
 * scoped to `notifications:user_id=<uid>` and merges INSERT / UPDATE
 * events into the in-memory list. Updates are buffered at 4 Hz so the
 * bell badge doesn't flash on every tick.
 */
export function useNotifications(initial: PortalNotification[] = []) {
  const [notifications, setNotifications] = useState<PortalNotification[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const pendingRef = useRef<Map<string, PortalNotification>>(new Map());
  const flushTimer = useRef<number | null>(null);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    if (initial.length > 0) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }
        const { data } = await supabase
          .from('notifications')
          .select('id, notification_type, title, body, is_read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (cancelled) return;
        setNotifications((data ?? []).map(normalize as (r: RawRow) => PortalNotification));
      } catch {
        /* ignore — empty list is a valid state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initial.length]);

  // Realtime subscription.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = (payload.new ?? payload.old) as RawRow | undefined;
            if (!row) return;
            pendingRef.current.set(row.id, normalize(row));
            if (flushTimer.current == null) {
              flushTimer.current = window.setTimeout(() => {
                flushTimer.current = null;
                setNotifications((prev) => merge(prev, pendingRef.current));
                pendingRef.current.clear();
              }, 250);
            }
          },
        )
        .subscribe();

      unsub = () => {
        if (flushTimer.current != null) {
          window.clearTimeout(flushTimer.current);
          flushTimer.current = null;
        }
        supabase.removeChannel(channel);
      };
    })();

    return () => { cancelled = true; unsub?.(); };
  }, []);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    // Optimistic update.
    setNotifications((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
    );
    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', ids);
    } catch {
      /* swallow — optimistic update will reconcile on next realtime tick */
    }
  }, []);

  const markAllRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    return markRead(unread);
  }, [notifications, markRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead };
}

function merge(prev: PortalNotification[], pending: Map<string, PortalNotification>): PortalNotification[] {
  const map = new Map(prev.map((n) => [n.id, n]));
  for (const [id, row] of pending) map.set(id, row);
  // Newest first — keep the on-mount ordering invariant.
  return Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
