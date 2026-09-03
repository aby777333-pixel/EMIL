'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateCalendarEvents, CURRENCY_COLORS, type CalendarEvent } from '@/lib/trading/calendar-data';
import { cn } from '@/lib/utils/format';

export default function CalendarPage() {
  const events = useMemo(() => generateCalendarEvents(), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  function prevMonth() {
    setViewMonth((v) => {
      const m = v.month - 1;
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m };
    });
  }

  function nextMonth() {
    setViewMonth((v) => {
      const m = v.month + 1;
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m };
    });
  }

  // Events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    events.forEach((e) => {
      const d = e.datetime;
      if (d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(e);
      }
    });
    return map;
  }, [events, viewMonth]);

  // Upcoming events
  const upcoming = events
    .filter((e) => e.datetime.getTime() > Date.now())
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
    .slice(0, 15);

  const impactBadge = (impact: string) => {
    const cls = impact === 'high'
      ? 'bg-loss/15 text-loss'
      : impact === 'medium'
        ? 'bg-gold/15 text-gold'
        : 'bg-secondary/15 text-secondary';
    return (
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', cls)}>
        {impact}
      </span>
    );
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">Economic Calendar</h1>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border bg-elevated p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-surface transition-colors text-secondary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-surface transition-colors text-secondary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-muted">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === today.getDate() && viewMonth.month === today.getMonth() && viewMonth.year === today.getFullYear();
            const hasHigh = dayEvents.some((e) => e.impact === 'high');
            const hasMedium = dayEvents.some((e) => e.impact === 'medium');

            return (
              <div
                key={day}
                className={cn(
                  'rounded-md p-1 text-center min-h-[48px] flex flex-col items-center',
                  isToday && 'ring-1 ring-accent',
                  dayEvents.length > 0 ? 'bg-surface/40' : 'bg-surface/10'
                )}
              >
                <span className={cn('text-[10px]', isToday ? 'font-bold text-accent' : 'text-muted')}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasHigh && <div className="h-1.5 w-1.5 rounded-full bg-loss" />}
                    {hasMedium && <div className="h-1.5 w-1.5 rounded-full bg-gold" />}
                    {!hasHigh && !hasMedium && <div className="h-1.5 w-1.5 rounded-full bg-secondary" />}
                  </div>
                )}
                {dayEvents.length > 0 && (
                  <span className="text-[9px] text-muted">{dayEvents.length}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming Events</h3>
        <div className="space-y-2">
          {upcoming.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded-lg bg-surface/40 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: (CURRENCY_COLORS[ev.currency] ?? '#6B7280') + '20',
                    color: CURRENCY_COLORS[ev.currency] ?? '#6B7280',
                  }}
                >
                  {ev.currency}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted">
                    {ev.datetime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                    {ev.datetime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right text-[10px]">
                  {ev.forecast && (
                    <span className="text-secondary">F: {ev.forecast}</span>
                  )}
                  {ev.previous && (
                    <span className="text-muted ml-2">P: {ev.previous}</span>
                  )}
                </div>
                {impactBadge(ev.impact)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
