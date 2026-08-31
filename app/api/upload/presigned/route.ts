import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const fileName = body?.fileName ?? `file-${Date.now()}`
    const contentType = body?.contentType ?? 'application/octet-stream'
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, false)
    return NextResponse.json({ uploadUrl, cloud_storage_path })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
