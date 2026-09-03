import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/features',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/risk-disclosure',
  '/status',
  '/pricing',
  '/blog',
  '/developer',
  '/changelog',
  '/sandbox',
  '/partners',
  '/education',
];

// Prefixes that are always public (e.g. /auth/*, /features/*, /blog/*)
// /r/ is the IB referral landing — must be reachable without auth
const PUBLIC_PREFIXES = ['/auth/', '/features/', '/blog/', '/developer/', '/education/', '/r/'];

// Protected route prefixes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/broker', '/admin', '/onboarding', '/converter', '/terminal'];

// Routes that ONLY broker_admin and gio4x_admin can access (hard deny for traders)
const BROKER_ONLY_PREFIXES = ['/broker'];

// Routes that ONLY gio4x_admin can access
const SUPERADMIN_ONLY_PREFIXES = ['/admin'];

type UserRole = 'trader' | 'broker_admin' | 'gio4x_admin';

/**
 * Check if a path is public (no auth required)
 */
function isPublicPath(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Prefix match
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

/**
 * Check if a path requires authentication
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Get the default redirect path for a given role
 */
function getDefaultPathForRole(role: UserRole): string {
  switch (role) {
    case 'gio4x_admin':
      return '/admin';
    case 'broker_admin':
      return '/broker/overview';
    case 'trader':
    default:
      return '/dashboard';
  }
}

/**
 * HARD ROLE ENFORCEMENT — not UI hiding, architecture-level separation.
 *
 * Principle: If role is unclear or unrecognized → DENY ACCESS (fail-safe).
 * Traders can NEVER access broker routes. Brokers can NEVER access admin routes.
 * This is enforced at middleware level — before any page/component renders.
 *
 * Returns the redirect path if denied, or null if allowed.
 */
function getRoleRedirect(role: UserRole, pathname: string): string | null {
  // gio4x_admin (Super Admin / Platform Owner) — access everything
  if (role === 'gio4x_admin') return null;

  // broker_admin: /broker/*, /dashboard/*, /converter, /terminal, /marketplace
  // DENIED: /admin/*
  if (role === 'broker_admin') {
    if (pathname.startsWith('/admin')) {
      return '/broker/overview';
    }
    return null;
  }

  // trader: /dashboard/*, /converter, /terminal/*, /marketplace/*, /onboarding
  // HARD DENY: /broker/*, /admin/*
  // Traders must NEVER see: broker internals, risk engine, dealing desk,
  // LP details, other client data, A/B routing, spread manipulation, CRM
  if (role === 'trader') {
    if (pathname.startsWith('/broker') || pathname.startsWith('/admin')) {
      return '/dashboard';
    }
    return null;
  }

  // FAIL-SAFE: Unrecognized role → deny access to all protected routes
  return '/auth/login';
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Allow public paths through without auth check
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user and path is protected, redirect to login with redirect param
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    // Preserve the full original target including its query string (e.g. the
    // ?account=<number> deep-link from the portal's "Open in Raptor") so it
    // survives the login round-trip.
    url.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // If no user and path is not explicitly protected or public, allow through
  // (catch-all for any routes not in either list)
  if (!user) {
    return supabaseResponse;
  }

  // --- User is authenticated beyond this point ---

  // If user is on /auth/login or /auth/register, redirect them to their default page
  // (they are already logged in)
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    // Check for redirect param first
    const redirectTo = request.nextUrl.searchParams.get('redirect');

    // Fetch user role to determine default path
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as UserRole) || 'trader';
    const defaultPath = redirectTo || getDefaultPathForRole(role);

    const url = request.nextUrl.clone();
    // defaultPath may carry a query string (e.g. /terminal?account=...).
    // Split it so pathname/search are set correctly rather than encoding the
    // "?" into the pathname.
    const [destPath, destQuery] = defaultPath.split('?');
    url.pathname = destPath;
    url.search = destQuery ? `?${destQuery}` : '';
    return NextResponse.redirect(url);
  }

  // For protected paths, enforce role-based access
  if (isProtectedPath(pathname)) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as UserRole) || 'trader';

    // Check role-based access
    const redirect = getRoleRedirect(role, pathname);
    if (redirect) {
      const url = request.nextUrl.clone();
      url.pathname = redirect;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
