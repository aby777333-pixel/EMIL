// TEACH EMIL — LLM helpers. Same Abacus chat-completions endpoint the rest of
// the app uses (see app/api/knowledge/analyze/route.ts), but non-streaming and
// parsed into JSON for the structured extraction / lab pipelines.
//
// Bring-your-own key (round F): when a userId is passed and that customer has
// saved an `openai` or `abacus_ai` key in Integrations, the call runs on THEIR
// key (their budget, their bill) instead of the house key.

import { prisma } from '@/lib/db'
import { decryptSecret } from '@/lib/secrets'

const ENDPOINT = 'https://apps.abacus.ai/v1/chat/completions'
const MODEL = 'gpt-5.4-mini'
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

async function resolveKey(userId?: string): Promise<{ endpoint: string; model: string; key: string; own: boolean }> {
  if (userId) {
    try {
      const rows = await prisma.userProviderKey.findMany({ where: { userId, providerKey: { in: ['openai', 'abacus_ai'] }, status: { not: 'error' } } })
      const abacus = rows.find((r) => r.providerKey === 'abacus_ai')
      const openai = rows.find((r) => r.providerKey === 'openai')
      if (abacus) { const k = decryptSecret(abacus.apiKey); if (k) return { endpoint: ENDPOINT, model: MODEL, key: k, own: true } }
      if (openai) { const k = decryptSecret(openai.apiKey); if (k) return { endpoint: OPENAI_ENDPOINT, model: OPENAI_MODEL, key: k, own: true } }
    } catch { /* fall through to the house key */ }
  }
  if (!process.env.ABACUSAI_API_KEY) throw new Error('AI engine not configured — set ABACUSAI_API_KEY in the server environment.')
  return { endpoint: ENDPOINT, model: MODEL, key: process.env.ABACUSAI_API_KEY, own: false }
}

export async function llmComplete(system: string, user: string, maxTokens = 3000, userId?: string): Promise<string> {
  const k = await resolveKey(userId)
  const res = await fetch(k.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k.key}` },
    body: JSON.stringify({
      model: k.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) {
    if (k.own && userId) prisma.userProviderKey.updateMany({ where: { userId, providerKey: { in: ['openai', 'abacus_ai'] } }, data: { lastError: `LLM API responded ${res.status}` } }).catch(() => {})
    throw new Error(`LLM API responded ${res.status}${k.own ? ' (your own AI key)' : ''}`)
  }
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

export async function llmJson<T = any>(system: string, user: string, maxTokens = 3000, userId?: string): Promise<T> {
  const text = await llmComplete(`${system}\n\nRespond with VALID JSON only — no prose before or after, no markdown fences.`, user, maxTokens, userId)
  return parseLlmJson<T>(text)
}
