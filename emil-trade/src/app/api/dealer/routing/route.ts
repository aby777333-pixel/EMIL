// ===============================================================
// EMIL TRADE -- Dealer Routing Decision API
// POST /api/dealer/routing
// Accepts trade data and returns an AI routing decision
// (A-book / B-book / Hybrid) via the decision engine.
// ===============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateBody,
  problemResponse,
  internalError,
} from '@/lib/api/error-handler';
import { requireBrokerAccess } from '@/lib/api/role-guard';
import {
  computeRoutingDecision,
  type DecisionContext,
} from '@/lib/dealer/decision-engine';
import type {
  Trade,
  Client,
  SymbolExposure,
  NewsEvent,
  RoutingDecision,
} from '@/lib/dealer/types';

// -- Request schema ---------------------------------------------

const RoutingRequestSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20),
  client_id: z.string().uuid('client_id must be a valid UUID'),
  volume: z.number().positive('Volume must be positive'),
  direction: z.enum(['buy', 'sell']),
  requested_price: z.number().positive('Price must be positive'),
  trade_type: z.enum([
    'market', 'limit', 'stop', 'stop_limit', 'trailing_stop',
  ]).default('market'),
  account_id: z.string().uuid().optional(),
});

type RoutingRequestBody = z.infer<typeof RoutingRequestSchema>;

// -- Route handler ----------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate & authorize
    const auth = await requireBrokerAccess();
    if ('error' in auth) return auth.error;

    // 2. Validate request body
    const parsed = await validateBody(request, RoutingRequestSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // 3. Fetch client profile (mocked)
    const client = await fetchClient(body.client_id);
    if (!client) {
      return problemResponse(
        404,
        'Client Not Found',
        `No client found with id ${body.client_id}`,
        { instance: `/api/dealer/routing` },
      );
    }

    // 4. Fetch symbol exposure (mocked)
    const exposure = await fetchSymbolExposure(body.symbol);

    // 5. Fetch active news events (mocked)
    const activeNews = await fetchActiveNews(body.symbol);

    // 6. Build synthetic trade for the decision engine
    const syntheticTrade: Trade = {
      id: crypto.randomUUID(),
      account_id: body.account_id ?? crypto.randomUUID(),
      client_id: body.client_id,
      symbol: body.symbol,
      direction: body.direction,
      type: body.trade_type,
      status: 'routing',
      requested_price: body.requested_price,
      fill_price: null,
      requested_size: body.volume,
      filled_size: 0,
      remaining_size: body.volume,
      sl: null,
      tp: null,
      trailing_stop_pips: null,
      time_in_force: 'GTC',
      commission: 0,
      swap: 0,
      floating_pnl: 0,
      realized_pnl: null,
      routing_mode: null,
      lp_order_id: null,
      lp_fill_price: null,
      lp_name: null,
      slippage: 0,
      latency_ms: null,
      source: 'dealer_desk',
      comment: '',
      dealer_id: null,
      dealer_action: null,
      risk_score: client.risk_score,
      toxic_score: client.toxic_score,
      margin_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      filled_at: null,
      closed_at: null,
      expired_at: null,
    };

    // 7. Compute routing decision
    const ctx: DecisionContext = {
      trade: syntheticTrade,
      client,
      exposure,
      activeNews,
      symbolMaxLots: exposure?.max_exposure_lots ?? 100,
    };

    const decision: RoutingDecision = computeRoutingDecision(ctx);

    return NextResponse.json({
      data: decision,
      meta: {
        symbol: body.symbol,
        client_id: body.client_id,
        volume: body.volume,
        direction: body.direction,
        computed_at: decision.computed_at,
      },
    }, { status: 200 });

  } catch (err) {
    console.error('[dealer/routing]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return internalError(message);
  }
}

// ===============================================================
// Mock DB functions -- replace with Supabase when connected
// ===============================================================

async function fetchClient(clientId: string): Promise<Client | null> {
  // TODO: Replace with supabase.from('clients').select('*').eq('id', clientId).single()
  return {
    id: clientId,
    user_id: crypto.randomUUID(),
    full_name: 'Mock Client',
    email: 'mock@client.com',
    country: 'US',
    phone: null,
    kyc_status: 'approved',
    tier: 'silver',
    ib_id: null,
    ib_name: null,
    risk_score: 3,
    toxic_score: 1,
    total_deposits: 25000,
    total_withdrawals: 5000,
    total_volume_lots: 120,
    total_trades: 85,
    win_rate: 0.52,
    avg_hold_time_seconds: 3600,
    is_active: true,
    is_flagged: false,
    flag_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchSymbolExposure(symbol: string): Promise<SymbolExposure | null> {
  // TODO: Replace with real exposure query
  return {
    symbol,
    net_position: 8.5,
    total_buy: 32.0,
    total_sell: 23.5,
    unrealized_pnl: 750.00,
    client_count: 12,
    risk_level: 'medium',
    max_exposure_lots: 100,
    utilization_pct: 32.0,
    is_breached: false,
  };
}

async function fetchActiveNews(_symbol: string): Promise<NewsEvent[]> {
  // TODO: Replace with real news events query
  return [];
}
