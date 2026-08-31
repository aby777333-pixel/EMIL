import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? ''
    const items = await prisma.knowledgeItem.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { contentText: { contains: q, mode: 'insensitive' } },
              { tags: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load knowledge' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const title = (body?.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const item = await prisma.knowledgeItem.create({
      data: {
        userId,
        title,
        knowledgeType: body?.knowledgeType ?? 'instruction',
        classification: body?.classification ?? 'personal',
        factType: body?.factType ?? 'hypothesis',
        trustLevel: 0,
        sourceReliability: 'trader_direct',
        scopeNote: body?.scopeNote ?? null,
        contentText: body?.contentText ?? null,
        cloudStoragePath: body?.cloudStoragePath ?? null,
        isPublic: false,
        fileName: body?.fileName ?? null,
        fileType: body?.fileType ?? null,
        status: 'processing',
        tags: body?.tags ?? null,
      },
    })
    await prisma.auditLog.create({
      data: { userId, actor: 'user', action: 'KNOWLEDGE UPLOAD', category: 'learning', detail: `"${title}" submitted to TEACH EMIL (${body?.knowledgeType ?? 'instruction'}). Trust level 0 — unprocessed.` },
    })
    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save knowledge item' }, { status: 500 })
  }
}
