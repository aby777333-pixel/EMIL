// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS API Client
// Central API for all NEXUS AI interactions across modules
// Every module talks to NEXUS through this single interface
// ═══════════════════════════════════════════════════════════

import type { NexusResponse, NexusSentiment } from '@/types/nexus';

type NexusEndpoint =
  | '/nexus/analyze'
  | '/nexus/suggest'
  | '/nexus/warn'
  | '/nexus/report'
  | '/nexus/coach'
  | '/nexus/signals'
  | '/nexus/draft';

interface NexusRequestOptions {
  module: NexusModule;
  context: Record<string, unknown>;
  userMessage?: string;
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  responseFormat?: 'text' | 'structured' | 'markdown';
  maxTokens?: number;
}

export type NexusModule =
  | 'crm' | 'desk' | 'price' | 'charts' | 'script' | 'intel'
  | 'comply' | 'social' | 'app' | 'core_engine' | 'comms'
  | 'marketplace' | 'incidents' | 'order_entry' | 'position_monitor'
  | 'margin_call' | 'education' | 'weekly_report';

// ─── Superprompt: Exact Dealer & Trader System Prompts ──────
// These are the canonical prompts from the NEXUS AI Engine spec.
// Context variables are injected at call time by the API route.
export const NEXUS_DEALER_SYSTEM_PROMPT = `You are NEXUS, the AI dealing desk assistant for EMIL TRADE.
You operate inside an active dealing room.

BEHAVIOR RULES:
- Be fast. One sentence max unless dealer asks for detail.
- Be opinionated. Give a recommendation, not options.
- Explain with one reason. Not a list.
- Never say "I think" or "possibly". State it.
- Use dealer-facing terminology only.
- When uncertain, say confidence level explicitly.

You are not a chatbot. You are a co-pilot with opinions.`;

export const NEXUS_TRADER_SYSTEM_PROMPT = `You are NEXUS, the AI trading assistant for EMIL TRADE.
You support the trader, not the broker.

BEHAVIOR RULES:
- Maximum 8 words per insight unless asked.
- Never teach. Nudge.
- Never shame losses. Anchor to behavior.
- Sound like an experienced trader, not software.
- If no edge exists, say nothing or say "Wait."
- Voice lines must be speakable in under 3 seconds.`;

const MODULE_SYSTEM_PROMPTS: Record<NexusModule, string> = {
  crm: 'You are NEXUS CRM Intelligence. Analyze client data for churn prediction, lead scoring, and draft client communications in the broker\'s brand voice.',
  desk: NEXUS_DEALER_SYSTEM_PROMPT,
  price: 'You are NEXUS Price Intelligence. Recommend spread adjustments, detect volatility anomalies, and alert on pricing edge cases.',
  charts: 'You are NEXUS Chart Intelligence. Detect chart patterns, identify key support/resistance zones, and generate entry/exit zone overlays.',
  script: 'You are NEXUS Script Reviewer. Analyze trading strategies for risk flags, performance issues, and suggest optimizations.',
  intel: 'You are NEXUS Business Intelligence. Answer natural language queries about any business metric using the provided data context.',
  comply: 'You are NEXUS Compliance Intelligence. Flag AML risks, draft SAR narratives, and alert on regulatory changes. Always err on the side of caution.',
  social: 'You are NEXUS Social Moderator. Review community content, answer trading questions, and validate shared signals for accuracy.',
  app: 'You are NEXUS Mobile Companion. Generate morning briefs, evening debriefs, and crisis support messages. Adapt tone to trader\'s emotional state.',
  core_engine: 'You are NEXUS Trade Intelligence. Provide pre-trade analysis and post-trade debriefs based on market context and trader history.',
  comms: 'You are NEXUS Communications Assistant. Draft emails, analyze sentiment, suggest responses, and maintain the broker\'s brand voice.',
  marketplace: 'You are NEXUS Marketplace Reviewer. Evaluate strategy safety, validate performance claims, and flag risk concerns in listed scripts.',
  incidents: 'You are NEXUS Incident Intelligence. Classify incidents, recommend playbook selection, and advise on escalation decisions.',
  order_entry: 'You are NEXUS Pre-Trade Advisor. Analyze the trade setup, check open positions, assess margin impact, and provide a clear verdict with mandatory disclaimer.',
  position_monitor: 'You are NEXUS Position Monitor. Watch open positions and provide real-time commentary on divergences, approaching levels, and exit opportunities.',
  margin_call: 'You are NEXUS Client Support. Draft compassionate, non-judgmental margin call notifications. Focus on protection and options, never shame.',
  education: 'You are NEXUS Tutor. Generate personalized learning content, interactive quizzes, and trade debriefs. Adapt complexity to trader level.',
  weekly_report: 'You are NEXUS Report Writer. Generate structured weekly performance reports with specific, data-driven insights and actionable improvement suggestions.',
};

const MANDATORY_DISCLAIMER = '⚠️ This is an AI-generated analysis provided for informational purposes only. It does not constitute financial advice. Trading involves substantial risk of loss. Past performance does not guarantee future results. You are solely responsible for your own trading decisions.';

/**
 * NEXUS API Client — all modules use this to communicate with NEXUS
 */
export class NexusAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/nexus') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send an analysis request to NEXUS
   */
  async analyze(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/analyze', options);
  }

  /**
   * Get action suggestions from NEXUS
   */
  async suggest(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/suggest', options);
  }

  /**
   * Get warning/risk assessment from NEXUS
   */
  async warn(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/warn', options);
  }

  /**
   * Generate a natural language report from structured data
   */
  async report(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/report', options);
  }

  /**
   * Get coaching/psychology message
   */
  async coach(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/coach', options);
  }

  /**
   * Draft content (emails, messages, notifications)
   */
  async draft(options: NexusRequestOptions): Promise<NexusResponse> {
    return this.request('/nexus/draft', options);
  }

  /**
   * Core request method — all NEXUS calls go through here
   */
  private async request(endpoint: NexusEndpoint, options: NexusRequestOptions): Promise<NexusResponse> {
    const systemPrompt = MODULE_SYSTEM_PROMPTS[options.module];

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          module: options.module,
          context: options.context,
          userMessage: options.userMessage,
          urgency: options.urgency ?? 'normal',
          responseFormat: options.responseFormat ?? 'text',
          maxTokens: options.maxTokens ?? 1024,
        }),
      });

      if (!res.ok) {
        return this.fallbackResponse(options.module, 'Service temporarily unavailable. Please try again.');
      }

      const data = await res.json();
      return {
        ...data,
        disclaimer: MANDATORY_DISCLAIMER,
      };
    } catch {
      return this.fallbackResponse(options.module, 'NEXUS is temporarily unavailable. Using rule-based fallback.');
    }
  }

  /**
   * Fallback response when AI is unavailable
   */
  private fallbackResponse(module: NexusModule, message: string): NexusResponse {
    return {
      response: message,
      confidence: 0,
      sources: ['fallback'],
      disclaimer: MANDATORY_DISCLAIMER,
      actions: [],
      sentiment: 'informational',
    };
  }
}

/**
 * Singleton NEXUS API instance
 */
export const nexus = new NexusAPI();

// ─── Module-Specific Helper Functions ───────────────────────

/** CRM: Predict churn probability for a client */
export async function nexusPredictChurn(clientData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'crm', context: { action: 'predict_churn', client: clientData } });
}

/** CRM: Score a lead */
export async function nexusScoreLead(leadData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'crm', context: { action: 'score_lead', lead: leadData } });
}

/** CRM: Draft an email */
export async function nexusDraftEmail(clientContext: Record<string, unknown>, purpose: string): Promise<NexusResponse> {
  return nexus.draft({ module: 'comms', context: { client: clientContext, purpose }, userMessage: `Draft a ${purpose} email for this client` });
}

/** Desk: Get routing advice */
export async function nexusRoutingAdvice(orderData: Record<string, unknown>, clientRisk: number): Promise<NexusResponse> {
  return nexus.suggest({ module: 'desk', context: { order: orderData, clientRiskScore: clientRisk } });
}

/** Desk: Get hedge suggestion */
export async function nexusHedgeSuggestion(exposure: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.suggest({ module: 'desk', context: { action: 'hedge_suggestion', exposure } });
}

/** Price: Spread recommendation */
export async function nexusSpreadAdvice(symbol: string, volatility: number, session: string): Promise<NexusResponse> {
  return nexus.suggest({ module: 'price', context: { symbol, volatility, session } });
}

/** Charts: Detect patterns */
export async function nexusDetectPatterns(symbol: string, timeframe: string, ohlcv: unknown[]): Promise<NexusResponse> {
  return nexus.analyze({ module: 'charts', context: { symbol, timeframe, bars: ohlcv } });
}

/** Charts: Generate S/R zones */
export async function nexusGenerateZones(symbol: string, timeframe: string): Promise<NexusResponse> {
  return nexus.analyze({ module: 'charts', context: { action: 'generate_zones', symbol, timeframe } });
}

/** Script: Review strategy for risks */
export async function nexusReviewStrategy(code: string, params: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'script', context: { code, params } });
}

/** Intel: Natural language query on business data */
export async function nexusQueryIntel(question: string, dataContext: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'intel', context: dataContext, userMessage: question });
}

/** Comply: Flag transaction for AML */
export async function nexusAmlCheck(transaction: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.warn({ module: 'comply', context: { action: 'aml_check', transaction }, urgency: 'high' });
}

/** Comply: Draft SAR narrative */
export async function nexusDraftSar(caseData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.draft({ module: 'comply', context: { action: 'draft_sar', case: caseData } });
}

/** Social: Moderate a post */
export async function nexusModeratePost(post: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'social', context: { action: 'moderate', post } });
}

/** Social: Answer a community question */
export async function nexusAnswerQuestion(question: string, context: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'social', context, userMessage: question });
}

/** App: Generate morning brief */
export async function nexusMorningBrief(traderProfile: Record<string, unknown>, marketData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.report({ module: 'app', context: { action: 'morning_brief', profile: traderProfile, market: marketData } });
}

/** App: Crisis detection */
export async function nexusCrisisCheck(tradingData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.warn({ module: 'app', context: { action: 'crisis_check', data: tradingData }, urgency: 'critical' });
}

/** Order Entry: Pre-trade analysis */
export async function nexusPreTradeAnalysis(orderIntent: Record<string, unknown>, accountState: Record<string, unknown>, marketContext: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'order_entry', context: { order: orderIntent, account: accountState, market: marketContext } });
}

/** Position Monitor: Live commentary */
export async function nexusPositionCommentary(position: Record<string, unknown>, marketState: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'position_monitor', context: { position, market: marketState } });
}

/** Margin Call: Draft compassionate notification */
export async function nexusMarginCallMessage(clientData: Record<string, unknown>, marginState: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.draft({ module: 'margin_call', context: { client: clientData, margin: marginState } });
}

/** Education: Generate personalized lesson */
export async function nexusGenerateLesson(topic: string, traderLevel: string): Promise<NexusResponse> {
  return nexus.report({ module: 'education', context: { topic, level: traderLevel } });
}

/** Education: Generate quiz */
export async function nexusGenerateQuiz(topic: string, difficulty: string): Promise<NexusResponse> {
  return nexus.report({ module: 'education', context: { action: 'quiz', topic, difficulty } });
}

/** Education: Trade debrief */
export async function nexusTradeDebrief(trade: Record<string, unknown>, traderHistory: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.coach({ module: 'education', context: { trade, history: traderHistory } });
}

/** Weekly Report: Generate full report */
export async function nexusWeeklyReport(performanceData: Record<string, unknown>, traderProfile: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.report({ module: 'weekly_report', context: { performance: performanceData, profile: traderProfile } });
}

/** Incidents: Classify and recommend */
export async function nexusClassifyIncident(incidentData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'incidents', context: incidentData, urgency: 'high' });
}

/** Marketplace: Safety review of a script */
export async function nexusMarketplaceReview(scriptCode: string, performanceData: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.analyze({ module: 'marketplace', context: { code: scriptCode, performance: performanceData } });
}

/** Comms: Analyze sentiment of a message */
export async function nexusAnalyzeSentiment(message: string): Promise<NexusResponse> {
  return nexus.analyze({ module: 'comms', context: { action: 'sentiment', message } });
}

/** Comms: Suggest response */
export async function nexusSuggestResponse(threadContext: Record<string, unknown>): Promise<NexusResponse> {
  return nexus.suggest({ module: 'comms', context: threadContext });
}
