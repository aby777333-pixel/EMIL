// EMIL TRADE — Unified Market API: financial news
// GET /api/market/news?q=nifty&limit=10
import { NextResponse } from 'next/server';
import { getNews } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const q = p.get('q') || '';
  const limit = Math.min(parseInt(p.get('limit') || '10', 10) || 10, 30);
  const items = await getNews(q, limit);
  // no-store: CDN keys by path, not the ?q= query.
  return NextResponse.json({ count: items.length, items }, { headers: { 'Cache-Control': 'no-store' } });
}
