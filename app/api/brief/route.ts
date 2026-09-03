import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { flagEnabled } from '@/lib/flags'
import { morningBrief } from '@/lib/brief'

export const dynamic = 'force-dynamic'

// EMIL Morning Brief (spec §67–69). Cached per user per UTC day; `?refresh=1`
// regenerates (one LLM call). Honest 503 when the AI engine is not configured.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  if (!(await flagEnabled('morning_brief', true))) return NextResponse.json({ disabled: true })
  if (!process.env.ABACUSAI_API_KEY) {
    return NextResponse.json({ error: 'AI engine not configured — set ABACUSAI_API_KEY in the server environment.' }, { status: 503 })
  }
  try {
    const refresh = new URL(req.url).searchParams.get('refresh') === '1'
    const brief = await morningBrief(userId, refresh)
    return NextResponse.json({ ok: true, brief, disclaimer: 'Model assessment from delayed research data. Research, not advice; nothing here places or recommends an order.' })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Brief unavailable right now' }, { status: 502 })
  }
}
