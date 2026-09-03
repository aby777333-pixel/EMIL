'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  TrendingUp,
  Headphones,
  User,
} from 'lucide-react';

/**
 * Mobile-only bottom nav, 64px tall, glassmorphism background.
 * Five items per spec — Home, Wallet, Trade, Support, Profile.
 *
 * "Trade" opens the existing trading terminal in a new tab so users
 * keep the portal anchored.
 */
const ITEMS = [
  { href: '/dashboard',           label: 'Home',     icon: Home },
  { href: '/dashboard/wallet',    label: 'Wallet',   icon: Wallet },
  { href: 'https://zippy-piroshki-21aa30.netlify.app', label: 'Trade', icon: TrendingUp, external: true },
  { href: '/dashboard/support',   label: 'Support',  icon: Headphones },
  { href: '/dashboard/profile',   label: 'Profile',  icon: User },
] as const;

export default function PortalMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t"
      style={{
        height: 64,
        background: 'var(--g-bg-glass)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--g-border-hair)',
      }}
      aria-label="Primary"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          'external' in item && item.external
            ? false
            : item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

        const linkProps =
          'external' in item && item.external
            ? { target: '_blank' as const, rel: 'noopener noreferrer' }
            : {};

        return (
          <Link
            key={item.href}
            href={item.href}
            {...linkProps}
            className="flex flex-col items-center justify-center gap-1 flex-1 relative"
            style={{ color: active ? 'var(--g-accent)' : 'var(--g-text-secondary)' }}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-0 left-1/2 -translate-x-1/2"
                style={{
                  width: 28,
                  height: 3,
                  background: 'var(--g-accent)',
                  borderRadius: '0 0 3px 3px',
                }}
              />
            )}
            <Icon size={18} strokeWidth={active ? 2 : 1.6} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
