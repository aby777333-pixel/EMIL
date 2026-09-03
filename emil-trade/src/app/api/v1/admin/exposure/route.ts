// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Admin Exposure API
// GET: Get live exposure grid
// POST: Trigger hedge action
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateExposure, calculateTotalExposure } from '@/lib/engine/exposure-calculator';
import { dealerDecisionCycle, type SystemState } from '@/lib/engine/dealer-ai';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['gio4x_admin', 'broker_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all open positions for exposure calculation
    const { data: positions } = await supabase
      .from('positions')
      .select('symbol, direction, size, floating_pnl')
      .eq('status', 'open');

    const positionsInput = (positions || []).map(p => ({
      symbol: p.symbol,
      direction: p.direction as 'BUY' | 'SELL',
      size: parseFloat(p.size) || 0,
      floatingPnl: parseFloat(p.floating_pnl) || 0,
    }));

    const exposureEntries = calculateExposure(positionsInput);
    const summary = calculateTotalExposure(exposureEntries);

    // Run dealer AI for recommendations
    const systemState: SystemState = {
      timestamp: Date.now(),
      exposure: exposureEntries,
      totalPnlToday: summary.totalPnl,
      pnlVelocity: 0,
      volatilityIndex: 0.4,
      toxicFlowRatio: 0.1,
      lpHealthAvg: 0.9,
      activeTraders: 0,
      openPositionCount: positions?.length || 0,
      marginUtilization: 0.3,
    };

    const dealerDecision = dealerDecisionCycle(systemState);

    return NextResponse.json({
      exposure: exposureEntries,
      summary,
      dealerAI: {
        riskScore: dealerDecision.riskScore,
        recommendation: dealerDecision.selectedAction,
        reasoning: dealerDecision.reasoning,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['gio4x_admin', 'broker_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, symbol, magnitude } = body;

    if (!action || !symbol) {
      return NextResponse.json({ error: 'Action and symbol are required' }, { status: 400 });
    }

    // Log the dealer action
    await supabase.from('dealer_actions').insert({
      user_id: user.id,
      action_type: action,
      symbol,
      magnitude: magnitude || 0,
      metadata: body,
    });

    // Log to immutable audit
    await supabase.from('immutable_audit_log').insert({
      user_id: user.id,
      action: `dealer_${action}`,
      entity_type: 'exposure',
      entity_id: symbol,
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: `Dealer action '${action}' on ${symbol} recorded and queued for execution.`,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
