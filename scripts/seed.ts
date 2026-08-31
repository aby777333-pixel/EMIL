import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding EMIL Control Cockpit...');

  // ---- Users ----
  const adminPass = await bcrypt.hash('M$1NMqk5Ms', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'abacus-cef4ea05@example.com' },
    update: { password: adminPass },
    create: { email: 'abacus-cef4ea05@example.com', name: 'Test Admin', password: adminPass, role: 'admin' },
  });

  // ---- Broker ----
  let broker = await prisma.broker.findFirst({ where: { name: 'IC Markets' } });
  if (!broker) broker = await prisma.broker.create({ data: { name: 'IC Markets', platform: 'MT5', serverName: 'ICMarketsSC-Live04' } });
  const conn = await prisma.brokerConnection.findFirst({ where: { brokerId: broker.id } });
  if (!conn) await prisma.brokerConnection.create({ data: { brokerId: broker.id, status: 'connected', latencyMs: 42, quoteStalenessMs: 180 } });

  // ---- Account ----
  let account = await prisma.tradingAccount.findFirst({ where: { userId: admin.id } });
  if (!account) {
    account = await prisma.tradingAccount.create({
      data: {
        userId: admin.id, brokerId: broker.id, accountNumber: '51488062', currency: 'USD',
        balance: 12840.5, equity: 12927.3, marginUsed: 412.6, freeMargin: 12514.7,
        protectedCapital: 10000, profitCapital: 2840.5, workingCapital: 1420.25,
        highWaterMark: 13105.8, profitFloor: 11400, floatingPL: 86.8,
        dailyPL: 124.4, weeklyPL: 386.2, monthlyPL: 912.7, profitCapitalMode: false,
      },
    });
  }

  // ---- Instruments ----
  const instruments = [
    { symbol: 'EURUSD', name: 'Euro / US Dollar', assetClass: 'forex', baseCurrency: 'EUR', quoteCurrency: 'USD', currentPrice: 1.09245, dailyChangePct: 0.18, spec: { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 1092, typicalSpreadPips: 0.6, currentSpreadPips: 0.7 } },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', assetClass: 'forex', baseCurrency: 'GBP', quoteCurrency: 'USD', currentPrice: 1.27612, dailyChangePct: -0.12, spec: { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 1276, typicalSpreadPips: 0.9, currentSpreadPips: 1.1 } },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', assetClass: 'forex', baseCurrency: 'USD', quoteCurrency: 'JPY', currentPrice: 147.382, dailyChangePct: 0.34, spec: { contractSize: 100000, tickSize: 0.001, pipValuePerLot: 6.78, marginPerLot: 1000, typicalSpreadPips: 0.8, currentSpreadPips: 0.9 } },
    { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', assetClass: 'forex', baseCurrency: 'AUD', quoteCurrency: 'USD', currentPrice: 0.65834, dailyChangePct: 0.09, spec: { contractSize: 100000, tickSize: 0.00001, pipValuePerLot: 10, marginPerLot: 658, typicalSpreadPips: 0.8, currentSpreadPips: 1.0 } },
    { symbol: 'XAUUSD', name: 'Gold / US Dollar', assetClass: 'metals', baseCurrency: 'XAU', quoteCurrency: 'USD', currentPrice: 2431.65, dailyChangePct: 0.72, spec: { contractSize: 100, tickSize: 0.01, pipValuePerLot: 10, marginPerLot: 2431, typicalSpreadPips: 2.2, currentSpreadPips: 3.4 } },
    { symbol: 'US500', name: 'S&P 500 Index CFD', assetClass: 'indices', currentPrice: 5487.2, dailyChangePct: 0.41, spec: { contractSize: 10, tickSize: 0.1, pipValuePerLot: 10, marginPerLot: 2743, typicalSpreadPips: 4.0, currentSpreadPips: 4.5 } },
    { symbol: 'USOIL', name: 'WTI Crude Oil', assetClass: 'energies', currentPrice: 78.44, dailyChangePct: -0.86, spec: { contractSize: 1000, tickSize: 0.01, pipValuePerLot: 10, marginPerLot: 784, typicalSpreadPips: 3.0, currentSpreadPips: 3.2 } },
    { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', assetClass: 'crypto', currentPrice: 61240.0, dailyChangePct: 1.85, spec: { contractSize: 1, tickSize: 0.01, pipValuePerLot: 1, marginPerLot: 6124, typicalSpreadPips: 15.0, currentSpreadPips: 18.0 } },
  ];
  const instMap: Record<string, string> = {};
  for (const i of instruments) {
    const { spec, ...data } = i;
    const inst = await prisma.instrument.upsert({ where: { symbol: i.symbol }, update: { currentPrice: i.currentPrice, dailyChangePct: i.dailyChangePct }, create: data });
    instMap[i.symbol] = inst.id;
    const existing = await prisma.instrumentSpecification.findUnique({ where: { instrumentId: inst.id } });
    if (!existing) await prisma.instrumentSpecification.create({ data: { instrumentId: inst.id, ...spec } });
  }

  // ---- Agents (40) ----
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
  for (const [number, name, category, description, currentAssessment, confidence] of agents) {
    await prisma.agent.upsert({
      where: { number },
      update: { currentAssessment, confidence },
      create: { number, name, category, description, currentAssessment, confidence, status: number === 15 ? 'active' : 'active' },
    });
  }

  // ---- Risk Profile ----
  let profile = await prisma.riskProfile.findFirst({ where: { name: 'Conservative Default' } });
  if (!profile) {
    profile = await prisma.riskProfile.create({
      data: {
        name: 'Conservative Default', isActive: true, baseLot: 0.01, maxAggregateExposure: 0.05,
        maxRiskPerTradePct: 0.5, riskCeilingPct: 5.0, dailyLossLimitPct: 2.0, weeklyLossLimitPct: 5.0,
        maxDrawdownPct: 8.0, maxMarginUtilPct: 25.0, maxOpenPositions: 4, pauseAfterConsecutiveLosses: 3,
        hedgePermitted: true, newsBehavior: 'pause_before_high_impact', allowedSessions: 'London,New York',
        allowedAssetClasses: 'forex,metals,indices',
      },
    });
  }

  // ---- Permissions ----
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
  for (const [key, label, description, category, granted] of perms) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, label, description, category, granted } });
  }

  // ---- Strategies ----
  const strategies = [
    { name: 'TrendRider', version: 'v3.2', strategyType: 'trend', status: 'healthy', healthScore: 84, trades: 212, winRate: 54.2, avgWin: 92.4, avgLoss: 48.1, expectancy: 0.61, profitFactor: 1.82, maxDrawdownPct: 4.1, sharpeLike: 1.42, sortinoLike: 1.91, recoveryFactor: 3.4, consecutiveLosses: 1, driftStatus: 'stable', isChampion: true, stage: 'production', regimePerformance: JSON.stringify({ strong_trend: 1.9, weak_trend: 1.4, range: 0.7, breakout: 1.6, high_vol: 0.9 }) },
    { name: 'TrendRider', version: 'v4.0-rc1', strategyType: 'trend', status: 'watch', healthScore: 77, trades: 64, winRate: 57.8, avgWin: 88.0, avgLoss: 51.2, expectancy: 0.58, profitFactor: 1.88, maxDrawdownPct: 3.2, sharpeLike: 1.51, sortinoLike: 2.02, recoveryFactor: 2.9, consecutiveLosses: 0, driftStatus: 'stable', isChallenger: true, stage: 'paper', regimePerformance: JSON.stringify({ strong_trend: 2.1, weak_trend: 1.5, range: 0.8, breakout: 1.7, high_vol: 1.0 }) },
    { name: 'LondonBreakout', version: 'v2.1', strategyType: 'breakout', status: 'healthy', healthScore: 79, trades: 148, winRate: 47.3, avgWin: 118.6, avgLoss: 52.3, expectancy: 0.72, profitFactor: 2.03, maxDrawdownPct: 5.6, sharpeLike: 1.28, sortinoLike: 1.74, recoveryFactor: 2.8, consecutiveLosses: 2, driftStatus: 'stable', isChampion: true, stage: 'production', regimePerformance: JSON.stringify({ strong_trend: 1.4, weak_trend: 1.1, range: 0.6, breakout: 2.4, high_vol: 1.2 }) },
    { name: 'MeanRev', version: 'v2.0', strategyType: 'mean_reversion', status: 'degraded', healthScore: 41, trades: 96, winRate: 44.1, avgWin: 61.0, avgLoss: 58.9, expectancy: -0.06, profitFactor: 0.94, maxDrawdownPct: 7.8, sharpeLike: 0.31, sortinoLike: 0.42, recoveryFactor: 0.8, consecutiveLosses: 4, driftStatus: 'drift_alert', stage: 'production', regimePerformance: JSON.stringify({ strong_trend: 0.4, weak_trend: 0.7, range: 1.6, breakout: 0.3, high_vol: 0.5 }) },
    { name: 'GoldMomentum', version: 'v1.4', strategyType: 'momentum', status: 'watch', healthScore: 63, trades: 81, winRate: 51.8, avgWin: 104.2, avgLoss: 71.5, expectancy: 0.31, profitFactor: 1.41, maxDrawdownPct: 6.2, sharpeLike: 0.88, sortinoLike: 1.12, recoveryFactor: 1.6, consecutiveLosses: 2, driftStatus: 'drifting', stage: 'production', regimePerformance: JSON.stringify({ strong_trend: 1.6, weak_trend: 1.0, range: 0.5, breakout: 1.5, high_vol: 1.3 }) },
    { name: 'IndexSwing', version: 'v1.0', strategyType: 'swing', status: 'research_only', healthScore: 55, trades: 40, winRate: 50.0, avgWin: 140.0, avgLoss: 95.0, expectancy: 0.22, profitFactor: 1.47, maxDrawdownPct: 8.9, sharpeLike: 0.72, sortinoLike: 0.95, recoveryFactor: 1.1, consecutiveLosses: 1, driftStatus: 'stable', stage: 'backtest', regimePerformance: JSON.stringify({ strong_trend: 1.5, weak_trend: 1.2, range: 0.9, breakout: 1.1, high_vol: 0.6 }) },
    { name: 'ScalpEdge', version: 'v0.9', strategyType: 'scalping', status: 'suspended', healthScore: 22, trades: 187, winRate: 38.5, avgWin: 22.1, avgLoss: 26.4, expectancy: -0.31, profitFactor: 0.71, maxDrawdownPct: 9.4, sharpeLike: -0.4, sortinoLike: -0.3, recoveryFactor: 0.3, consecutiveLosses: 6, driftStatus: 'drift_alert', stage: 'research', regimePerformance: JSON.stringify({ strong_trend: 0.8, weak_trend: 0.6, range: 0.9, breakout: 0.7, high_vol: 0.4 }) },
  ];
  const stratMap: Record<string, string> = {};
  for (const s of strategies) {
    let st = await prisma.strategyVersion.findFirst({ where: { name: s.name, version: s.version } });
    if (!st) st = await prisma.strategyVersion.create({ data: s });
    stratMap[`${s.name}-${s.version}`] = st.id;
  }

  // ---- Market Regimes ----
  const regimeCount = await prisma.marketRegime.count();
  if (regimeCount === 0) {
    await prisma.marketRegime.createMany({
      data: [
        { symbol: 'EURUSD', timeframe: 'H1', regime: 'weak_bullish_trend', confidence: 78, volatilityClass: 'normal' },
        { symbol: 'EURUSD', timeframe: 'H4', regime: 'strong_bullish_trend', confidence: 82, volatilityClass: 'normal' },
        { symbol: 'GBPUSD', timeframe: 'H1', regime: 'range', confidence: 71, volatilityClass: 'normal' },
        { symbol: 'GBPUSD', timeframe: 'H4', regime: 'compression', confidence: 66, volatilityClass: 'normal' },
        { symbol: 'USDJPY', timeframe: 'H1', regime: 'strong_bullish_trend', confidence: 80, volatilityClass: 'elevated' },
        { symbol: 'XAUUSD', timeframe: 'H1', regime: 'expansion', confidence: 74, volatilityClass: 'elevated' },
        { symbol: 'XAUUSD', timeframe: 'H4', regime: 'breakout', confidence: 69, volatilityClass: 'elevated' },
        { symbol: 'US500', timeframe: 'H4', regime: 'weak_bullish_trend', confidence: 75, volatilityClass: 'normal' },
        { symbol: 'USOIL', timeframe: 'H4', regime: 'mean_reversion', confidence: 62, volatilityClass: 'normal' },
        { symbol: 'BTCUSD', timeframe: 'H4', regime: 'high_volatility', confidence: 70, volatilityClass: 'high' },
      ],
    });
  }

  // ---- Correlations ----
  const corrCount = await prisma.correlationSnapshot.count();
  if (corrCount === 0) {
    await prisma.correlationSnapshot.createMany({
      data: [
        { symbolA: 'EURUSD', symbolB: 'GBPUSD', coefficient: 0.83, cluster: 'USD-majors' },
        { symbolA: 'EURUSD', symbolB: 'USDJPY', coefficient: -0.41, cluster: 'USD-majors' },
        { symbolA: 'EURUSD', symbolB: 'AUDUSD', coefficient: 0.67, cluster: 'USD-majors' },
        { symbolA: 'EURUSD', symbolB: 'XAUUSD', coefficient: 0.38, cluster: null },
        { symbolA: 'GBPUSD', symbolB: 'USDJPY', coefficient: -0.35, cluster: null },
        { symbolA: 'GBPUSD', symbolB: 'AUDUSD', coefficient: 0.58, cluster: 'USD-majors' },
        { symbolA: 'XAUUSD', symbolB: 'USDJPY', coefficient: -0.52, cluster: 'risk-off' },
        { symbolA: 'XAUUSD', symbolB: 'US500', coefficient: 0.21, cluster: null },
        { symbolA: 'US500', symbolB: 'BTCUSD', coefficient: 0.61, cluster: 'risk-on' },
        { symbolA: 'USOIL', symbolB: 'US500', coefficient: 0.44, cluster: 'risk-on' },
        { symbolA: 'AUDUSD', symbolB: 'XAUUSD', coefficient: 0.49, cluster: null },
        { symbolA: 'USDJPY', symbolB: 'US500', coefficient: 0.33, cluster: null },
      ],
    });
  }

  // ---- Portfolio Exposure ----
  const expCount = await prisma.portfolioExposure.count();
  if (expCount === 0) {
    await prisma.portfolioExposure.createMany({
      data: [
        { dimension: 'instrument', key: 'EURUSD', exposureLots: 0.02, exposurePct: 40, direction: 'net_long' },
        { dimension: 'instrument', key: 'XAUUSD', exposureLots: 0.01, exposurePct: 20, direction: 'net_long' },
        { dimension: 'asset_class', key: 'forex', exposureLots: 0.02, exposurePct: 40, direction: 'net_long' },
        { dimension: 'asset_class', key: 'metals', exposureLots: 0.01, exposurePct: 20, direction: 'net_long' },
        { dimension: 'currency', key: 'USD', exposureLots: 0.03, exposurePct: 60, direction: 'net_short' },
        { dimension: 'currency', key: 'EUR', exposureLots: 0.02, exposurePct: 40, direction: 'net_long' },
        { dimension: 'cluster', key: 'USD-majors', exposureLots: 0.02, exposurePct: 40, direction: 'net_long' },
        { dimension: 'cluster', key: 'risk-off', exposureLots: 0.01, exposurePct: 20, direction: 'net_long' },
      ],
    });
  }

  // ---- Positions ----
  const posCount = await prisma.position.count();
  if (posCount === 0) {
    await prisma.position.createMany({
      data: [
        { accountId: account.id, instrumentId: instMap['EURUSD'], direction: 'BUY', lots: 0.02, entryPrice: 1.0912, currentPrice: 1.09245, stopLoss: 1.08935, takeProfit: 1.0968, floatingPL: 25.0, status: 'open', strategyName: 'TrendRider v3.2', openedAt: new Date(Date.now() - 5 * 3600e3) },
        { accountId: account.id, instrumentId: instMap['XAUUSD'], direction: 'BUY', lots: 0.01, entryPrice: 2424.8, currentPrice: 2431.65, stopLoss: 2412.0, takeProfit: 2455.0, floatingPL: 68.5, status: 'open', strategyName: 'GoldMomentum v1.4', openedAt: new Date(Date.now() - 26 * 3600e3) },
        { accountId: account.id, instrumentId: instMap['GBPUSD'], direction: 'SELL', lots: 0.01, entryPrice: 1.2748, currentPrice: 1.27612, floatingPL: -13.2, status: 'open', isHedge: true, strategyName: 'Hedge (CPI window)', openedAt: new Date(Date.now() - 2 * 3600e3) },
        { accountId: account.id, instrumentId: instMap['US500'], direction: 'BUY', lots: 0.01, entryPrice: 5462.0, currentPrice: 5462.0, stopLoss: 5430.0, takeProfit: 5520.0, floatingPL: 0, status: 'pending', strategyName: 'IndexSwing v1.0 (limit)', openedAt: new Date(Date.now() - 1 * 3600e3) },
        { accountId: account.id, instrumentId: instMap['USDJPY'], direction: 'BUY', lots: 0.02, entryPrice: 146.42, currentPrice: 147.1, floatingPL: 92.4, status: 'closed', closedPL: 92.4, strategyName: 'TrendRider v3.2', openedAt: new Date(Date.now() - 3 * 86400e3), closedAt: new Date(Date.now() - 2 * 86400e3) },
        { accountId: account.id, instrumentId: instMap['USOIL'], direction: 'SELL', lots: 0.01, entryPrice: 79.1, currentPrice: 78.8, floatingPL: -30.0, status: 'closed', closedPL: -30.0, strategyName: 'MeanRev v2.0', openedAt: new Date(Date.now() - 2 * 86400e3), closedAt: new Date(Date.now() - 1.5 * 86400e3) },
      ],
    });
    const hedgePos = await prisma.position.findFirst({ where: { isHedge: true } });
    if (hedgePos) {
      await prisma.hedge.create({
        data: {
          positionId: hedgePos.id, hedgeSymbol: 'GBPUSD', hedgeLots: 0.01,
          reason: 'Correlated EUR exposure elevated during US CPI event window (EURUSD-GBPUSD corr 0.83).',
          exitCondition: 'Remove when volatility normalizes below Elevated OR correlation falls below 0.70 OR CPI window closes +45m.',
          status: 'active',
        },
      });
    }
  }

  // ---- Trade Candidates + votes ----
  const candCount = await prisma.tradeCandidate.count();
  if (candCount === 0) {
    const cand1 = await prisma.tradeCandidate.create({
      data: {
        instrumentId: instMap['EURUSD'], strategyId: stratMap['TrendRider-v3.2'], direction: 'BUY',
        regime: 'weak_bullish_trend', htfBias: 'H4 bullish, D1 neutral-bullish',
        entry: 1.0921, stopLoss: 1.09025, tp1: 1.0948, tp2: 1.0968, tp3: 1.0995,
        baseLot: 0.01, calculatedLot: 0.02, maxExposure: 0.05, aggExposureBefore: 0.03, aggExposureAfter: 0.05,
        monetaryRisk: 37.0, riskPct: 0.29, rewardRisk: 2.5, confidence: 82,
        probabilityScenario: '58% TP1 before SL | 34% TP2 | 18% TP3', expectedDuration: '4-12 hours',
        trendCondition: 'HH/HL intact on H1, aligned with H4', volatilityCondition: 'Normal (ATR 0.9x 20d avg)',
        liquidityCondition: 'Deep (London/NY overlap)', spreadPips: 0.7, estSlippagePips: 0.2,
        newsRisk: 'US CPI in 3h 42m — HIGH impact. Must resolve or be managed before T-30m.',
        correlationExposure: 'GBPUSD corr 0.83 — cluster treated as single exposure', hedgeRequired: false,
        reasonsFor: JSON.stringify(['H1 and H4 trends align bullish', 'Clean retest of broken resistance 1.0910', 'Momentum positive without exhaustion', 'Spread and liquidity normal', 'Strategy TrendRider v3.2 healthy (score 84)']),
        reasonsAgainst: JSON.stringify(['US CPI in under 4 hours', 'Entry 12 pips above breakout (Devil\'s Advocate: possibly late)', 'Correlated GBP exposure already open', 'M15 momentum decelerating']),
        invalidation: 'H1 close below 1.0902 invalidates the retest structure.',
        exitPlan: '40% at TP1 → SL to break-even → 35% at TP2 → trail remainder via H1 swing lows. Full exit before CPI T-30m if TP1 not reached.',
        guardianStatus: 'approved_conditional', finalDecision: 'BUY', consensusScore: 71, trustScore: 62,
        survivalResult: JSON.stringify({ stopGap: '-0.6%', vol2x: '-0.9%', vol3x: '-1.4%', spreadBlowout: '-0.4%', correlatedShock: '-2.9%', hedgeFailure: '-1.1%', brokerOutage: '-1.8%', verdict: 'SURVIVES' }),
        status: 'approved', pipelineStage: 'execution',
      },
    });
    const cand2 = await prisma.tradeCandidate.create({
      data: {
        instrumentId: instMap['XAUUSD'], strategyId: stratMap['GoldMomentum-v1.4'], direction: 'BUY',
        regime: 'expansion', htfBias: 'H4 breakout, D1 bullish',
        entry: 2432.0, stopLoss: 2402.0, tp1: 2462.0, tp2: 2490.0,
        baseLot: 0.01, calculatedLot: 0.01, maxExposure: 0.05, aggExposureBefore: 0.03, aggExposureAfter: 0.04,
        monetaryRisk: 300.0, riskPct: 2.34, rewardRisk: 1.9, confidence: 74,
        probabilityScenario: '51% TP1 before SL', expectedDuration: '1-3 days',
        trendCondition: 'Expansion after breakout', volatilityCondition: 'Elevated (ATR 1.4x)',
        liquidityCondition: 'Normal', spreadPips: 3.4, estSlippagePips: 1.1,
        newsRisk: 'US CPI HIGH impact — gold highly sensitive', correlationExposure: 'Existing 0.01 XAUUSD long', hedgeRequired: false,
        reasonsFor: JSON.stringify(['D1 breakout confirmed', 'Momentum strong', 'Safe-haven demand into CPI']),
        reasonsAgainst: JSON.stringify(['Even minimum 0.01 lot risks $300 = 2.34% — exceeds 0.5% per-trade limit', 'Volatility elevated', 'Already long 0.01 XAUUSD']),
        invalidation: 'H4 close below 2402 breakout base.',
        exitPlan: 'N/A — rejected before execution.',
        guardianStatus: 'rejected', finalDecision: 'REJECT', consensusScore: 55, trustScore: 58,
        survivalResult: JSON.stringify({ stopGap: '-3.1%', vol2x: '-4.4%', vol3x: '-6.2%', spreadBlowout: '-3.5%', correlatedShock: '-7.8%', hedgeFailure: '-4.9%', brokerOutage: '-5.6%', verdict: 'MARGINAL' }),
        status: 'rejected', pipelineStage: 'monetary_risk',
      },
    });
    const cand3 = await prisma.tradeCandidate.create({
      data: {
        instrumentId: instMap['GBPUSD'], strategyId: stratMap['LondonBreakout-v2.1'], direction: 'SELL',
        regime: 'compression', htfBias: 'H4 compression, D1 neutral',
        entry: 1.2738, stopLoss: 1.2769, tp1: 1.2695, tp2: 1.2660,
        baseLot: 0.01, calculatedLot: 0.01, maxExposure: 0.05, aggExposureBefore: 0.03, aggExposureAfter: 0.04,
        monetaryRisk: 31.0, riskPct: 0.24, rewardRisk: 2.2, confidence: 58,
        probabilityScenario: '46% TP1 before SL', expectedDuration: '2-8 hours',
        trendCondition: 'Compression — breakout not confirmed', volatilityCondition: 'Normal',
        liquidityCondition: 'Normal', spreadPips: 1.1, estSlippagePips: 0.3,
        newsRisk: 'US CPI ahead', correlationExposure: 'EURUSD long conflicts (corr 0.83)', hedgeRequired: false,
        reasonsFor: JSON.stringify(['Range low proximity', 'Session timing favorable']),
        reasonsAgainst: JSON.stringify(['Breakout not confirmed — premature', 'Conflicts with EURUSD long via correlation', 'Confidence below strategy threshold (58 < 65)']),
        invalidation: 'Breakout confirmation absent.',
        exitPlan: 'N/A — waiting.',
        guardianStatus: 'pending', finalDecision: 'WAIT', consensusScore: 44, trustScore: 62,
        status: 'proposed', pipelineStage: 'agent_council',
      },
    });

    // votes for cand1
    const allAgents = await prisma.agent.findMany();
    const byNum = (n: number) => allAgents.find((a) => a.number === n)!.id;
    const votes1: [number, string, number, string, string][] = [
      [2, 'BUY', 78, 'Weak bullish trend confirmed H1, strong H4', 'Regime could shift at CPI'],
      [3, 'BUY', 74, 'HH/HL intact, healthy pullback depth', 'Trend age 14 bars'],
      [4, 'BUY', 76, 'Clean retest-and-hold of 1.0910', 'Minor wick rejection above'],
      [5, 'BUY', 68, 'H1 momentum positive', 'M15 deceleration'],
      [6, 'WAIT', 60, 'ATR normal', 'CPI vol expansion likely'],
      [9, 'WAIT', 55, 'No conflict for next 3h', 'CPI HIGH impact in window'],
      [10, 'REDUCE', 70, 'Cluster exposure manageable', 'GBP corr 0.83 already held'],
      [16, 'BUY', 73, 'TrendRider signal valid', 'None material'],
      [21, 'BUY', 91, '0.02 lots = 0.29% risk, compliant', 'None'],
      [22, 'BUY', 84, 'Daily budget 71% remaining', 'None'],
      [31, 'WAIT', 64, 'None', 'Entry may be late; reward overstated into CPI'],
      [33, 'BUY', 86, 'Worst-case -2.9%, survives', 'Correlated shock is largest risk'],
      [30, 'BUY', 88, 'Conditional approval: exit before CPI T-30m', 'CPI window'],
    ];
    for (const [num, vote, confidence, ef, ea] of votes1) {
      await prisma.agentVote.create({ data: { candidateId: cand1.id, agentId: byNum(num), vote, confidence, evidenceFor: ef, evidenceAgainst: ea } });
    }
    const votes2: [number, string, number, string, string][] = [
      [2, 'BUY', 74, 'Expansion regime after breakout', 'Elevated volatility'],
      [5, 'BUY', 79, 'Strong momentum', 'Extended from mean'],
      [6, 'WAIT', 58, 'None', 'ATR 1.4x average'],
      [21, 'REJECT', 95, 'None', 'Min 0.01 lot = $300 risk = 2.34%, exceeds 0.5% limit'],
      [22, 'REJECT', 92, 'None', 'Violates per-trade monetary risk law'],
      [30, 'REJECT', 96, 'None', 'Risk Engine veto is final. Even minimum size exceeds permitted risk.'],
    ];
    for (const [num, vote, confidence, ef, ea] of votes2) {
      await prisma.agentVote.create({ data: { candidateId: cand2.id, agentId: byNum(num), vote, confidence, evidenceFor: ef, evidenceAgainst: ea } });
    }
    const votes3: [number, string, number, string, string][] = [
      [2, 'WAIT', 66, 'Compression forming', 'Breakout unconfirmed'],
      [17, 'WAIT', 52, 'Setup building', 'Premature'],
      [10, 'REJECT', 72, 'None', 'Conflicts with EURUSD long, corr 0.83'],
      [30, 'WAIT', 80, 'No violation', 'Await confirmation'],
    ];
    for (const [num, vote, confidence, ef, ea] of votes3) {
      await prisma.agentVote.create({ data: { candidateId: cand3.id, agentId: byNum(num), vote, confidence, evidenceFor: ef, evidenceAgainst: ea } });
    }

    await prisma.riskDecision.createMany({
      data: [
        { candidateId: cand1.id, engine: 'independent_risk_engine', decision: 'approved', reason: '0.29% risk within 0.5% limit; aggregate 0.05 at cap after trade.' },
        { candidateId: cand1.id, engine: 'capital_protection', decision: 'approved', reason: 'Equity above profit floor; daily budget sufficient.' },
        { candidateId: cand1.id, engine: 'guardian', decision: 'conditional', reason: 'Approved with condition: flat or managed before CPI T-30m.' },
        { candidateId: cand2.id, engine: 'independent_risk_engine', decision: 'rejected', reason: 'Minimum 0.01 lot risks 2.34% — exceeds permitted monetary risk. Rejected rather than blindly using minimum.' },
        { candidateId: cand2.id, engine: 'guardian', decision: 'rejected', reason: 'Risk Engine veto upheld. No override path.' },
      ],
    });

    const order1 = await prisma.tradeOrder.create({
      data: { candidateId: cand1.id, symbol: 'EURUSD', direction: 'BUY', orderType: 'market', lots: 0.02, price: 1.0912, stopLoss: 1.08935, takeProfit: 1.0968, status: 'filled' },
    });
    await prisma.execution.create({ data: { orderId: order1.id, fillPrice: 1.0912, fillLots: 0.02, slippagePips: 0.1, commission: 0.14 } });
  }

  // ---- Capital Ledger ----
  const ledCount = await prisma.capitalLedger.count();
  if (ledCount === 0) {
    const entries = [
      { entryType: 'deposit', amount: 10000, balanceAfter: 10000, equityAfter: 10000, note: 'Initial protected capital', daysAgo: 90 },
      { entryType: 'realized_pl', amount: 420.3, balanceAfter: 10420.3, equityAfter: 10420.3, note: 'Week 2 realized P/L', daysAgo: 76 },
      { entryType: 'realized_pl', amount: 615.8, balanceAfter: 11036.1, equityAfter: 11036.1, note: 'Week 4 realized P/L', daysAgo: 62 },
      { entryType: 'profit_lock', amount: 500, balanceAfter: 11036.1, equityAfter: 11036.1, note: 'Weekly profit lock: $500 moved to profit floor', daysAgo: 61 },
      { entryType: 'realized_pl', amount: -238.4, balanceAfter: 10797.7, equityAfter: 10797.7, note: 'Drawdown week — MeanRev degradation', daysAgo: 48 },
      { entryType: 'realized_pl', amount: 812.6, balanceAfter: 11610.3, equityAfter: 11610.3, note: 'Trend month begins', daysAgo: 34 },
      { entryType: 'hwm_update', amount: 0, balanceAfter: 11610.3, equityAfter: 11694.0, note: 'New high-water mark $11,694', daysAgo: 33 },
      { entryType: 'realized_pl', amount: 736.9, balanceAfter: 12347.2, equityAfter: 12347.2, note: 'XAUUSD swing series', daysAgo: 20 },
      { entryType: 'profit_lock', amount: 900, balanceAfter: 12347.2, equityAfter: 12347.2, note: 'Monthly profit lock: floor raised to $11,400', daysAgo: 19 },
      { entryType: 'hwm_update', amount: 0, balanceAfter: 12840.5, equityAfter: 13105.8, note: 'High-water mark $13,105.80', daysAgo: 6 },
      { entryType: 'realized_pl', amount: 493.3, balanceAfter: 12840.5, equityAfter: 12840.5, note: 'Current month to date', daysAgo: 5 },
    ];
    for (const e of entries) {
      const { daysAgo, ...data } = e;
      await prisma.capitalLedger.create({ data: { ...data, accountId: account.id, createdAt: new Date(Date.now() - daysAgo * 86400e3) } });
    }
  }

  // ---- Drawdown Events ----
  const ddCount = await prisma.drawdownEvent.count();
  if (ddCount === 0) {
    await prisma.drawdownEvent.createMany({
      data: [
        { accountId: account.id, level: 'daily', drawdownPct: 1.42, thresholdPct: 2.0, action: 'Warning issued at 71% of daily budget. New risk reduced by 25%.', resolved: true, createdAt: new Date(Date.now() - 12 * 86400e3) },
        { accountId: account.id, level: 'strategy', drawdownPct: 7.8, thresholdPct: 6.0, action: 'MeanRev v2.0 downgraded to Degraded; live sizing halved, then suspended from new entries.', resolved: false, createdAt: new Date(Date.now() - 9 * 86400e3) },
        { accountId: account.id, level: 'hwm', drawdownPct: 1.36, thresholdPct: 8.0, action: 'Within normal band. No action.', resolved: true, createdAt: new Date(Date.now() - 2 * 86400e3) },
        { accountId: account.id, level: 'weekly', drawdownPct: 2.9, thresholdPct: 5.0, action: 'Monitoring. Consecutive-loss counter at 1 of 3.', resolved: true, createdAt: new Date(Date.now() - 15 * 86400e3) },
      ],
    });
  }

  // ---- Learning Events ----
  const leCount = await prisma.learningEvent.count();
  if (leCount === 0) {
    await prisma.learningEvent.createMany({
      data: [
        { eventType: 'post_trade_analysis', title: 'USDJPY trend trade tagged CORRECT WIN', detail: 'Entry, management and exit followed plan. Reinforced H1/H4 alignment pattern weight.', agentName: 'Learning Agent', createdAt: new Date(Date.now() - 2 * 86400e3) },
        { eventType: 'bad_loss', title: 'USOIL loss tagged BAD LOSS', detail: 'Entry taken in mean-reversion regime while H4 momentum was trending. Rule added: MeanRev requires H4 range confirmation.', agentName: 'Learning Agent', createdAt: new Date(Date.now() - 36 * 3600e3) },
        { eventType: 'drift_detected', title: 'MeanRev v2.0 drift alert', detail: 'Live win rate 44% vs expected 58% over 30-trade window. Strategy moved to Degraded, sizing halved.', agentName: 'Drift Detection Agent', createdAt: new Date(Date.now() - 9 * 86400e3) },
        { eventType: 'regime_learned', title: 'New sub-regime recorded: post-breakout compression', detail: 'XAUUSD exhibited compression within expansion. Stored as new regime fingerprint for future matching.', agentName: 'Novelty Detector', createdAt: new Date(Date.now() - 4 * 86400e3) },
        { eventType: 'promotion', title: 'TrendRider v4.0-rc1 promoted to paper stage', detail: 'Passed backtest matrix (2,400 trades, 12 regimes). Now running paper validation against champion v3.2.', agentName: 'Knowledge Council', createdAt: new Date(Date.now() - 6 * 86400e3) },
        { eventType: 'correction', title: 'User correction ingested: London ORB stop placement', detail: 'Trader corrected stop placement logic to use pre-range extreme + spread buffer. Trust level raised to 3 after validation.', agentName: 'Knowledge Council', createdAt: new Date(Date.now() - 1 * 86400e3) },
      ],
    });
  }

  // ---- Knowledge Items ----
  const kiCount = await prisma.knowledgeItem.count();
  if (kiCount === 0) {
    await prisma.knowledgeItem.createMany({
      data: [
        { userId: admin.id, title: 'London Opening Range Breakout — personal strategy', knowledgeType: 'strategy', classification: 'personal', factType: 'hypothesis', trustLevel: 4, sourceReliability: 'trader_verified', scopeNote: 'GBPUSD and EURUSD only, London session only', contentText: 'Trade the break of the 07:00-08:00 London range with stop at opposite extreme plus spread buffer. Skip on red-folder days.', status: 'validated', tags: 'breakout,london,session', analysisResult: 'Backtested: PF 1.7 over 420 trades. Session-restricted validity confirmed.' },
        { userId: admin.id, title: 'SuperTrend v2.4 indicator (MQ5)', knowledgeType: 'indicator', classification: 'personal', factType: 'fact', trustLevel: 2, sourceReliability: 'unverified', scopeNote: 'Understand logic only — do not trade it', contentText: 'ATR-band trailing indicator. Deconstructed: lagging in ranges, effective in strong trends.', status: 'understood', tags: 'indicator,atr,trend' },
        { userId: admin.id, title: 'Trading journal 2025-H2.csv', knowledgeType: 'journal', classification: 'personal', factType: 'fact', trustLevel: 3, sourceReliability: 'trader_verified', contentText: '184 journaled trades. Extracted patterns: best performance London open, worst during NY lunch. Oversized after losses on 6 occasions.', status: 'validated', tags: 'journal,behavior' },
        { userId: admin.id, title: 'GoldRush EA v3 (compiled ex4)', knowledgeType: 'ea', classification: 'personal', factType: 'hypothesis', trustLevel: 1, sourceReliability: 'unknown_origin', scopeNote: 'SANDBOX ONLY — compiled binary, behavioral analysis only', contentText: 'Compiled EA — cannot inspect source. Behavioral sandbox shows grid-averaging behavior. FLAGGED: contradicts drawdown rules.', status: 'parsed', tags: 'ea,sandbox,flagged' },
        { userId: admin.id, title: 'Correction: exit gold before FOMC, not after', knowledgeType: 'correction', classification: 'personal', factType: 'opinion', trustLevel: 3, sourceReliability: 'trader_direct', contentText: 'Trader correction 2026-08-01: EMIL held XAUUSD through FOMC. Rule adjusted: metals positions flat 30m before FOMC unless hedged.', status: 'active', tags: 'correction,news,gold' },
        { userId: admin.id, title: 'Wyckoff accumulation notes (PDF)', knowledgeType: 'document', classification: 'global', factType: 'opinion', trustLevel: 2, sourceReliability: 'published_book', contentText: 'Extracted schematics for accumulation/distribution phases. Mapped to regime classifier vocabulary.', status: 'understood', tags: 'wyckoff,structure' },
        { userId: admin.id, title: 'ATR position sizing rule', knowledgeType: 'instruction', classification: 'personal', factType: 'fact', trustLevel: 7, sourceReliability: 'trader_direct', contentText: 'Always size from stop distance and permitted monetary risk, never from desired lots. Approved production knowledge.', status: 'active', tags: 'risk,sizing' },
      ],
    });
  }

  // ---- EMIL State ----
  const stateCount = await prisma.emilState.count();
  if (stateCount === 0) {
    await prisma.emilState.create({
      data: {
        armed: true, mode: 'semi_autonomous', guardianStatus: 'active', guardianDecision: 'NORMAL OPERATION — CPI window conditions active',
        trustScore: 62,
        trustBreakdown: JSON.stringify({ regimeFamiliarity: 74, historicalEvidence: 68, recentLiveAccuracy: 61, strategyHealth: 66, dataQuality: 92, modelDrift: 48, correlationStability: 55, executionQuality: 88, noveltyPenalty: 71 }),
        agentConsensus: 'BUY (conditional)', consensusScore: 71, volatilityStatus: 'normal',
        newsCountdownMins: 222, nextNewsEvent: 'US CPI (YoY) — HIGH impact', marketDataHealth: 'healthy',
      },
    });
  }

  // ---- System Health ----
  const shCount = await prisma.systemHealth.count();
  if (shCount === 0) {
    await prisma.systemHealth.createMany({
      data: [
        { component: 'Broker Gateway (MT5)', status: 'healthy', latencyMs: 42, message: 'Heartbeat OK' },
        { component: 'Market Data Feed', status: 'healthy', latencyMs: 12, message: 'Staleness 180ms' },
        { component: 'Agent Orchestrator', status: 'healthy', latencyMs: 8, message: '40/40 agents responsive' },
        { component: 'Risk Engine', status: 'healthy', latencyMs: 3, message: 'Independent process isolated' },
        { component: 'Guardian Process', status: 'healthy', latencyMs: 5, message: 'Veto channel verified' },
        { component: 'News Calendar Feed', status: 'degraded', latencyMs: 340, message: 'Secondary provider active; primary reconnecting' },
        { component: 'Learning Pipeline', status: 'healthy', latencyMs: 55, message: 'Nightly consolidation complete' },
        { component: 'Knowledge Sandbox', status: 'healthy', latencyMs: 20, message: '2 items in validation' },
      ],
    });
  }

  // ---- Consent + Audit ----
  const clCount = await prisma.consentLog.count();
  if (clCount === 0) {
    await prisma.consentLog.createMany({
      data: [
        { userId: admin.id, action: 'arm_emil', mode: 'semi_autonomous', detail: 'EMIL armed in Semi-Autonomous mode. All 6 disclosures acknowledged. Press-and-hold completed (3.2s).', checkboxes: JSON.stringify(['loss_risk', 'auto_action', 'exposure_cap', 'hedge_risk', 'slippage', 'responsibility']), authMethod: 'press_and_hold', createdAt: new Date(Date.now() - 8 * 3600e3) },
        { userId: admin.id, action: 'mode_change', mode: 'advisory', detail: 'Mode changed Observation → Advisory during evaluation week.', authMethod: 'button', createdAt: new Date(Date.now() - 21 * 86400e3) },
      ],
    });
    await prisma.auditLog.createMany({
      data: [
        { userId: admin.id, actor: 'user', action: 'ARM EMIL', category: 'consent', detail: 'Armed in Semi-Autonomous mode with Conservative Default risk profile.', createdAt: new Date(Date.now() - 8 * 3600e3) },
        { actor: 'emil', action: 'TRADE OPENED', category: 'execution', detail: 'EURUSD BUY 0.02 @ 1.0912, SL 1.08935, TP 1.0968. Guardian conditional approval.', createdAt: new Date(Date.now() - 5 * 3600e3) },
        { actor: 'guardian', action: 'TRADE REJECTED', category: 'risk', detail: 'XAUUSD BUY rejected: minimum 0.01 lot exceeds permitted monetary risk (2.34% > 0.5%).', createdAt: new Date(Date.now() - 4 * 3600e3) },
        { actor: 'emil', action: 'HEDGE OPENED', category: 'hedging', detail: 'GBPUSD SELL 0.01 defensive hedge for CPI window. Exit condition logged.', createdAt: new Date(Date.now() - 2 * 3600e3) },
        { actor: 'system', action: 'FEED DEGRADATION', category: 'health', detail: 'News calendar primary feed reconnecting; secondary provider active.', createdAt: new Date(Date.now() - 90 * 60e3) },
        { actor: 'emil', action: 'LEARNING EVENT', category: 'learning', detail: 'User correction ingested: London ORB stop placement. Trust level 3.', createdAt: new Date(Date.now() - 1 * 86400e3) },
      ],
    });
  }

  // ---- India Market API Hub (NSE / BSE / MCX) ----
  const { INDIA_PROVIDERS, INDIA_INSTRUMENTS, INDIA_EXCHANGE_SESSIONS, INDIA_HOLIDAYS_2026 } = await import('../lib/india/providers');

  for (const p of INDIA_PROVIDERS) {
    await prisma.indiaApiProvider.upsert({
      where: { key: p.key },
      update: {
        name: p.name, vendor: p.vendor, docsUrl: p.docsUrl, baseUrl: p.baseUrl,
        authType: p.authType, authNote: p.authNote, exchanges: p.exchanges,
        capabilities: p.capabilities, rateLimitNote: p.rateLimitNote, pricingNote: p.pricingNote,
      },
      create: {
        key: p.key, name: p.name, vendor: p.vendor, docsUrl: p.docsUrl, baseUrl: p.baseUrl,
        authType: p.authType, authNote: p.authNote, exchanges: p.exchanges,
        capabilities: p.capabilities, rateLimitNote: p.rateLimitNote, pricingNote: p.pricingNote,
        isPrimaryData: p.key === 'dalalai',
      },
    });
  }

  for (const s of INDIA_EXCHANGE_SESSIONS) {
    await prisma.exchangeSession.upsert({
      where: { exchange_segment: { exchange: s.exchange, segment: s.segment } },
      update: { preOpen: s.preOpen, open: s.open, close: s.close, postClose: s.postClose, eveningClose: s.eveningClose, note: s.note },
      create: { exchange: s.exchange, segment: s.segment, preOpen: s.preOpen, open: s.open, close: s.close, postClose: s.postClose, eveningClose: s.eveningClose, note: s.note },
    });
  }

  for (const h of INDIA_HOLIDAYS_2026) {
    const date = new Date(`${h.date}T00:00:00.000Z`);
    const existing = await prisma.indiaHoliday.findFirst({ where: { exchange: h.exchange, date } });
    if (!existing) await prisma.indiaHoliday.create({ data: { exchange: h.exchange, date, name: h.name } });
  }

  for (const i of INDIA_INSTRUMENTS) {
    const { spec, ...rest } = i;
    const data = {
      symbol: rest.symbol, name: rest.name, assetClass: rest.assetClass,
      exchange: rest.exchange, segment: rest.segment, country: 'IN',
      isin: rest.isin ?? null, lotSize: rest.lotSize ?? null, priceBandPct: rest.priceBandPct ?? null,
      quoteCurrency: 'INR', currentPrice: rest.currentPrice,
    };
    const inst = await prisma.instrument.upsert({
      where: { symbol: rest.symbol },
      update: { exchange: rest.exchange, segment: rest.segment, country: 'IN', lotSize: rest.lotSize ?? null },
      create: data,
    });
    const existingSpec = await prisma.instrumentSpecification.findUnique({ where: { instrumentId: inst.id } });
    if (!existingSpec) await prisma.instrumentSpecification.create({ data: { instrumentId: inst.id, ...spec } });
  }

  console.log('Seed complete (incl. India Market API Hub).');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
