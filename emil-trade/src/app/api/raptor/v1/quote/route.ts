// Authenticated Raptor Market API — single quote.
// GET /api/raptor/v1/quote?symbol=EURUSD
// Headers: x-raptor-key, x-raptor-secret  (or Authorization: Bearer key:secret)
import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/market/raptor-feed';
import { verifyKey } from '@/lib/market/raptor-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyKey(request);
  if (!auth.valid) return NextResponse.json({ error: 'invalid or missing Raptor API key' }, { status: 401 });
  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const q = await getQuote(symbol);
  if (!q) return NextResponse.json({ error: 'no data for symbol', symbol }, { status: 404 });
  return NextResponse.json(q, { headers: { 'Cache-Control': 'no-store' } });
}
