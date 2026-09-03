// ═══════════════════════════════════════════════════════════════
// Platform entitlements (admin console). Read-mostly feature switches from
// public.platform_entitlements. Missing keys and fetch failures default to
// ENABLED so a network hiccup can never lock the trader out of the platform.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';

let cache: { at: number; map: Record<string, boolean> } | null = null;
const TTL_MS = 60_000;

export async function getEntitlements(): Promise<Record<string, boolean>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const { data } = await createClient()
      .from('platform_entitlements')
      .select('key, enabled');
    const map: Record<string, boolean> = {};
    for (const row of data ?? []) map[row.key as string] = row.enabled as boolean;
    cache = { at: Date.now(), map };
    return map;
  } catch {
    return cache?.map ?? {};
  }
}

/** Convenience: true unless the switch exists AND is off. */
export async function isEnabled(key: string): Promise<boolean> {
  const map = await getEntitlements();
  return map[key] !== false;
}
