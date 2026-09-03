// Instrument master — DB sync + search (server only).
// The table mirrors lib/instruments/catalog.ts; the code catalog is the source
// of truth and is upserted idempotently whenever the version or row count
// disagrees, so a fresh database is populated on first use.

import { prisma } from '@/lib/db'
import { CATALOG, CATALOG_VERSION, type InstrumentDef } from './catalog'

let syncPromise: Promise<void> | null = null

export async function syncInstrumentMaster(force = false) {
  if (syncPromise && !force) return syncPromise
  syncPromise = (async () => {
    const [count, newest] = await Promise.all([
      prisma.instrumentMaster.count(),
      prisma.instrumentMaster.findFirst({ orderBy: { catalogVersion: 'desc' }, select: { catalogVersion: true } }),
    ])
    if (!force && count >= CATALOG.length && (newest?.catalogVersion ?? 0) >= CATALOG_VERSION) return
    const rows = CATALOG.map(toRow)
    // chunked upserts — the catalog is small (≈120) but keep transactions short
    for (let i = 0; i < rows.length; i += 25) {
      await prisma.$transaction(rows.slice(i, i + 25).map((r) => prisma.instrumentMaster.upsert({ where: { key: r.key }, update: r, create: r })))
    }
  })().catch((e) => { syncPromise = null; throw e })
  return syncPromise
}

function toRow(d: InstrumentDef) {
  return {
    key: d.key, name: d.name, assetClass: d.assetClass, market: d.market, exchange: d.exchange, country: d.country, currency: d.currency,
    base: d.base ?? null, quote: d.quote ?? null, tdSymbol: d.tdSymbol ?? null, tdProxy: !!d.tdProxy, tvSymbol: d.tvSymbol ?? null,
    emilTradeSymbol: d.tradable ? (d.emilTradeSymbol ?? d.key) : null, deribitSymbol: d.deribitSymbol ?? null, geminiSymbol: d.geminiSymbol ?? null, deltaSymbol: d.deltaSymbol ?? null,
    aliases: (d.aliases ?? []).join(','), lotSize: d.lotSize ?? null, tickSize: d.tickSize ?? null, dataStatus: d.dataStatus, tradable: d.tradable, catalogVersion: CATALOG_VERSION,
  }
}

export type MasterRow = Awaited<ReturnType<typeof prisma.instrumentMaster.findMany>>[number]

/** Ranked search over key / name / aliases. Exact key or alias first, then prefix, then contains. */
export async function searchInstruments(q: string, opts: { market?: string; limit?: number } = {}) {
  await syncInstrumentMaster()
  const query = q.trim()
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12))
  const where: any = opts.market ? { market: opts.market } : {}
  if (!query) {
    return prisma.instrumentMaster.findMany({ where, orderBy: [{ market: 'asc' }, { key: 'asc' }], take: limit })
  }
  const upper = query.toUpperCase()
  const rows = await prisma.instrumentMaster.findMany({
    where: { ...where, OR: [{ key: { contains: upper } }, { name: { contains: query, mode: 'insensitive' } }, { aliases: { contains: upper } }] },
    take: 80,
  })
  const flat = upper.replace(/[\s\/\-_.:=]/g, '')
  const rank = (r: MasterRow) => {
    const aliases = r.aliases.split(',').filter(Boolean)
    if (r.key === upper || r.key === flat || aliases.includes(upper)) return 0
    if (r.key.startsWith(flat)) return 1
    if (r.name.toUpperCase().startsWith(upper)) return 2
    if (aliases.some((a) => a.startsWith(upper))) return 3
    return 4
  }
  return rows.sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key)).slice(0, limit)
}

export async function listInstruments(market?: string) {
  await syncInstrumentMaster()
  return prisma.instrumentMaster.findMany({ where: market ? { market } : {}, orderBy: [{ market: 'asc' }, { assetClass: 'asc' }, { key: 'asc' }] })
}

export async function getInstrument(key: string) {
  await syncInstrumentMaster()
  return prisma.instrumentMaster.findUnique({ where: { key: key.trim().toUpperCase() } })
}
