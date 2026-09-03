import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Star, CandlestickChart, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Public read-only view of a shared watchlist (spec §66 "sharing"). Deliberately
// shows SYMBOLS ONLY: no quotes (they would spend the free data plan's credits
// on anonymous traffic) and nothing about the owner's account.
export default async function SharedWatchlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length > 64) notFound()
  const list = await prisma.watchlist.findUnique({
    where: { shareToken: token },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  if (!list) notFound()

  return (
    <main className="min-h-screen bg-[#0a0e14] text-slate-200 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-5">
        <div className="flex items-center gap-2 text-cyan-300">
          <span className="font-display text-lg font-bold tracking-tight text-white">EMIL</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">shared watchlist</span>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h1 className="text-base font-bold text-amber-300 flex items-center gap-2"><Star className="h-4 w-4" /> {list.name}</h1>
          <p className="text-[11px] text-slate-500 mt-1">{list.items.length} instrument{list.items.length === 1 ? '' : 's'} · read-only · symbols only</p>
          <ul className="mt-3 space-y-1.5">
            {list.items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 rounded-md border border-border bg-black/30 px-3 py-2">
                <CandlestickChart className="h-3.5 w-3.5 text-cyan-500" />
                <span className="num text-sm font-semibold text-white">{it.symbol}</span>
                {it.label ? <span className="text-[11px] text-slate-500">{it.label}</span> : null}
              </li>
            ))}
            {list.items.length === 0 ? <li className="text-xs text-slate-500">This list is empty.</li> : null}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-black/30 p-4 text-[12px] text-slate-400 space-y-2">
          <p>Live quotes, charts, correlations and alerts for these instruments are available to signed-in EMIL users.</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5">Open EMIL <ArrowRight className="h-3.5 w-3.5" /></Link>
          <p className="text-[10px] text-slate-600">A shared watchlist is a list of symbols, not a recommendation. Nothing here is investment advice.</p>
        </div>
      </div>
    </main>
  )
}
