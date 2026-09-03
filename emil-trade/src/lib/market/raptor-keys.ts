// Raptor API key verification for the authenticated Market API (/api/raptor/v1/*).
// Credentials are read from headers and checked against the raptor_api_keys
// store via a SECURITY DEFINER RPC (secrets are compared by SHA-256 hash).
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface KeyVerdict { valid: boolean; name?: string; scopes?: string[] }

export function readCreds(request: Request): { keyId: string; secret: string } | null {
  const h = request.headers;
  let keyId = h.get('x-raptor-key') || '';
  let secret = h.get('x-raptor-secret') || '';
  if (!keyId || !secret) {
    // Also accept  Authorization: Bearer <key_id>:<secret>
    const auth = h.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m && m[1].includes(':')) {
      const [k, ...rest] = m[1].split(':');
      keyId = k;
      secret = rest.join(':');
    }
  }
  if (!keyId || !secret) return null;
  return { keyId, secret };
}

export async function verifyKey(request: Request): Promise<KeyVerdict> {
  const creds = readCreds(request);
  if (!creds) return { valid: false };
  try {
    const sb = await createServerSupabaseClient();
    const { data, error } = await sb.rpc('raptor_key_verify', { p_key_id: creds.keyId, p_secret: creds.secret });
    if (error || !data) return { valid: false };
    return data as KeyVerdict;
  } catch {
    return { valid: false };
  }
}
