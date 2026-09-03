'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  CreditCard,
  Settings,
  BarChart3,
  Bell,
  LogOut,
  Gauge,
  Monitor,
  Network,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

// ─── Core nav items. Flat. No sub-menus. ───────────────────
const NAV_ITEMS = [
  { href: '/broker/overview', label: 'Dashboard', icon: BarChart3 },
  { href: '/terminal', label: 'Platform', icon: Monitor },
  { href: '/dealer', label: 'Dealer', icon: Gauge },
  { href: '/broker/dealing-desk', label: 'Dealing Desk', icon: Gauge },
  { href: '/broker/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/broker/clients', label: 'Clients', icon: Users },
  { href: '/broker/payments', label: 'Finance', icon: CreditCard },
  { href: '/broker/crm', label: 'CRM', icon: LayoutDashboard },
  { href: '/broker/ib-management', label: 'IB & Affiliates', icon: Network },
  { href: '/broker/settings', label: 'Settings', icon: Settings },
];

interface BrokerSidebarProps {
  brokerName: string;
  userEmail: string;
  environment?: 'LIVE' | 'SANDBOX';
}

export function BrokerSidebar({ brokerName, userEmail, environment = 'LIVE' }: BrokerSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/broker/overview') return pathname === '/broker' || pathname === '/broker/overview';
    return pathname.startsWith(href);
  };

  return (
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0091D5] to-[#009B4D] flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">R</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              RAPTOR
            </div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Broker
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

      {/* Footer */}
      <div className="shrink-0 p-2" style={{ borderTop: '1px solid var(--border)' }}>
        {!collapsed && (
          <div className="px-3 py-2 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {userEmail}
          </div>
        )}
        <Link
          href="/auth/login"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-[13px]">Sign Out</span>}
        </Link>
      </div>
    </aside>
  );
}

interface BrokerTopBarProps {
  brokerName: string;
  userEmail: string;
  environment?: 'LIVE' | 'SANDBOX';
}

export function BrokerTopBar({ brokerName, userEmail, environment = 'LIVE' }: BrokerTopBarProps) {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <header
      className="h-12 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: broker name + environment badge + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {brokerName}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            environment === 'LIVE'
              ? 'bg-[var(--accent-green-glow)] text-[var(--accent-green)]'
              : 'bg-[var(--gold-glow)] text-[var(--gold)]'
          }`}
        >
          {environment}
        </span>
        <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>/</span>
          {breadcrumbs.slice(1).map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {crumb.isLast ? (
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--loss)]" />
        </button>
        <span className="hidden md:block text-xs mono" style={{ color: 'var(--text-muted)' }}>
          {userEmail}
        </span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)' }}
        >
          {(userEmail[0] ?? 'B').toUpperCase()}
        </div>
      </div>
    </header>
  );
}
