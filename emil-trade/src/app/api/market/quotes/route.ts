// EMIL TRADE — Unified Market API: batch quotes
// GET /api/market/quotes?symbols=EURUSD,AAPL,BTCUSDT,NIFTY50
import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('symbols') || '';
  const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
  if (!symbols.length) return NextResponse.json({ error: 'symbols required' }, { status: 400 });
  const quotes = await getQuotes(symbols);
  // no-store: CDN keys by path, not the ?symbols= query (see quote route).
  return NextResponse.json({ count: quotes.length, quotes }, { headers: { 'Cache-Control': 'no-store' } });
}
