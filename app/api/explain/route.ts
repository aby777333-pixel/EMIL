import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// EXPLAIN EVERY IMPORTANT DECISION — streams EMIL's plain-language reasoning to the UI.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const candidateId = body?.candidateId ?? ''
    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: candidateId },
      include: { instrument: true, strategy: true, votes: { include: { agent: true } }, riskDecisions: true },
    })
    if (!candidate) return NextResponse.json({ error: 'Trade candidate not found' }, { status: 404 })

    const votesSummary = candidate.votes
      .map((v: any) => `${v?.agent?.name}: ${v?.vote} (${v?.confidence}%)${v?.evidenceAgainst && v.evidenceAgainst !== 'None' ? ` — against: ${v.evidenceAgainst}` : ''}`)
      .join('\n')
    const riskSummary = candidate.riskDecisions.map((r: any) => `${r?.engine}: ${r?.decision} — ${r?.reason}`).join('\n')

    const messages = [
      {
        role: 'system',
        content: `You are EMIL, the Evolutionary Market Intelligence Layer — the trader's best buddy. Explain trading decisions in first person, plain language, honestly and calmly, like the examples: "I am considering EURUSD because the H1 and M15 trends align..." or "I rejected XAUUSD because even the minimum 0.01-lot position exceeds your permitted monetary risk." Cover: what I saw in the market, why the decision was ${candidate.finalDecision}, the exact risk numbers, what the agents and the Guardian said, what would invalidate my view, and what I will do next. Be protective, never promotional. 3-6 short paragraphs. Never guarantee outcomes.`,
      },
      {
        role: 'user',
        content: `Explain this decision:\n\nInstrument: ${candidate.instrument?.symbol} (${candidate.instrument?.name})\nDirection: ${candidate.direction}\nFinal decision: ${candidate.finalDecision}\nStrategy: ${candidate.strategy?.name} ${candidate.strategy?.version} (health ${candidate.strategy?.healthScore})\nRegime: ${candidate.regime} | HTF bias: ${candidate.htfBias}\nEntry ${candidate.entry} SL ${candidate.stopLoss} TP1 ${candidate.tp1 ?? '-'} TP2 ${candidate.tp2 ?? '-'} TP3 ${candidate.tp3 ?? '-'}\nCalculated lot: ${candidate.calculatedLot} (base 0.01, max aggregate ${candidate.maxExposure})\nExposure before/after: ${candidate.aggExposureBefore}/${candidate.aggExposureAfter} lots\nMonetary risk: $${candidate.monetaryRisk} = ${candidate.riskPct}% | R:R ${candidate.rewardRisk}\nConfidence ${candidate.confidence}% | Consensus ${candidate.consensusScore} | EMIL trust in environment ${candidate.trustScore}\nNews risk: ${candidate.newsRisk ?? 'none'}\nCorrelation: ${candidate.correlationExposure ?? 'none'}\nReasons for: ${candidate.reasonsFor}\nReasons against: ${candidate.reasonsAgainst}\nInvalidation: ${candidate.invalidation ?? '-'}\nExit plan: ${candidate.exitPlan ?? '-'}\nGuardian status: ${candidate.guardianStatus}\n\nAgent votes:\n${votesSummary}\n\nRisk engine decisions:\n${riskSummary}`,
      },
    ]

    if (!process.env.ABACUSAI_API_KEY) {
      return NextResponse.json({ error: 'AI engine not configured — set ABACUSAI_API_KEY in the server environment.' }, { status: 503 })
    }
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages, stream: true, max_tokens: 1200 }),
    })

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'LLM API request failed' }, { status: 502 })
    }

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
              } catch {
                // skip invalid JSON chunks
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
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
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Explain failed' }, { status: 500 })
  }
}
