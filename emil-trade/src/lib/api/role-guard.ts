// ═══════════════════════════════════════════════════════════
// EMIL TRADE — API Role Guard
// Backend-level access control — not just frontend hiding
// Every API route validates role BEFORE processing
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ApiRole = 'trader' | 'broker_admin' | 'gio4x_admin';

interface AuthResult {
  user: { id: string; email: string };
  role: ApiRole;
  brokerId: string | null;
}

interface AuthError {
  error: NextResponse;
}

/**
 * Authenticate and get user role.
 * Returns user info or an error response.
 */
export async function authenticateRequest(): Promise<AuthResult | AuthError> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { type: 'https://raptor.gio4x.com/errors/unauthorized', title: 'Unauthorized', status: 401, detail: 'Authentication required' },
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
      ),
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, broker_id')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as ApiRole) ?? 'trader';
  const brokerId = profile?.broker_id ?? null;

  return { user: { id: user.id, email: user.email ?? '' }, role, brokerId };
}

/**
 * Require specific role(s) for an API route.
 * Returns the auth result if allowed, or an error response if denied.
 *
 * Usage in API route:
 *   const auth = await requireRole('broker_admin', 'gio4x_admin');
 *   if ('error' in auth) return auth.error;
 *   // auth.user, auth.role, auth.brokerId are available
 */
export async function requireRole(...allowedRoles: ApiRole[]): Promise<AuthResult | AuthError> {
  const result = await authenticateRequest();

  if ('error' in result) return result;

  if (!allowedRoles.includes(result.role)) {
    return {
      error: NextResponse.json(
        {
          type: 'https://raptor.gio4x.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `This endpoint requires one of: ${allowedRoles.join(', ')}. Your role: ${result.role}`,
        },
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      ),
    };
  }

  return result;
}

/**
 * Require broker-level access (broker_admin or gio4x_admin).
 * Traders are HARD DENIED — this is architecture-level separation.
 */
export async function requireBrokerAccess(): Promise<AuthResult | AuthError> {
  return requireRole('broker_admin', 'gio4x_admin');
}

/**
 * Require super admin access (gio4x_admin only).
 */
export async function requireSuperAdmin(): Promise<AuthResult | AuthError> {
  return requireRole('gio4x_admin');
}

/**
 * Require trader or higher access (any authenticated user).
 */
export async function requireAuthenticated(): Promise<AuthResult | AuthError> {
  return requireRole('trader', 'broker_admin', 'gio4x_admin');
}

/**
 * Ensure a trader can only access their own data.
 * For broker_admin: can access any data within their broker.
 * For gio4x_admin: can access everything.
 */
export function enforceDataIsolation(
  auth: AuthResult,
  resourceUserId?: string,
  resourceBrokerId?: string,
): boolean {
  // Super admin sees everything
  if (auth.role === 'gio4x_admin') return true;

  // Broker admin sees data within their broker
  if (auth.role === 'broker_admin') {
    if (resourceBrokerId && auth.brokerId) {
      return resourceBrokerId === auth.brokerId;
    }
    return true; // If no broker_id on resource, allow (backward compat)
  }

  // Trader sees ONLY their own data
  if (auth.role === 'trader') {
    if (resourceUserId) {
      return resourceUserId === auth.user.id;
    }
    return false; // If we can't verify ownership, deny (fail-safe)
  }

  return false; // Unknown role = deny
}
