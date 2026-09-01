import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { classifyUrl, isSafePublicUrl } from '@/lib/teach/ingest'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? ''
    const sources = await prisma.researchSource.findMany({
      where: q
        ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { url: { contains: q, mode: 'insensitive' } }, { author: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: {
        id: true, sourceType: true, url: true, title: true, author: true, publishedAt: true,
        durationSec: true, status: true, reliability: true, fetchError: true, claimCount: true,
        metadata: true, createdAt: true,
      },
    })
    return NextResponse.json({ sources })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load sources' }, { status: 500 })
  }
}

// Submit one or many URLs to the research queue.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const rawUrls: string[] = Array.isArray(body?.urls) ? body.urls : typeof body?.urls === 'string' ? body.urls.split(/\s+/) : []
    const urls = Array.from(new Set(rawUrls.map((u: string) => u.trim()).filter(Boolean))).slice(0, 20)
    if (urls.length === 0) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })

    const created: any[] = []
    const rejected: { url: string; reason: string }[] = []
    for (const u of urls) {
      if (!isSafePublicUrl(u)) {
        rejected.push({ url: u, reason: 'Not a valid public http(s) URL.' })
        continue
      }
      const existing = await prisma.researchSource.findFirst({ where: { url: u } })
      if (existing) {
        rejected.push({ url: u, reason: `Already in the source library (status: ${existing.status}).` })
        continue
      }
      const src = await prisma.researchSource.create({
        data: {
          submittedById: userId,
          sourceType: classifyUrl(u),
          url: u,
          title: u,
          status: 'queued',
        },
      })
      created.push(src)
    }

    if (created.length) {
      await prisma.auditLog.create({
        data: {
          userId, actor: 'user', action: 'TEACH EMIL — SOURCES SUBMITTED', category: 'learning',
          detail: `${created.length} URL(s) queued for the Knowledge Council: ${created.map((c) => c.url).join(', ').slice(0, 900)}`,
        },
      })
    }
    return NextResponse.json({ ok: true, created, rejected })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to submit sources' }, { status: 500 })
  }
}
