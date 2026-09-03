// DB-backed fixed-window rate limiting. Serverless functions share no memory,
// so the counter lives in Postgres (rate_limits) and is bumped atomically in
// one upsert. Fail-open: a DB hiccup must never lock everyone out.

import { prisma } from '@/lib/db'

export type RateLimitResult = { allowed: boolean; count: number; limit: number; retryAfterSec: number }

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
      insert into rate_limits (key, count, "windowStart")
      values (${key}, 1, now())
      on conflict (key) do update set
        count = case when rate_limits."windowStart" < now() - (${windowSec} * interval '1 second') then 1 else rate_limits.count + 1 end,
        "windowStart" = case when rate_limits."windowStart" < now() - (${windowSec} * interval '1 second') then now() else rate_limits."windowStart" end
      returning count, "windowStart"`
    const count = Number(rows?.[0]?.count ?? 1)
    const started = rows?.[0]?.windowStart ? new Date(rows[0].windowStart).getTime() : Date.now()
    const retryAfterSec = Math.max(1, Math.ceil((started + windowSec * 1000 - Date.now()) / 1000))
    return { allowed: count <= limit, count, limit, retryAfterSec }
  } catch (e) {
    console.error('rate limit unavailable — failing open', e)
    return { allowed: true, count: 0, limit, retryAfterSec: 0 }
  }
}

// Clear a counter (e.g. login failures after a successful sign-in).
export async function rateLimitReset(key: string) {
  await prisma.$executeRaw`delete from rate_limits where key = ${key}`.catch(() => {})
}

export function clientIp(req: Request): string {
  const h = req.headers
  return (h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'unknown').split(',')[0].trim()
}
