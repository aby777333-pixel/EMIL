import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const REF_COOKIE = 'raptor_ref';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/terminal';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // IB attribution: if this client arrived via /r/[refCode], link them
      // to the referring IB. Best-effort — never blocks the redirect.
      if (data.user) {
        try {
          await attributeReferral(supabase, data.user);
        } catch {
          // Swallow — attribution is non-critical to login flow
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}

async function attributeReferral(supabase: SupabaseClient, user: User) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(REF_COOKIE)?.value;
  if (!raw) return;

  let payload: { code?: unknown; campaign?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    cookieStore.delete(REF_COOKIE);
    return;
  }

  const refCode = typeof payload.code === 'string' ? payload.code : null;
  if (!refCode || !/^[a-zA-Z0-9_-]{1,64}$/.test(refCode)) {
    cookieStore.delete(REF_COOKIE);
    return;
  }

  // Look up the IB by the trailing segment of their referral_link.
  // (ReferralLinkCard generates links of the form `${baseUrl}/r/${refCode}`.)
  const { data: ib } = await supabase
    .from('ib_profiles')
    .select('id')
    .ilike('referral_link', `%/${refCode}`)
    .limit(1)
    .maybeSingle();

  if (!ib) {
    cookieStore.delete(REF_COOKIE);
    return;
  }

  // Idempotency: don't create a duplicate attribution if this user has
  // already been attributed (e.g. they re-clicked a referral link).
  const { data: existing } = await supabase
    .from('ib_referrals')
    .select('id')
    .eq('client_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    cookieStore.delete(REF_COOKIE);
    return;
  }

  await supabase.from('ib_referrals').insert({
    ib_id: ib.id,
    client_id: user.id,
    client_email: user.email ?? null,
    status: 'registered',
    registered_at: new Date().toISOString(),
  });

  cookieStore.delete(REF_COOKIE);
}
