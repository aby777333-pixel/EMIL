import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchInstruments, listInstruments, getInstrument } from '@/lib/instruments/master'
import { resolveInstrument, CATALOG_VERSION } from '@/lib/instruments/catalog'

export const dynamic = 'force-dynamic'

// Instrument master API (spec §150–151, §40–42 instrument-level search).
//   GET /api/instruments?q=gold            → ranked search (default 12)
//   GET /api/instruments?key=XAUUSD        → one instrument with every provider symbol
//   GET /api/instruments?all=1&market=forex→ full listing (for /instruments)
//   GET /api/instruments?resolve=EUR/USD   → normalization only (no DB)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  try {
    const resolve = url.searchParams.get('resolve')
    if (resolve) return NextResponse.json({ ok: true, input: resolve, instrument: resolveInstrument(resolve) })

    const key = url.searchParams.get('key')
    if (key) {
      const row = await getInstrument(key)
      if (!row) return NextResponse.json({ error: 'Unknown instrument' }, { status: 404 })
      return NextResponse.json({ ok: true, instrument: row })
    }

    const market = url.searchParams.get('market') ?? undefined
    if (url.searchParams.get('all')) {
      const rows = await listInstruments(market)
      return NextResponse.json({ ok: true, catalogVersion: CATALOG_VERSION, count: rows.length, instruments: rows })
    }

    const q = url.searchParams.get('q') ?? ''
    const limit = parseInt(url.searchParams.get('limit') ?? '12', 10)
    const results = await searchInstruments(q, { market, limit })
    return NextResponse.json({ ok: true, q, results })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Instrument lookup failed' }, { status: 500 })
  }
}
