'use client';

import { useState } from 'react';
import { Clock, User } from 'lucide-react';
import type { BlogPost } from './page';

interface BlogClientProps {
  posts: BlogPost[];
  categoryConfig: Record<string, { label: string; color: string }>;
}

const categories = ['all', 'product', 'trading', 'brokers', 'technology'] as const;

export default function BlogClient({ posts, categoryConfig }: BlogClientProps) {
  const [active, setActive] = useState<string>('all');

  const filtered = active === 'all' ? posts : posts.filter(p => p.category === active);

  return (
    <>
      {/* Category Filter */}
      <div className="mb-8 flex gap-2">
        {categories.map(cat => {
          const isActive = active === cat;
          const label = cat === 'all' ? 'All' : categoryConfig[cat]?.label || cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: isActive ? 'none' : '1px solid var(--border)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Post Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(post => {
          const cat = categoryConfig[post.category];
          return (
            <article
              key={post.slug}
              className="group flex flex-col overflow-hidden rounded-xl transition-all hover:translate-y-[-2px]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {/* Image placeholder */}
              <div
                className="h-44 w-full"
                style={{
                  background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}08)`,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <span className="font-mono text-3xl font-bold" style={{ color: `${cat.color}44` }}>
                    R
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                {/* Category badge */}
                <span
                  className="mb-3 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: `${cat.color}18`, color: cat.color }}
                >
                  {cat.label}
                </span>

                <h2
                  className="text-lg font-bold leading-snug group-hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <a href={`/blog/${post.slug}`}>{post.title}</a>
                </h2>

                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {post.excerpt.slice(0, 140)}...
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {post.author}
                  </span>
                  <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>No posts in this category yet. Check back soon.</p>
        </div>
      )}
    </>
  );
}
