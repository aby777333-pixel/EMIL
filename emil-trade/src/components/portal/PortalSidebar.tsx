'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Briefcase,
  Users,
  PieChart,
  Network,
  ShieldCheck,
  Headphones,
  Settings,
  PanelLeftClose,
  PanelLeft,
  TrendingUp,
} from 'lucide-react';
import Logo from '@/components/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  external?: boolean;
}

/**
 * Eight-item portal navigation per spec — every item must be a discrete
 * portal module, not a marketing surface.  Order is intentional: most
 * frequent at top, settings + support pinned at bottom.
 */
const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',                 label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/wallet',          label: 'Wallet',        icon: Wallet },
  { href: '/dashboard/accounts',        label: 'Accounts',      icon: Briefcase },
  { href: 'https://zippy-piroshki-21aa30.netlify.app/copy', label: 'Copy Trading',  icon: Users,    external: true },
  { href: 'https://zippy-piroshki-21aa30.netlify.app/pamm', label: 'PAMM',          icon: PieChart, external: true },
  { href: '/dashboard/referrals',       label: 'IB Network',    icon: Network },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/dashboard/profile',         label: 'KYC & Profile', icon: ShieldCheck },
  { href: '/dashboard/support',         label: 'Support',       icon: Headphones },
  { href: '/dashboard/settings',        label: 'Settings',      icon: Settings },
];

const STORAGE_KEY = 'gio.portal.sidebar.collapsed';

export default function PortalSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse preference per device.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 border-r transition-[width] duration-200 ease-out"
      style={{
        width: collapsed ? 72 : 240,
        backgroundColor: 'var(--g-bg-void)',
        borderColor: 'var(--g-border-hair)',
      }}
    >
      {/* Brand block */}
      <div
        className="h-14 flex items-center shrink-0 border-b"
        style={{
          paddingLeft: collapsed ? 16 : 16,
          paddingRight: collapsed ? 16 : 12,
          borderColor: 'var(--g-border-hair)',
        }}
      >
        <Link href="/dashboard" className="flex items-center min-w-0" aria-label="EMIL TRADE home">
          {collapsed ? (
            <Logo height={24} iconOnly theme="dark" />
          ) : (
            <Logo height={24} theme="dark" />
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="ml-auto p-1.5 rounded transition-colors"
            style={{ color: 'var(--g-text-muted)' }}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav
        className="flex-1 overflow-y-auto py-3"
        style={{ paddingLeft: 8, paddingRight: 8 }}
      >
        <NavList items={PRIMARY_NAV} collapsed={collapsed} isActive={isActive} />

        <div className="my-3 mx-3 border-t" style={{ borderColor: 'var(--g-border-hair)' }} />

        <NavList items={SECONDARY_NAV} collapsed={collapsed} isActive={isActive} />
      </nav>

      {/* Footer — open the trading hub (new app) in a new tab */}
      <div
        className="shrink-0 p-2 border-t"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <Link
          href="https://zippy-piroshki-21aa30.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors"
          style={{
            color: 'var(--g-accent)',
            padding: collapsed ? '10px' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            border: '1px solid rgba(220,38,38,0.25)',
            background: 'rgba(220,38,38,0.06)',
          }}
          title={collapsed ? 'Open trading terminal' : undefined}
        >
          <TrendingUp size={16} strokeWidth={1.8} />
          {!collapsed && <span>Open terminal</span>}
        </Link>

        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="w-full mt-2 flex items-center justify-center p-2 rounded transition-colors"
            style={{ color: 'var(--g-text-muted)' }}
            aria-label="Expand sidebar"
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}

function NavList({
  items,
  collapsed,
  isActive,
}: {
  items: NavItem[];
  collapsed: boolean;
  isActive: (href: string) => boolean;
}) {
  return (
    <ul className="space-y-0.5 list-none m-0 p-0">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                padding: collapsed ? '10px' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                position: 'relative',
              }}
            >
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 2,
                    height: 16,
                    background: 'var(--g-accent)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <Icon size={16} strokeWidth={active ? 1.9 : 1.5} />
              {!collapsed && item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
