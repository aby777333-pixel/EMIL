// EMIL TRADE — send a strategy from the EMIL Strategy Builder (/ai-lab) to EMIL
// POST /api/emil/teach  { spec }
//
// Signed-in traders only. The spec is validated with the shared kit, then
// forwarded to the EMIL Cockpit (POST /api/v1/strategies) with a server-held
// key carrying the strategies_write scope. The Cockpit stores it as a LEARNED
// blueprint: research until the Strategy Lab and a person approve it. It never
// trades by itself. Off (503) until EMIL_COCKPIT_URL and EMIL_COCKPIT_API_KEY
// are set in the Netlify environment.
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateSpec } from '@/lib/emil-strategy-kit';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_000;
const UPSTREAM_TIMEOUT_MS = 8000;

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply(401, { error: 'Sign in to send strategies to EMIL.' });

  const cockpitUrl = (process.env.EMIL_COCKPIT_URL ?? process.env.NEXT_PUBLIC_EMIL_COCKPIT_URL ?? '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.EMIL_COCKPIT_API_KEY ?? '').trim();
  if (!cockpitUrl || !apiKey) {
    return reply(503, { error: 'Sending to EMIL is not switched on yet. The strategy is saved in your browser.' });
  }

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return reply(413, { error: 'Request too large.' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400, { error: 'Request body must be JSON.' });
  }
  const checked = validateSpec((body as { spec?: unknown } | null)?.spec);
  if (!checked.ok) return reply(422, { error: checked.errors.slice(0, 3).join(' ') });

  let upstream: Response;
  try {
    upstream = await fetch(`${cockpitUrl}/api/v1/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ spec: checked.spec, channel: 'emil-trade' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return reply(502, { error: 'EMIL could not be reached.' });
  }

  const result = (await upstream.json().catch(() => null)) as { code?: string; version?: string; duplicate?: boolean; error?: string } | null;
  if (upstream.ok) {
    return reply(upstream.status === 201 ? 201 : 200, { ok: true, code: result?.code, version: result?.version, duplicate: result?.duplicate === true });
  }
  if (upstream.status === 429) return reply(429, { error: 'EMIL is receiving too many strategies just now.' });
  if (upstream.status === 400 || upstream.status === 422) return reply(422, { error: String(result?.error ?? 'EMIL did not accept the strategy.').slice(0, 300) });
  console.error('EMIL teach: cockpit responded', upstream.status, result?.error);
  return reply(503, { error: 'Sending to EMIL is temporarily unavailable. The strategy is saved in your browser.' });
}
