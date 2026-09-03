// ═══════════════════════════════════════════════════════════
// EMIL TRADE — IB/Affiliate Management API
// Profiles, payouts, referrals, commission tracking
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') ?? 'list';

  if (view === 'list') {
    const { data, error } = await supabase.from('ib_profiles').select('*').order('performance_score', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ibs: data ?? [] });
  }

  if (view === 'payouts') {
    const ibId = searchParams.get('ib_id');
    let query = supabase.from('ib_payouts').select('*').order('created_at', { ascending: false });
    if (ibId) query = query.eq('ib_id', ibId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payouts: data ?? [] });
  }

  if (view === 'referrals') {
    const ibId = searchParams.get('ib_id');
    if (!ibId) return NextResponse.json({ error: 'ib_id required' }, { status: 400 });
    const { data, error } = await supabase.from('ib_referrals').select('*').eq('ib_id', ibId).order('registered_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ referrals: data ?? [] });
  }

  if (view === 'tree') {
    const { data, error } = await supabase.from('ib_profiles').select('id, name, tier, parent_ib_id, referred_clients, total_volume_lots, total_commission_earned, status').order('tier', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const tree = buildIbTree(data ?? []);
    return NextResponse.json({ tree });
  }

  if (view === 'my_dashboard') {
    // For the IB themselves — their own portal
    const { data: profile } = await supabase.from('ib_profiles').select('*').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Not an IB' }, { status: 404 });

    const { data: referrals } = await supabase.from('ib_referrals').select('*').eq('ib_id', profile.id).order('registered_at', { ascending: false });
    const { data: payouts } = await supabase.from('ib_payouts').select('*').eq('ib_id', profile.id).order('created_at', { ascending: false }).limit(10);
    const { data: subIbs } = await supabase.from('ib_profiles').select('*').eq('parent_ib_id', profile.id);

    return NextResponse.json({ profile, referrals: referrals ?? [], payouts: payouts ?? [], subIbs: subIbs ?? [] });
  }

  return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { name, email, phone, country, commission_type, per_lot_rate, parent_ib_id } = body;
    const referralLink = `https://dashing-hamster-0028ed.netlify.app/?ref=${generateReferralCode()}`;

    const { data, error } = await supabase.from('ib_profiles').insert({
      user_id: user.id, name, email, phone, country,
      commission_type: commission_type ?? 'per_lot',
      per_lot_rate: per_lot_rate ?? 3.00,
      parent_ib_id, referral_link: referralLink,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ib: data });
  }

  if (action === 'approve') {
    const { ib_id } = body;
    const { data, error } = await supabase.from('ib_profiles').update({ status: 'active' }).eq('id', ib_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ib: data });
  }

  if (action === 'suspend') {
    const { ib_id, reason } = body;
    const { data, error } = await supabase.from('ib_profiles')
      .update({ status: 'suspended', at_risk_reason: reason, is_at_risk: true })
      .eq('id', ib_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ib: data });
  }

  if (action === 'approve_payout') {
    const { payout_id } = body;
    const { data, error } = await supabase.from('ib_payouts')
      .update({ status: 'approved', approved_by: user.id })
      .eq('id', payout_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payout: data });
  }

  if (action === 'generate_payout') {
    const { ib_id, amount, period, method } = body;
    const { data, error } = await supabase.from('ib_payouts').insert({
      ib_id, amount, period, method: method ?? 'bank_wire', currency: 'USD',
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payout: data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

function generateReferralCode(): string {
  return 'IB' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface IbRow { id: string; name: string; tier: number; parent_ib_id: string | null; referred_clients: number; total_volume_lots: number; total_commission_earned: number; status: string }

function buildIbTree(rows: IbRow[]): Record<string, unknown> {
  const map = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    map.set(r.id, { ...r, children: [], isActive: r.status === 'active', referrals: r.referred_clients, volume: r.total_volume_lots, commission: r.total_commission_earned });
  }
  const roots: Record<string, unknown>[] = [];
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_ib_id && map.has(r.parent_ib_id)) {
      (map.get(r.parent_ib_id)!.children as Record<string, unknown>[]).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots.length === 1 ? roots[0] : { id: 'root', name: 'All IBs', tier: 0, children: roots, isActive: true, referrals: 0, volume: 0, commission: 0 };
}
