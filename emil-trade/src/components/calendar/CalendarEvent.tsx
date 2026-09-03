'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { CalendarEvent as CalendarEventType, CalendarImpact } from '@/lib/trading/calendar-data';
import { CURRENCY_COLORS } from '@/lib/trading/calendar-data';

function ImpactBars({ impact }: { impact: CalendarImpact }) {
  const filled = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  const color = impact === 'high' ? '#EF4444' : impact === 'medium' ? '#F59E0B' : '#FACC15';

  return (
    <div className="flex items-end gap-[2px]" title={`${impact} impact`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 4 + i * 3,
            borderRadius: 1,
            backgroundColor: i <= filled ? color : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

function getCountdown(datetime: Date): string | null {
  const now = Date.now();
  const diff = datetime.getTime() - now;
  if (diff <= 0) return null;

  const totalMin = Math.floor(diff / 60000);
  if (totalMin < 60) return `in ${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return `in ${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `in ${days}d ${remHours}h`;
}

function ValueCell({ label, value, highlight }: { label: string; value: string | null; highlight?: 'green' | 'red' | null }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="font-mono text-[12px] font-medium mt-0.5"
        style={{
          color: highlight === 'green'
            ? '#00C27A'
            : highlight === 'red'
              ? '#EF4444'
              : value
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
        }}
      >
        {value ?? '-'}
      </span>
    </div>
  );
}

export default function CalendarEvent({ event }: { event: CalendarEventType }) {
  const [countdown, setCountdown] = useState<string | null>(getCountdown(event.datetime));
  const isPast = event.datetime.getTime() < Date.now();

  useEffect(() => {
    if (isPast) return;
    const iv = setInterval(() => {
      setCountdown(getCountdown(event.datetime));
    }, 30000);
    return () => clearInterval(iv);
  }, [event.datetime, isPast]);

  // Determine actual highlight
  let actualHighlight: 'green' | 'red' | null = null;
  if (event.actual && event.forecast) {
    const actualNum = parseFloat(event.actual.replace(/[%KMBkTt,]/g, ''));
    const forecastNum = parseFloat(event.forecast.replace(/[%KMBkTt,]/g, ''));
    if (!isNaN(actualNum) && !isNaN(forecastNum)) {
      if (actualNum > forecastNum) actualHighlight = 'green';
      else if (actualNum < forecastNum) actualHighlight = 'red';
    }
  }

  const timeStr = event.datetime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const currencyColor = CURRENCY_COLORS[event.currency] || '#888';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
      style={{
        borderBottom: '1px solid var(--border)',
        opacity: isPast ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* Time */}
      <div className="flex items-center gap-1.5 min-w-[52px]">
        <Clock size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          {timeStr}
        </span>
      </div>

      {/* Currency badge */}
      <div
        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: `${currencyColor}20`,
          color: currencyColor,
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {event.currency}
      </div>

      {/* Impact */}
      <ImpactBars impact={event.impact} />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </span>
        <span className="text-[10px] truncate block mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {event.description}
        </span>
      </div>

      {/* Countdown or values */}
      <div className="flex items-center gap-3 shrink-0">
        <ValueCell label="Forecast" value={event.forecast} />
        <ValueCell label="Previous" value={event.previous} />
        <ValueCell label="Actual" value={event.actual} highlight={actualHighlight} />
      </div>

      {/* Countdown badge */}
      {countdown && !isPast && (
        <div
          className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: event.impact === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
            color: event.impact === 'high' ? '#EF4444' : 'var(--text-secondary)',
          }}
        >
          {countdown}
        </div>
      )}
    </div>
  );
}
