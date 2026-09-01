import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ASK EMIL — interrogate everything EMIL has learned. Answers are grounded in
// stored knowledge (claims, concepts, strategies, notebook, contradictions)
// and cite [S#] source markers that map back to the provenance list returned
// in the X-Emil-Sources header the client renders alongside the answer.

const words = (q: string) =>
  Array.from(new Set(q.toLowerCase().replace(/[^a-z0-9\s/]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'what', 'which', 'have', 'about', 'show', 'from', 'that', 'this', 'you', 'your', 'learned', 'every', 'best', 'did'].includes(w))))

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const question = String(body?.question ?? '').slice(0, 1000)
    if (!question.trim()) return NextResponse.json({ error: 'Question required' }, { status: 400 })

    const terms = words(question)
    const or = (fields: string[]) => terms.flatMap((t) => fields.map((f) => ({ [f]: { contains: t, mode: 'insensitive' as const } })))

    const [claims, concepts, blueprints, notes, contradictions] = await Promise.all([
      prisma.knowledgeClaim.findMany({
        where: terms.length ? { OR: or(['claimText', 'instrument', 'timeframe', 'regime']) } : undefined,
        include: { source: { select: { id: true, title: true, url: true, sourceType: true, author: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.knowledgeConcept.findMany({
        where: terms.length ? { OR: or(['name', 'summary', 'instruments']) } : undefined,
        orderBy: { sourceCount: 'desc' },
        take: 15,
      }),
      prisma.strategyBlueprint.findMany({
        where: { isCurrent: true, ...(terms.length ? { OR: or(['name', 'code', 'market', 'instruments', 'entryLong', 'entryShort']) } : {}) },
        include: { labRuns: { orderBy: { createdAt: 'desc' }, take: 3 } },
        take: 10,
      }),
      prisma.researchNote.findMany({
        where: terms.length ? { OR: or(['title', 'learned', 'studied']) } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.knowledgeContradiction.findMany({
        where: terms.length ? { OR: or(['topic', 'sideA', 'sideB']) } : undefined,
        take: 8,
      }),
    ])

    // Build the numbered provenance list.
    const sourceRefs: { n: number; id: string; title: string; url?: string | null; type: string; author?: string | null }[] = []
    const refBySourceId = new Map<string, number>()
    const refFor = (s: { id: string; title: string; url?: string | null; sourceType: string; author?: string | null }) => {
      const existing = refBySourceId.get(s.id)
      if (existing) return existing
      const n = sourceRefs.length + 1
      sourceRefs.push({ n, id: s.id, title: s.title, url: s.url, type: s.sourceType, author: s.author })
      refBySourceId.set(s.id, n)
      return n
    }

    const ctx: string[] = []
    for (const c of claims) {
      const n = refFor(c.source)
      ctx.push(`[S${n}] CLAIM (${c.claimType}, validation: ${c.validationStatus}, confidence ${Math.round(c.confidence)}/100)${c.instrument ? ` on ${c.instrument}` : ''}${c.timeframe ? ` ${c.timeframe}` : ''}${c.locationHint ? ` at ${c.locationHint}` : ''}: ${c.claimText}`)
    }
    for (const c of concepts) {
      ctx.push(`CONCEPT "${c.name}" [${c.category}] (validation: ${c.validationStatus}, confidence ${Math.round(c.confidence)}/100, ${c.sourceCount} sources): ${c.summary ?? ''}`)
    }
    for (const b of blueprints) {
      const runs = b.labRuns.map((r) => `${r.runType}:${r.verdict ?? r.status}`).join(', ')
      ctx.push(`STRATEGY ${b.code} v${b.version} "${b.name}" (${b.origin}, state ${b.state}, stage ${b.labStage}, completeness ${b.completeness}, robustness ${Math.round(b.robustnessScore)}/100)${runs ? ` — recent lab runs: ${runs}` : ''}. Entry long: ${b.entryLong ?? 'n/a'}. Stop: ${b.stopLoss ?? 'n/a'}.`)
    }
    for (const n of notes) ctx.push(`NOTEBOOK "${n.title}": ${(n.learned ?? '').slice(0, 400)}`)
    for (const c of contradictions) ctx.push(`CONTRADICTION (${c.status}) on "${c.topic}": A) ${c.sideA} — vs — B) ${c.sideB}${c.analysisNote ? `. Analysis: ${c.analysisNote}` : ''}`)

    const messages = [
      {
        role: 'system',
        content: `You are EMIL, an institutional-grade trading research intelligence. Answer the user's question ONLY from the stored knowledge provided below. Rules:
- Cite sources inline with the [S#] markers exactly as given whenever a statement traces to a source.
- Always distinguish validated knowledge from unverified claims: prefix unverified material with "Source claims…" and state its validation status and confidence.
- If contradictions exist on the topic, present both sides and when each may apply.
- If the stored knowledge does not cover the question, say so plainly and suggest what to teach EMIL next. Never invent sources or results, never promise profits.
- Be concise and structured; short headings and bullets are fine.`,
      },
      {
        role: 'user',
        content: `STORED KNOWLEDGE:\n${ctx.join('\n').slice(0, 24_000) || '(EMIL has not learned anything matching this topic yet.)'}\n\nQUESTION: ${question}`,
      },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages, stream: true, max_tokens: 1500 }),
    })
    if (!response.ok || !response.body) return NextResponse.json({ error: 'LLM API request failed' }, { status: 502 })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let partial = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            partial += decoder.decode(value, { stream: true })
            const lines = partial.split('\n')
            partial = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const content = parsed?.choices?.[0]?.delta?.content ?? ''
                if (content) controller.enqueue(encoder.encode(content))
              } catch { /* skip */ }
            }
          }
        } catch (error) {
          controller.error(error)
          return
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Emil-Sources': encodeURIComponent(JSON.stringify(sourceRefs.map(({ n, title, url, type, author }) => ({ n, title: title.slice(0, 120), url, type, author })))),
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Ask EMIL failed' }, { status: 500 })
  }
}
