'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/format';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'today' | '7d' | '30d' | 'month' | 'lastMonth' | 'ytd' | 'all';

interface Preset {
  label: string;
  get: () => DateRange;
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

const PRESETS: Record<PresetKey, Preset> = {
  today: {
    label: 'Today',
    get: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  '7d': {
    label: 'Last 7 Days',
    get: () => {
      const to = endOfDay(new Date());
      const from = startOfDay(new Date());
      from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  '30d': {
    label: 'Last 30 Days',
    get: () => {
      const to = endOfDay(new Date());
      const from = startOfDay(new Date());
      from.setDate(from.getDate() - 29);
      return { from, to };
    },
  },
  month: {
    label: 'This Month',
    get: () => {
      const now = new Date();
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: endOfDay(now),
      };
    },
  },
  lastMonth: {
    label: 'Last Month',
    get: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  ytd: {
    label: 'YTD',
    get: () => ({
      from: startOfDay(new Date(new Date().getFullYear(), 0, 1)),
      to: endOfDay(new Date()),
    }),
  },
  all: {
    label: 'All Time',
    get: () => ({
      from: startOfDay(new Date(2020, 0, 1)),
      to: endOfDay(new Date()),
    }),
  },
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(formatDate(value.from));
  const [customTo, setCustomTo] = useState(formatDate(value.to));
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function applyPreset(key: PresetKey) {
    const range = PRESETS[key].get();
    setCustomFrom(formatDate(range.from));
    setCustomTo(formatDate(range.to));
    onChange(range);
    setOpen(false);
  }

  function applyCustom() {
    const from = new Date(customFrom + 'T00:00:00');
    const to = new Date(customTo + 'T23:59:59');
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
      onChange({ from, to });
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-secondary transition-colors',
          'hover:border-border-strong hover:text-foreground',
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatDisplay(value.from)} - {formatDisplay(value.to)}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-border-strong bg-elevated p-3 shadow-2xl">
          {/* Presets */}
          <div className="mb-3 grid grid-cols-2 gap-1">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="rounded-md px-2.5 py-1.5 text-left text-xs text-secondary transition-colors hover:bg-surface hover:text-foreground"
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mb-3 border-t border-border" />

          {/* Custom inputs */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Custom Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <button
              onClick={applyCustom}
              className="mt-1 w-full rounded-md bg-accent py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/80"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
