// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Twelve Data Proxy API Route
// Proxies requests to Twelve Data to hide API key server-side
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.twelvedata.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'EUR/USD';
  const endpoint = searchParams.get('endpoint') || 'quote';
  const interval = searchParams.get('interval') || '1h';
  const outputsize = searchParams.get('outputsize') || '100';

  const apiKey = process.env.TWELVEDATA_API_KEY || process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || 'demo';

  try {
    let url = '';

    switch (endpoint) {
      case 'quote':
        url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        break;
      case 'time_series':
        url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
        break;
      default: {
        // Generic indicator endpoint
        url = `${BASE_URL}/${endpoint}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&apikey=${apiKey}`;
        // Pass through additional params
        for (const [key, value] of searchParams.entries()) {
          if (!['symbol', 'endpoint', 'interval', 'outputsize'].includes(key)) {
            url += `&${key}=${value}`;
          }
        }
        break;
      }
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'EMIL-Trade/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Twelve Data API error', status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from Twelve Data', message: String(error) },
      { status: 500 }
    );
  }
}
