import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchSourceContent, isSafePublicUrl } from '@/lib/teach/ingest'
import { runExtraction } from '@/lib/teach/extract'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ANALYZE & TEACH EMIL — acquire a queued source's content, then run the
// Knowledge Council extraction pipeline over it. One source per call.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const sourceId = body?.sourceId ?? ''
    const source = await prisma.researchSource.findUnique({ where: { id: sourceId } })
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    if (source.status === 'quarantined') return NextResponse.json({ error: 'Source is quarantined — restore it from the Super Admin console first.' }, { status: 409 })
    if (source.status === 'analyzing') return NextResponse.json({ error: 'Analysis already in progress.' }, { status: 409 })

    // 1. Acquire content (skipped for manual/document sources or forced refetch).
    if (source.url && (body?.refetch || !source.extractedText)) {
      if (!isSafePublicUrl(source.url)) return NextResponse.json({ error: 'URL is not a fetchable public address.' }, { status: 400 })
      await prisma.researchSource.update({ where: { id: source.id }, data: { status: 'fetching', fetchError: null } })
      const fetched = await fetchSourceContent(source.url)
      await prisma.researchSource.update({
        where: { id: source.id },
        data: {
          sourceType: fetched.sourceType,
          title: fetched.title?.slice(0, 400) ?? source.title,
          author: fetched.author ?? source.author,
          publishedAt: fetched.publishedAt ?? source.publishedAt,
          durationSec: fetched.durationSec ?? source.durationSec,
          extractedText: fetched.extractedText ?? source.extractedText,
          metadata: fetched.metadata ? JSON.stringify(fetched.metadata).slice(0, 20_000) : source.metadata,
          fetchError: fetched.fetchError ?? null,
          status: 'fetched',
        },
      })
      if (!fetched.extractedText && fetched.fetchError && !fetched.author) {
        // Nothing usable at all — stop here with an honest error.
        await prisma.researchSource.update({ where: { id: source.id }, data: { status: 'error' } })
        return NextResponse.json({ ok: false, error: fetched.fetchError }, { status: 422 })
      }
    }

    // 2. Extraction pipeline.
    await prisma.researchSource.update({ where: { id: source.id }, data: { status: 'analyzing' } })
    try {
      const { extraction, persisted } = await runExtraction(source.id)
      await prisma.auditLog.create({
        data: {
          userId, actor: 'emil', action: 'TEACH EMIL — SOURCE ANALYZED', category: 'learning',
          detail: `"${source.title.slice(0, 160)}" → ${persisted.claims} claims, ${persisted.concepts} concepts, ${persisted.edges} edges, ${persisted.contradictions} contradictions, ${persisted.strategies} strategies, ${persisted.hypotheses} hypotheses. All stored as untested hypotheses.`,
        },
      })
      return NextResponse.json({ ok: true, extraction, persisted })
    } catch (e: any) {
      await prisma.researchSource.update({ where: { id: source.id }, data: { status: 'error', fetchError: `Extraction failed: ${e?.message ?? 'LLM error'}` } })
      return NextResponse.json({ error: `Extraction failed: ${e?.message ?? 'LLM error'}` }, { status: 502 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}
