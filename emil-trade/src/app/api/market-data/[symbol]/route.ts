// EMIL TRADE — candles for the AI Strategy Lab
// GET /api/market-data/BTCUSDT?timeframe=1H&bars=200
//   → { symbol, candles, indicators } in the lab's expected shape.
import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const p = new URL(request.url).searchParams;
  const tf = p.get('timeframe') || '1H';
  const bars = Math.min(parseInt(p.get('bars') || '200', 10) || 200, 1000);
  const candles = await getCandles(symbol, tf, bars);
  if (!candles.length) {
    return NextResponse.json({ error: 'no candles', symbol }, { status: 502 });
  }
  // no-store: the ?timeframe= query varies within one path; avoid CDN collisions.
  return NextResponse.json(
    { symbol: symbol.toUpperCase(), candles, indicators: {} },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
