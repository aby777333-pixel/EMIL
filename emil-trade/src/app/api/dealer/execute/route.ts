// ===============================================================
// EMIL TRADE -- Dealer Execute Trade API
// POST /api/dealer/execute
// Validates state transition, records dealer action, updates
// trade status, recalculates exposure, and writes audit log.
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
  validateTransition,
  InvalidTransitionError,
} from '@/lib/dealer/state-machine';
import type {
  TradeStatus,
  DealerActionType,
  ExecutionResult,
  DealerAction,
} from '@/lib/dealer/types';

// -- Request schema ---------------------------------------------

const ExecuteTradeSchema = z.object({
  tradeId: z.string().uuid('tradeId must be a valid UUID'),
  action: z.enum([
    'force_close',
    'modify_sl',
    'modify_tp',
    'reject_order',
    'requote',
    'partial_fill',
    'mass_cancel',
    'override_routing',
    'margin_extension',
    'spread_override',
    'flag_client',
    'unflag_client',
    'approve_withdrawal',
    'suspend_account',
  ] as const),
  dealerId: z.string().uuid('dealerId must be a valid UUID'),
  reason: z.string().min(1, 'Reason is required').max(500),
  targetStatus: z.string().optional(),
  context: z.object({
    execution_mode: z.enum(['instant', 'market', 'exchange']).default('instant'),
    slippage: z.number().min(0).max(100).default(0),
    delay_ms: z.number().int().min(0).max(5000).default(0),
    fill_price: z.number().positive().optional(),
    partial_size: z.number().positive().optional(),
    new_sl: z.number().positive().optional(),
    new_tp: z.number().positive().optional(),
    requote_price: z.number().positive().optional(),
    override_routing: z.enum(['a_book', 'b_book', 'hybrid']).optional(),
  }).default({
    execution_mode: 'instant',
    slippage: 0,
    delay_ms: 0,
  }),
});

type ExecuteTradeBody = z.infer<typeof ExecuteTradeSchema>;

// -- Action-to-target-status mapping ----------------------------

const ACTION_STATUS_MAP: Partial<Record<DealerActionType, TradeStatus>> = {
  force_close: 'pending_close',
  reject_order: 'rejected',
  requote: 'pending_validation',
  partial_fill: 'partially_filled',
};

// -- Route handler ----------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate & authorize
    const auth = await requireBrokerAccess();
    if ('error' in auth) return auth.error;

    // 2. Validate request body
    const parsed = await validateBody(request, ExecuteTradeSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // 3. Fetch trade from DB (mocked)
    const trade = await fetchTrade(body.tradeId);
    if (!trade) {
      return problemResponse(
        404,
        'Trade Not Found',
        `No trade found with id ${body.tradeId}`,
        { instance: `/api/dealer/execute/${body.tradeId}` },
      );
    }

    // 4. Determine target status
    const targetStatus =
      (body.targetStatus as TradeStatus) ??
      ACTION_STATUS_MAP[body.action] ??
      trade.status;

    // 5. Validate state transition
    if (targetStatus !== trade.status) {
      try {
        validateTransition(trade.status, targetStatus);
      } catch (err) {
        if (err instanceof InvalidTransitionError) {
          return problemResponse(
            409,
            'Invalid State Transition',
            err.message,
            { instance: `/api/dealer/execute/${body.tradeId}` },
          );
        }
        throw err;
      }
    }

    // 6. Write dealer_action to DB (mocked)
    const dealerAction: DealerAction = {
      id: crypto.randomUUID(),
      dealer_id: body.dealerId,
      dealer_name: auth.user.email,
      action: body.action,
      target_type: 'trade',
      target_id: body.tradeId,
      details: body.context as Record<string, unknown>,
      reason: body.reason,
      approved_by: null,
      timestamp: new Date().toISOString(),
    };
    await writeDealerAction(dealerAction);

    // 7. Update trade status (mocked)
    const updatedTrade = await updateTradeStatus(
      body.tradeId,
      targetStatus,
      body.context.fill_price ?? null,
      body.context.partial_size ?? null,
    );

    // 8. Recalculate symbol exposure (mocked)
    const exposure = await recalculateExposure(trade.symbol);

    // 9. Write audit log (mocked)
    await writeAuditLog({
      event: 'dealer_execute',
      actor_id: body.dealerId,
      actor_email: auth.user.email,
      trade_id: body.tradeId,
      action: body.action,
      from_status: trade.status,
      to_status: targetStatus,
      details: body.context,
      timestamp: new Date().toISOString(),
    });

    // 10. Build execution result
    const result: ExecutionResult = {
      success: true,
      trade_id: body.tradeId,
      status: targetStatus,
      fill_price: body.context.fill_price ?? null,
      filled_size: body.context.partial_size ?? updatedTrade.filled_size,
      slippage_pips: body.context.slippage,
      latency_ms: body.context.delay_ms,
      routing_mode: body.context.override_routing ?? updatedTrade.routing_mode,
      lp_result: null,
      margin_check: null,
      routing_decision: null,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      data: result,
      dealer_action: dealerAction,
      exposure_update: exposure,
    }, { status: 200 });

  } catch (err) {
    console.error('[dealer/execute]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return internalError(message);
  }
}

// ===============================================================
// Mock DB functions — replace with Supabase when connected
// ===============================================================

async function fetchTrade(tradeId: string) {
  // TODO: Replace with supabase.from('trades').select('*').eq('id', tradeId).single()
  return {
    id: tradeId,
    status: 'filled' as TradeStatus,
    symbol: 'EURUSD',
    direction: 'buy' as const,
    requested_size: 1.0,
    filled_size: 1.0,
    remaining_size: 0,
    routing_mode: 'b_book' as const,
    fill_price: 1.08542,
    floating_pnl: 23.50,
    margin_used: 1085.42,
    updated_at: new Date().toISOString(),
  };
}

async function writeDealerAction(_action: DealerAction): Promise<void> {
  // TODO: Replace with supabase.from('dealer_actions').insert(action)
}

async function updateTradeStatus(
  _tradeId: string,
  _status: TradeStatus,
  _fillPrice: number | null,
  _partialSize: number | null,
) {
  // TODO: Replace with supabase.from('trades').update({ status, fill_price, ... }).eq('id', tradeId)
  return {
    filled_size: _partialSize ?? 1.0,
    routing_mode: 'b_book' as const,
  };
}

async function recalculateExposure(symbol: string) {
  // TODO: Fetch all open positions for symbol and run calculateExposure()
  return {
    symbol,
    net_position: 12.5,
    total_buy: 45.0,
    total_sell: 32.5,
    unrealized_pnl: 1250.00,
    risk_level: 'medium' as const,
    recalculated_at: new Date().toISOString(),
  };
}

async function writeAuditLog(_entry: Record<string, unknown>): Promise<void> {
  // TODO: Replace with supabase.from('audit_log').insert(entry)
  console.info('[AUDIT]', JSON.stringify(_entry));
}
