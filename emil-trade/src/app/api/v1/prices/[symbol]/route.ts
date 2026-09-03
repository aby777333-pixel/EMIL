// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Price API
// GET /api/v1/prices/[symbol] — Get latest price for a symbol
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const TWELVEDATA_KEY = process.env.TWELVEDATA_API_KEY || process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';

// Map our symbols to TwelveData format
const SYMBOL_MAP: Record<string, string> = {
  'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY',
  'USDCHF': 'USD/CHF', 'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD',
  'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP', 'EURJPY': 'EUR/JPY',
  'GBPJPY': 'GBP/JPY', 'XAUUSD': 'XAU/USD', 'XAGUSD': 'XAG/USD',
  'BTCUSD': 'BTC/USD', 'ETHUSD': 'ETH/USD',
  'USOIL': 'CL', 'UKOIL': 'BZ', 'NATGAS': 'NG',
  'US30': 'DJI', 'SPX500': 'SPX', 'NAS100': 'IXIC',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    const tdSymbol = SYMBOL_MAP[upperSymbol] || upperSymbol;

    if (!TWELVEDATA_KEY) {
      // Return mock price if no API key
      return NextResponse.json({
        symbol: upperSymbol,
        bid: 1.0832,
        ask: 1.0834,
        spread: 0.0002,
        timestamp: new Date().toISOString(),
        source: 'mock',
      });
    }

    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${TWELVEDATA_KEY}`,
      { next: { revalidate: 5 } } // cache for 5 seconds
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Price feed unavailable' }, { status: 502 });
    }

    const data = await res.json();
    const price = parseFloat(data.price || '0');

    // Simulate bid/ask from mid price
    const isJPY = upperSymbol.includes('JPY');
    const pipSize = isJPY ? 0.01 : 0.0001;
    const halfSpread = pipSize * 0.8; // ~0.8 pip spread

    return NextResponse.json({
      symbol: upperSymbol,
      mid: price,
      bid: price - halfSpread,
      ask: price + halfSpread,
      spread: halfSpread * 2,
      spreadPips: (halfSpread * 2) / pipSize,
      timestamp: new Date().toISOString(),
      source: 'twelvedata',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
