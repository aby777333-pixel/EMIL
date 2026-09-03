// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Client Portal API
// Wallet, transactions, referrals, support tickets
// B2C — traders only see their own data (RLS enforced)
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section') ?? 'overview';

  if (section === 'overview') {
    const [{ data: wallets }, { data: recentTxns }, { data: openTickets }, { data: referrals }] = await Promise.all([
      supabase.from('client_wallets').select('*').eq('user_id', user.id),
      supabase.from('client_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('support_tickets').select('*').eq('user_id', user.id).neq('status', 'closed').order('created_at', { ascending: false }),
      supabase.from('client_referrals').select('*').eq('referrer_id', user.id),
    ]);

    return NextResponse.json({
      wallets: wallets ?? [],
      recentTransactions: recentTxns ?? [],
      openTickets: openTickets ?? [],
      referrals: referrals ?? [],
    });
  }

  if (section === 'wallet') {
    const { data: wallets } = await supabase.from('client_wallets').select('*').eq('user_id', user.id);
    return NextResponse.json({ wallets: wallets ?? [] });
  }

  if (section === 'transactions') {
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    let query = supabase.from('client_transactions').select('*', { count: 'exact' })
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, count } = await query;
    return NextResponse.json({ transactions: data ?? [], total: count ?? 0 });
  }

  if (section === 'referrals') {
    const { data } = await supabase.from('client_referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false });
    const referralCode = `REF${user.id.substring(0, 6).toUpperCase()}`;
    const totalRewards = (data ?? []).reduce((s, r) => s + (r.reward_amount ?? 0), 0);
    const fundedCount = (data ?? []).filter(r => r.status === 'funded' || r.status === 'rewarded').length;

    return NextResponse.json({ referrals: data ?? [], referralCode, totalRewards, fundedCount });
  }

  if (section === 'tickets') {
    const { data: tickets } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return NextResponse.json({ tickets: tickets ?? [] });
  }

  if (section === 'ticket_messages') {
    const ticketId = searchParams.get('ticket_id');
    if (!ticketId) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 });
    const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return NextResponse.json({ messages: data ?? [] });
  }

  return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'deposit') {
    const { amount, method, currency } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    // Create transaction
    const { data: txn, error } = await supabase.from('client_transactions').insert({
      user_id: user.id, type: 'deposit', amount, currency: currency ?? 'USD',
      method: method ?? 'card', status: 'pending',
      reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: txn });
  }

  if (action === 'withdraw') {
    const { amount, method, currency } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    // Check wallet balance
    const { data: wallet } = await supabase.from('client_wallets').select('balance').eq('user_id', user.id).single();
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const { data: txn, error } = await supabase.from('client_transactions').insert({
      user_id: user.id, type: 'withdrawal', amount, currency: currency ?? 'USD',
      method: method ?? 'bank_wire', status: 'pending',
      reference: `WTH-${Date.now().toString(36).toUpperCase()}`,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: txn });
  }

  if (action === 'transfer') {
    const { from_account, to_account, amount } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const { data: txn, error } = await supabase.from('client_transactions').insert({
      user_id: user.id, type: 'transfer', amount,
      reference: `TRF-${Date.now().toString(36).toUpperCase()}`,
      notes: `From ${from_account} to ${to_account}`,
      status: 'completed',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: txn });
  }

  if (action === 'create_ticket') {
    const { subject, category, priority, message } = body;
    if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });

    const { data: ticket, error } = await supabase.from('support_tickets').insert({
      user_id: user.id, subject, category: category ?? 'general', priority: priority ?? 'normal',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add initial message
    if (message && ticket) {
      await supabase.from('support_messages').insert({
        ticket_id: ticket.id, sender_id: user.id, sender_name: 'Client', sender_role: 'client', body: message,
      });
    }

    return NextResponse.json({ ticket });
  }

  if (action === 'reply_ticket') {
    const { ticket_id, message } = body;
    if (!ticket_id || !message) return NextResponse.json({ error: 'ticket_id and message required' }, { status: 400 });

    const { data, error } = await supabase.from('support_messages').insert({
      ticket_id, sender_id: user.id, sender_name: 'Client', sender_role: 'client', body: message,
    }).select().single();

    // Update ticket timestamp
    await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticket_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  }

  if (action === 'refer') {
    const { email } = body;
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const referralCode = `REF${user.id.substring(0, 6).toUpperCase()}`;
    const { data, error } = await supabase.from('client_referrals').insert({
      referrer_id: user.id, referred_email: email, referral_code: referralCode,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ referral: data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
