// ═══════════════════════════════════════════════════════════════
// EMIL Trading Wisdom — method principles distilled from studying
// the worldwide EA ecosystem (vendor pages, forums, multi-language
// communities). NOT strategy cards: these are the generalizable
// attributes behind the EAs — what survives, what blows up, which
// filters matter — expressed as rules the council can apply when
// scoring or vetoing a trade.
//
// Honesty rules: every principle carries its rationale, its failure
// mode (caution) and its sources. Wisdom can only ever ADD caution
// or context to a council read — it has no order path and cannot
// raise risk (same Knowledge-to-Trading Firewall as everything else).
// ═══════════════════════════════════════════════════════════════

import { upsertFact } from '@/lib/trading/emil-knowledge';

export interface WisdomCard {
  topic: string;
  principle: string;
  rationale: string;
  /** How the council applies it when scoring or vetoing a trade. */
  application: string;
  caution: string;
  sources: string[];
  /** Match keywords: council context words that make this card relevant
   *  (e.g. "martingale", "news", "scalper", "range", "trend", "lock"). */
  tags: string[];
}

export const TRADING_WISDOM: WisdomCard[] = [
  {
    topic: "Single-indicator signals",
    principle: "A lone indicator signal (MA cross, RSI, MACD…) is a candidate trigger, never a standalone reason to trade.",
    rationale: "The dominant free-EA archetype is one mechanical indicator signal — and recent real-tick reviews show these systems losing consistently without a second, independent confirmation.",
    application: "Score a signal up only when a genuinely independent condition from a different indicator family agrees.",
    caution: "Stacking correlated indicators (two MA derivatives) gives fake confluence; too many filters starves the system of trades.",
    sources: ["pointzero-trading", "IG", "mql5 blog"],
    tags: ["lean", "trend", "cross", "signal"],
  },
  {
    topic: "Regime first — markets trend ~30% of the time",
    principle: "Classify the regime (trending vs ranging) before applying any trend logic; signal-on-every-cross systems die in ranges.",
    rationale: "ForexFactory's HFT-EA community found the system profitable in strong trends but bled to death from whipsaws in flat markets — every proposed fix was a regime filter.",
    application: "Veto MA-cross style entries when the market is classified as ranging; require volatility expansion or trend-strength confirmation first.",
    caution: "Regime classifiers lag and flip at exactly the wrong time — require more than one measure before switching modes.",
    sources: ["forexfactory HFT thread", "mql5 forum"],
    tags: ["range", "chop", "no edge", "neutral"],
  },
  {
    topic: "Grid & martingale tail risk",
    principle: "Systems that add to losing positions with growing size convert steady small wins into one hidden, exponentially growing tail liability — they fail all at once, not gradually.",
    rationale: "Global consensus across languages: Russian portals say 'the moment always comes when the trader parts with the deposit', Japanese sites call nanpin-martin EAs 'adjacent to ruin', and mql5 reviews document popular grid EAs blowing accounts despite 1000+ positive reviews.",
    application: "Treat any proposal to add to a losing position as a near-veto; allow only within a pre-declared max-levels and basket-stop budget.",
    caution: "Smooth grid equity curves are the signature of the deferred blow-up, not evidence of safety — evaluate equity (floating) drawdown, never balance drawdown.",
    sources: ["mql5 blog", "academyfx (RU)", "fx-ea-lab (JA)", "CSDN (ZH)"],
    tags: ["grid", "martingale", "recovery", "average", "basket"],
  },
  {
    topic: "Martingale hides under many names",
    principle: "Lot-multiplication after losses appears as 'recovery mode', 'smart lot scaling' or 'position averaging' — it changes the payoff distribution, not the expectancy, and should be off by default.",
    rationale: "Vendors ship optional martingale modes on almost every EA to smooth equity curves; the sizing math, not the label, reveals it.",
    application: "Size every trade independently of the previous trade's outcome; veto sizing rules that scale up after losses.",
    caution: "If averaging is ever used, cap it at 3-4 levels with a pre-defined total-basket stop — a capped grid converts ruin into a large-but-survivable known loss.",
    sources: ["pointzero-trading", "gerchik (RU)", "fx-prog (JA)"],
    tags: ["martingale", "recovery", "sizing", "lot"],
  },
  {
    topic: "Hard stop on every position",
    principle: "Every position carries a defined stop loss at entry; 'wait forever to become profitable' is the signature of a doomed system.",
    rationale: "The EAs recommended for serious money all place defined stops; no-stop designs are exactly the family that blows up. A hard stop converts unknown tail risk into a budgetable cost.",
    application: "Reject any trade proposal without an explicit stop price and refuse post-hoc stop widening.",
    caution: "Stops inside normal noise convert a valid edge into death by a thousand cuts — size stops from volatility, not from desired risk.",
    sources: ["IG", "newyorkcityservers", "algotradingspace"],
    tags: ["lean", "stop", "sl", "entry"],
  },
  {
    topic: "Account-level kill switch",
    principle: "Beyond per-trade stops, enforce equity-level protection: daily loss limits, max drawdown, and a global equity floor that halts everything when breached.",
    rationale: "Surviving EAs center on account-level caps; the failures are defined by uncapped drawdowns exceeding 80%.",
    application: "Maintain a standing veto that overrides all strategy votes once daily loss or open drawdown crosses its threshold — executed as a full flatten, not a pause.",
    caution: "A kill switch that pauses new entries while leaving a losing basket open does not cap risk.",
    sources: ["eafree", "mql5 blog", "prop-firm guides"],
    tags: ["lock", "stand aside", "drawdown", "floor"],
  },
  {
    topic: "Fixed-fractional sizing",
    principle: "Risk a fixed small fraction (1-2%) of current equity per trade, sized from the actual stop distance and current volatility.",
    rationale: "The single most universal cross-language consensus: a 10-loss streak then costs 10-18% instead of ruin; gold EAs sized for old volatility regimes carry 3x intended risk when ranges triple.",
    application: "Re-derive lot size from equity, stop distance and current ATR for every trade; veto orders whose worst case exceeds the per-trade budget.",
    caution: "Percent sizing silently scales exposure with volatility regimes — never reuse yesterday's lot.",
    sources: ["fxnx", "oanda.jp (JA)", "tlap.io (RU)"],
    tags: ["sizing", "lot", "risk", "lean"],
  },
  {
    topic: "Total exposure, not per-trade lots",
    principle: "Compute open exposure across ALL concurrent positions against a portfolio risk budget — risk-percent sizing applied per-trade silently multiplies account risk by the position count.",
    rationale: "Grid and multi-position methods deliberately use fixed small lots because layered exposure compounds; the sizing regime is a strategy-level design choice.",
    application: "Score a candidate trade partly on its correlation to open positions; veto stacking positions that express the same underlying bet.",
    caution: "Correlations converge toward 1 in crises — portfolio limits must assume simultaneous drawdowns.",
    sources: ["eafree", "myfxbook forum", "botfxpro"],
    tags: ["exposure", "correlation", "portfolio", "hedge"],
  },
  {
    topic: "Spread & execution gate",
    principle: "Check live spread and expected slippage against the strategy's per-trade edge before every entry; block trading when execution costs are elevated.",
    rationale: "An EA's profitability is broker-specific — 1-2 pips of slippage flips scalp winners into losers, and spreads widen 5-10x in volatile moments.",
    application: "Veto any trade where round-trip cost exceeds a fixed fraction of expected edge at the actual venue.",
    caution: "A spread filter validated only on quiet-hours data is decorative — costs are dynamic exactly when the strategy trades.",
    sources: ["eafree", "expforex", "pro-scalper"],
    tags: ["spread", "scalp", "cost", "execution"],
  },
  {
    topic: "Scalping is an infrastructure trade",
    principle: "M1-M5 scalping is only viable on raw-spread accounts with low latency; on micro timeframes price is near-random and the edge is infrastructure-bound.",
    rationale: "Communities put viable latency under ~50ms with sub-pip spreads; 'HFT' branding on retail EAs is just fast scalping — no retail setup competes on true HFT terms.",
    application: "Penalize high-frequency small-target entries unless verified execution conditions leave positive expectancy after costs.",
    caution: "Backtesters model M1 spread and ticks poorly, so scalp backtests are the least trustworthy category of all.",
    sources: ["mql5 forum (RU)", "forexfactory HFT thread", "newyorkcityservers"],
    tags: ["scalp", "1m", "5m", "hft"],
  },
  {
    topic: "Session edges are real",
    principle: "Restrict every strategy to its validated session window — the edge often comes from WHEN you trade as much as the entry signal (Asian-window mean reversion, London-open breakouts).",
    rationale: "Night scalpers carry multi-year verified records precisely because low-volatility windows make small mean-reversion targets reliable; London-open breakouts ride institutional flow with profit factors above 1.5 in backtests.",
    application: "Weight the session as a first-class input: boost setups inside their window, veto them outside it.",
    caution: "Session boundaries optimized on history are overfit artifacts unless the edge has an economic reason (liquidity, volatility regime).",
    sources: ["newyorkcityservers", "quantifiedstrategies", "pointzero-trading"],
    tags: ["session", "london", "asian", "breakout", "time"],
  },
  {
    topic: "News is a regime, not background",
    principle: "Scheduled high-impact releases demand a decision: either a deliberate, slippage-budgeted news strategy or a mandatory stand-aside window — never incidental exposure.",
    rationale: "News-trading communities are blunt: 'when trading news, slippage is what kills you' — spread widening and 100-pip single-tick slips consume most of the volatility edge, and post-spike reversals are common.",
    application: "Treat an upcoming red-flag event as an automatic penalty on every incidental entry near it.",
    caution: "A triggered breakout order can be instantly offside even when the news direction was 'right'.",
    sources: ["forexfactory", "bestmt4ea"],
    tags: ["news", "event", "calendar"],
  },
  {
    topic: "Pyramid into winners only",
    principle: "The legitimate form of position stacking adds only to PROFITABLE positions in an intact trend, each add-on smaller than the base, all sharing one exit.",
    rationale: "The HFT-thread community converged on tiny add-ons in trend direction only — that is what survived whipsaw and compounded the ~30% of time markets trend.",
    application: "Approve scale-ins only when the existing position is profitable and the regime is intact; budget the whole pyramid as one trade.",
    caution: "The final add-ons usually lose — pyramids concentrate exposure at the top of the move.",
    sources: ["forexfactory HFT thread"],
    tags: ["add", "scale", "pyramid", "uptrend", "downtrend"],
  },
  {
    topic: "Higher timeframes filter noise and cost",
    principle: "Moving from M1-M15 to H1/H4 drops noise faster than signal and shrinks spread cost relative to target size — fewer, larger, better signals.",
    rationale: "The community fix for whipsaw-prone systems was H1/H4 plus high-velocity pairs; per-trade cost as a fraction of target falls with the timeframe.",
    application: "Require higher-timeframe confirmation for lower-timeframe entries; prefer the slower signal when the two conflict.",
    caution: "Wider stops mean position size must shrink proportionally or per-trade risk silently doubles.",
    sources: ["forexfactory HFT thread", "newyorkcityservers"],
    tags: ["timeframe", "htf", "whipsaw", "1h", "4h"],
  },
  {
    topic: "Backtests are an upper bound",
    principle: "Only real-tick, out-of-sample, recent evidence counts; a flawless backtest equity curve is a warning sign, not a credential.",
    rationale: "Real-tick testing of the 10 most-popular free EAs showed all of them losing; curve-fitting to history and selling before live divergence is a documented business model.",
    application: "Weight live/forward statistics heavily, discount anything produced before the last parameter change, and treat backtest expectancy as a ceiling.",
    caution: "Even honest walk-forward validation is invalidated by repeated re-testing on the same history.",
    sources: ["mql5 blog", "forexfactory", "algotradingspace"],
    tags: ["backtest", "evidence", "score"],
  },
  {
    topic: "ML models decay by design",
    principle: "Machine-learning signals can be real, but the model is the signal layer, never the risk layer — and every model degrades when the regime shifts.",
    rationale: "Endorsed ML EAs pair neural entries with classical risk control (one position, fixed stops, no grid) and mandatory retraining; 'AI-powered' marketing usually decorates ordinary logic or hidden martingale.",
    application: "Treat model outputs as one vote among several and decay their weight as live hit-rate drifts from validation hit-rate.",
    caution: "An ML edge that cannot be monitored for drift fails silently — schedule revalidation rather than waiting for losses.",
    sources: ["newyorkcityservers", "mql5 blog"],
    tags: ["ml", "ai", "model", "nexus"],
  },
  {
    topic: "Popularity is not evidence",
    principle: "Review counts, download ranks and phrases like 'verified performance' or 'prop firm ready' carry zero evidential weight — popularity and profitability are uncorrelated.",
    rationale: "All ten most-popular free mql5 EAs lost money on real-tick tests; one blew an account despite 1381 positive reviews.",
    application: "Score strategies only on verifiable recent trade records, never on social proof or vendor claims.",
    caution: "Obscurity is not evidence of edge either — only measured performance counts.",
    sources: ["mql5 blog", "eafree"],
    tags: ["marketing", "claims", "score"],
  },
  {
    topic: "Longevity across regimes ranks strategies",
    principle: "The strongest predictor of a method's worth is the length and regime-diversity of its verified live record — multi-year beats any recent return figure.",
    rationale: "Every family looks brilliant in its favorable regime; only a record spanning multiple regimes distinguishes edge from unmet tail risk.",
    application: "Weight each engine's vote by its own verified history length; cap allocation to anything young.",
    caution: "Survivorship bias means visible track records are the winners of a large dead cohort — even long records overstate expectancy, and longevity never repeals a recovery system's blow-up mode.",
    sources: ["newyorkcityservers", "myfxbook", "fortraders (ES)"],
    tags: ["record", "history", "score", "confidence"],
  },
  {
    topic: "Every strategy has a lifespan",
    principle: "Practitioner consensus: 'they all eventually lose — the goal is to delay that point.' An EA refusing to trade outside its regime is behaving correctly.",
    rationale: "EA meltdowns are attributed primarily to regime shifts — trend bots bleeding in sideways summers, mean-reversion bots dying when flow trends.",
    application: "Continuously classify the regime and suppress strategies operating outside their designed conditions; predefine the statistical threshold that retires a strategy.",
    caution: "Distinguishing a dead edge from a normal drawdown is genuinely hard — set the retirement rule before deployment, not during the drawdown.",
    sources: ["myfxbook forum", "mql5 blog"],
    tags: ["regime", "range", "chop", "bench"],
  },
  {
    topic: "Prop-firm discipline",
    principle: "Under external drawdown mandates: no grid, no martingale, no averaging; defined stop every trade; low frequency; drawdown in low single digits with a buffer below the official limit.",
    rationale: "Prop rules kill accounts on equity drawdown — precisely the metric recovery systems maximize while looking profitable on balance; grid EAs are 'explicitly not recommended' even by sites promoting them.",
    application: "When an external drawdown constraint exists, evaluate daily-loss and max-drawdown headroom before any entry.",
    caution: "Rules differ per firm (static vs trailing drawdown) — encode constraints per account, not generically.",
    sources: ["holaprime", "fundednext", "newyorkcityservers"],
    tags: ["prop", "drawdown", "lock", "challenge"],
  },
  {
    topic: "Instrument specialization",
    principle: "Tuned single-instrument specialists consistently beat generic multi-market robots — but only trade instruments the method was actually validated on.",
    rationale: "Top-performing EAs are overwhelmingly specialists (XAUUSD dominates); running a system outside its intended asset adds uncertainty even when backtests look good.",
    application: "Apply per-instrument parameters and veto trades on instruments the strategy was never validated on.",
    caution: "Specialization is overfitting risk — a gold-only edge can vanish when gold's volatility regime changes.",
    sources: ["newyorkcityservers", "algotradingspace"],
    tags: ["symbol", "instrument", "validate"],
  },
  {
    topic: "Gold is a different animal",
    principle: "XAUUSD's 200-500+ pip days demand dynamic sizing and spread-aware entries — spreads can widen 5-10x in volatile moments.",
    rationale: "Gold EA guides report spread blowouts from 10-20 to 100+ pips turning correct directional scalps into losses; settings calibrated to old regimes triple effective risk.",
    application: "Gate gold entries on spread being near normal and scale size inversely to realized volatility.",
    caution: "The volatility that makes gold returns spectacular makes lot-sizing errors fatal faster than on majors.",
    sources: ["mql5 blog", "fxnx", "blodsalgo"],
    tags: ["xau", "gold", "volatility"],
  },
  {
    topic: "Range harvesting needs an escape plan",
    principle: "Range-ladder systems (Japan's Toraripi style) work exactly while price stays in the band — the defining risk is a trend escaping the range.",
    rationale: "Japanese repeat-order systems are prized for hands-off range harvesting, with the uniform warning that sustained one-way trends beyond the band expand losses without limit.",
    application: "Approve range-harvesting logic only with an explicit invalidation level where the range thesis dies and positions are cut.",
    caution: "Wide 'safe' bands lower returns, tempting operators to narrow them and recreate grid-style tail risk.",
    sources: ["m2j.co.jp (JA)", "zuu.co.jp (JA)"],
    tags: ["range", "band", "ladder", "chop"],
  },
  {
    topic: "Breakouts need untested levels",
    principle: "Trade breakouts of UNTESTED levels with resting orders placed ahead of price — and cancel the opposite order once one side fills.",
    rationale: "Breakout EAs that survive use pending stops at pre-defined levels (daily extremes, fractals, session ranges); a RangeBreakout EA without a regime filter reached 80% drawdown.",
    application: "Require the level to be untested, the entry to be a resting order, and a range-width + news filter before approving a breakout.",
    caution: "Breakout systems take repeated small losses in choppy weeks — they need regime awareness, not daily forced participation.",
    sources: ["pointzero-trading", "quantifiedstrategies", "mql5 blog"],
    tags: ["breakout", "level", "pending"],
  },
  {
    topic: "Latency arbitrage is not an edge",
    principle: "Feed-discrepancy and execution-speed exploits are business-model attacks that brokers detect and punish with confiscation — not durable trading edges.",
    rationale: "Documented five-figure profit reversals and systematic 2026-era detection; every prop firm treats it as a hard ban.",
    application: "Veto any signal whose edge derives from feed discrepancies rather than market behavior.",
    caution: "Legitimate fast strategies can be misclassified as toxic flow — avoid trade patterns that mimic arbitrage fingerprints.",
    sources: ["forexpeacearmy", "forexfactory"],
    tags: ["arbitrage", "latency", "hft"],
  },
  {
    topic: "Auditability is non-negotiable",
    principle: "Only admit strategies whose full rule set, parameters and update history are known, so every decision can be audited after the fact.",
    rationale: "Reviews flag runtime server-fetched 'best settings' and implausibly tiny binaries as red flags; an unauditable strategy makes post-mortem analysis and risk attribution impossible.",
    application: "Require every trade decision to carry its reasons; reject black-box proposals.",
    caution: "Opacity is often defended as IP protection — legitimate or not, it fails the audit test.",
    sources: ["mql5 blog"],
    tags: ["audit", "transparent", "explain"],
  },
  {
    topic: "Never interrupt a sequence — except to kill it",
    principle: "Multi-leg strategies depend on completing their sequence: don't stop them mid-cycle, don't let strategies fight over one account, ring-fence dangerous families on separate capital.",
    rationale: "Interrupted operation and conflicting EAs on one account rank among the top causes of real-money losses in every roundup.",
    application: "Track which strategy owns each position and forbid cross-strategy interference; wind down multi-leg strategies through their own managed exit.",
    caution: "'Never stop the EA' is not absolute — the equity-floor kill switch still overrides everything, executed as a full flatten.",
    sources: ["newyorkcityservers", "algotradingspace", "forexfactory HFT thread"],
    tags: ["sequence", "isolation", "lock"],
  },
  {
    topic: "New-bar signals, per-tick management",
    principle: "Evaluate entry signals once per completed bar; run trade management — trailing, breakeven, exits — on every tick.",
    rationale: "The forming bar makes indicator conditions flicker true/false within one bar, causing repeated or premature entries that never appear in closed-bar backtests.",
    application: "Trust closed-bar signals; treat any intra-bar 'signal' as unconfirmed until the candle finishes.",
    caution: "Genuinely tick-driven logic (trailing stops, live breakout stops) must NOT wait for the bar close, or stops move only once per bar.",
    sources: ["mql5 articles", "EA programming (Young)"],
    tags: ["bar", "tick", "signal", "repaint"],
  },
  {
    topic: "The duplicate-position guard",
    principle: "Never open an entry without first counting existing positions for the same symbol and strategy — its absence is the single most common fatal EA bug.",
    rationale: "A published MA-ADX code-base EA omitted the check and stacked new positions every signal bar until the deposit drained; netting and hedging accounts count differently, so a guard written for one silently fails on the other.",
    application: "Enforce one-position-per-direction (or an explicit max) before every entry; treat unexpected position stacking as a system fault, not a strategy choice.",
    caution: "Deliberate pyramiding is different — it adds to WINNERS under a shared budget, never accidentally.",
    sources: ["mql5 CodeBase", "scribd MA-ADX doc"],
    tags: ["duplicate", "stack", "position", "guard"],
  },
  {
    topic: "Orders fail — handle it",
    principle: "Every order call is fallible: validate stops against broker minimums, normalize prices, check return codes, retry transient errors a bounded number of times, and log everything.",
    rationale: "Un-normalized or too-close stops are silently rejected (leaving naked positions), and requotes are routine live — a fire-and-forget EA ends up unprotected exactly when it matters.",
    application: "Treat an unconfirmed order state as an emergency: verify the position and its stop actually exist after every send.",
    caution: "Retry only transient errors (requote, busy); retrying logical errors like invalid stops loops forever — log and abort those.",
    sources: ["mql5 articles", "EA programming (Young)"],
    tags: ["error", "order", "execution", "retry"],
  },
  {
    topic: "Scope every strategy's trades",
    principle: "Stamp every order with the owning strategy's identity (magic number) and make all counting, trailing and closing logic filter by it.",
    rationale: "Accounts run several systems plus manual trades side by side; an unscoped close-all or trailing loop modifies trades that belong to another system or the human.",
    application: "Attribute every position to its owning engine and never let one engine manage another's trades.",
    caution: "Two instances of the same strategy on one symbol still collide unless their identities differ per instance.",
    sources: ["EA programming (Young)", "mql5 articles"],
    tags: ["magic", "isolation", "scope", "sequence"],
  },
  {
    topic: "Build → backtest → forward-test → live",
    principle: "Automation executes rules flawlessly — including flawed rules — at machine speed; the pipeline is backtest across regimes, optimize sparingly, validate out-of-sample, then weeks on demo before minimum-size live.",
    rationale: "Parameter optimization on history overfits easily; only out-of-sample forward testing reveals whether the edge is real, and the demo phase catches order-handling bugs the tester never shows.",
    application: "Grant full voting weight only to engines that have passed the whole pipeline; anything mid-pipeline trades at reduced weight or observe-only.",
    caution: "A beautiful optimized equity curve is the warning sign, not the goal — the more parameters tuned, the more the backtest describes the past.",
    sources: ["EA programming (Young)", "synapsetrading"],
    tags: ["backtest", "demo", "forward", "pipeline"],
  },
  {
    topic: "Management beats the signal",
    principle: "What traders actually request from EA programmers is overwhelmingly simple 1-2 indicator signals — the complexity they demand lives in the management and safety layer.",
    rationale: "Across free-coding threads, signal logic fits in a sentence while the follow-up posts pile on trailing stops, breakeven, partials, close-all buttons, time windows and lot caps — practitioners believe outcomes are decided in the wrapper.",
    application: "Spend the debate budget the same way: agree quickly on a simple, testable signal, then scrutinize the exit/risk wrapper in detail.",
    caution: "Each added management feature multiplies the parameter space to validate — simple signals overfit easily under stacked filters.",
    sources: ["forexfactory 656979", "earnforex 30294"],
    tags: ["management", "exit", "signal", "wrapper"],
  },
  {
    topic: "The trade-manager duty list",
    principle: "A complete trade manager provides: fixed SL/TP, breakeven, stepped trailing (start/distance/step), partial close, close-all panic commands, and time gating (session start, Friday force-flat).",
    rationale: "Community enhancement requests enumerate exactly this set as the expected baseline for a 'complete' EA.",
    application: "Treat the list as a checklist — every approved strategy specifies a value or an explicit 'not used' for each duty before deployment.",
    caution: "Trailing steps and partial distances are broker/pair sensitive (pip vs point); values assumed for 5-digit quotes misbehave elsewhere.",
    sources: ["earnforex 30294"],
    tags: ["manager", "trail", "partial", "checklist"],
  },
  {
    topic: "Hard caps are first-class inputs",
    principle: "Absolute circuit-breakers belong in every strategy's contract: max lot, max trades per period, max acceptable loss, and a flat-by time before weekends.",
    rationale: "These caps bound worst-case damage independently of the signal — critical when risky sizing options coexist — and Friday-flat avoids weekend gap risk that stops cannot protect against.",
    application: "Require every strategy proposal to declare its caps; veto any system whose caps are undefined.",
    caution: "Caps must be present in the backtest, not bolted on after — tight caps silently change a strategy's statistical profile.",
    sources: ["earnforex 30294"],
    tags: ["caps", "lot", "weekend", "frequency"],
  },
  {
    topic: "Audit exits first",
    principle: "In real requests, exits and risk get specified numerically while entries stay vague — so review the exit/risk specification first and reject strategies whose entry rules are only implied.",
    rationale: "Traders experience P&L through exits, so that is where the concrete opinions live; a posted 3-MA EA shipped MA periods without ever documenting the cross rules.",
    application: "Verify the exit/risk spec is complete and unambiguous before debating the entry; never trade logic that has not been read and restated.",
    caution: "An undocumented entry cannot be reproduced or audited even when the parameters look familiar.",
    sources: ["forexfactory 656979", "earnforex 30294"],
    tags: ["exit", "audit", "spec", "entry"],
  },
  {
    topic: "Ship the smallest auditable version",
    principle: "Free-coding culture works incrementally: a minimal EA with source, then one management feature per iteration with the source republished each round — never a monolithic v1.",
    rationale: "Both source threads follow this loop, and it is why the code stays learnable and auditable; community EAs that accumulated features from many hands must be re-read in full before any use.",
    application: "Grow strategies one reviewed change at a time; treat every inherited file as unread until its entry, exit and sizing have been restated.",
    caution: "Binaries without source should never be run — and 'adaptive algorithm for any pair' with no disclosed logic is a marketing red flag, not a feature.",
    sources: ["forexfactory 656979", "eafxstore product page"],
    tags: ["iterate", "audit", "source", "version"],
  },
  {
    topic: "Diversify structure, not symbols",
    principle: "Robustness comes from structurally uncorrelated methods (trend + mean-reversion, different timeframes) — 35 USD pairs are still one dollar bet.",
    rationale: "Multi-EA portfolio wisdom: a mean-reversion and a trend system are structurally uncorrelated and smooth the combined curve; symbol breadth without method diversity just replicates the same risk.",
    application: "Prefer combining opposing method families over adding more symbols to one family.",
    caution: "In crises all correlations converge — assume simultaneous drawdowns when budgeting.",
    sources: ["botfxpro", "myfxbook forum", "mql5 blog"],
    tags: ["portfolio", "correlation", "diversify", "hedge"],
  },
  {
    topic: "Swap is a silent tax on held positions",
    principle: "Any strategy that holds past the daily rollover must price in swap — including the one weekday it is charged triple — or the financing bleed quietly turns a winning signal into a losing account.",
    rationale: "Swap is overnight financing debited/credited at market close; brokers apply a triple charge on one weekday (exposed via SYMBOL_SWAP_ROLLOVER3DAYS) to cover the weekend. Carry-trade write-ups stress that on multi-day holds — especially high-differential pairs like AUDJPY/NZDUSD — cumulative swap can exceed spread plus commission and decides whether the trade nets a profit. It gets forgotten in EAs prototyped as scalpers and later left holding overnight.",
    application: "For any strategy with holding time beyond one session, read SYMBOL_SWAP_LONG/SHORT and discount expected edge by projected swap over the hold; near-veto positive-swap 'carry' theses whose backtest ignored the triple-swap day; flag any record reporting gross P&L with no swap line.",
    caution: "Swap sign and size are broker- and date-specific and move with central-bank rates — a positive-swap edge today can flip negative, so it must be read live, never hard-coded.",
    sources: ["mql5 articles (carry trade)", "forexrobotlab", "mql5 broker reality check"],
    tags: ["swap", "rollover", "carry", "overnight", "hold", "cost"],
  },
  {
    topic: "Broker time is not GMT — session logic must self-calibrate",
    principle: "Never hard-code a UTC offset or trust the VPS clock for time-of-day logic; derive the broker-to-UTC offset dynamically or every session window drifts by hours twice a year.",
    rationale: "MT5 reports broker server time, and retail brokers run offsets of GMT+2/+3 that shift with DST. An EA testing hour>=7 && hour<16 against broker time misclassifies the London open for its whole history; hard-coding TimeCurrent()−2h is right only while the server runs GMT+2 and breaks the moment DST moves it to GMT+3. Using TimeLocal() couples behaviour to VPS geography. Brokers also disagree on whether the week opens Sunday evening or Monday, creating edge-bar bugs.",
    application: "Down-score or veto any session/news/time-window strategy that references a literal hour without a dynamically-computed broker offset; treat 'clean in backtest, dead in live right around the DST switch' as this bug until proven otherwise.",
    caution: "Auto-offset detection can itself misfire on illiquid symbols or thin history — the anchor (e.g. NY 17:00 close) must be validated against real bar timestamps.",
    sources: ["mql5 blogs (session time bugs)", "mql5 forum (broker offset/DST)", "mql5 code (TimeGMT)"],
    tags: ["timezone", "dst", "session", "time", "broker-time", "london"],
  },
  {
    topic: "Point ≠ pip, and stops must clear the broker minimum",
    principle: "Compute distances in tick size (not raw Point), scale for 3/5-digit quoting, and always place SL/TP beyond SYMBOL_TRADE_STOPS_LEVEL plus spread — or the broker rejects the order (error 130 / invalid stops).",
    rationale: "On a 5-digit broker one point is 1/10 pip, so pips×Point() places stops 10× too close; on currencies Point==TickSize hides the bug, but on metals/indices they diverge and orders fail. Brokers enforce a minimum stop distance, and when STOPS_LEVEL reads zero it means a floating level derived from live spread, not 'no limit' — a real gold scalper's 40-point stop was systematically rejected where the broker required 70.",
    application: "Veto any EA that multiplies a pip input by Point() with no digits/10× adjustment, or that sets SL/TP without checking STOPS_LEVEL + current spread; require tick-size rounding for metals/CFDs, not Point.",
    caution: "Adding spread to the minimum distance widens stops in fast markets, changing risk — the sizing math must use the ACTUAL placed stop, not the intended one.",
    sources: ["alfatactix (common MQL5 errors)", "mql5 forum (invalid stops)", "trgy.co.jp (JA)"],
    tags: ["point", "pip", "tick", "stops-level", "normalization", "error-130"],
  },
  {
    topic: "An EA is coupled to its test broker's SymbolInfo",
    principle: "Code every broker-specific rule against live SymbolInfo — filling mode, volume step, freeze level, trade mode, stops level — because the Strategy Tester validates only against YOUR broker's rulebook and hides incompatibilities until a different broker rejects the orders.",
    rationale: "The 'broker reality check' names the failure modes: a filling-policy mismatch is the #1 OrderSend killer (hard-coding FOK where the symbol only allows IOC returns error 10030 on every send); volume-step differences turn 0.015 lots into 'invalid volume'; freeze levels forbid modifying orders near price (hanging trailing EAs); trade-mode can be close-only near expiry. The tester uses your own broker's specs and never surfaces any of it — so a clean backtest is silent about all of this.",
    application: "Veto any EA that hard-codes a filling mode, lot step, or assumes it can always modify a position; require reading SYMBOL_FILLING_MODE/VOLUME_STEP/TRADE_FREEZE_LEVEL/TRADE_MODE at init and rounding lots to the step. Down-score 'verified on demo' claims not reproduced on a second broker. Partial fills belong here: a DONE retcode under IOC can still return result.volume < requested — check the filled volume, not just the code.",
    caution: "Defensive SymbolInfo branches themselves need testing, and freeze/stops levels are dynamic — a value read once at init can be stale by execution time.",
    sources: ["mql5 broker reality check", "trading-strategies.academy (IOC filling)", "mql5 articles (OrderSend retries)"],
    tags: ["broker", "portability", "filling", "volume-step", "demo", "live"],
  },
  {
    topic: "A stop that lives only in the EA dies with the terminal",
    principle: "Protective stops must be attached server-side on the position, not held as 'virtual' levels the EA checks each tick — because a VPS/terminal disconnect leaves in-memory stops unenforced while the position stays live at the broker.",
    rationale: "When the terminal disconnects, open trades remain active on the broker's server but the EA no longer manages them: an SL already attached to the order keeps working, while a stop that exists only as EA logic (virtual stop, per-tick trailing) does not fire at all. Vendors quantify an unmanaged position losing hundreds to thousands in a news spike that a server-side SL would have capped.",
    application: "Veto any strategy whose only downside protection is a virtual/synthetic stop or a 'close in code' branch unless a real server-side SL is also placed as a backstop; for grid/martingale require a broker-side catastrophic stop on the basket; score up EAs that place SL/TP on OrderSend itself.",
    caution: "Server-side stops can be swept by spread spikes and don't slippage-protect in gaps; strategies that legitimately hide levels with virtual stops must still carry a wider server-side disaster stop.",
    sources: ["tradingfxvps (VPS disconnect)", "socialvps (prevent EA failures)"],
    tags: ["virtual-stop", "server-side", "disconnect", "vps", "stop", "sl"],
  },
  {
    topic: "Correlation is a statistic, not a hedge",
    principle: "Treat correlated legs as one bet: correlation collapses exactly during the shocks you need protection from, so a 'hedged' basket can lose on both legs at once, and two correlated pairs are 2× the same exposure, not diversification.",
    rationale: "EURUSD/USDCHF run near −0.95, the textbook hedge — but correlation is a statistic, not a guarantee; it breaks during high-impact news and central-bank/geopolitical shocks, and a breakdown means both legs lose together. Correlation-hedge EAs also bleed swap on BOTH legs while the basket stays open for days, and brokers that disallow hedging or apply asymmetric margin make them misbehave.",
    application: "When scoring a multi-leg or multi-pair EA, measure realized correlation and treat highly-correlated exposure as a single position for the cap; veto 'market-neutral'/hedge claims that assume a fixed correlation and have no rule for the leg that stops tracking — the breakdown IS the trade going wrong.",
    caution: "Correlation is regime- and window-dependent (−0.9 over a month can be −0.3 over a week), so the number used for risk must match the holding horizon; and 'the hedge broke' can look identical to 'the signal was right', so it can't be the only exit trigger.",
    sources: ["fxnx (double exposure)", "forexcracked (correlation hedge EA)", "forexfactory (EURUSD/CHF hedging)"],
    tags: ["correlation", "hedge", "false-hedge", "exposure", "basket", "market-neutral"],
  },
  {
    topic: "Degrees of freedom, sample size, plateau not peak",
    principle: "Keep optimized parameters to a handful, demand enough trades to be statistically real, and trust a broad stable 'plateau' over an isolated peak — otherwise the optimizer is fitting noise and the result won't survive live.",
    rationale: "Converging advice across four languages: English guides warn that more than 3–4 optimizable parameters gives the optimizer freedom to fit noise and that ~15 trades over five years is far too small (≈50–100 minimum); Russian sources tie over-optimization to a forward return that should roughly match the optimization window; Chinese material says optimize toward the stable 高原 (plateau) region, never a spiky peak. Even walk-forward has a trap — the in/out-of-sample split is itself a tunable degree of freedom.",
    application: "Down-score EAs with many free parameters, tiny trade counts, or a result sitting on a sharp parameter peak; require an untouched out-of-sample/walk-forward window and reject when forward performance diverges sharply from in-sample. Reward few parameters, hundreds of trades, and robustness across neighbouring settings.",
    caution: "Distinct from 'backtests are an upper bound' — this is about WHY the ceiling is fake (degrees of freedom vs sample). Over-correcting into too few parameters can under-fit and miss a real regime; the goal is robustness, not zero tuning.",
    sources: ["forex92 (overfitting)", "tlap.com (RU over-optimization)", "csdn (CN plateau)", "quantinsti (walk-forward)"],
    tags: ["overfitting", "optimization", "walk-forward", "sample", "plateau", "backtest"],
  },
];

/** Pick the most relevant wisdom for a council context. Pure keyword
 *  lookup over bundled knowledge — deterministic and cheap. */
export function relevantWisdom(contextWords: string[], max = 2): WisdomCard[] {
  const ctx = contextWords.map((w) => w.toLowerCase());
  const scored = TRADING_WISDOM
    .map((c) => ({ c, score: c.tags.reduce((a, t) => a + (ctx.some((w) => w.includes(t) || t.includes(w)) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.c);
}

/** Seed one strategic interpretation fact per principle (idempotent). */
export function seedWisdomFacts(): number {
  let seeded = 0;
  for (const c of TRADING_WISDOM) {
    const r = upsertFact({
      id: `wisdom:${c.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'emil-interpretation',
      level: 'strategic',
      subject: `Trading wisdom · ${c.topic}`,
      statement: `${c.principle} Caution: ${c.caution}`,
      evidence: `distilled from ${c.sources.join(', ')}`,
      confidence: 65,
      freshUntil: Date.now() + 180 * 24 * 3_600_000,
      reason: 'wisdom digest',
    });
    if (r === 'new') seeded++;
  }
  return seeded;
}
