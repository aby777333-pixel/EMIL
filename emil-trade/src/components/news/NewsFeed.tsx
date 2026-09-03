'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import NewsCard from '@/components/news/NewsCard';
import { generateNewsItems } from '@/lib/trading/news-data';
import type { NewsCategory } from '@/lib/trading/news-data';
import { cn } from '@/lib/utils/format';

const CATEGORIES: { key: 'all' | NewsCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'forex', label: 'Forex' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'indices', label: 'Indices' },
  { key: 'central-banks', label: 'Central Banks' },
];

export default function NewsFeed() {
  const [category, setCategory] = useState<'all' | NewsCategory>('all');
  const [search, setSearch] = useState('');

  const allNews = useMemo(() => generateNewsItems(), []);

  const filtered = useMemo(() => {
    return allNews.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.headline.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.currencies.some((c) => c.toLowerCase().includes(q)) ||
          item.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allNews, category, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0 flex-wrap"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Category tabs */}
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                category === cat.key ? 'opacity-100' : 'opacity-50 hover:opacity-70'
              )}
              style={{
                backgroundColor: category === cat.key ? 'var(--bg-elevated)' : 'transparent',
                color: category === cat.key ? '#0091D5' : 'var(--text-secondary)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] w-36"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} articles
        </span>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No news found for the selected filters.
            </span>
          </div>
        )}
        {filtered.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
