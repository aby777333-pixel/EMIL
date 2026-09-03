'use client';

import TopBar from '@/components/layout/TopBar';
import NewsFeed from '@/components/news/NewsFeed';

export default function NewsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex-1 overflow-hidden">
        <NewsFeed />
      </div>
    </div>
  );
}
