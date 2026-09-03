// EMIL TRADE — Unified Market API: OHLC candles
// GET /api/market/candles?symbol=BTCUSDT&tf=1h&bars=200
import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const symbol = p.get('symbol');
  const tf = p.get('tf') || '1h';
  const bars = Math.min(parseInt(p.get('bars') || '200', 10) || 200, 1000);
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const candles = await getCandles(symbol, tf, bars);
  // no-store: CDN keys by path, not the ?symbol= query (see quote route).
  return NextResponse.json(
    { symbol: symbol.toUpperCase(), tf, count: candles.length, candles },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
