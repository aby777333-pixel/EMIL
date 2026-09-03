// Authenticated Raptor Market API — OHLC candles.
// GET /api/raptor/v1/candles?symbol=BTCUSDT&tf=1h&bars=200
import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/market/raptor-feed';
import { verifyKey } from '@/lib/market/raptor-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyKey(request);
  if (!auth.valid) return NextResponse.json({ error: 'invalid or missing Raptor API key' }, { status: 401 });
  const p = new URL(request.url).searchParams;
  const symbol = p.get('symbol');
  const tf = p.get('tf') || '1h';
  const bars = Math.min(parseInt(p.get('bars') || '200', 10) || 200, 1000);
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const candles = await getCandles(symbol, tf, bars);
  return NextResponse.json({ symbol: symbol.toUpperCase(), tf, count: candles.length, candles }, { headers: { 'Cache-Control': 'no-store' } });
}
