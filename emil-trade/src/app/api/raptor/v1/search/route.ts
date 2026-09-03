// Authenticated Raptor Market API — instrument search.
// GET /api/raptor/v1/search?q=apple
import { NextResponse } from 'next/server';
import { getSearch } from '@/lib/market/raptor-feed';
import { verifyKey } from '@/lib/market/raptor-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyKey(request);
  if (!auth.valid) return NextResponse.json({ error: 'invalid or missing Raptor API key' }, { status: 401 });
  const q = new URL(request.url).searchParams.get('q') || '';
  if (q.trim().length < 1) return NextResponse.json({ count: 0, results: [] });
  const results = await getSearch(q);
  return NextResponse.json({ count: results.length, results }, { headers: { 'Cache-Control': 'no-store' } });
}
