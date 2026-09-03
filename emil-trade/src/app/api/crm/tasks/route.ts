// ═══════════════════════════════════════════════════════════
// EMIL TRADE — CRM Tasks API
// Task management for broker sales/support teams
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assigned_to');
  const priority = searchParams.get('priority');

  let query = supabase.from('crm_tasks').select('*').order('due_date', { ascending: true });
  if (status && status !== 'all') query = query.eq('status', status);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { client_id, client_name, type, title, description, assigned_to, assigned_to_name, due_date, priority } = body;
    const { data, error } = await supabase.from('crm_tasks').insert({
      client_id, client_name, type: type ?? 'follow_up', title, description,
      assigned_to: assigned_to ?? user.id, assigned_to_name, due_date, priority: priority ?? 'normal',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  }

  if (action === 'update_status') {
    const { task_id, new_status, outcome } = body;
    const updates: Record<string, unknown> = { status: new_status };
    if (new_status === 'completed') { updates.completed_at = new Date().toISOString(); updates.outcome = outcome; }

    const { data, error } = await supabase.from('crm_tasks').update(updates).eq('id', task_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
