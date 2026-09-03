// ═══════════════════════════════════════════════════════════
// EMIL TRADE — CRM Leads API
// CRUD + pipeline management + lead scoring
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const search = searchParams.get('search');
  const assignedTo = searchParams.get('assigned_to');
  const limit = parseInt(searchParams.get('limit') ?? '100');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  let query = supabase.from('crm_leads').select('*', { count: 'exact' });

  if (stage && stage !== 'all') query = query.eq('stage', stage);
  if (assignedTo) query = query.eq('assigned_agent', assignedTo);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

  query = query.order('score', { ascending: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { full_name, email, phone, country, source, campaign, tags } = body;
    if (!full_name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const score = calculateLeadScore({ country, source, campaign });
    const { data, error } = await supabase.from('crm_leads').insert({
      full_name, email, phone, country, source, campaign, tags: tags ?? [],
      score, stage: 'lead', stage_entered_at: new Date().toISOString(),
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data });
  }

  if (action === 'update_stage') {
    const { lead_id, new_stage } = body;
    const { data, error } = await supabase.from('crm_leads')
      .update({ stage: new_stage, stage_entered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', lead_id).select().single();

    // Log activity
    await supabase.from('crm_activities').insert({
      client_id: lead_id, agent_id: user.id, agent_name: 'System',
      channel: 'system', direction: 'internal',
      subject: 'Stage changed', body: `Moved to ${new_stage}`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data });
  }

  if (action === 'assign') {
    const { lead_id, agent_id, agent_name } = body;
    const { data, error } = await supabase.from('crm_leads')
      .update({ assigned_agent: agent_id, assigned_agent_name: agent_name, updated_at: new Date().toISOString() })
      .eq('id', lead_id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data });
  }

  if (action === 'bulk_update') {
    const { lead_ids, updates } = body;
    const { error } = await supabase.from('crm_leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', lead_ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

function calculateLeadScore(data: { country?: string; source?: string; campaign?: string }): number {
  let score = 30;
  const highValueCountries = ['AE', 'SA', 'GB', 'US', 'SG', 'HK', 'DE', 'CH', 'AU'];
  if (data.country && highValueCountries.includes(data.country.toUpperCase())) score += 20;
  if (data.source === 'ib_referral') score += 25;
  else if (data.source === 'google_ads') score += 15;
  else if (data.source === 'organic') score += 10;
  if (data.campaign) score += 5;
  return Math.min(score, 100);
}
