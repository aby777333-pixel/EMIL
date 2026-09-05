import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { newsFeed, timeSeries, watchlistQuotes } from '@/lib/data/hub'
import { morningBrief } from '@/lib/brief'
import { liveContext } from '@/lib/live-context'
import { llmComplete } from '@/lib/teach/llm'
import { toTwelveData } from '@/lib/instruments/catalog'
import { withGoLinks } from '@/lib/news-link'

export const dynamic = 'force-dynamic'

// Embeddable widgets (round E): public endpoints keyed by an EMBED KEY
// (emil_pk_…, safe to ship in a web page). Protection = allowed origins +
// per-key rate limits + the owner's own data budget. Research data only.
const cors = (origin: string | null) => ({ 'Access-Control-Allow-Origin': origin ?? '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' })

function originOf(req: Request) {
  const o = req.headers.get('origin')
  if (o) return o
  const r = req.headers.get('referer')
  try { return r ? new URL(r).origin : null } catch { return null }
}

async function gate(req: Request, widget: string) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') ?? ''
  if (!key.startsWith('emil_pk_')) return { error: 'Missing embed key (?key=emil_pk_…)', status: 401 as const }
  const ek = await prisma.embedKey.findUnique({ where: { publicKey: key } })
  if (!ek || ek.status !== 'active') return { error: 'Embed key not found or revoked', status: 401 as const }
  if (!ek.widgets.split(',').map((s) => s.trim()).includes(widget)) return { error: `This key does not allow the "${widget}" widget`, status: 403 as const }
  const origin = originOf(req)
  const allowed = (ek.allowedOrigins ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const selfOrigin = `${url.protocol}//${url.host}`
  if (allowed.length && origin && origin !== selfOrigin && !allowed.includes(origin)) return { error: `Origin ${origin} is not allowed for this embed key`, status: 403 as const }
  const rl = await rateLimit(`embed:${ek.id}`, 120, 60)
  if (!rl.allowed) return { error: 'Embed rate limit reached', status: 429 as const, retryAfterSec: rl.retryAfterSec }
  return { ek, origin, url }
}

export async function OPTIONS(req: Request) { return new Response(null, { status: 204, headers: cors(originOf(req)) }) }

export async function GET(req: Request, ctx: { params: { widget: string } }) {
  const g = await gate(req, ctx.params.widget)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status, headers: cors(originOf(req)) })
  const { ek, origin, url } = g
  const theme = (() => { try { return JSON.parse(ek.theme ?? '{}') } catch { return {} } })()
  const s = (k: string, d = '') => (url.searchParams.get(k) ?? d).trim()
  try {
    let data: any
    switch (ctx.params.widget) {
      case 'chart': {
        const symbol = toTwelveData(s('symbol', 'EUR/USD').slice(0, 24)).symbol
        data = await timeSeries(symbol, s('interval', '1day'), Math.min(300, parseInt(s('bars', '150'), 10) || 150))
        break
      }
      case 'quotes': {
        const symbols = Array.from(new Set(s('symbols', 'EUR/USD,XAU/USD,BTC/USD').split(',').map((x) => toTwelveData(x.trim()).symbol).filter(Boolean))).slice(0, 5)
        data = await watchlistQuotes(symbols)
        break
      }
      case 'news': {
        const feed: any = await newsFeed(s('category', 'markets').slice(0, 20), Math.min(20, parseInt(s('limit', '10'), 10) || 10))
        data = { ...feed, data: withGoLinks((feed?.data ?? []).slice(0, 20)) }
        break
      }
      case 'brief':
        data = await morningBrief(ek.userId)
        break
      case 'ask':
        return NextResponse.json({ error: 'POST { question } to this endpoint' }, { status: 405, headers: cors(origin) })
      default:
        return NextResponse.json({ error: 'Unknown widget' }, { status: 404, headers: cors(origin) })
    }
    return NextResponse.json({ ok: true, widget: ctx.params.widget, theme, label: 'Delayed research data via EMIL — not an execution trigger', data }, { headers: { ...cors(origin), 'Cache-Control': 'public, max-age=60' } })
  } catch (e: any) {
    const status = e?.rateLimited ? 429 : 500
    return NextResponse.json({ error: e?.message ?? 'Widget unavailable' }, { status, headers: cors(origin) })
  }
}

export async function POST(req: Request, ctx: { params: { widget: string } }) {
  if (ctx.params.widget !== 'ask') return NextResponse.json({ error: 'Only the ask widget accepts POST' }, { status: 405, headers: cors(originOf(req)) })
  const g = await gate(req, 'ask')
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status, headers: cors(originOf(req)) })
  const { ek, origin } = g
  const daily = await rateLimit(`embed:ask:${ek.id}`, 50, 86_400)
  if (!daily.allowed) return NextResponse.json({ error: 'Daily Ask EMIL budget for this embed reached (50/day).' }, { status: 429, headers: cors(origin) })
  const body = await req.json().catch(() => ({}))
  const question = String(body?.question ?? '').trim().slice(0, 600)
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400, headers: cors(origin) })
  try {
    const ctxText = await liveContext(ek.userId, false).then((c) => c.text).catch(() => '')
    const answer = await llmComplete(
      'You are EMIL, a calm research assistant embedded on a partner website. Answer briefly (<= 160 words) using only the live context below plus general market knowledge. Label anything as delayed research data. Never tell the reader to buy or sell, never guarantee outcomes, never give personalised financial advice.\n\nLIVE CONTEXT:\n' + ctxText.slice(0, 6000),
      question, 500, ek.userId,
    )
    return NextResponse.json({ ok: true, answer, label: 'EMIL research assistant — delayed data, not advice' }, { headers: cors(origin) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Ask EMIL unavailable' }, { status: 503, headers: cors(origin) })
  }
}
