// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Auto-Trade Consent & Control API
// Superprompt Section 6.3: AI Auto-Trade Mode
// Locked behind explicit consent flow with risk disclosure
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AutoTradeParameters } from '@/types/nexus';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, parameters } = body as {
    action: 'activate' | 'deactivate' | 'update_params' | 'status';
    parameters?: AutoTradeParameters;
  };

  if (action === 'status') {
    const { data: consent } = await supabase
      .from('auto_trade_consents')
      .select('*')
      .eq('trader_id', user.id)
      .is('revoked_at', null)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      active: !!consent,
      consent: consent ?? null,
    });
  }

  if (action === 'activate') {
    if (!parameters) {
      return NextResponse.json({ error: 'Parameters required for activation' }, { status: 400 });
    }

    // Validate parameters
    if (parameters.maxRiskPerTrade < 0.1 || parameters.maxRiskPerTrade > 5) {
      return NextResponse.json({ error: 'Max risk per trade must be between 0.1% and 5%' }, { status: 400 });
    }
    if (parameters.maxDailyLoss < 1 || parameters.maxDailyLoss > 20) {
      return NextResponse.json({ error: 'Max daily loss must be between 1% and 20%' }, { status: 400 });
    }
    if (!parameters.allowedSymbols || parameters.allowedSymbols.length === 0) {
      return NextResponse.json({ error: 'At least one symbol must be selected' }, { status: 400 });
    }

    // Revoke any existing active consents
    await supabase
      .from('auto_trade_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('trader_id', user.id)
      .is('revoked_at', null);

    // Record new consent
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null;
    const { data: consent, error } = await supabase
      .from('auto_trade_consents')
      .insert({
        trader_id: user.id,
        accepted_at: new Date().toISOString(),
        ip_address: ipAddress,
        parameters: parameters as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) {
      console.error('[AUTO-TRADE] Consent insert failed:', error);
      return NextResponse.json({ error: 'Failed to activate auto-trade' }, { status: 500 });
    }

    return NextResponse.json({ active: true, consent });
  }

  if (action === 'deactivate') {
    const { error } = await supabase
      .from('auto_trade_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('trader_id', user.id)
      .is('revoked_at', null);

    if (error) {
      console.error('[AUTO-TRADE] Deactivation failed:', error);
      return NextResponse.json({ error: 'Failed to deactivate auto-trade' }, { status: 500 });
    }

    return NextResponse.json({ active: false });
  }

  if (action === 'update_params') {
    if (!parameters) {
      return NextResponse.json({ error: 'Parameters required' }, { status: 400 });
    }

    // Revoke current, insert new with updated params
    await supabase
      .from('auto_trade_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('trader_id', user.id)
      .is('revoked_at', null);

    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null;
    const { data: consent } = await supabase
      .from('auto_trade_consents')
      .insert({
        trader_id: user.id,
        accepted_at: new Date().toISOString(),
        ip_address: ipAddress,
        parameters: parameters as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    return NextResponse.json({ active: true, consent });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
