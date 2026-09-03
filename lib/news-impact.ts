// News AI impact scoring (spec §16–17). One structured LLM call per batch of
// headlines, cached by content hash so every user shares the same assessment.
// Output is a MODEL ASSESSMENT of likely market relevance — never a fact,
// never an execution trigger (research data ≠ execution data).

import { createHash } from 'crypto'
import { cachedFetch } from '@/lib/data/hub'
import { llmJson } from '@/lib/teach/llm'

export type HeadlineImpact = {
  i: number
  impact: 'high' | 'medium' | 'low'
  tone: 'risk-on' | 'risk-off' | 'neutral'
  assets: string[]
  why: string
}

export const NEWS_SCORING_MODEL = 'gpt-5.4-mini'

const SYSTEM = `You are EMIL's news desk analyst for a global multi-asset research terminal.
For each headline, assess likely MARKET relevance for traders in FX, metals, indices, energies, crypto and equities.
Rules: use only the headline text and source; do not invent facts; when unsure choose "low" and tone "neutral".
impact: high = likely to move major markets or a central-bank/rates path today; medium = sector or single-asset relevance; low = little tradable relevance.
tone: risk-on / risk-off / neutral for broad markets.
assets: up to 3 short tickers or asset names most affected (e.g. "USD", "XAUUSD", "US500", "BTC", "Crude", "Nifty").
why: one sentence, max 20 words, plain language.
Return {"items":[{"i":<index>,"impact":"high|medium|low","tone":"risk-on|risk-off|neutral","assets":["..."],"why":"..."}]} covering EVERY index given.`

export async function scoreHeadlines(articles: { title: string; domain?: string | null }[]) {
  // 24 headlines keeps one scoring call comfortably inside the serverless time budget (measured ~23 s for 30).
  const list = articles.slice(0, 24)
  if (list.length === 0) return { fetchedAt: new Date().toISOString(), model: NEWS_SCORING_MODEL, items: [] as HeadlineImpact[] }
  const hash = createHash('sha1').update(list.map((a) => a.title).join('\n')).digest('hex').slice(0, 20)
  return cachedFetch(`news_impact_${hash}`, 1800, async () => {
    const user = list.map((a, i) => `${i}\t${a.domain ?? ''}\t${a.title}`).join('\n')
    const out = await llmJson<{ items: HeadlineImpact[] }>(SYSTEM, `Headlines (index<TAB>source<TAB>title):\n${user}`, 2500)
    const items = (Array.isArray(out?.items) ? out.items : [])
      .filter((x) => Number.isInteger(x?.i) && x.i >= 0 && x.i < list.length)
      .map((x) => ({
        i: x.i,
        impact: (['high', 'medium', 'low'].includes(x.impact) ? x.impact : 'low') as HeadlineImpact['impact'],
        tone: (['risk-on', 'risk-off', 'neutral'].includes(x.tone) ? x.tone : 'neutral') as HeadlineImpact['tone'],
        assets: Array.isArray(x.assets) ? x.assets.slice(0, 3).map((s) => String(s).slice(0, 12)) : [],
        why: String(x.why ?? '').slice(0, 160),
      }))
    return { fetchedAt: new Date().toISOString(), model: NEWS_SCORING_MODEL, items }
  })
}
