'use client';

import { useState, useMemo } from 'react';
import { Newspaper, Clock, ExternalLink } from 'lucide-react';
import { generateNewsItems, SOURCE_COLORS, type NewsCategory } from '@/lib/trading/news-data';
import { cn } from '@/lib/utils/format';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'indices', label: 'Indices' },
  { id: 'central-banks', label: 'Central Banks' },
];

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsPage() {
  const [filter, setFilter] = useState('all');
  const news = useMemo(() => generateNewsItems(), []);

  const filtered = filter === 'all' ? news : news.filter((n) => n.category === filter);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">Market News</h1>

      {/* Category filter */}
      <div className="flex items-center gap-1 border-b border-border">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={cn(
              'relative px-3 py-2.5 text-xs font-medium transition-colors',
              filter === cat.id ? 'text-foreground' : 'text-secondary hover:text-foreground'
            )}
          >
            {cat.label}
            {filter === cat.id && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* News Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-border bg-elevated p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                style={{
                  backgroundColor: (SOURCE_COLORS[item.source] ?? '#6B7280') + '15',
                  color: SOURCE_COLORS[item.source] ?? '#6B7280',
                }}
              >
                {item.source}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <Clock className="h-3 w-3" />
                {timeAgo(item.timestamp)}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {item.headline}
            </h3>

            <p className="text-xs text-secondary line-clamp-3">{item.summary}</p>

            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex gap-1.5">
                {item.currencies.slice(0, 3).map((cur) => (
                  <span key={cur} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {cur}
                  </span>
                ))}
              </div>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  item.impact === 'high' ? 'bg-loss/15 text-loss' : item.impact === 'medium' ? 'bg-gold/15 text-gold' : 'bg-secondary/15 text-secondary'
                )}
              >
                {item.impact}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
