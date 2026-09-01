// TEACH EMIL — knowledge extraction pipeline.
// Core principle: "I read it" is never "I know it is true". Every extracted
// claim starts as an attributed hypothesis at low confidence and must earn its
// way up through independent validation in the Strategy Lab.

import { prisma } from '@/lib/db'
import { llmJson } from './llm'

export type ExtractionResult = {
  summary: string
  reliability: 'low' | 'medium' | 'high'
  reliabilityReason?: string
  claims: Array<{
    claimText: string
    claimType: 'fact' | 'opinion' | 'prediction' | 'trading_rule' | 'performance_claim' | 'psychology' | 'hypothesis'
    concept?: string
    instrument?: string
    timeframe?: string
    regime?: string
    locationHint?: string
    evidenceText?: string
  }>
  concepts: Array<{
    name: string
    category: string
    summary: string
    instruments?: string
    timeframes?: string
    regimes?: string
  }>
  edges: Array<{ from: string; to: string; relation: string; note?: string }>
  contradictions: Array<{ topic: string; sideA: string; sideB: string; analysisNote?: string }>
  strategies: Array<{
    name: string
    market?: string
    instruments?: string
    timeframe?: string
    indicators?: string[]
    entryLong?: string
    entryShort?: string
    stopLoss?: string
    takeProfit?: string
    positionSizing?: string
    filters?: string
    invalidConditions?: string
    missingFields?: string
  }>
  hypotheses: Array<{ title: string; statement: string; testPlan?: string }>
}

const EXTRACTION_SYSTEM = `You are the EMIL Knowledge Council — the research-intake layer of an institutional quant research laboratory covering forex, global equities, indices, commodities, metals, energy, bonds, ETFs, futures and cross-asset macro.

You are given raw material from ONE external source (a YouTube transcript, article, or document). Extract structured trading knowledge from it. CRITICAL RULES:
1. NEVER treat the source as authoritative. A confident presenter is not evidence. Classify every statement precisely:
   - "fact": objectively verifiable market mechanics or definitions (e.g. "NFP is released monthly").
   - "opinion": the presenter's view or preference.
   - "prediction": a forward-looking market call.
   - "trading_rule": a concrete if-then rule the source teaches.
   - "performance_claim": any win-rate / profit / accuracy claim — ALWAYS record as "Source claims X" and mark for independent validation, never as truth.
   - "psychology": mindset / discipline material.
   - "hypothesis": anything else potentially useful but unproven.
2. For each claim capture instrument, timeframe, market regime and the location hint (transcript timestamp like [12:34] or page) when the material provides them.
3. Extract distinct CONCEPTS (indicators, strategies, macro relationships, regimes, sessions, central banks, risk models). Reuse EXACT names from the provided existing-concept list when the same concept appears — do not create near-duplicates.
4. Extract knowledge-graph EDGES between concepts (relations: drives, inverse, correlates, filters, component_of, contradicts, precedes, regime_of).
5. Detect CONTRADICTIONS between this source's claims and the provided existing knowledge. Do not pick a winner — describe when each side might be right (regime/timeframe/instrument dependence).
6. If the source teaches a complete tradeable METHODOLOGY, extract it into structured strategy rules. If any component (entries, exits, stops, sizing) is missing, list what is missing in missingFields — NEVER invent missing rules.
7. Propose at most 3 research HYPOTHESES worth testing, each with a concrete test plan.
Keep every text field concise (1-3 sentences). Limit: max 15 claims, 10 concepts, 12 edges, 4 contradictions, 3 strategies, 3 hypotheses. Also rate the source's reliability (low/medium/high) with a one-line reason — based on rigor and evidence supplied, not confidence or popularity.

JSON schema:
{"summary": str, "reliability": "low|medium|high", "reliabilityReason": str, "claims": [{"claimText","claimType","concept","instrument","timeframe","regime","locationHint","evidenceText"}], "concepts": [{"name","category","summary","instruments","timeframes","regimes"}], "edges": [{"from","to","relation","note"}], "contradictions": [{"topic","sideA","sideB","analysisNote"}], "strategies": [{"name","market","instruments","timeframe","indicators":[str],"entryLong","entryShort","stopLoss","takeProfit","positionSizing","filters","invalidConditions","missingFields"}], "hypotheses": [{"title","statement","testPlan"}]}
Concept "category" must be one of: indicator, strategy, macro, instrument, regime, risk, psychology, session, event, central_bank, correlation, other.`

// LLMs occasionally return arrays/objects where the schema says string —
// coerce everything defensively before it reaches Prisma.
const asStr = (v: any, max = 1500): string | null => {
  if (v === null || v === undefined) return null
  const s = Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ') : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v)
  const t = s.trim()
  return t ? t.slice(0, max) : null
}

const MARKET_CODE: Record<string, string> = {
  forex: 'FX', equities: 'EQ', stocks: 'EQ', indices: 'IX', commodities: 'CM',
  metals: 'MT', energy: 'EN', bonds: 'BD', etf: 'ET', futures: 'FU', crypto: 'CR', multi: 'XA',
}

async function nextStrategyCode(market?: string | null): Promise<string> {
  const code = MARKET_CODE[(market ?? 'multi').toLowerCase()] ?? 'XA'
  const count = await prisma.strategyBlueprint.count({ where: { code: { startsWith: `EMIL-${code}-` } } })
  return `EMIL-${code}-${String(count + 1).padStart(3, '0')}`
}

export async function runExtraction(sourceId: string): Promise<{ extraction: ExtractionResult; persisted: Record<string, number> }> {
  const source = await prisma.researchSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error('Source not found')

  const existingConcepts = await prisma.knowledgeConcept.findMany({
    select: { name: true, category: true, summary: true },
    orderBy: { sourceCount: 'desc' },
    take: 120,
  })
  const recentRules = await prisma.knowledgeClaim.findMany({
    where: { claimType: { in: ['trading_rule', 'performance_claim'] } },
    select: { claimText: true, instrument: true, timeframe: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  const materialParts = [
    `SOURCE TYPE: ${source.sourceType}`,
    `TITLE: ${source.title}`,
    source.author ? `AUTHOR/CHANNEL: ${source.author}` : '',
    source.url ? `URL: ${source.url}` : '',
    source.publishedAt ? `PUBLISHED: ${source.publishedAt.toISOString().slice(0, 10)}` : '',
    source.durationSec ? `DURATION: ${Math.round(source.durationSec / 60)} min` : '',
    source.metadata ? `METADATA: ${source.metadata.slice(0, 1500)}` : '',
    '',
    'EXISTING KNOWLEDGE-GRAPH CONCEPTS (reuse exact names where they match):',
    existingConcepts.map((c) => `- ${c.name} [${c.category}]`).join('\n') || '(none yet)',
    '',
    'EXISTING TRADING RULES ALREADY LEARNED (check the new material against these for contradictions):',
    recentRules.map((r) => `- ${r.claimText}${r.instrument ? ` (${r.instrument}${r.timeframe ? ` ${r.timeframe}` : ''})` : ''}`).join('\n') || '(none yet)',
    '',
    'MATERIAL:',
    source.extractedText ?? '(No transcript/body text could be acquired — analyze from title, author and metadata only, and keep claims minimal.)',
  ]

  const extraction = await llmJson<ExtractionResult>(EXTRACTION_SYSTEM, materialParts.filter(Boolean).join('\n'), 4000)

  const persisted = { claims: 0, concepts: 0, edges: 0, contradictions: 0, strategies: 0, hypotheses: 0 }
  const conceptIdByName = new Map<string, string>()

  const CATEGORIES = ['indicator', 'strategy', 'macro', 'instrument', 'regime', 'risk', 'psychology', 'session', 'event', 'central_bank', 'correlation', 'other']
  for (const c of (extraction.concepts ?? []).slice(0, 12)) {
    const name = asStr(c?.name, 160)
    if (!name) continue
    const existing = await prisma.knowledgeConcept.findUnique({ where: { name } })
    if (existing) {
      const merge = (prev: string | null, next: string | null) => {
        const set = new Set((prev ?? '').split(',').map((s) => s.trim()).filter(Boolean))
        for (const v of (next ?? '').split(',').map((s) => s.trim()).filter(Boolean)) set.add(v)
        return Array.from(set).join(',') || null
      }
      const updated = await prisma.knowledgeConcept.update({
        where: { id: existing.id },
        data: {
          sourceCount: existing.sourceCount + 1,
          instruments: merge(existing.instruments, asStr(c?.instruments, 400)),
          timeframes: merge(existing.timeframes, asStr(c?.timeframes, 400)),
          regimes: merge(existing.regimes, asStr(c?.regimes, 400)),
        },
      })
      conceptIdByName.set(name, updated.id)
    } else {
      const category = asStr(c?.category, 40) ?? 'other'
      const created = await prisma.knowledgeConcept.create({
        data: {
          name,
          category: CATEGORIES.includes(category) ? category : 'other',
          summary: asStr(c?.summary, 1500),
          instruments: asStr(c?.instruments, 400),
          timeframes: asStr(c?.timeframes, 400),
          regimes: asStr(c?.regimes, 400),
          sourceCount: 1,
          confidence: 20,
          confidenceFactors: JSON.stringify([{ factor: 'Newly learned — untested', delta: 0, base: 20 }]),
        },
      })
      conceptIdByName.set(name, created.id)
      persisted.concepts++
    }
  }

  const CLAIM_TYPES = ['fact', 'opinion', 'prediction', 'trading_rule', 'performance_claim', 'psychology', 'hypothesis']
  for (const cl of (extraction.claims ?? []).slice(0, 18)) {
    const claimText = asStr(cl?.claimText, 2000)
    if (!claimText) continue
    const conceptName = asStr(cl?.concept, 160)
    const conceptId = conceptName ? conceptIdByName.get(conceptName) ?? null : null
    const claimType = asStr(cl?.claimType, 40) ?? 'hypothesis'
    await prisma.knowledgeClaim.create({
      data: {
        sourceId: source.id,
        conceptId,
        claimText,
        claimType: CLAIM_TYPES.includes(claimType) ? claimType : 'hypothesis',
        instrument: asStr(cl?.instrument, 120),
        timeframe: asStr(cl?.timeframe, 120),
        regime: asStr(cl?.regime, 200),
        locationHint: asStr(cl?.locationHint, 120),
        evidenceText: asStr(cl?.evidenceText, 1000),
        confidence: claimType === 'fact' ? 45 : 20,
      },
    })
    persisted.claims++
  }

  for (const e of (extraction.edges ?? []).slice(0, 15)) {
    const fromName = asStr(e?.from, 160)
    const toName = asStr(e?.to, 160)
    const fromId = fromName ? conceptIdByName.get(fromName) : null
    const toId = toName ? conceptIdByName.get(toName) : null
    if (!fromId || !toId || fromId === toId) continue
    const relation = asStr(e?.relation, 40) ?? 'correlates'
    try {
      await prisma.knowledgeEdge.upsert({
        where: { fromId_toId_relation: { fromId, toId, relation } },
        update: { note: asStr(e?.note, 500) ?? undefined },
        create: { fromId, toId, relation, note: asStr(e?.note, 500) },
      })
      persisted.edges++
    } catch {
      /* duplicate edge race — ignore */
    }
  }

  for (const ct of (extraction.contradictions ?? []).slice(0, 5)) {
    const sideA = asStr(ct?.sideA, 1500)
    const sideB = asStr(ct?.sideB, 1500)
    if (!sideA || !sideB) continue
    await prisma.knowledgeContradiction.create({
      data: {
        topic: asStr(ct?.topic, 300) ?? 'Conflicting guidance',
        sideA,
        sideB,
        sourceAId: source.id,
        analysisNote: asStr(ct?.analysisNote, 1500),
      },
    })
    persisted.contradictions++
  }

  for (const s of (extraction.strategies ?? []).slice(0, 3)) {
    const name = asStr(s?.name, 200)
    if (!name) continue
    const missing = asStr(s?.missingFields, 800)
    const market = asStr(s?.market, 40)
    const code = await nextStrategyCode(market)
    await prisma.strategyBlueprint.create({
      data: {
        code,
        version: '1.0',
        name,
        origin: 'extracted',
        sourceId: source.id,
        market,
        instruments: asStr(s?.instruments, 400),
        timeframe: asStr(s?.timeframe, 120),
        indicators: s?.indicators ? JSON.stringify(Array.isArray(s.indicators) ? s.indicators : [s.indicators]).slice(0, 2000) : null,
        entryLong: asStr(s?.entryLong),
        entryShort: asStr(s?.entryShort),
        stopLoss: asStr(s?.stopLoss),
        takeProfit: asStr(s?.takeProfit),
        positionSizing: asStr(s?.positionSizing),
        filters: asStr(s?.filters),
        invalidConditions: asStr(s?.invalidConditions),
        completeness: missing ? 'incomplete' : 'complete',
        missingFields: missing,
        state: 'LEARNED',
        labStage: 'rules',
        changeLog: JSON.stringify([{ version: '1.0', date: new Date().toISOString(), change: `Extracted from source: ${source.title}`, source: source.url ?? source.title }]),
      },
    })
    persisted.strategies++
  }

  for (const h of (extraction.hypotheses ?? []).slice(0, 3)) {
    const statement = asStr(h?.statement, 2000)
    if (!statement) continue
    await prisma.researchHypothesis.create({
      data: {
        title: asStr(h?.title, 300) ?? statement.slice(0, 120),
        statement,
        originType: 'source_claim',
        sourceId: source.id,
        conceptNames: Array.from(conceptIdByName.keys()).slice(0, 6).join(',') || null,
        testPlan: asStr(h?.testPlan, 1500),
      },
    })
    persisted.hypotheses++
  }

  const reliability = asStr(extraction?.reliability, 20) ?? 'unrated'
  const summary = asStr(extraction?.summary, 3000)
  await prisma.researchSource.update({
    where: { id: source.id },
    data: {
      status: 'analyzed',
      reliability: ['low', 'medium', 'high'].includes(reliability) ? reliability : 'unrated',
      claimCount: persisted.claims,
      analysisJson: JSON.stringify(extraction).slice(0, 100_000),
    },
  })

  await prisma.researchNote.create({
    data: {
      title: `Learning session — ${source.title.slice(0, 140)}`,
      studied: `${source.sourceType === 'youtube' ? 'YouTube video' : 'Web source'}: ${source.title}${source.author ? ` (${source.author})` : ''}`,
      learned: summary,
      stats: JSON.stringify(persisted),
      content: [
        `**Source:** ${source.url ?? source.title}`,
        `**Reliability (assessed):** ${reliability}${asStr(extraction?.reliabilityReason, 400) ? ` — ${asStr(extraction?.reliabilityReason, 400)}` : ''}`,
        persisted.contradictions ? `**Contradictions detected:** ${persisted.contradictions} — see the Contradiction Engine.` : '',
        persisted.strategies ? `**Strategies extracted:** ${persisted.strategies} — entered the Strategy Lab as LEARNED (validation required).` : '',
        persisted.hypotheses ? `**New hypotheses queued:** ${persisted.hypotheses}` : '',
        `**Next research questions:** validate the new claims independently before any confidence increase.`,
      ].filter(Boolean).join('\n'),
    },
  })

  await prisma.learningEvent.create({
    data: {
      eventType: 'regime_learned',
      title: `Studied: ${source.title.slice(0, 180)}`,
      detail: `Knowledge Council extracted ${persisted.claims} claims, ${persisted.concepts} new concepts, ${persisted.strategies} strategies, ${persisted.contradictions} contradictions. Everything enters as UNVALIDATED hypothesis.`,
      agentName: 'Knowledge Council',
    },
  })

  return { extraction, persisted }
}
