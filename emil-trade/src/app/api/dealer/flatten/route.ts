// ===============================================================
// EMIL TRADE -- Emergency Flatten API
// POST /api/dealer/flatten
// Closes all open positions, creates system alert, writes audit.
// Requires gio4x_admin or broker_admin role.
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
  isValidTransition,
  buildTransitionContext,
} from '@/lib/dealer/state-machine';
import type {
  Trade,
  TradeStatus,
  SystemAlert,
  TransitionContext,
} from '@/lib/dealer/types';

// -- Request schema ---------------------------------------------

const FlattenRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000),
  symbol: z.string().max(20).optional(),
  account_id: z.string().uuid().optional(),
  confirm: z.literal(true, {
    error: 'Explicit confirmation required: set confirm to true',
  }),
});

type FlattenRequestBody = z.infer<typeof FlattenRequestSchema>;

// -- Allowed source states for force close ----------------------

const FORCE_CLOSABLE_STATES: ReadonlySet<TradeStatus> = new Set<TradeStatus>([
  'filled',
  'partially_filled',
  'pending_lp',
  'lp_accepted',
]);

const FORCE_CLOSE_TARGET: TradeStatus = 'pending_close';

// -- Route handler ----------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate & authorize (broker_admin or gio4x_admin)
    const auth = await requireBrokerAccess();
    if ('error' in auth) return auth.error;

    // 2. Validate request body
    const parsed = await validateBody(request, FlattenRequestSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // 3. Fetch all open positions (mocked)
    const openPositions = await fetchOpenPositions(
      body.symbol ?? null,
      body.account_id ?? null,
    );

    if (openPositions.length === 0) {
      return problemResponse(
        404,
        'No Open Positions',
        'No open positions found matching the given filters',
        { instance: '/api/dealer/flatten' },
      );
    }

    // 4. Transition each position to pending_close
    const results: FlattenResult[] = [];
    const transitions: TransitionContext[] = [];
    const errors: { trade_id: string; reason: string }[] = [];

    for (const trade of openPositions) {
      if (!FORCE_CLOSABLE_STATES.has(trade.status)) {
        errors.push({
          trade_id: trade.id,
          reason: `Cannot force-close from status "${trade.status}"`,
        });
        continue;
      }

      if (!isValidTransition(trade.status, FORCE_CLOSE_TARGET)) {
        errors.push({
          trade_id: trade.id,
          reason: `Invalid transition: "${trade.status}" -> "${FORCE_CLOSE_TARGET}"`,
        });
        continue;
      }

      // Build transition context for audit
      const transition = buildTransitionContext(
        trade.id,
        trade.status,
        FORCE_CLOSE_TARGET,
        'dealer',
        `Emergency flatten: ${body.reason}`,
        {
          initiated_by: auth.user.id,
          flatten_request: true,
          symbol_filter: body.symbol ?? null,
          account_filter: body.account_id ?? null,
        },
      );
      transitions.push(transition);

      // Update trade status (mocked)
      await updateTradeStatus(trade.id, FORCE_CLOSE_TARGET);

      results.push({
        trade_id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        size: trade.filled_size,
        from_status: trade.status,
        to_status: FORCE_CLOSE_TARGET,
      });
    }

    // 5. Create system alert (mocked)
    const alert: SystemAlert = {
      id: crypto.randomUUID(),
      severity: 'emergency',
      category: 'exposure_breach',
      title: 'Emergency Flatten Executed',
      message: `${results.length} position(s) force-closed by ${auth.user.email}. Reason: ${body.reason}`,
      source: 'dealer_desk',
      target_type: body.symbol ? 'symbol' : null,
      target_id: body.symbol ?? null,
      acknowledged: false,
      acknowledged_by: null,
      acknowledged_at: null,
      auto_resolved: false,
      created_at: new Date().toISOString(),
    };
    await writeSystemAlert(alert);

    // 6. Write audit log (mocked)
    await writeAuditLog({
      event: 'emergency_flatten',
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      positions_closed: results.length,
      positions_failed: errors.length,
      symbol_filter: body.symbol ?? null,
      account_filter: body.account_id ?? null,
      reason: body.reason,
      trade_ids: results.map((r) => r.trade_id),
      alert_id: alert.id,
      timestamp: new Date().toISOString(),
    });

    // 7. Return summary
    return NextResponse.json({
      data: {
        positions_closed: results.length,
        positions_failed: errors.length,
        total_positions: openPositions.length,
        closed: results,
        errors: errors.length > 0 ? errors : undefined,
        alert_id: alert.id,
      },
      meta: {
        initiated_by: auth.user.email,
        reason: body.reason,
        symbol_filter: body.symbol ?? null,
        account_filter: body.account_id ?? null,
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (err) {
    console.error('[dealer/flatten]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return internalError(message);
  }
}

// -- Types ------------------------------------------------------

interface FlattenResult {
  trade_id: string;
  symbol: string;
  direction: string;
  size: number;
  from_status: TradeStatus;
  to_status: TradeStatus;
}

// ===============================================================
// Mock DB functions -- replace with Supabase when connected
// ===============================================================

async function fetchOpenPositions(
  symbol: string | null,
  accountId: string | null,
): Promise<Pick<Trade, 'id' | 'status' | 'symbol' | 'direction' | 'filled_size' | 'account_id'>[]> {
  // TODO: Replace with supabase query:
  //   supabase.from('trades')
  //     .select('id, status, symbol, direction, filled_size, account_id')
  //     .in('status', ['filled', 'partially_filled', 'pending_lp', 'lp_accepted'])
  //     .modify(q => { if (symbol) q.eq('symbol', symbol); if (accountId) q.eq('account_id', accountId); })
  const mockPositions: Pick<Trade, 'id' | 'status' | 'symbol' | 'direction' | 'filled_size' | 'account_id'>[] = [
    {
      id: crypto.randomUUID(),
      status: 'filled',
      symbol: symbol ?? 'EURUSD',
      direction: 'buy',
      filled_size: 2.5,
      account_id: accountId ?? crypto.randomUUID(),
    },
    {
      id: crypto.randomUUID(),
      status: 'filled',
      symbol: symbol ?? 'GBPUSD',
      direction: 'sell',
      filled_size: 1.0,
      account_id: accountId ?? crypto.randomUUID(),
    },
    {
      id: crypto.randomUUID(),
      status: 'partially_filled',
      symbol: symbol ?? 'EURUSD',
      direction: 'buy',
      filled_size: 0.5,
      account_id: accountId ?? crypto.randomUUID(),
    },
  ];

  return mockPositions;
}

async function updateTradeStatus(
  _tradeId: string,
  _status: TradeStatus,
): Promise<void> {
  // TODO: Replace with supabase.from('trades').update({ status }).eq('id', tradeId)
}

async function writeSystemAlert(_alert: SystemAlert): Promise<void> {
  // TODO: Replace with supabase.from('system_alerts').insert(alert)
  console.info('[ALERT]', _alert.title, '-', _alert.message);
}

async function writeAuditLog(_entry: Record<string, unknown>): Promise<void> {
  // TODO: Replace with supabase.from('audit_log').insert(entry)
  console.info('[AUDIT]', JSON.stringify(_entry));
}
