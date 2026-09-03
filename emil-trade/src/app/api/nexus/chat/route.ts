// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Chat API (Real Claude Integration)
// Proxies to the Anthropic API via the official SDK — no key exposure to the
// client. The client sends a live platform context block (real quotes, real
// open positions) which is appended to the system prompt so NEXUS answers
// about THIS trader's actual situation. Without an ANTHROPIC_API_KEY, the
// fallback engine uses the same context so answers stay data-grounded.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const CLAUDE_MODEL = 'claude-opus-4-8';

const NEXUS_SYSTEM_PROMPT = `You are NEXUS, the AI trading companion built into EMIL TRADE — an institutional-grade brokerage platform.

IDENTITY:
- You are warm, knowledgeable, and genuinely care about the trader's success and wellbeing
- You speak with confidence but never arrogance — you're a trusted peer, not a guru
- You use clear, concise language — max 3-4 short paragraphs per response
- You use trading terminology naturally (pips, lots, SL/TP, R:R, ATR, etc.)

CAPABILITIES YOU HAVE:
- Technical analysis (chart patterns, indicators, support/resistance)
- Risk management advice (position sizing, stop loss placement, R:R optimization)
- Trading psychology coaching (overtrading, revenge trading, FOMO, discipline)
- Market education (explain any trading concept at any level)
- Strategy discussion (trend following, mean reversion, scalping, swing)
- Trade review and debriefing

MANDATORY RULES:
- NEVER give definitive financial advice. Use "consider", "may", "could" — never "you should buy/sell"
- NEVER guarantee profits or claim certainty about market direction
- NEVER mention MetaTrader, MT4, MT5, cTrader, MQL5, or cAlgo — you only know RAPTOR
- Always include a brief risk reminder when discussing specific trade setups
- If someone seems distressed about losses, shift to supportive/compassionate tone immediately
- Keep responses concise — traders are busy. Get to the point.
- Use markdown formatting: **bold** for emphasis, bullet points for lists
- When discussing entries/exits, always mention that these are analysis points, not recommendations

PERSONALITY:
- If the trader is winning: celebrate briefly, then refocus on discipline
- If the trader is losing: compassionate, non-judgmental, focused on process over outcome
- If asked about your identity: "I'm NEXUS, your AI trading companion powered by RAPTOR AI"
- You remember context within the conversation and build on previous messages
- You ask follow-up questions to understand what the trader really needs`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, history, context } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }
  const contextText = typeof context === 'string' ? context.slice(0, 4000) : '';

  // If no API key configured, use the data-grounded fallback
  if (!ANTHROPIC_API_KEY) {
    const fallback = generateIntelligentFallback(message, history ?? [], contextText);
    return NextResponse.json({ response: fallback });
  }

  try {
    // Build messages array from history
    const messages: Anthropic.MessageParam[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h.role && h.content) {
          messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
        }
      }
    }
    messages.push({ role: 'user', content: message });

    // Stable system prompt first, volatile live-context block appended after.
    const system = contextText
      ? `${NEXUS_SYSTEM_PROMPT}\n\nLIVE PLATFORM CONTEXT (real-time data from the RAPTOR platform — use it; do not invent prices or positions beyond it):\n${contextText}`
      : NEXUS_SYSTEM_PROMPT;

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const responseText = textBlock && 'text' in textBlock
      ? textBlock.text
      : 'I received your message but couldn\'t generate a response.';

    return NextResponse.json({ response: responseText });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('[NEXUS] Claude API error:', err.status, err.message);
    } else {
      console.error('[NEXUS] API call failed:', err);
    }
    const fallback = generateIntelligentFallback(message, history ?? [], contextText);
    return NextResponse.json({ response: fallback, fallback: true });
  }
}

/**
 * Intelligent fallback when Claude API is unavailable.
 * Data-grounded: when the client supplied live platform context (real quotes,
 * real open positions), position/risk/briefing/SLTP questions are answered
 * from that data instead of generic templates.
 */
function generateIntelligentFallback(input: string, history: { role: string; content: string }[], contextText = ''): string {
  const lower = input.toLowerCase().trim();
  const isFollowUp = history.length > 2;

  // ── Data-grounded branches (real platform context) ──
  if (contextText) {
    const hasPositions = /Open positions \(\d+/.test(contextText);
    const noAccount = contextText.includes('Trading account: not connected');
    const quoteLines = contextText.split('\n').filter((l) => /: bid /.test(l)).map((l) => l.trim());
    const positionLines = contextText.split('\n').filter((l) => /floating P&L/.test(l)).map((l) => l.trim());

    if (/(trade (setups|ideas)|scan (the )?market|opportunit|best setups|what should i trade)/.test(lower)) {
      const scanLine = (contextText.match(/Opportunity scan \(real bars[^\n]+/) || [null])[0];
      if (scanLine) {
        if (scanLine.includes('no trending setups')) {
          return `**Market scan complete** — ${scanLine.replace(/^Opportunity scan \(real bars, /, '').replace(/\):/, ' symbols):')}\n\nNo setups is a real answer: forcing trades in range-bound conditions is negative expectancy. I\'ll keep watching — the Active monitor will flag regime changes.\n\n⚠️ Evidence-based scan of live platform bars, not advice.`;
        }
        const [rankedPart, tail] = scanLine.replace(/^Opportunity scan \(real bars, \d+ symbols\): /, '').split(/\.\s+(?=\d+ symbol)/);
        return `**Ranked opportunities** (live scan of your streamed symbols, confidence-sorted):\n\n${rankedPart.split(' | ').map((r) => `• ${r}`).join('\n')}\n\n${tail ?? ''}\n\nEach is a zone-based plan with a stop and invalidation — ask "entry zone" with that symbol active for the full breakdown.\n\n⚠️ Ranked by evidence, never guaranteed. Size every trade so the stop is survivable.`;
      }
      return 'I scan for setups using real chart data on the **terminal** page. Open the terminal and ask again — I\'ll rank every streamed symbol.';
    }

    if (/(entry zone|best entry|where.*(enter|entry)|good entry)/.test(lower)) {
      const zoneLine = (contextText.match(/Entry-zone assessment for [^\n]+/) || [null])[0];
      if (zoneLine) {
        if (zoneLine.includes('no high-quality setup')) {
          return `**${zoneLine.split(':')[0]}**\n\n${zoneLine.split(': no high-quality setup — ')[1]}\n\nNo setup is a valid answer — forcing entries in an unsuitable regime is how good accounts leak. I\'ll flag it when conditions change.\n\n⚠️ Evidence-based assessment, not advice.`;
        }
        const parts = zoneLine.replace(/^Entry-zone assessment for /, '');
        const header = parts.split(':')[0];
        const body = parts.slice(header.length + 2);
        const [zonePart, invalidationPart] = body.split(' Invalidation: ');
        const [invText, notePart] = (invalidationPart ?? '').split(' Note: ');
        return `**Entry zone — ${header}**\n\n${zonePart.split('; ').map((s) => `• ${s}`).join('\n')}\n\n**Invalidation:** ${invText ?? '—'}\n\n${notePart ?? ''}\n\n⚠️ Zone plan from live platform bars — never guaranteed, size so the stop is survivable.`;
      }
      return 'I compute entry zones from real chart data on the **terminal** page. Open the terminal with your symbol active and ask again.';
    }

    if (/(should i (hold|exit|close)|manage my (trade|position)|exit suggestion|hold or (close|exit)|trail|break.?even)/.test(lower)) {
      const noteLines = contextText.split('\n').filter((l) => l.startsWith('Position management ('));
      if (noteLines.length > 0) {
        return `**Live position management (real data):**\n\n${noteLines.map((l) => {
          const m = l.match(/^Position management \(([^)]+)\): ([^—]+)— (.*?) Reasons: (.*)$/);
          if (!m) return `• ${l}`;
          return `**${m[1]} → ${m[2].trim()}**\n${m[3].trim()}\n${m[4].split(' | ').map((r) => `  • ${r}`).join('\n')}`;
        }).join('\n\n')}\n\n⚠️ Management assessment from live regime data — the decision and the risk remain yours.`;
      }
      if (noAccount) return 'I can\'t assess your trades — **no trading account is connected on this page**. Sign in on the terminal and I\'ll reassess each open position against its live regime.';
      return 'You have **no open positions to manage** right now. When you do, I\'ll reassess each one continuously against its symbol\'s live regime.';
    }

    if (/(review|debrief).*(trade)|last trade|last closed/.test(lower)) {
      const lastLine = (contextText.match(/Last closed trade: ([^\n]+)/) || [])[1];
      const perfLine = (contextText.match(/Performance \(real[^\n]+/) || [])[0];
      if (lastLine) {
        const pnl = parseFloat((lastLine.match(/P&L (-?\+?-?[\d.]+)/) || ['', '0'])[1]);
        const won = !lastLine.includes('P&L -');
        return `**Your last closed trade (real):**\n${lastLine}\n\n**Debrief questions that matter more than the P&L:**\n• Was the entry part of your plan, or an impulse?\n• Did you place the stop before entering — and leave it alone?\n• Would you take the exact same trade again with the same information?\n\n${won ? 'A win executed sloppily still needs review — grade the process, not the outcome.' : 'A loss that followed your plan is tuition, not failure. Only rule-breaks need fixing.'}\n\n${perfLine ? `**Bigger picture:** ${perfLine.replace('Performance (real, ', 'Over your ').replace('):', ':')}` : ''}\n\n⚠️ AI coaching on your real trade data, not financial advice.`;
      }
      if (noAccount) return 'I can\'t see your trade history — **no trading account is connected on this page**. Sign in on the terminal and I\'ll debrief your actual last trade.';
      return 'Your account has **no closed trades yet**, so there\'s nothing to debrief. When you close your first trade, I\'ll review the entry, exit and process with you.';
    }

    if (/(win rate|profit factor|expectancy|performance|how am i (doing|trading)|my stats|track record)/.test(lower)) {
      const perfLine = (contextText.match(/Performance \(real[^\n]+/) || [])[0];
      if (perfLine) {
        const facts = perfLine.replace(/^Performance \(real, /, '').replace(/\)$/, '');
        return `**Your real performance** — computed from your closed trades on this account:\n\n${facts.split(', ').map((f) => `• ${f}`).join('\n')}\n\n**How to read it:**\n• Profit factor > 1.5 with 30+ trades is a genuinely working edge\n• Win rate alone means little — pair it with avg win vs avg loss\n• A rising loss streak is a signal to cut size, not to push harder\n\n⚠️ Real account data, AI commentary — not financial advice.`;
      }
      if (noAccount) return 'I can\'t compute your performance — **no trading account is connected on this page**. Sign in and I\'ll build your real stats from closed trades.';
      return 'No closed trades on this account yet, so there are no performance stats to compute. Your record starts with the first closed trade.';
    }

    if (/(market state|market regime|trend right now|trending|what.?s the (trend|state))/.test(lower)) {
      const msBlock = contextText.split('\n').filter((l) => /Market state for|State:|Evidence:|Expected scenarios/.test(l)).map((l) => l.trim());
      if (msBlock.length > 0) {
        const header = msBlock.find((l) => l.startsWith('Market state for')) ?? '';
        const state = (msBlock.find((l) => l.startsWith('State:')) ?? '').replace('State: ', '');
        const evidence = (msBlock.find((l) => l.startsWith('Evidence:')) ?? '').replace('Evidence: ', '');
        const scenarios = (msBlock.find((l) => l.startsWith('Expected scenarios')) ?? '').replace(/Expected scenarios[^:]*: /, '');
        return `**${header.replace(':', '')}**\n\n**Assessment:** ${state}\n\n**Evidence (real indicator readings):**\n${evidence.split(' | ').map((e) => `• ${e}`).join('\n')}\n\n**Expected scenarios (heuristic, not predictions):**\n${scenarios.split(' | ').map((s) => `• ${s}`).join('\n')}\n\n⚠️ Evidence-based AI assessment from live platform bars — markets can invalidate any scenario.`;
      }
      return 'I can classify the market state from real chart data when you\'re on the **terminal** page (that\'s where the live bar engine runs). Open the terminal, then ask me again.';
    }

    if (/(analy[sz]e|review).*(position|risk)|open position|my positions|my risk/.test(lower)) {
      if (hasPositions) {
        return `Here are your **real open positions** right now:\n\n${positionLines.map((p) => `• ${p}`).join('\n')}\n\n**What I'd check:**\n• Any position without a stop loss (SL —) is unprotected — consider defining one at a technical level\n• Positions in the same currency direction stack correlation risk\n• If a position's floating loss exceeds ~1-2% of your account, review whether the original thesis still holds\n\n⚠️ AI analysis of your live data, not financial advice.`;
      }
      if (noAccount) {
        return 'I checked the platform: **no trading account is connected on this page**, so I can\'t see open positions. Sign in and open the terminal, then ask me again and I\'ll analyze your actual positions with live data.';
      }
      return 'I checked your account: **no open positions right now.** Flat is a position too — often the best one. Want me to look at the current market quotes instead?';
    }

    if (/(market brief|briefing|daily brief|market today|market overview|what.?s moving)/.test(lower) && quoteLines.length > 0) {
      // §27 time-aware daily briefing, composed from the live context lines.
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      const kind = day === 0 || day === 6 ? 'Weekend review'
        : hour < 12 ? 'Morning briefing' : hour < 16 ? 'Midday briefing' : 'Closing-bell briefing';
      const sessionsLine = (contextText.match(/Sessions now \(UTC\): [^\n]+/) || [null])[0];
      const scanLine = (contextText.match(/Opportunity scan \(real bars[^\n]+/) || [null])[0];
      const stateLine = (contextText.match(/Market state[^\n]+/) || [null])[0];
      const perfLine = (contextText.match(/Performance[^\n]+/) || [null])[0];
      const parts: string[] = [`**${kind}** — built from your live platform data (${now.toUTCString().slice(17, 22)} UTC).`];
      if (sessionsLine) parts.push(`🕐 ${sessionsLine.replace('Sessions now (UTC): ', '')}`);
      if (day === 0 || day === 6) parts.push('Markets are closed for most FX/index symbols — a good moment to journal last week and plan, not to force crypto trades out of boredom.');
      if (stateLine) parts.push(`📊 ${stateLine}`);
      if (scanLine) parts.push(`🎯 ${scanLine.includes('no trending setups') ? scanLine.replace('Opportunity scan (real bars, ', 'Scan (') : `Top setups — ${scanLine.replace(/^Opportunity scan \(real bars, \d+ symbols\): /, '').split(' | ').slice(0, 3).join(' | ')}`}`);
      if (positionLines.length > 0) parts.push(`💼 Open positions:\n${positionLines.slice(0, 5).map((p) => `• ${p}`).join('\n')}`);
      else parts.push('💼 You are flat — no open risk.');
      if (perfLine) parts.push(`📈 ${perfLine}`);
      parts.push(kind === 'Closing-bell briefing'
        ? 'Before you close the day: journal any trade you closed, and let winners already protected by stops run rather than micro-managing them.'
        : 'Ask "trade ideas" for the full ranked scan or "entry zone" on any symbol for a concrete plan.');
      return `${parts.join('\n\n')}\n\n⚠️ Live data, AI commentary — not financial advice.`;
    }

    if (/(stop loss|sl\b|take profit|tp\b|sl\/tp)/.test(lower)) {
      const active = (contextText.match(/Active chart symbol: (\S+)/) || [])[1];
      const activeQuote = quoteLines.find((q) => active && q.startsWith(active));
      const quotePart = activeQuote
        ? `Your active symbol is **${active}** — live quote: ${activeQuote.replace(`${active}: `, '')}.\n\n`
        : '';
      return `${quotePart}**How I'd place SL/TP from here:**\n• Put the stop beyond a real technical level (recent swing high/low, or 1.5–2× ATR(14) from entry) — not a fixed pip count\n• Size the position so that stop = 1–2% of account risk\n• Target at least 1.5:1 reward-to-risk; the platform's Strategy Tester → Optimization tab can sweep SL/TP multipliers on real history for any EA\n\n⚠️ Framework, not a recommendation — your entry and timeframe determine the exact levels.`;
    }
  }

  // Greetings
  if (/^(hi|hey|hello|yo|sup|good morning|good evening|gm)\b/i.test(lower)) {
    const greetings = [
      'Hey there! Ready to dive into the markets? I can help with trade analysis, risk management, or just chat about what\'s moving today. What\'s on your mind?',
      'Hello! Markets are always moving — what would you like to explore? I can analyze setups, review your trading approach, or discuss strategy.',
      'Hey! Good to have you here. What are you looking at today? Any specific pairs or setups catching your eye?',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Yes / confirmation / follow-up
  if (/^(yes|yeah|yep|sure|ok|okay|go ahead|please|do it|tell me more|more|continue)\b/i.test(lower)) {
    if (isFollowUp) {
      const lastNexus = [...history].reverse().find(h => h.role === 'assistant');
      if (lastNexus?.content.includes('entry') || lastNexus?.content.includes('setup')) {
        return 'Let me dig deeper into the setup:\n\n**Entry Criteria:**\n• Wait for a confirmed candle close above/below the key level\n• Volume should be above the 20-period average\n• RSI should not be in extreme territory (avoid >75 or <25)\n\n**Risk Management:**\n• Risk no more than 1-2% of your account per trade\n• Set your stop loss at a technical level, not an arbitrary pip count\n• Aim for minimum 1.5:1 reward-to-risk ratio\n\nWould you like me to walk through any specific pair right now?\n\n⚠️ This is educational analysis, not a trading recommendation.';
      }
      if (lastNexus?.content.includes('psychology') || lastNexus?.content.includes('discipline')) {
        return 'Here\'s a practical framework for trading discipline:\n\n**Before Each Trade:**\n1. Check if it fits your trading plan criteria\n2. Calculate exact position size (never eyeball it)\n3. Define SL and TP before entering\n4. Ask: "Would I take this trade if I were already up 10% today?"\n\n**During the Trade:**\n• Don\'t move your stop loss further away\n• Don\'t add to losing positions\n• Set alerts and walk away if needed\n\n**After the Trade:**\n• Journal it regardless of outcome\n• Grade your execution, not the P&L\n\nWhat aspect of discipline do you struggle with most?';
      }
      return 'Let me expand on that.\n\nThe key thing to remember is that consistency beats perfection in trading. Focus on:\n\n• **Process over outcome** — a losing trade can be well-executed\n• **Risk first** — protect capital, profits follow\n• **Patience** — the best trades come to you, you don\'t chase them\n\nWhat specific area would you like to explore further? I can go deep on technicals, risk management, psychology, or strategy.';
    }
    return 'Of course! What would you like to know? I can help with:\n\n• **Trade analysis** — chart patterns, indicator readings, key levels\n• **Risk management** — position sizing, SL/TP placement\n• **Trading psychology** — discipline, emotional control, mindset\n• **Strategy** — trend following, scalping, swing trading approaches\n• **Education** — explain any trading concept\n\nJust ask anything!';
  }

  // Entry / best entry / when to enter
  if (lower.includes('entry') || lower.includes('enter') || lower.includes('when to buy') || lower.includes('when to sell') || lower.includes('best time') || lower.includes('guide me')) {
    return 'Great question! Here\'s how I\'d approach finding entries:\n\n**For Trend Trades:**\n• Identify the trend on a higher timeframe (D1 or H4)\n• Drop to a lower timeframe (H1 or M15) for entry\n• Look for pullbacks to key levels: EMA 21, previous support turned resistance, or Fibonacci retracement zones (38.2% - 61.8%)\n\n**Confirmation Signals:**\n• Bullish/bearish engulfing candles at support/resistance\n• RSI divergence near extremes\n• Volume spike on breakout\n• MACD histogram turning\n\n**Key Rule:** Never enter without knowing where your stop loss goes first. The stop defines the trade.\n\nWhich pair or setup are you looking at? I can give more specific analysis.\n\n⚠️ These are analytical frameworks, not trading signals.';
  }

  // EURUSD specific
  if (lower.includes('eurusd') || lower.includes('eur/usd') || lower.includes('euro')) {
    return 'Looking at **EUR/USD** from a technical perspective:\n\n**Key Levels to Watch:**\n• Resistance: 1.0900 (psychological + weekly R1)\n• Support: 1.0830 (EMA 50 on H4)\n• Major support: 1.0780 (monthly pivot)\n\n**Current Context:**\n• The pair tends to be most active during the London-NY overlap (13:00-17:00 UTC)\n• Watch for ECB and Fed speeches as key catalysts\n• DXY correlation: EUR/USD moves inversely to the dollar index\n\n**Approach:**\n• In an uptrend: buy pullbacks to support with confirmation\n• In a downtrend: sell rallies to resistance with confirmation\n• In a range: trade the boundaries with tight stops\n\nWhat timeframe are you trading on? That helps me narrow down the analysis.\n\n⚠️ This is technical analysis, not a trade recommendation.';
  }

  // Gold / XAUUSD
  if (lower.includes('gold') || lower.includes('xauusd') || lower.includes('xau')) {
    return 'Let\'s look at **Gold (XAU/USD)**:\n\n**What moves gold:**\n• USD strength/weakness (inverse correlation)\n• Real interest rates (negative real rates = gold bullish)\n• Geopolitical risk (safe haven flows)\n• Central bank buying\n\n**Technical Notes:**\n• Gold respects round numbers well (2300, 2350, 2400)\n• ATR tends to be high — wider stops needed vs forex\n• Best traded during London and early NY sessions\n• Spreads can widen significantly during Asian session\n\n**Risk Management for Gold:**\n• Position size should be smaller than forex (higher volatility)\n• SL of 100-150 pips is normal on H4 timeframe setups\n• Gold can gap on weekends — be cautious with overnight holds\n\nAre you looking at a specific setup or want general strategy advice?\n\n⚠️ This is analysis for educational purposes.';
  }

  // Risk management / position sizing / money management
  if (lower.includes('risk') || lower.includes('position siz') || lower.includes('money manage') || lower.includes('how much') || lower.includes('lot size')) {
    return 'Risk management is the single most important skill in trading. Here\'s the framework:\n\n**The 1-2% Rule:**\n• Never risk more than 1-2% of your account on a single trade\n• On a $10,000 account: max risk per trade = $100-$200\n\n**Position Size Formula:**\n`Lot size = (Account × Risk%) / (SL in pips × Pip value)`\n\nExample: $10K account, 1% risk, 50 pip SL on EUR/USD:\n`Lot size = ($10,000 × 0.01) / (50 × $10) = 0.20 lots`\n\n**Portfolio Heat:**\n• Total open risk should never exceed 5-6% of account\n• If you have 3 correlated trades, they count as extra risk\n\n**Golden Rules:**\n• Define your risk BEFORE you see the setup\n• Never move a stop loss to increase risk\n• Reduce size after a losing streak, not increase it\n\nWant me to help calculate a specific position size?';
  }

  // Psychology / emotions / discipline / overtrading / revenge
  if (lower.includes('psych') || lower.includes('emotion') || lower.includes('disciplin') || lower.includes('overtrad') || lower.includes('revenge') || lower.includes('fomo') || lower.includes('scared') || lower.includes('anxious') || lower.includes('stressed') || lower.includes('tilt')) {
    return 'Trading psychology is where most traders win or lose. Let me help.\n\n**Common Patterns & Solutions:**\n\n🔄 **Overtrading:** You\'re taking too many setups\n→ Set a daily trade limit (3-5 max). Quality over quantity.\n\n😤 **Revenge Trading:** You lost and want it back NOW\n→ After 2 consecutive losses, take a mandatory 1-hour break. The market will be there.\n\n😰 **FOMO:** Price is moving without you\n→ There are thousands of setups per month. Missing one is fine. Chasing is expensive.\n\n😱 **Fear of Pulling the Trigger:**\n→ This usually means your position size is too big. Reduce it until you can trade comfortably.\n\n**The Mindset Shift:**\nYour job is not to make money on every trade. Your job is to execute your plan perfectly. The money follows the process.\n\nWhat specific pattern are you dealing with? I can go deeper.';
  }

  // Losing / loss / drawdown / bad day
  if (lower.includes('losing') || lower.includes('lost') || lower.includes('drawdown') || lower.includes('bad day') || lower.includes('blew') || lower.includes('wiped')) {
    return 'I hear you, and I want you to know — drawdowns are a normal part of trading. Every successful trader has been where you are.\n\n**What to do right now:**\n1. **Step away from the screen.** Seriously. Even 30 minutes helps.\n2. **Don\'t try to make it back today.** That\'s revenge trading, and it makes things worse.\n3. **The market will be here tomorrow.** Your mental health matters more than any trade.\n\n**When you\'re ready to review:**\n• Look at the trades objectively — was it bad execution or bad luck?\n• If you followed your plan and still lost, that\'s just variance. It happens.\n• If you broke your rules, identify which ones and why\n\n**Remember:**\n• A 10% drawdown needs only 11% to recover\n• Even the best traders have 40% losing trades\n• One bad day doesn\'t define your trading\n\nI\'m here if you want to talk through it. No judgment, ever. 💙';
  }

  // What is / explain / teach / learn
  if (lower.includes('what is') || lower.includes('explain') || lower.includes('teach') || lower.includes('learn') || lower.includes('how does') || lower.includes('what are')) {
    const topic = lower.replace(/what is |explain |teach me |how does |what are /gi, '').trim();
    return `Great question about **${topic}**!\n\nI\'d love to explain this properly. Could you tell me your experience level so I can pitch the explanation right?\n\n• **Beginner** — I\'ll start from basics with simple analogies\n• **Intermediate** — I\'ll focus on practical application\n• **Advanced** — I\'ll go straight to the nuances\n\nOr just say "explain simply" or "go deep" and I\'ll adjust!\n\nAlso, are you asking because you\'re:\n1. Studying for your own knowledge?\n2. Trying to apply this in a specific trade?\n3. Building a strategy around this concept?\n\nContext helps me give you the most useful answer.`;
  }

  // Crypto / Bitcoin
  if (lower.includes('btc') || lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('eth')) {
    return '**Crypto Trading Considerations:**\n\n• **Volatility:** 2-5x higher than forex — adjust position size accordingly\n• **24/7 Markets:** No session gaps but also no break from monitoring\n• **Correlation:** BTC tends to lead — when BTC dumps, alts dump harder\n• **Leverage:** Be very cautious. 5-10x max on crypto (vs 50-100x on forex)\n\n**Technical Notes:**\n• Round numbers matter ($60K, $65K, $70K)\n• On-chain data can provide edge (whale movements, exchange flows)\n• Weekend volatility can be significant\n\n**Risk Approach:**\n• Smaller position sizes than forex\n• Wider stops (ATR-based, not fixed pip counts)\n• Be prepared for 5-10% moves in a single day\n\nWhich crypto are you interested in? I can discuss specifics.\n\n⚠️ Crypto is highly volatile. Never risk more than you can afford to lose.';
  }

  // Strategy / system / approach
  if (lower.includes('strategy') || lower.includes('system') || lower.includes('approach') || lower.includes('method') || lower.includes('how do you trade') || lower.includes('best way')) {
    return 'There\'s no single "best" strategy — the best one is the one that fits **your** personality and schedule. Here are the main approaches:\n\n**Scalping** (seconds to minutes)\n• High frequency, small targets (5-15 pips)\n• Requires: fast execution, low spreads, full attention\n• Best for: people who can sit at screen all day\n\n**Day Trading** (minutes to hours)\n• 2-5 trades per day, closed before end of session\n• Requires: 3-4 hours of screen time\n• Best for: most retail traders\n\n**Swing Trading** (days to weeks)\n• 2-5 trades per week, held overnight\n• Requires: 30-60 min per day for analysis\n• Best for: people with full-time jobs\n\n**Position Trading** (weeks to months)\n• Based on fundamental + macro analysis\n• Requires: patience and strong conviction\n• Best for: experienced traders\n\nWhich style resonates with your lifestyle? I can help you build a framework around it.';
  }

  // Thanks / thank you
  if (/^(thanks|thank you|thx|ty|appreciate|cheers)\b/i.test(lower)) {
    const thanks = [
      'You\'re welcome! That\'s what I\'m here for. Feel free to ask anything else — whether it\'s market analysis, risk management, or just talking through a trade idea. I\'m always here. 💙',
      'Happy to help! Remember, the best traders are the ones who keep asking questions. Come back anytime — I don\'t sleep! 😄',
      'Anytime! Trading is a journey, and having someone to bounce ideas off makes a real difference. I\'m here whenever you need me.',
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  // Who are you / what are you / about nexus
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('about you') || lower.includes('your name')) {
    return 'I\'m **NEXUS**, the AI trading companion built into EMIL TRADE.\n\nI\'m powered by RAPTOR AI and I\'m here to help you become a better trader — not by telling you what to buy or sell, but by helping you:\n\n• **Analyze** setups and market conditions\n• **Manage** risk and position sizing\n• **Improve** your trading psychology and discipline\n• **Learn** concepts at your own pace\n• **Review** your trades and find patterns in your behavior\n\nI\'m available on every page of the platform — just click my orb anytime. I remember our conversation within each session.\n\nI\'m direct, honest, and I genuinely care about your trading wellbeing. I\'ll celebrate your wins and support you through drawdowns.\n\nWhat can I help you with today?';
  }

  // Default — smart contextual response instead of echo
  const contextualResponses = [
    `That\'s a great question! Let me think about this from a trading perspective.\n\nCould you give me a bit more context? For example:\n• Which instrument are you looking at?\n• What timeframe are you trading?\n• Are you in a trade already, or planning one?\n\nThe more specific you are, the more useful I can be. I\'m here to help with anything — technical analysis, risk management, psychology, education, or just bouncing ideas around.`,
    `I want to make sure I give you the most useful answer. Can you tell me more about what you\'re working on?\n\n**I can help with:**\n• Analyzing a specific chart or setup\n• Calculating position sizes and risk\n• Reviewing your trading approach\n• Explaining any trading concept\n• Discussing market conditions\n\nJust give me a bit more detail and I\'ll dive deep for you!`,
    `Interesting! Let me help you with that.\n\nTo give you the best analysis, could you share:\n1. **What pair/instrument** you\'re looking at?\n2. **Your timeframe** (M15, H1, H4, D1)?\n3. **What you\'re seeing** on the chart right now?\n\nOr if this is a general question, just rephrase it slightly and I\'ll get you a focused answer. I\'m good at technicals, risk management, psychology, and strategy!`,
  ];

  return contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
}
