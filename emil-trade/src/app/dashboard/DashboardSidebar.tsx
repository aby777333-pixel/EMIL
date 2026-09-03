'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Monitor,
  Briefcase,
  History,
  Wallet,
  HeadphonesIcon,
  Settings,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Home,
  MoreHorizontal,
} from 'lucide-react';

// ─── 7 flat nav items. Essentials only. ─────────────────────
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/terminal', label: 'Terminal', icon: Monitor },
  { href: '/dashboard/positions', label: 'Positions', icon: Briefcase },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/support', label: 'Support', icon: HeadphonesIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const mobileTabItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/terminal', label: 'Terminal', icon: Monitor },
  { href: '/dashboard/positions', label: 'Positions', icon: Briefcase },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/settings', label: 'More', icon: MoreHorizontal },
];

interface DashboardSidebarProps {
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
}

export function DashboardSidebar({ userName, userEmail, userAvatar }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail[0]?.toUpperCase() ?? 'U';

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex h-full flex-col shrink-0 border-r transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div
          className="h-14 flex items-center px-4 shrink-0 gap-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0091D5] to-[#00A5A8] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold tracking-tight">R</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                RAPTOR
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Trading
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-white/[0.04] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* 7 flat nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                  }`}
                  style={{
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: active ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-2" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-7 h-7 rounded-full shrink-0" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                {initials}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {userName || userEmail}
                </div>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {mobileTabItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

interface DashboardTopBarProps {
  userName: string;
  userEmail: string;
}

export function DashboardTopBar({ userName, userEmail }: DashboardTopBarProps) {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail[0]?.toUpperCase() ?? 'U';

  return (
    <header
      className="h-12 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>/</span>
            )}
            {crumb.isLast ? (
              <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:underline transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--loss)]" />
        </button>
        <div className="hidden md:flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            {initials}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {userName || userEmail}
          </span>
        </div>
      </div>
    </header>
  );
}
