// EMIL TRADE — Unified Market API: single quote
// GET /api/market/quote?symbol=EURUSD
import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const q = await getQuote(symbol);
  if (!q) return NextResponse.json({ error: 'no data for symbol', symbol }, { status: 404 });
  // no-store: Netlify's CDN keys function responses by path (not query), so a
  // shared cache here would serve one symbol's price for every symbol. The
  // upstream provider fetches are still deduped by the data-layer fetch cache.
  return NextResponse.json(q, { headers: { 'Cache-Control': 'no-store' } });
}
