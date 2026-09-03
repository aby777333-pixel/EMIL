'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Search,
  Globe,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CommandPalette from './CommandPalette';
import NotificationDrawer from './NotificationDrawer';
import AccountSelector from './AccountSelector';
import { useNotifications } from './useNotifications';

interface PortalTopBarProps {
  userName: string;
  userEmail: string;
}

export default function PortalTopBar({ userName, userEmail }: PortalTopBarProps) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, loading: notifLoading, unreadCount, markRead, markAllRead } = useNotifications();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K toggles the command palette globally.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !isInputFocused) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const unread = unreadCount;
  const initials = (userName ?? userEmail ?? 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <header
        className="flex items-center gap-3 px-4 md:px-6 shrink-0 border-b"
        style={{
          height: 56,
          background: 'var(--g-bg-void)',
          borderColor: 'var(--g-border-hair)',
        }}
      >
        {/* ⌘K palette trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2.5 h-9 px-3 rounded-md text-[12px] transition-colors hover:bg-white/[0.03] flex-1 max-w-md"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--g-border-hair)',
            color: 'var(--g-text-muted)',
          }}
          aria-label="Open command palette"
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search modules, accounts, actions…</span>
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              borderColor: 'var(--g-border-soft)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <AccountSelector />

          {/* Language picker stub */}
          <button
            type="button"
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
            style={{
              color: 'var(--g-text-secondary)',
              border: '1px solid var(--g-border-soft)',
            }}
            title="Language (coming soon)"
          >
            <Globe size={13} />
            <span>EN</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="relative h-9 w-9 rounded-md flex items-center justify-center transition-colors hover:bg-white/[0.04]"
            style={{
              color: 'var(--g-text-secondary)',
              border: '1px solid var(--g-border-soft)',
            }}
            aria-label="Notifications"
          >
            <Bell size={14} />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 num text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{
                  width: 16, height: 16,
                  background: 'var(--g-accent)',
                  color: '#fff',
                  border: '2px solid var(--g-bg-void)',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Profile menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md transition-colors hover:bg-white/[0.04]"
              style={{ border: '1px solid var(--g-border-soft)' }}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span
                className="flex items-center justify-center text-[11px] font-bold rounded-full"
                style={{
                  width: 26, height: 26,
                  background: 'rgba(220,38,38,0.12)',
                  color: 'var(--g-accent)',
                }}
              >
                {initials}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--g-text-muted)' }} />
            </button>

            {profileOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 w-60 rounded-xl border z-50 py-1 g-fade-in"
                style={{
                  background: 'var(--g-bg-elevated)',
                  borderColor: 'var(--g-border-hair)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}
                role="menu"
              >
                <div
                  className="px-3 py-2.5 border-b"
                  style={{ borderColor: 'var(--g-border-hair)' }}
                >
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--g-text-primary)' }}>
                    {userName || userEmail.split('@')[0]}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--g-text-muted)' }}>
                    {userEmail}
                  </div>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--g-text-secondary)' }}
                >
                  <User size={13} /> Profile & KYC
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--g-text-secondary)' }}
                >
                  <Settings size={13} /> Settings
                </Link>
                <div className="border-t my-1" style={{ borderColor: 'var(--g-border-hair)' }} />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.04] text-left"
                  style={{ color: 'var(--g-text-secondary)' }}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        loading={notifLoading}
        onMarkAllRead={markAllRead}
        onMarkRead={(id) => markRead([id])}
      />
    </>
  );
}
