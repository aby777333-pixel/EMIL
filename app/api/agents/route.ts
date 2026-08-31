import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const agents = await prisma.agent.findMany({
      include: {
        votes: {
          include: { candidate: { include: { instrument: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { number: 'asc' },
    })
    const activeCandidate = await prisma.tradeCandidate.findFirst({
      where: { status: { in: ['proposed', 'approved'] } },
      include: { instrument: true, votes: { include: { agent: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ agents, activeCandidate })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
  }
}
