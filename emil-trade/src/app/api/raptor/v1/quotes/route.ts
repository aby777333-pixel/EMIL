// Authenticated Raptor Market API — batch quotes.
// GET /api/raptor/v1/quotes?symbols=AAPL,BTCUSDT,NIFTY50
import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/market/raptor-feed';
import { verifyKey } from '@/lib/market/raptor-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyKey(request);
  if (!auth.valid) return NextResponse.json({ error: 'invalid or missing Raptor API key' }, { status: 401 });
  const raw = new URL(request.url).searchParams.get('symbols') || '';
  const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
  if (!symbols.length) return NextResponse.json({ error: 'symbols required' }, { status: 400 });
  const quotes = await getQuotes(symbols);
  return NextResponse.json({ count: quotes.length, quotes }, { headers: { 'Cache-Control': 'no-store' } });
}
