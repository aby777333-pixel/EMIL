'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NewsItem, NewsImpact } from '@/lib/trading/news-data';
import { SOURCE_COLORS } from '@/lib/trading/news-data';
import { CURRENCY_COLORS } from '@/lib/trading/calendar-data';

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ImpactPill({ impact }: { impact: NewsImpact }) {
  const config = {
    high: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'HIGH' },
    medium: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'MED' },
    low: { bg: 'rgba(250,204,21,0.12)', color: '#FACC15', label: 'LOW' },
  }[impact];

  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export default function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const sourceColor = SOURCE_COLORS[item.source] || '#888';

  return (
    <div
      className="transition-colors cursor-pointer"
      style={{
        backgroundColor: '#111118',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = '#111118';
      }}
    >
      <div className="px-4 py-3">
        {/* Top row: source + time + impact */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${sourceColor}18`, color: sourceColor }}
          >
            {item.source}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(item.timestamp)}
          </span>
          <div className="flex-1" />
          <ImpactPill impact={item.impact} />
        </div>

        {/* Headline */}
        <h3 className="text-[13px] font-semibold leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {item.headline}
        </h3>

        {/* Currency badges */}
        <div className="flex items-center gap-1.5 mb-2">
          {item.currencies.map((cur) => {
            const color = CURRENCY_COLORS[cur] || '#888';
            return (
              <span
                key={cur}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${color}18`,
                  color: color,
                }}
              >
                {cur}
              </span>
            );
          })}
        </div>

        {/* Summary */}
        <p
          className="text-[11px] leading-relaxed"
          style={{
            color: 'var(--text-secondary)',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: expanded ? undefined : 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          {expanded ? item.fullContent : item.summary}
        </p>

        {/* Expand indicator */}
        <div className="flex items-center justify-center mt-1.5">
          {expanded ? (
            <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </div>
    </div>
  );
}
