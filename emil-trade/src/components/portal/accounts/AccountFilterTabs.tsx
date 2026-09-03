'use client';

export type AccountFilter = 'all' | 'live' | 'demo' | 'archived';

const TABS: { id: AccountFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'live',     label: 'Live' },
  { id: 'demo',     label: 'Demo' },
  { id: 'archived', label: 'Archived' },
];

/**
 * Underlined filter strip at the top of the accounts list. Counts are
 * shown next to each tab so the user can see archived activity without
 * having to switch first.
 */
export default function AccountFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: AccountFilter;
  onChange: (next: AccountFilter) => void;
  counts: Record<AccountFilter, number>;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-1 mb-5 border-b"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="text-[13px] px-3 py-2.5 transition-colors relative"
            style={{
              color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
            }}
          >
            <span>{tab.label}</span>
            <span className="num text-[10px] ml-1.5" style={{ color: 'var(--g-text-muted)' }}>
              {counts[tab.id]}
            </span>
            {active && (
              <span
                aria-hidden
                className="absolute bottom-0 left-2 right-2 h-px"
                style={{ background: 'var(--g-accent)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
