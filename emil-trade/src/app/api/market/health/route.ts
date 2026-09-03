// EMIL TRADE — Unified Market API: provider health
// GET /api/market/health
import { NextResponse } from 'next/server';
import { feedHealth } from '@/lib/market/raptor-feed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(feedHealth(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
