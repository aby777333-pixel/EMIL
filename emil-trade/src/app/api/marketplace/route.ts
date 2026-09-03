// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Marketplace API
// Public listing, search, and filtering for marketplace
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const params = req.nextUrl.searchParams;

  const category = params.get('category');
  const sort = params.get('sort') ?? 'rating';
  const search = params.get('search');
  const page = parseInt(params.get('page') ?? '1');
  const perPage = Math.min(parseInt(params.get('perPage') ?? '30'), 100);

  let query = supabase
    .from('marketplace_listings')
    .select('*')
    .eq('is_published', true);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  switch (sort) {
    case 'rating':
      query = query.order('rating', { ascending: false });
      break;
    case 'installs':
      query = query.order('install_count', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'active':
      query = query.order('active_users', { ascending: false });
      break;
    default:
      query = query.order('rating', { ascending: false });
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data: listings, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }

  return NextResponse.json({
    listings: listings ?? [],
    page,
    perPage,
    total: listings?.length ?? 0,
  });
}
