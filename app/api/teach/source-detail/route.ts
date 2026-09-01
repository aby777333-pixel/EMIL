import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Claims extracted from one source — the provenance drill-down.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id') ?? ''
    const [source, claims] = await Promise.all([
      prisma.researchSource.findUnique({ where: { id }, select: { id: true, title: true, url: true, sourceType: true, author: true, status: true, reliability: true, analysisJson: true } }),
      prisma.knowledgeClaim.findMany({ where: { sourceId: id }, orderBy: { createdAt: 'asc' }, include: { concept: { select: { name: true } } } }),
    ])
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    return NextResponse.json({ source, claims })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load source detail' }, { status: 500 })
  }
}
