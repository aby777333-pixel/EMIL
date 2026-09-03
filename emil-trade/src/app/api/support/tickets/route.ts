import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const status = searchParams.get('status'); // open, in_progress, resolved, closed
    const offset = (page - 1) * limit;

    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, category, priority, message } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    if (subject.length > 200) {
      return NextResponse.json({ error: 'Subject must be under 200 characters' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message must be under 5,000 characters' }, { status: 400 });
    }

    // Validate category
    const validCategories = ['general', 'technical', 'billing', 'account', 'trading', 'kyc', 'broker_inquiry'];
    const ticketCategory = validCategories.includes(category) ? category : 'general';

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const ticketPriority = validPriorities.includes(priority) ? priority : 'medium';

    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        category: ticketCategory,
        priority: ticketPriority,
        message,
        status: 'open',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
    }

    return NextResponse.json({
      ticket,
      message: 'Support ticket created successfully.',
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
