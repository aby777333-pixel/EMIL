// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Scenario Simulation API
// Superprompt Section 3.7: "What if EURUSD drops 2% in 10 seconds?"
// Pre-trade stress testing for the risk desk
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Decimal from 'decimal.js';
import type { ScenarioSimulationResult } from '@/types/nexus';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { symbol, priceChangePct, timeframeSeconds } = body as {
    symbol: string;
    priceChangePct: number;
    timeframeSeconds: number;
  };

  if (!symbol || typeof priceChangePct !== 'number') {
    return NextResponse.json({ error: 'symbol and priceChangePct required' }, { status: 400 });
  }

  // Fetch current exposure for the symbol
  const { data: exposureData } = await supabase
    .from('exposure_snapshots')
    .select('*')
    .eq('symbol', symbol)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single();

  const netExposure = new Decimal(exposureData?.net_exposure ?? 0);
  const longVolume = new Decimal(exposureData?.long_volume ?? 0);
  const shortVolume = new Decimal(exposureData?.short_volume ?? 0);

  // Calculate PnL impact of price change
  const changeFactor = new Decimal(priceChangePct).div(100);
  // Net PnL impact: net exposure * price change percentage * contract value approximation
  const contractValue = new Decimal(100000); // standard lot
  const brokerPnlImpact = netExposure.mul(changeFactor).mul(contractValue).neg().toNumber();

  // Estimate margin cascade risk
  const absChange = Math.abs(priceChangePct);
  const speed = absChange / Math.max(timeframeSeconds, 1);
  let cascadeRisk: ScenarioSimulationResult['marginCascadeRisk'] = 'low';
  if (speed > 0.1 || absChange > 3) cascadeRisk = 'critical';
  else if (speed > 0.05 || absChange > 2) cascadeRisk = 'high';
  else if (speed > 0.02 || absChange > 1) cascadeRisk = 'medium';

  // Estimate affected clients and stop-outs
  const totalClients = Math.max(
    longVolume.add(shortVolume).div(0.1).round().toNumber(),
    1
  );
  const affectedPct = Math.min(absChange * 15, 100); // rough heuristic
  const affectedClients = Math.round(totalClients * (affectedPct / 100));
  const stopOutsTriggered = Math.round(affectedClients * Math.min(absChange * 8, 50) / 100);

  // Current hedge coverage approximation
  const hedgeCoverage = netExposure.isZero()
    ? 100
    : Math.max(0, 100 - Math.abs(netExposure.toNumber()) * 2);

  // Generate recommendation
  let recommendation: string;
  if (cascadeRisk === 'critical') {
    recommendation = `CRITICAL: ${symbol} ${priceChangePct > 0 ? '+' : ''}${priceChangePct}% in ${timeframeSeconds}s would trigger ${stopOutsTriggered} stop-outs. Hedge immediately. Widen spreads. Alert dealing desk.`;
  } else if (cascadeRisk === 'high') {
    recommendation = `HIGH RISK: Pre-position hedges on ${symbol}. Current net exposure of ${netExposure.toFixed(2)} lots creates significant P&L vulnerability. Consider partial hedge now.`;
  } else if (cascadeRisk === 'medium') {
    recommendation = `MODERATE: Monitor ${symbol} exposure. If move materializes, be ready to hedge ${Math.round(netExposure.abs().mul(0.5).toNumber() * 10) / 10} lots within 30 seconds.`;
  } else {
    recommendation = `LOW RISK: Current exposure manageable. No immediate action required for ${symbol}.`;
  }

  const result: ScenarioSimulationResult = {
    brokerPnlImpact: Math.round(brokerPnlImpact * 100) / 100,
    marginCascadeRisk: cascadeRisk,
    affectedClients,
    stopOutsTriggered,
    hedgeCoverage: Math.round(hedgeCoverage),
    recommendation,
  };

  return NextResponse.json(result);
}
