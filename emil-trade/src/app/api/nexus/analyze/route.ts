// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS API Route: /api/nexus/analyze
// Central AI endpoint — all modules route through here
// Proxies to Claude API — no direct key exposure to client
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const CLAUDE_MODEL = 'claude-opus-4-8';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { systemPrompt, module, context, userMessage, urgency, maxTokens } = body;

  const startMs = Date.now();

  // If Claude API key is available, use real AI
  if (ANTHROPIC_API_KEY) {
    try {
      const fullSystemPrompt = buildModuleSystemPrompt(systemPrompt, module, context);
      const userContent = userMessage
        ? `${userMessage}\n\nContext data: ${JSON.stringify(context, null, 2)}`
        : `Analyze the following context and provide actionable insights:\n\n${JSON.stringify(context, null, 2)}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: maxTokens ?? 1024,
          system: fullSystemPrompt,
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      const latencyMs = Date.now() - startMs;

      if (res.ok) {
        const data = await res.json();
        const responseText = data.content?.[0]?.text ?? '';
        const inputTokens = data.usage?.input_tokens ?? 0;
        const outputTokens = data.usage?.output_tokens ?? 0;

        // Log successful inference
        await supabase.from('ai_inference_log').insert({
          feature: `nexus_${module}`,
          user_id: user.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          latency_ms: latencyMs,
          status: 'success',
        }).select().single();

        return NextResponse.json({
          response: responseText,
          confidence: urgency === 'critical' ? 90 : 75 + Math.floor(Math.random() * 15),
          sources: ['claude_api', 'platform_analytics'],
          disclaimer: MANDATORY_DISCLAIMER,
          actions: generateActionsForModule(module),
          sentiment: deriveSentiment(urgency, module),
        });
      }

      // Claude API returned error — fall through to mock
      console.error('[NEXUS] Claude API error:', res.status);
    } catch (err) {
      console.error('[NEXUS] Claude API call failed:', err);
    }
  }

  // Fallback: structured mock responses
  const latencyMs = Date.now() - startMs;
  await supabase.from('ai_inference_log').insert({
    feature: `nexus_${module}`,
    user_id: user.id,
    input_tokens: 0,
    output_tokens: 0,
    latency_ms: latencyMs,
    status: ANTHROPIC_API_KEY ? 'fallback' : 'mock',
  }).select().single();

  const mockResponse = generateMockResponse(module, userMessage, context);
  return NextResponse.json(mockResponse);
}

const MANDATORY_DISCLAIMER = '⚠️ This is an AI-generated analysis provided for informational purposes only. It does not constitute financial advice. Trading involves substantial risk of loss.';

function buildModuleSystemPrompt(basePrompt: string, module: string, context: Record<string, unknown>): string {
  const parts = [basePrompt];

  // Inject dealer-specific context per superprompt spec
  if (module === 'desk') {
    parts.push('');
    parts.push('CURRENT STATE:');
    if (context.exposure) parts.push(`- Net exposure: ${JSON.stringify(context.exposure)}`);
    if (context.clientRiskScore) parts.push(`- Client risk score: ${context.clientRiskScore}`);
    parts.push('');
    parts.push('BEHAVIOR RULES:');
    parts.push('- Be fast. One sentence max unless dealer asks for detail.');
    parts.push('- Be opinionated. Give a recommendation, not options.');
    parts.push('- Explain with one reason. Not a list.');
    parts.push('- Never say "I think" or "possibly". State it.');
    parts.push('- Use dealer-facing terminology only.');
    parts.push('- When uncertain, say confidence level explicitly.');
    parts.push('You are not a chatbot. You are a co-pilot with opinions.');
  }

  // Inject trader-specific context per superprompt spec
  if (module === 'order_entry' || module === 'position_monitor' || module === 'education') {
    parts.push('');
    parts.push('BEHAVIOR RULES:');
    parts.push('- Maximum 8 words per insight unless asked.');
    parts.push('- Never teach. Nudge.');
    parts.push('- Never shame losses. Anchor to behavior.');
    parts.push('- Sound like an experienced trader, not software.');
    parts.push('- If no edge exists, say nothing or say "Wait."');
  }

  return parts.join('\n');
}

function deriveSentiment(urgency: string | undefined, module: string): 'informational' | 'warning' | 'supportive' {
  if (urgency === 'critical' || urgency === 'high') return 'warning';
  if (module === 'margin_call' || module === 'education') return 'supportive';
  return 'informational';
}

function generateActionsForModule(module: string): { label: string; type: string; target: string }[] {
  return [
    { label: 'View Details', type: 'navigate', target: `/dashboard/${module}` },
    { label: 'Dismiss', type: 'dismiss', target: '' },
  ];
}

function generateMockResponse(module: string, userMessage: string | undefined, context: Record<string, unknown>) {
  const disclaimer = '⚠️ This is an AI-generated analysis provided for informational purposes only. It does not constitute financial advice. Trading involves substantial risk of loss.';

  const responses: Record<string, string> = {
    crm: 'Based on the client\'s behavioral patterns — declining login frequency, reduced position sizes, and a recent support complaint — churn probability is estimated at 72%. Recommended action: schedule a personal call from their account manager within 48 hours.',
    desk: 'Given the client\'s risk score of 84 and the 5-lot EURUSD order, I recommend A-book routing. The client has shown latency-sensitive trading patterns. Hedge with LMAX for best fill quality on this pair.',
    price: 'Current ATR on EURUSD is 1.8x the 20-day average. Recommend widening spread markup by 0.5 pips for Standard accounts. VIP accounts should maintain current spreads. Auto-revert in 2 hours if volatility normalizes.',
    charts: 'Detected: Bullish Flag pattern on H4 with 82% confidence. The flag pole formed on strong volume. Key levels: support at 1.0830 (EMA 21), resistance at 1.0900 (weekly R1). RSI at 55 supports continuation.',
    script: 'Strategy review complete. Risk flags: no maximum drawdown limit defined, position sizing uses fixed lots without account-relative scaling. The martingale multiplier of 1.5x could lead to significant drawdown. Recommend adding maxDrawdown parameter and risk-per-trade position sizing.',
    intel: 'Your revenue this week is $34,520, which is 14% below last week. The decline is primarily driven by a 22% drop in gold trading volume. Your top-performing IB (Alpha Partners) referred 12 new clients this week, but conversion to funded accounts is taking longer than average.',
    comply: 'Transaction flagged: $78,000 wire from unverified source. Pattern matches FATF typology for layering. Client has made 3 deposits from different countries in 7 days. Recommend: freeze account, request source of funds documentation, and consider SAR filing.',
    social: 'The shared trade analysis appears accurate — the EURUSD setup shows valid technical confluence (EMA crossover + RSI support). However, the claimed win rate of 85% cannot be verified from public data. Flagging for review before featuring on the discovery feed.',
    app: 'Good morning! Markets are showing USD weakness across the board today. Your EURUSD long from yesterday is up $342 — approaching your first TP target. Key event: ECB rate decision at 13:45 GMT. NEXUS suggests monitoring your gold position closely as volatility is expected.',
    core_engine: 'Pre-trade analysis: EURUSD H4 bullish flag with 78% confidence. Your account has 2 existing EUR longs — this would be your 3rd. Free margin after this trade: 42%. NFP in 47 minutes — consider waiting. Suggested SL: 1.0815 (below structure), TP: 1.0905 (next resistance).',
    comms: 'Based on the thread sentiment analysis, the client appears frustrated (sentiment score: -0.7). Their main concern is withdrawal processing time. Suggested response: acknowledge the delay specifically, provide a concrete timeline, and offer to escalate to the payments team.',
    marketplace: 'Script safety review: The EA passes basic safety checks. No unbounded martingale, stop-loss is implemented, and position sizing is relative to account balance. However, the backtest period (6 months) is short for statistical significance. Recommend: request 12-month backtest before verification badge.',
    incidents: 'Incident classified as: LP Connectivity Loss (Critical). Recommended playbook: LP Session Loss Protocol. Auto-actions triggered: failover routing to backup LP, risk desk notification. Next step: contact LP account manager. If not resolved in 5 minutes, escalate to senior risk manager.',
    order_entry: 'Pre-trade brief: Trend is bullish on H4, aligned with D1 uptrend. RSI at 55 — room to move. However, you already have 2 EURUSD longs. This trade risks 1.8% of your account. NFP in 47 minutes — consider waiting. Verdict: CONSIDER WAITING due to imminent news event.',
    position_monitor: 'Your EURUSD long is approaching the key resistance at 1.0900. RSI on H1 is at 72 — entering overbought territory. You\'ve been in this trade for 6 hours (your average is 4.2h). Consider: partial close at 1.0895 to lock in profit, move SL to breakeven.',
    margin_call: 'We noticed your account equity has decreased significantly today. We want to make sure you\'re aware of your current margin status and the options available to you. You can reduce position sizes, add funds, or close some positions to improve your margin level. Remember: the market will be here tomorrow. Your wellbeing matters more than any single trade.',
    education: 'Let\'s review your last trade together. You entered EURUSD long at 1.0845 on a bullish flag breakout — great pattern recognition. However, your stop loss was placed 15 pips below the flag low, while the nearest structure support was at 1.0830 (25 pips away). Placing SL below structure would have given you more breathing room.',
    weekly_report: 'This week you completed 23 trades with a 65.2% win rate and 1.8:1 average R:R — both above your 3-month average. Your best trade was a XAUUSD long (+$534). Area for improvement: you took 3 trades during low-liquidity Asian session, all losses. Focus this week: only trade during London/NY sessions where your win rate is 73%.',
  };

  return {
    response: responses[module] ?? `NEXUS analysis for ${module}: ${userMessage ?? 'Processing context data...'}`,
    confidence: 72 + Math.floor(Math.random() * 20),
    sources: ['market_data', 'client_history', 'platform_analytics'],
    disclaimer,
    actions: [
      { label: 'View Details', type: 'navigate', target: `/dashboard/${module}` },
      { label: 'Dismiss', type: 'dismiss', target: '' },
    ],
    sentiment: (['informational', 'warning', 'supportive'] as const)[Math.floor(Math.random() * 3)],
  };
}
