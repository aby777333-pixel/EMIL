import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const candidates = await prisma.tradeCandidate.findMany({
      include: {
        instrument: true,
        strategy: true,
        votes: { include: { agent: true }, orderBy: { confidence: 'desc' } },
        riskDecisions: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    const positions = await prisma.position.findMany({ include: { instrument: true, hedges: true }, orderBy: { openedAt: 'desc' } })
    return NextResponse.json({ candidates, positions })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load trades' }, { status: 500 })
  }
}
