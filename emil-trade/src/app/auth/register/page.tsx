import { redirect } from 'next/navigation';

// Account creation has moved to the GIO4X client portal (app.gio4x.com).
// The terminal no longer hosts its own sign-up form — any visit to
// /auth/register bounces straight to the portal's signup page so every
// existing internal CTA keeps working without a dead link.
export const dynamic = 'force-dynamic';

const PORTAL_SIGNUP_URL = 'https://app.gio4x.com/auth/signup';

export default function RegisterPage() {
  redirect(PORTAL_SIGNUP_URL);
}
