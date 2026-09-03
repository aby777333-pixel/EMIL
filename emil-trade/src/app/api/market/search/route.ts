// EMIL TRADE — Unified Market API: instrument search
// GET /api/market/search?q=apple  →  matching stocks, forex, indices, crypto.
import { NextResponse } from 'next/server';
import { getSearch } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') || '';
  if (q.trim().length < 1) return NextResponse.json({ count: 0, results: [] });
  const results = await getSearch(q);
  // no-store: CDN keys by path, not the ?q= query.
  return NextResponse.json({ count: results.length, results }, { headers: { 'Cache-Control': 'no-store' } });
}
