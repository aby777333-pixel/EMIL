// EMIL TRADE — market feed for the AI Strategy Lab
// GET /api/markets  →  { groups, symbols } in the lab's MarketTick shape.
// The lab is served same-origin at /ai-lab and calls this endpoint; on failure
// it falls back to its own mock data, so real prices are a pure upgrade.
import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

// Mirrors the lab's symbol universe + groups.
const GROUPS: Record<string, string[]> = {
  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP'],
  Stocks: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'],
  Crypto: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
  Indian: ['NIFTY50', 'SENSEX', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'RELIANCE', 'TCS', 'INFY', 'HDFC'],
  'India MCX': ['GOLDMCX', 'SILVERMCX', 'CRUDEMCX', 'NATGASMCX'],
  Metals: ['GOLD', 'SILVER', 'PLATINUM'],
  Energies: ['CRUDEOIL', 'NATURALGAS'],
  Indices: ['SPX500', 'DJI30', 'NASDAQ', 'FTSE100', 'DAX40', 'NIKKEI225'],
  CFDs: ['UK100', 'GER40', 'FRA40'],
};

const GROUP_OF: Record<string, string> = {};
for (const [g, syms] of Object.entries(GROUPS)) for (const s of syms) GROUP_OF[s] = g;

export async function GET() {
  const all = Object.values(GROUPS).flat();
  const quotes = await getQuotes(all);

  // If most providers failed, signal error so the lab uses its mock fallback.
  if (quotes.length < all.length * 0.4) {
    return NextResponse.json({ error: 'feed degraded' }, { status: 502 });
  }

  const symbols = quotes.map((q) => ({
    symbol: q.symbol,
    price: q.price,
    prev_close: q.prev_close,
    change_pct: q.change_pct,
    group: GROUP_OF[q.symbol] || 'Other',
    time: q.time,
    source: q.source,
  }));

  const groups: Record<string, typeof symbols> = {};
  for (const g of Object.keys(GROUPS)) groups[g] = [];
  for (const t of symbols) (groups[t.group] ||= []).push(t);

  return NextResponse.json(
    { groups, symbols },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } },
  );
}
