// TEACH EMIL — LLM helpers. Same Abacus chat-completions endpoint the rest of
// the app uses (see app/api/knowledge/analyze/route.ts), but non-streaming and
// parsed into JSON for the structured extraction / lab pipelines.

const ENDPOINT = 'https://apps.abacus.ai/v1/chat/completions'
const MODEL = 'gpt-5.4-mini'

export async function llmComplete(system: string, user: string, maxTokens = 3000): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) throw new Error(`LLM API responded ${res.status}`)
  const body = await res.json()
  const text = body?.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('LLM returned an empty response')
  return text
}

// Extract the first JSON object/array from an LLM response (handles ```json fences).
export function parseLlmJson<T = any>(text: string): T {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.search(/[{[]/)
  if (start > 0) t = t.slice(start)
  // Trim trailing prose after the JSON payload by finding the matching close.
  try {
    return JSON.parse(t)
  } catch {
    for (let end = t.length; end > 1; end--) {
      const ch = t[end - 1]
      if (ch !== '}' && ch !== ']') continue
      try {
        return JSON.parse(t.slice(0, end))
      } catch {
        /* keep shrinking */
      }
    }
    throw new Error('LLM response was not valid JSON')
  }
}

export async function llmJson<T = any>(system: string, user: string, maxTokens = 3000): Promise<T> {
  const text = await llmComplete(`${system}\n\nRespond with VALID JSON only — no prose before or after, no markdown fences.`, user, maxTokens)
  return parseLlmJson<T>(text)
}
