import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Streams an EMIL Knowledge Council analysis of a knowledge item back to the UI.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const itemId = body?.itemId ?? ''
    const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 })

    const messages = [
      {
        role: 'system',
        content: `You are the EMIL Knowledge Council — the layer of the Evolutionary Market Intelligence Layer that reviews trader-submitted knowledge before it can influence trading. Analyze the submitted knowledge item like a professional quant desk would: summarize what it teaches, classify it (fact / opinion / hypothesis), assess risks and contradictions with sound risk management (0.05-lot aggregate exposure cap, 0.5% risk per trade, drawdown guard), state what validation would be required to raise its trust level (levels 0-7: 0 unprocessed, 1 parsed, 2 understood, 3 internally validated, 4 backtested, 5 paper-validated, 6 restricted-live, 7 production), and give a recommended initial trust level with reasoning. Be concise, structured with short section headings, plain language. Never promise profits.`,
      },
      {
        role: 'user',
        content: `Knowledge item submitted to TEACH EMIL:\n\nTitle: ${item.title}\nType: ${item.knowledgeType}\nScope: ${item.scopeNote ?? 'not specified'}\nClassification: ${item.classification}\n\nContent:\n${item.contentText ?? '(file upload — content not inline)'}${item.fileName ? `\nAttached file: ${item.fileName} (${item.fileType ?? 'unknown type'})` : ''}`,
      },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages, stream: true, max_tokens: 1500 }),
    })

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'LLM API request failed' }, { status: 502 })
    }

    let fullText = ''
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
                if (content) {
                  fullText += content
                  controller.enqueue(encoder.encode(content))
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
          // Persist the analysis and advance the item
          await prisma.knowledgeItem.update({
            where: { id: item.id },
            data: { analysisResult: fullText, status: 'understood', trustLevel: Math.max(item.trustLevel, 2) },
          })
          await prisma.learningEvent.create({
            data: { eventType: 'correction', title: `Knowledge analyzed: ${item.title}`, detail: 'Knowledge Council completed semantic analysis. Trust level raised to 2 (understood).', agentName: 'Knowledge Council' },
          })
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
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
