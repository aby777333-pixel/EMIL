// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — IB Referral Landing
// GET /r/[code]?c=campaign&to=/auth/register
//
// Drops a signed-flat raptor_ref cookie identifying the referring IB,
// then redirects to the chosen destination (defaults to /auth/register).
// Attribution itself happens in /auth/callback after the user verifies
// their email — we just plant the cookie here.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'raptor_ref';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams, origin } = new URL(request.url);
  const campaign = searchParams.get('c');
  const destinationParam = searchParams.get('to');

  // Refcodes are short alphanumeric tokens (per ib_profiles.referral_link).
  // Bail to a plain register page if the code shape is suspicious — never
  // throw, since this is a marketing entry point.
  const isValidCode = /^[a-zA-Z0-9_-]{1,64}$/.test(code);

  // Open-redirect guard: only allow internal destinations (single leading slash).
  const safeDestination =
    destinationParam && destinationParam.startsWith('/') && !destinationParam.startsWith('//')
      ? destinationParam
      : '/auth/register';

  const response = NextResponse.redirect(`${origin}${safeDestination}`);

  if (isValidCode) {
    const payload = JSON.stringify({
      code,
      campaign: campaign ? campaign.slice(0, 64) : null,
      ts: Date.now(),
    });

    response.cookies.set(COOKIE_NAME, payload, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}
