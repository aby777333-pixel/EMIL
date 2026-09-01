import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// One call powering the Teach EMIL research dashboard: counts, knowledge graph,
// concepts, claims, hypotheses, contradictions, notebook and confidence trail.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // Batched (not one giant Promise.all) — the pooled DATABASE_URL runs a
    // small connection_limit, and a 17-way parallel fan-out can exceed the
    // pool queue timeout under load.
    const [sourceCount, youtubeCount, docCount, conceptCount, claimCount, edgeCount] = await Promise.all([
      prisma.researchSource.count(),
      prisma.researchSource.count({ where: { sourceType: 'youtube' } }),
      prisma.researchSource.count({ where: { sourceType: { in: ['article', 'document', 'dataset'] } } }),
      prisma.knowledgeConcept.count(),
      prisma.knowledgeClaim.count(),
      prisma.knowledgeEdge.count(),
    ])
    const [hypothesisCounts, blueprintCounts, contradictionOpen, concepts, edges, claims] = await Promise.all([
      prisma.researchHypothesis.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.strategyBlueprint.groupBy({ by: ['state'], where: { isCurrent: true }, _count: { _all: true } }),
      prisma.knowledgeContradiction.count({ where: { status: { in: ['open', 'investigating'] } } }),
      prisma.knowledgeConcept.findMany({ orderBy: [{ sourceCount: 'desc' }, { updatedAt: 'desc' }], take: 60 }),
      prisma.knowledgeEdge.findMany({ include: { from: { select: { name: true, category: true } }, to: { select: { name: true, category: true } } }, take: 150, orderBy: { createdAt: 'desc' } }),
      prisma.knowledgeClaim.findMany({ orderBy: { createdAt: 'desc' }, take: 60, include: { source: { select: { title: true, url: true, sourceType: true, author: true } }, concept: { select: { name: true } } } }),
    ])
    const [hypotheses, contradictions, notebook, confidenceEvents, queue] = await Promise.all([
      prisma.researchHypothesis.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.knowledgeContradiction.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.researchNote.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
      prisma.confidenceEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.researchSource.findMany({ where: { status: { in: ['queued', 'fetching', 'analyzing', 'error'] } }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, title: true, url: true, status: true, sourceType: true, fetchError: true } }),
    ])

    const hypoByStatus: Record<string, number> = {}
    for (const h of hypothesisCounts) hypoByStatus[h.status] = h._count._all
    const stratByState: Record<string, number> = {}
    for (const s of blueprintCounts) stratByState[s.state] = s._count._all

    return NextResponse.json({
      counts: {
        sources: sourceCount,
        youtube: youtubeCount,
        documents: docCount,
        concepts: conceptCount,
        claims: claimCount,
        edges: edgeCount,
        contradictionsOpen: contradictionOpen,
        hypotheses: hypoByStatus,
        strategies: stratByState,
      },
      concepts, edges, claims, hypotheses, contradictions, notebook, confidenceEvents, queue,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load research overview' }, { status: 500 })
  }
}
