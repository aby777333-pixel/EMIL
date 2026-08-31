import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const strategies = await prisma.strategyVersion.findMany({ orderBy: [{ name: 'asc' }, { version: 'asc' }] })
    return NextResponse.json({ strategies })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load strategies' }, { status: 500 })
  }
}
