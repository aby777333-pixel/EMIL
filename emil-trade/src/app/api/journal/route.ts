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
    const offset = (page - 1) * limit;

    const { data: entries, error, count } = await supabase
      .from('trade_journal')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
    }

    return NextResponse.json({
      entries: entries || [],
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
    const {
      title,
      symbol,
      direction,
      entry_price,
      exit_price,
      lot_size,
      pnl,
      rating,
      notes,
      tags,
      trade_date,
      screenshot_url,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title must be under 200 characters' }, { status: 400 });
    }

    if (notes && notes.length > 10000) {
      return NextResponse.json({ error: 'Notes must be under 10,000 characters' }, { status: 400 });
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const { data: entry, error: insertError } = await supabase
      .from('trade_journal')
      .insert({
        user_id: user.id,
        title,
        symbol: symbol ? symbol.toUpperCase() : null,
        direction: direction || null,
        entry_price: entry_price ? parseFloat(entry_price) : null,
        exit_price: exit_price ? parseFloat(exit_price) : null,
        lot_size: lot_size ? parseFloat(lot_size) : null,
        pnl: pnl ? parseFloat(pnl) : null,
        rating: rating || null,
        notes: notes || null,
        tags: tags || [],
        trade_date: trade_date || new Date().toISOString().split('T')[0],
        screenshot_url: screenshot_url || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
