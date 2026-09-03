// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Output Guardrails & Content Filtering
// All NEXUS responses pass through these filters before display
// ═══════════════════════════════════════════════════════════

/**
 * Content categories that NEXUS must NEVER output
 */
const BLOCKED_PATTERNS = [
  // Definitive financial advice (legally protected)
  /you (should|must|need to) (buy|sell|invest|trade|deposit)/i,
  /guaranteed (profit|return|income)/i,
  /risk[- ]free (trading|investment|return)/i,
  /can('t| not) lose/i,
  /100% (win|success|guaranteed)/i,

  // MT5/cTrader references in trader-facing context (NEVER mention)
  /\bMT4\b/,
  /\bMT5\b/,
  /\bMetaTrader\b/i,
  /\bcTrader\b/i,
  /\bMQL[45]?\b/i,
  /\bcAlgo\b/i,

  // Harmful content
  /suicide|self[- ]harm/i,
  /illegal (trading|activity|scheme)/i,
  /insider (trading|information)/i,
  /market manipulation/i,
  /pump and dump/i,
];

/**
 * Patterns that trigger mandatory disclaimer attachment
 */
const DISCLAIMER_TRIGGERS = [
  /\b(buy|sell|long|short) (signal|setup|opportunity|idea)/i,
  /entry (zone|point|level|price)/i,
  /exit (zone|point|level|price)/i,
  /target (price|level)/i,
  /stop loss.*(at|around|near)/i,
  /take profit.*(at|around|near)/i,
  /\bforecast\b/i,
  /\bprediction\b/i,
  /\bexpect(ed|ing)?\b.*\b(rise|fall|drop|increase|decrease)/i,
  /high[- ]probability/i,
  /confidence.*(score|level|rating)/i,
];

/**
 * Words to soften — replace definitive language with hedged language
 */
const SOFTENING_MAP: [RegExp, string][] = [
  [/\bwill (rise|fall|increase|decrease|drop)\b/gi, 'may $1'],
  [/\bshould (buy|sell)\b/gi, 'could consider a $1 position'],
  [/\bguaranteed\b/gi, 'potential'],
  [/\bcertainly\b/gi, 'likely'],
  [/\bdefinitely\b/gi, 'possibly'],
  [/\bwithout doubt\b/gi, 'with reasonable confidence'],
  [/\bno risk\b/gi, 'managed risk'],
  [/\bsure thing\b/gi, 'potential opportunity'],
  [/\beasy money\b/gi, 'trading opportunity'],
  [/\bcan't fail\b/gi, 'has favorable characteristics'],
];

export interface GuardrailResult {
  text: string;
  wasFiltered: boolean;
  filterReasons: string[];
  requiresDisclaimer: boolean;
  wasBlocked: boolean;
}

/**
 * Filter NEXUS output through all guardrails
 * Called on EVERY response before display to user
 */
export function filterNexusOutput(text: string, isTraderFacing: boolean = true): GuardrailResult {
  const filterReasons: string[] = [];
  let filtered = text;
  let wasBlocked = false;

  // 1. Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filtered)) {
      // If trader-facing, remove the offending content
      if (isTraderFacing) {
        // For MT5/cTrader references: silently replace
        if (/MT[45]|MetaTrader|cTrader|MQL|cAlgo/i.test(pattern.source)) {
          filtered = filtered
            .replace(/\bMT4\b/g, 'the previous platform')
            .replace(/\bMT5\b/g, 'the previous platform')
            .replace(/\bMetaTrader\s*[45]?\b/gi, 'the previous platform')
            .replace(/\bcTrader\b/gi, 'the previous platform')
            .replace(/\bMQL[45]?\b/gi, 'RAPTOR Script')
            .replace(/\bcAlgo\b/gi, 'RAPTOR Script');
          filterReasons.push('mt5_ctrader_reference_replaced');
        }
        // For harmful/definitive advice: flag and soften
        else if (/guaranteed|risk[- ]free|can('t| not) lose|100%/i.test(pattern.source)) {
          filterReasons.push('definitive_financial_advice_softened');
        }
        // For truly harmful content: block entirely
        else {
          wasBlocked = true;
          filtered = 'I\'m unable to provide that type of analysis. Let me help you with something else.';
          filterReasons.push('harmful_content_blocked');
          break;
        }
      }
    }
  }

  // 2. Apply softening to financial language (trader-facing only)
  if (isTraderFacing && !wasBlocked) {
    for (const [pattern, replacement] of SOFTENING_MAP) {
      if (pattern.test(filtered)) {
        filtered = filtered.replace(pattern, replacement);
        filterReasons.push('language_softened');
      }
    }
  }

  // 3. Check if response requires mandatory disclaimer
  let requiresDisclaimer = false;
  if (!wasBlocked) {
    for (const trigger of DISCLAIMER_TRIGGERS) {
      if (trigger.test(filtered)) {
        requiresDisclaimer = true;
        break;
      }
    }
  }

  // 4. Enforce max length (3 sentences for proactive messages)
  // This is enforced at the component level, not here — NEXUS responses
  // to direct questions can be longer, but proactive messages are capped

  return {
    text: filtered,
    wasFiltered: filterReasons.length > 0,
    filterReasons: [...new Set(filterReasons)],
    requiresDisclaimer,
    wasBlocked,
  };
}

/**
 * Rate limiter for NEXUS API calls
 * Per user, per broker tenant — prevents API cost abuse
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkNexusRateLimit(
  userId: string,
  brokerId: string,
  maxCallsPerMinute: number = 20,
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `${brokerId}:${userId}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: maxCallsPerMinute - 1, resetIn: 60 };
  }

  if (entry.count >= maxCallsPerMinute) {
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  return { allowed: true, remaining: maxCallsPerMinute - entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Build the full system prompt for Claude API calls
 * Includes: RAPTOR context + broker context + user profile
 */
export function buildNexusSystemPrompt(
  modulePrompt: string,
  brokerContext: { name: string; persona: string; tone: string; disclaimerText: string },
  userProfile: { level: string; style: string; rules: string[] } | null,
): string {
  const parts = [
    // Core identity
    `You are ${brokerContext.persona || 'NEXUS'}, the AI companion of ${brokerContext.name || 'EMIL TRADE'}.`,
    `Your tone is: ${brokerContext.tone || 'professional and warm'}.`,
    '',
    // Module-specific
    modulePrompt,
    '',
    // Mandatory rules
    'MANDATORY RULES:',
    '- NEVER provide definitive financial advice. Use language like "may", "could", "consider".',
    '- NEVER guarantee profits or claim any trading outcome is certain.',
    '- NEVER mention MT5, MetaTrader, cTrader, MQL5, or cAlgo. Use "RAPTOR" equivalents.',
    '- ALWAYS include risk awareness in trade-related responses.',
    '- Keep proactive messages to 3 sentences maximum.',
    '- Be warm but never condescending. Be direct but never alarming without reason.',
    '- If a trader appears distressed, shift to supportive tone immediately.',
    '- NEVER shame a trader for losses or poor decisions.',
    '',
    // Broker disclaimer
    `Broker disclaimer: ${brokerContext.disclaimerText || 'Trading involves substantial risk of loss.'}`,
  ];

  // User profile context (if available)
  if (userProfile) {
    parts.push('');
    parts.push(`TRADER PROFILE:`);
    parts.push(`- Level: ${userProfile.level}`);
    parts.push(`- Trading style: ${userProfile.style}`);
    if (userProfile.rules.length > 0) {
      parts.push(`- Their stated rules: ${userProfile.rules.join('; ')}`);
    }
    parts.push('Adapt your communication complexity and detail level to this trader\'s profile.');
  }

  return parts.join('\n');
}
