'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Activity,
  DollarSign,
  Receipt,
  Waves,
  ToggleLeft,
  Database,
  Rocket,
  FlaskConical,
  ShieldCheck,
  Fingerprint,
  Lock,
  ScrollText,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Bell,
  Monitor,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { href: '/terminal', label: 'Trading Terminal', icon: Monitor },
  { href: '/dashboard', label: 'Trader Dashboard', icon: ExternalLink },
  { href: '/broker/overview', label: 'Broker Panel', icon: Building2 },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/brokers', label: 'Brokers', icon: Building2 },
  { href: '/admin/health', label: 'System Health', icon: Activity },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/billing', label: 'Billing', icon: Receipt },
  { href: '/admin/liquidity', label: 'Liquidity', icon: Waves },
  { href: '/admin/features', label: 'Features', icon: ToggleLeft },
  { href: '/admin/warehouse', label: 'Warehouse', icon: Database },
  { href: '/admin/releases', label: 'Releases', icon: Rocket },
  { href: '/admin/sandbox', label: 'Sandbox', icon: FlaskConical },
  { href: '/admin/dr', label: 'DR', icon: ShieldCheck },
  { href: '/admin/identity', label: 'Identity', icon: Fingerprint },
  { href: '/admin/privacy', label: 'Privacy', icon: Lock },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
];

interface AdminSidebarProps {
  userEmail: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`hidden md:flex h-full flex-col shrink-0 border-r transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo header */}
      <div
        className="h-14 flex items-center px-4 shrink-0 gap-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0091D5] to-[#0091D5]/60 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">G</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              EMIL Trade
            </div>
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--gold)' }}
            >
              Super Admin
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 hide-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors ${
                collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-1.5'
              }`}
              style={{
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--accent-glow)' : undefined,
              }}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 p-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-2.5 py-2">
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {collapsed ? '' : userEmail}
          </div>
        </div>
        <Link
          href="/auth/login"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/[0.04] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-[13px]">Sign Out</span>}
        </Link>
      </div>
    </aside>
  );
}
