'use client';

import { cn } from '@/lib/utils/format';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabGroup({ tabs, activeTab, onChange }: TabGroupProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors',
              active
                ? 'text-foreground'
                : 'text-secondary hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  active
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface text-muted',
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active indicator */}
            {active && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
