// Raptor API key management (used by the lab's Connections panel).
//   GET    /api/raptor/keys        → list keys (no secrets)
//   POST   /api/raptor/keys {name} → create a key (returns the secret ONCE)
//   DELETE /api/raptor/keys?id=…   → revoke a key
//
// NOTE: open in this demo so the lab can manage keys without a login. In
// production these three routes must be gated behind admin authentication.
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = await createServerSupabaseClient();
    const { data, error } = await sb.rpc('raptor_key_list');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ keys: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body?.name || 'Default').toString().slice(0, 60);
    const sb = await createServerSupabaseClient();
    const { data, error } = await sb.rpc('raptor_key_create', { p_name: name });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const sb = await createServerSupabaseClient();
    const { data, error } = await sb.rpc('raptor_key_revoke', { p_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ revoked: !!data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
