// One-off bootstrap: emits idempotent seed SQL so the Supabase database can be
// seeded through the SQL editor / MCP without a direct DATABASE_URL connection.
// Covers core config (user, account, agents, risk, permissions, strategies,
// state, health) + the full India Market API Hub. The richer demo data
// (candidates, votes, positions…) still comes from `yarn prisma db seed`
// once DATABASE_URL is set.
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { INDIA_PROVIDERS, INDIA_INSTRUMENTS, INDIA_EXCHANGE_SESSIONS, INDIA_HOLIDAYS_2026 } from '../lib/india/providers';

let n = 0;
const id = (p: string) => `seed_${p}_${String(++n).padStart(3, '0')}`;
const q = (v: any) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const L: string[] = [];

// ---- user (same test admin as scripts/seed.ts) ----
const userId = id('user');
L.push(`INSERT INTO users (id, email, name, password, role, "updatedAt") VALUES (${q(userId)}, 'abacus-cef4ea05@example.com', 'Test Admin', ${q(bcrypt.hashSync('M$1NMqk5Ms', 10))}, 'admin', now()) ON CONFLICT (email) DO NOTHING;`);

// ---- broker / connection / account ----
const brokerId = id('broker');
L.push(`INSERT INTO brokers (id, name, platform, "serverName") SELECT ${q(brokerId)}, 'IC Markets', 'MT5', 'ICMarketsSC-Live04' WHERE NOT EXISTS (SELECT 1 FROM brokers WHERE name = 'IC Markets');`);
L.push(`INSERT INTO broker_connections (id, "brokerId", status, "latencyMs", "quoteStalenessMs") SELECT ${q(id('conn'))}, b.id, 'connected', 42, 180 FROM brokers b WHERE b.name = 'IC Markets' AND NOT EXISTS (SELECT 1 FROM broker_connections c WHERE c."brokerId" = b.id);`);
L.push(`INSERT INTO accounts (id, "userId", "brokerId", "accountNumber", currency, balance, equity, "marginUsed", "freeMargin", "protectedCapital", "profitCapital", "workingCapital", "highWaterMark", "profitFloor", "floatingPL", "dailyPL", "weeklyPL", "monthlyPL") SELECT ${q(id('acct'))}, u.id, b.id, '51488062', 'USD', 12840.5, 12927.3, 412.6, 12514.7, 10000, 2840.5, 1420.25, 13105.8, 11400, 86.8, 124.4, 386.2, 912.7 FROM users u, brokers b WHERE u.email = 'abacus-cef4ea05@example.com' AND b.name = 'IC Markets' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a."userId" = u.id);`);

// ---- global instruments ----
const globals: [string, string, string, string | null, string | null, number, number, Record<string, number>][] = [
  ['EURUSD', 'Euro / US Dollar', 'forex', 'EUR', 'USD', 1.09245, 0.18, { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 1092, typicalSpreadPips: 0.6, currentSpreadPips: 0.7 }],
  ['GBPUSD', 'British Pound / US Dollar', 'forex', 'GBP', 'USD', 1.27612, -0.12, { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 1276, typicalSpreadPips: 0.9, currentSpreadPips: 1.1 }],
  ['USDJPY', 'US Dollar / Japanese Yen', 'forex', 'USD', 'JPY', 147.382, 0.34, { contractSize: 100000, tickSize: 0.001, pipValuePerLot: 6.78, marginPerLot: 1000, typicalSpreadPips: 0.8, currentSpreadPips: 0.9 }],
  ['AUDUSD', 'Australian Dollar / US Dollar', 'forex', 'AUD', 'USD', 0.65834, 0.09, { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 658, typicalSpreadPips: 0.8, currentSpreadPips: 1.0 }],
  ['XAUUSD', 'Gold / US Dollar', 'metals', 'XAU', 'USD', 2431.65, 0.72, { contractSize: 100, tickSize: 0.01, pipValuePerLot: 10, marginPerLot: 2431, typicalSpreadPips: 2.2, currentSpreadPips: 3.4 }],
  ['US500', 'S&P 500 Index CFD', 'indices', null, null, 5487.2, 0.41, { contractSize: 10, tickSize: 0.1, pipValuePerLot: 10, marginPerLot: 2743, typicalSpreadPips: 4.0, currentSpreadPips: 4.5 }],
  ['USOIL', 'WTI Crude Oil', 'energies', null, null, 78.44, -0.86, { contractSize: 1000, tickSize: 0.01, pipValuePerLot: 10, marginPerLot: 784, typicalSpreadPips: 3.0, currentSpreadPips: 3.2 }],
  ['BTCUSD', 'Bitcoin / US Dollar', 'crypto', null, null, 61240.0, 1.85, { contractSize: 1, tickSize: 0.01, pipValuePerLot: 1, marginPerLot: 6124, typicalSpreadPips: 15.0, currentSpreadPips: 18.0 }],
];
for (const [sym, name, cls, base, quote, price, chg, spec] of globals) {
  L.push(`INSERT INTO instruments (id, symbol, name, "assetClass", "baseCurrency", "quoteCurrency", "currentPrice", "dailyChangePct") VALUES (${q(id('inst'))}, ${q(sym)}, ${q(name)}, ${q(cls)}, ${q(base)}, ${q(quote)}, ${price}, ${chg}) ON CONFLICT (symbol) DO NOTHING;`);
  L.push(`INSERT INTO instrument_specifications (id, "instrumentId", "contractSize", "tickSize", "pipValuePerLot", "marginPerLot", "typicalSpreadPips", "currentSpreadPips") SELECT ${q(id('spec'))}, i.id, ${spec.contractSize}, ${spec.tickSize}, ${spec.pipValuePerLot}, ${spec.marginPerLot}, ${spec.typicalSpreadPips}, ${spec.currentSpreadPips} FROM instruments i WHERE i.symbol = ${q(sym)} AND NOT EXISTS (SELECT 1 FROM instrument_specifications s WHERE s."instrumentId" = i.id);`);
}

// ---- India instruments ----
for (const i of INDIA_INSTRUMENTS) {
  L.push(`INSERT INTO instruments (id, symbol, name, "assetClass", "quoteCurrency", "currentPrice", exchange, segment, country, isin, "lotSize", "priceBandPct") VALUES (${q(id('inst'))}, ${q(i.symbol)}, ${q(i.name)}, ${q(i.assetClass)}, 'INR', ${i.currentPrice}, ${q(i.exchange)}, ${q(i.segment)}, 'IN', ${q(i.isin ?? null)}, ${i.lotSize ?? 'NULL'}, ${i.priceBandPct ?? 'NULL'}) ON CONFLICT (symbol) DO NOTHING;`);
  const s = i.spec;
  L.push(`INSERT INTO instrument_specifications (id, "instrumentId", "contractSize", "tickSize", "tickValue", "pipValuePerLot", "minLot", "lotStep", "maxLot", "marginPerLot", "typicalSpreadPips", "currentSpreadPips") SELECT ${q(id('spec'))}, i.id, ${s.contractSize}, ${s.tickSize}, ${s.tickValue}, ${s.pipValuePerLot}, ${s.minLot}, ${s.lotStep}, ${s.maxLot}, ${s.marginPerLot}, ${s.typicalSpreadPips}, ${s.currentSpreadPips} FROM instruments i WHERE i.symbol = ${q(i.symbol)} AND NOT EXISTS (SELECT 1 FROM instrument_specifications sp WHERE sp."instrumentId" = i.id);`);
}

// ---- India API providers / sessions / holidays ----
for (const p of INDIA_PROVIDERS) {
  L.push(`INSERT INTO india_api_providers (id, key, name, vendor, "docsUrl", "baseUrl", "authType", "authNote", exchanges, capabilities, "rateLimitNote", "pricingNote", "isPrimaryData", "updatedAt") VALUES (${q(id('prov'))}, ${q(p.key)}, ${q(p.name)}, ${q(p.vendor)}, ${q(p.docsUrl)}, ${q(p.baseUrl)}, ${q(p.authType)}, ${q(p.authNote)}, ${q(p.exchanges)}, ${q(p.capabilities)}, ${q(p.rateLimitNote)}, ${q(p.pricingNote)}, ${p.key === 'indianapi'}, now()) ON CONFLICT (key) DO NOTHING;`);
}
for (const s of INDIA_EXCHANGE_SESSIONS) {
  L.push(`INSERT INTO exchange_sessions (id, exchange, segment, "preOpen", open, close, "postClose", "eveningClose", note) VALUES (${q(id('sess'))}, ${q(s.exchange)}, ${q(s.segment)}, ${q(s.preOpen)}, ${q(s.open)}, ${q(s.close)}, ${q(s.postClose)}, ${q(s.eveningClose)}, ${q(s.note)}) ON CONFLICT (exchange, segment) DO NOTHING;`);
}
for (const h of INDIA_HOLIDAYS_2026) {
  L.push(`INSERT INTO india_market_holidays (id, exchange, date, name) SELECT ${q(id('hol'))}, ${q(h.exchange)}, ${q(h.date)}::timestamp, ${q(h.name)} WHERE NOT EXISTS (SELECT 1 FROM india_market_holidays x WHERE x.exchange = ${q(h.exchange)} AND x.date = ${q(h.date)}::timestamp);`);
}

// ---- agents (40) ----
const agents: [number, string, string, string, string, number][] = [
  [1, 'Global Market Scanner', 'market_analysis', 'Scans approved assets and timeframes for opportunity, risk and abnormal behavior.', 'Scanning 8 instruments across 5 timeframes. EURUSD showing relative strength vs G10.', 71],
  [2, 'Regime Intelligence Agent', 'market_analysis', 'Classifies markets into 18 regime types.', 'EURUSD H1: weak bullish trend. XAUUSD H4: expansion. GBPUSD: range.', 78],
  [3, 'Trend Agent', 'market_analysis', 'Analyzes structure: higher highs/lows, slope, trend age and exhaustion.', 'EURUSD: HH/HL intact on H1, trend age 14 bars, no exhaustion signals.', 74],
  [4, 'Price Action Agent', 'market_analysis', 'Reads structure, S/R, rejections, breakouts, liquidity sweeps.', 'EURUSD retested broken resistance 1.0910 and held. Clean structure.', 76],
  [5, 'Momentum Agent', 'market_analysis', 'Measures acceleration, divergence, exhaustion and momentum failure.', 'Momentum positive, mild deceleration on M15. No divergence on H1.', 68],
  [6, 'Volatility Agent', 'market_analysis', 'Tracks ATR, realized vol, clustering, gaps, spread expansion.', 'ATR within normal band. XAUUSD volatility elevated (1.4x 20d avg).', 82],
  [7, 'Liquidity Agent', 'market_analysis', 'Tracks spread, depth, volume, thin-market behavior, session windows.', 'London/NY overlap: deep liquidity. Spreads normal except XAUUSD.', 85],
  [8, 'Execution Quality Agent', 'execution', 'Monitors slippage, fill quality, requotes and broker behavior.', 'Avg slippage 0.2 pips over last 50 fills. Execution healthy.', 88],
  [9, 'News & Macro Agent', 'market_analysis', 'Monitors economic calendar and macro shocks.', 'US CPI in 3h 42m — HIGH impact. Pre-news restriction window at T-30m.', 90],
  [10, 'Correlation Intelligence Agent', 'risk', 'Tracks cross-market correlation and hidden concentration.', 'EURUSD-GBPUSD 20d corr 0.83 — same-direction exposure treated as one cluster.', 80],
  [11, 'Hedge Agent', 'risk', 'Designs defensive hedges with explicit exit conditions.', 'No hedge currently required. Watching correlated EUR/GBP exposure into CPI.', 72],
  [12, 'Scalping Agent', 'strategy', 'Short-horizon opportunities. Currently restricted by spread policy.', 'Standing down: spread/ATR ratio unfavorable for scalps on majors.', 45],
  [13, 'Intraday Agent', 'strategy', 'Intraday setups within session boundaries.', 'EURUSD pullback-continuation setup valid until NY close.', 70],
  [14, 'Swing Agent', 'strategy', 'Multi-day swing setups aligned with H4/D1 bias.', 'XAUUSD D1 bias bullish but volatility elevated — reduced conviction.', 61],
  [15, 'Positional Agent', 'strategy', 'Long-horizon positioning.', 'No positional candidates meet criteria this week.', 38],
  [16, 'Trend Strategy Agent', 'strategy', 'Trend-following entries on confirmed structure.', 'TrendRider-v3 signal active on EURUSD H1.', 73],
  [17, 'Breakout Strategy Agent', 'strategy', 'Breakout and retest logic with failed-breakout protection.', 'GBPUSD compression forming; breakout premature — WAIT.', 52],
  [18, 'Mean Reversion Agent', 'strategy', 'Fades extensions in range regimes.', 'GBPUSD range edges not yet reached. No signal.', 47],
  [19, 'Momentum Strategy Agent', 'strategy', 'Momentum continuation entries.', 'Momentum aligned with trend on EURUSD — supportive, not primary.', 66],
  [20, 'Portfolio Agent', 'risk', 'Aggregates exposure across instruments, classes, currencies.', 'Aggregate 0.03 / 0.05 lots. USD net short via EUR long + GBP flat.', 84],
  [21, 'Position Sizing Agent', 'risk', 'Computes size from stop distance and permitted monetary risk.', 'EURUSD: 18.5 pip stop → 0.02 lots = $37 risk (0.29% of working capital).', 91],
  [22, 'Capital Protection Agent', 'risk', 'Guards protected capital, drawdown limits and profit floors.', 'Equity above profit floor. Daily loss budget 71% remaining.', 89],
  [23, 'Trade Management Agent', 'execution', 'Manages stops, break-even, trailing, partials on open trades.', 'EURUSD position at +12 pips; break-even trigger at +15 pips.', 77],
  [24, 'Execution Agent', 'execution', 'Places validated orders via broker gateway with idempotency keys.', 'Gateway ready. Last order round-trip 96ms.', 87],
  [25, 'Learning Agent', 'learning', 'Post-trade analysis, pattern extraction, model updates.', 'Analyzed 14 closed trades this week. 2 tagged bad-loss (late entry).', 75],
  [26, 'Behavioral Coach', 'learning', 'Protects the trader from overtrading and revenge trading.', 'Trading frequency normal. No revenge-trade pattern detected.', 81],
  [27, 'Explainability Agent', 'learning', 'Translates every decision into plain language.', 'All active decisions have published explanations.', 93],
  [28, 'Permission & Consent Agent', 'guardian', 'Enforces authorized modes, assets, sessions and limits.', 'Mode: Semi-Autonomous. All actions within granted permissions.', 95],
  [29, 'System Health Agent', 'execution', 'Monitors feeds, broker link, latency, process health.', 'All systems nominal. Feed staleness 180ms. No degradation.', 92],
  [30, 'GUARDIAN', 'guardian', 'Final independent authority. Can veto any trade or force protection mode.', 'NORMAL OPERATION. Watching CPI window and EUR/GBP correlation.', 96],
  [31, "Devil's Advocate Agent", 'guardian', 'Argues against every significant trade before authorization.', 'On EURUSD: "Signal may be late — entry is 12 pips above breakout. Reward could be overstated into CPI."', 64],
  [32, 'Novelty Detector', 'learning', 'Detects when market conditions are outside EMIL experience.', 'Current conditions 87% similar to known regimes. No novelty alert.', 79],
  [33, 'Survival Engine', 'risk', 'Simulates catastrophes (gaps, 3x vol, spread blowout) before exposure.', 'Worst-case sim on proposed book: -2.9% equity. Account survives.', 86],
  [34, 'Trust Calibration Agent', 'learning', 'Maintains EMIL Trust Score separate from trade confidence.', 'Environment trust 62/100 — moderate familiarity, CPI uncertainty penalized.', 76],
  [35, 'Knowledge Council', 'knowledge', 'Reviews ingested knowledge before it can influence trading.', '2 items in sandbox validation. 1 strategy awaiting backtest.', 70],
  [36, 'Knowledge Graph Agent', 'knowledge', 'Links strategies, indicators, regimes and outcomes into a graph.', '312 nodes, 1,840 edges. 3 new links from last journal upload.', 74],
  [37, 'Contradiction Engine', 'knowledge', 'Detects conflicts between knowledge items.', 'Flagged: uploaded EA logic conflicts with news-avoidance rule.', 68],
  [38, 'Strategy Compiler', 'knowledge', 'Converts described strategies into testable rule sets.', 'Compiled "London ORB" from user description — queued for backtest.', 71],
  [39, 'Drift Detection Agent', 'learning', 'Monitors live vs expected strategy behavior for drift.', 'MeanRev-v2 win rate drifting: 58% → 44% over 30 trades. Flagged.', 83],
  [40, 'Memory Architect', 'learning', 'Manages episodic, semantic and procedural memory stores.', 'Consolidated 9 episodes into semantic memory overnight.', 78],
];
for (const [num, name, cat, desc, assess, conf] of agents) {
  L.push(`INSERT INTO agents (id, number, name, category, description, "currentAssessment", confidence) VALUES (${q(id('agent'))}, ${num}, ${q(name)}, ${q(cat)}, ${q(desc)}, ${q(assess)}, ${conf}) ON CONFLICT (number) DO NOTHING;`);
}

// ---- risk profile + permissions ----
L.push(`INSERT INTO risk_profiles (id, name, "isActive") SELECT ${q(id('risk'))}, 'Conservative Default', true WHERE NOT EXISTS (SELECT 1 FROM risk_profiles WHERE name = 'Conservative Default');`);
const perms: [string, string, string, string, boolean][] = [
  ['open_trades', 'Open New Trades', 'EMIL may open new directional positions within limits.', 'trading', true],
  ['modify_stops', 'Modify Stop-Loss', 'EMIL may tighten (never widen) protective stops.', 'management', true],
  ['partial_exits', 'Partial Exits', 'EMIL may take partial profits per exit plan.', 'management', true],
  ['trailing_stops', 'Trailing Stops', 'EMIL may trail stops on winning positions.', 'management', true],
  ['open_hedges', 'Open Defensive Hedges', 'EMIL may open temporary hedges with defined exit conditions.', 'hedging', true],
  ['scale_in', 'Scale Into Positions', 'EMIL may add to winners within aggregate exposure cap.', 'trading', false],
  ['trade_news', 'Trade During High-Impact News', 'EMIL may hold/open positions through red-folder events.', 'trading', false],
  ['auto_learn', 'Autonomous Learning Updates', 'EMIL may promote models through paper stage without approval.', 'learning', true],
  ['live_promotion', 'Live Model Promotion', 'EMIL may promote models to live without explicit approval.', 'learning', false],
  ['emergency_close', 'Emergency Close Authority', 'EMIL may close all positions in disorderly markets.', 'emergency', true],
];
for (const [key, label, desc, cat, granted] of perms) {
  L.push(`INSERT INTO permissions (id, key, label, description, category, granted, "updatedAt") VALUES (${q(id('perm'))}, ${q(key)}, ${q(label)}, ${q(desc)}, ${q(cat)}, ${granted}, now()) ON CONFLICT (key) DO NOTHING;`);
}

// ---- strategies ----
const strategies: [string, string, string, string, number, number, number, number, number, number, number, number, boolean, boolean, string][] = [
  ['TrendRider', 'v3.2', 'trend', 'healthy', 84, 212, 54.2, 92.4, 48.1, 1.82, 4.1, 1, true, false, 'production'],
  ['TrendRider', 'v4.0-rc1', 'trend', 'watch', 77, 64, 57.8, 88.0, 51.2, 1.88, 3.2, 0, false, true, 'paper'],
  ['LondonBreakout', 'v2.1', 'breakout', 'healthy', 79, 148, 47.3, 118.6, 52.3, 2.03, 5.6, 2, true, false, 'production'],
  ['MeanRev', 'v2.0', 'mean_reversion', 'degraded', 41, 96, 44.1, 61.0, 58.9, 0.94, 7.8, 4, false, false, 'production'],
  ['GoldMomentum', 'v1.4', 'momentum', 'watch', 63, 81, 51.8, 104.2, 71.5, 1.41, 6.2, 2, false, false, 'production'],
  ['IndexSwing', 'v1.0', 'swing', 'research_only', 55, 40, 50.0, 140.0, 95.0, 1.47, 8.9, 1, false, false, 'backtest'],
  ['ScalpEdge', 'v0.9', 'scalping', 'suspended', 22, 187, 38.5, 22.1, 26.4, 0.71, 9.4, 6, false, false, 'research'],
];
for (const [name, ver, type, status, health, trades, wr, aw, al, pf, dd, cl, champ, chall, stage] of strategies) {
  L.push(`INSERT INTO strategy_versions (id, name, version, "strategyType", status, "healthScore", trades, "winRate", "avgWin", "avgLoss", "profitFactor", "maxDrawdownPct", "consecutiveLosses", "isChampion", "isChallenger", stage) SELECT ${q(id('strat'))}, ${q(name)}, ${q(ver)}, ${q(type)}, ${q(status)}, ${health}, ${trades}, ${wr}, ${aw}, ${al}, ${pf}, ${dd}, ${cl}, ${champ}, ${chall}, ${q(stage)} WHERE NOT EXISTS (SELECT 1 FROM strategy_versions s WHERE s.name = ${q(name)} AND s.version = ${q(ver)});`);
}

// ---- state + health ----
L.push(`INSERT INTO emil_state (id, armed, mode, "updatedAt") SELECT ${q(id('state'))}, false, 'observation', now() WHERE NOT EXISTS (SELECT 1 FROM emil_state);`);
const health = ['Market Data Feed', 'Broker Gateway', 'Risk Engine', 'Agent Council', 'Learning Pipeline', 'News Calendar', 'India Data Hub'];
for (const c of health) {
  L.push(`INSERT INTO system_health (id, component, status, "latencyMs") SELECT ${q(id('health'))}, ${q(c)}, 'healthy', ${Math.floor(20 + n * 3)} WHERE NOT EXISTS (SELECT 1 FROM system_health h WHERE h.component = ${q(c)});`);
}

const out = process.argv[2] || 'seed-supabase.sql';
writeFileSync(out, L.join('\n') + '\n');
console.log(`Wrote ${L.length} statements to ${out}`);
