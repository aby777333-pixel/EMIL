'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/settings/security',      label: 'Security' },
  { href: '/dashboard/settings/preferences',   label: 'Preferences' },
  { href: '/dashboard/settings/notifications', label: 'Notifications' },
  { href: '/dashboard/settings/sessions',      label: 'Sessions' },
  { href: '/dashboard/settings/api-keys',      label: 'API keys' },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      className="flex items-center gap-1 overflow-x-auto border-b mb-6"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className="text-[13px] px-3 py-2.5 transition-colors relative whitespace-nowrap"
            style={{ color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)' }}
          >
            {tab.label}
            {active && (
              <span
                aria-hidden
                className="absolute bottom-0 left-2 right-2 h-px"
                style={{ background: 'var(--g-accent)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
