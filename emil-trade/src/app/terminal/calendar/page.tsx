'use client';

import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import CalendarEventComponent from '@/components/calendar/CalendarEvent';
import { generateCalendarEvents, CURRENCY_COLORS } from '@/lib/trading/calendar-data';
import type { CalendarImpact } from '@/lib/trading/calendar-data';
import { cn } from '@/lib/utils/format';

type DateRange = 'today' | 'week' | 'month';
const CURRENCIES = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
const IMPACTS: ('All' | CalendarImpact)[] = ['All', 'high', 'medium', 'low'];

export default function CalendarPage() {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('All');
  const [selectedImpact, setSelectedImpact] = useState<'All' | CalendarImpact>('All');
  const [dateOffset, setDateOffset] = useState(0);

  const allEvents = useMemo(() => generateCalendarEvents(), []);

  // Filter events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter((ev) => {
      // Currency filter
      if (selectedCurrency !== 'All' && ev.currency !== selectedCurrency) return false;
      // Impact filter
      if (selectedImpact !== 'All' && ev.impact !== selectedImpact) return false;
      // Date range filter
      if (dateRange === 'today') {
        const target = new Date(now);
        target.setDate(target.getDate() + dateOffset);
        return (
          ev.datetime.getFullYear() === target.getFullYear() &&
          ev.datetime.getMonth() === target.getMonth() &&
          ev.datetime.getDate() === target.getDate()
        );
      }
      // week and month show all by default
      return true;
    });
  }, [allEvents, selectedCurrency, selectedImpact, dateRange, dateOffset]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of filteredEvents) {
      const key = ev.datetime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  const impactLabel = (imp: 'All' | CalendarImpact) => {
    if (imp === 'All') return 'All';
    return imp.charAt(0).toUpperCase() + imp.slice(1);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />

      {/* Date navigation */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0 flex-wrap"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Range buttons */}
        <div className="flex items-center gap-1">
          {(['today', 'week', 'month'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setDateOffset(0); }}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                dateRange === r ? 'opacity-100' : 'opacity-50 hover:opacity-70'
              )}
              style={{
                backgroundColor: dateRange === r ? 'var(--bg-elevated)' : 'transparent',
                color: dateRange === r ? '#0091D5' : 'var(--text-secondary)',
              }}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Date picker arrows (for today mode) */}
        {dateRange === 'today' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDateOffset((o) => o - 1)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setDateOffset(0)}
              className="px-2 py-0.5 rounded text-[10px] font-mono hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {new Date(Date.now() + dateOffset * 86400000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </button>
            <button
              onClick={() => setDateOffset((o) => o + 1)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Currency filter */}
        <div className="flex items-center gap-1">
          {CURRENCIES.map((cur) => (
            <button
              key={cur}
              onClick={() => setSelectedCurrency(cur)}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
              style={{
                backgroundColor:
                  selectedCurrency === cur
                    ? cur === 'All'
                      ? 'var(--bg-elevated)'
                      : `${CURRENCY_COLORS[cur] || '#888'}20`
                    : 'transparent',
                color:
                  selectedCurrency === cur
                    ? cur === 'All'
                      ? 'var(--text-primary)'
                      : CURRENCY_COLORS[cur] || '#888'
                    : 'var(--text-muted)',
                border: selectedCurrency === cur ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
            >
              {cur}
            </button>
          ))}
        </div>

        {/* Impact filter */}
        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />
        <div className="flex items-center gap-1">
          {IMPACTS.map((imp) => (
            <button
              key={imp}
              onClick={() => setSelectedImpact(imp)}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: selectedImpact === imp ? 'var(--bg-elevated)' : 'transparent',
                color:
                  selectedImpact === imp
                    ? imp === 'high'
                      ? '#EF4444'
                      : imp === 'medium'
                        ? '#F59E0B'
                        : imp === 'low'
                          ? '#FACC15'
                          : 'var(--text-primary)'
                    : 'var(--text-muted)',
                border: selectedImpact === imp ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
            >
              {impactLabel(imp)}
            </button>
          ))}
        </div>
      </div>

      {/* Events timeline */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No events found for the selected filters.
            </span>
          </div>
        )}
        {grouped.map(([dateLabel, events]) => (
          <div key={dateLabel}>
            {/* Date header */}
            <div
              className="sticky top-0 z-10 px-4 py-1.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {dateLabel}
              </span>
              <span className="text-[10px] ml-2 font-mono" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Events */}
            {events.map((ev) => (
              <CalendarEventComponent key={ev.id} event={ev} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
