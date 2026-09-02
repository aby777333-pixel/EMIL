// Feature flags (spec §77) — high-risk modules ship behind admin-controlled
// flags so they can be turned off without a deploy. Reads are cached briefly
// in-process; a flip in Command Center → Feature Flags takes effect within
// ~30 seconds. On any DB failure the last known value (or the fallback) is
// used — a flag outage must never take the app down.

import { prisma } from '@/lib/db'

const cache = new Map<string, { value: boolean; at: number }>()
const TTL_MS = 30_000

export async function flagEnabled(key: string, fallback = false): Promise<boolean> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  try {
    const row = await prisma.featureFlag.findUnique({ where: { key } })
    const value = row ? row.enabled : fallback
    cache.set(key, { value, at: Date.now() })
    return value
  } catch {
    return hit?.value ?? fallback
  }
}
