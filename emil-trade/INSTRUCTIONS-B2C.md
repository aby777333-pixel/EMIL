# GIO RAPTOR — B2C Trader User Guide

## Getting Started

### Creating Your Account
1. Visit the platform and click **Register**
2. Enter your email, create a password, verify your email
3. Complete KYC verification (identity document + proof of address)
4. Fund your account via the Finance Portal
5. Start trading!

### Your Dashboard (`/dashboard`)
After login, you land on your personal dashboard showing:
- Account balance and equity
- Open positions with live P&L
- Recent trade history
- Market overview and news
- NEXUS AI companion (the pulsing orb in the bottom-right corner)

---

## Trading

### Charts (`/dashboard/raptor-charts`)
Your charting workspace powered by RAPTOR CHARTS:
- **15 chart types:** Candlestick, Heikin Ashi, Renko, and more
- **155+ indicators** organized by category (Trend, Oscillators, Volatility, Volume)
- **8 RAPTOR-exclusive indicators** (PULSE, MOMENTUM WAVE, LIQUIDITY MAP, SMART MONEY, FLOW, REGIME, SENTIMENT BAR, SIGNAL)
- **5 NEXUS AI overlays** (Support/Resistance Zones, Pattern Detection, Divergence, Entry Zones, Exit Zones)
- **50+ drawing tools** including Fibonacci, Gann, Elliott Wave, and Harmonic patterns
- **Multi-chart layouts:** View up to 9 charts simultaneously
- **30+ timeframes** from tick-by-tick to yearly

### Placing Orders
From the trading terminal or chart:
- **Quick trade:** Select symbol, direction, size — one click to execute
- **Advanced order ticket:** Choose from 23 order types including market, limit, stop, trailing stop, OCO, and more
- **On-chart:** Drag to place stop loss and take profit directly on the chart
- **Risk calculator:** See potential P&L and margin impact before placing
- Spread is shown live on every order ticket

### Managing Positions (`/dashboard/positions`)
- View all open positions with live P&L (green = profit, red = loss)
- **Partial close:** Close a portion of any position
- **Modify:** Change stop loss, take profit, or trailing stop
- **One-click close all** (with confirmation)
- **Close by group:** Close all forex positions, all crypto, etc.
- Add notes to any trade

### Watchlist
- Add any instrument to your watchlist
- See live bid/ask prices updating in real-time
- Tap any symbol to open its chart
- Organize by custom groups

---

## Analytics & Performance

### Performance Dashboard (`/dashboard/analytics`)
Track your trading performance:
- **Equity curve** showing your account growth over time
- **Key metrics:** Win rate, profit factor, Sharpe ratio, max drawdown, expectancy
- **Monthly returns calendar** — green months and red months at a glance
- **Trade distribution** by symbol, hour of day, and day of week
- **Best/worst trades** and streak tracking
- **Benchmark comparison** vs S&P 500, Gold, Bitcoin

### Trade Journal (`/dashboard/journal`)
Every trade is automatically captured:
- Entry price, exit price, P&L, duration, commission, swap
- Add your own notes and tags (e.g., "breakout", "news trade")
- Attach chart screenshots
- Self-assess: did you follow your rules?
- Export as CSV or PDF

---

## Copy Trading (`/dashboard/copy-trading-v2`)

### Discovering Providers
- Browse providers with verified live track records
- See total return, max drawdown, Sharpe ratio, win rate, followers
- Equity curve visualization and monthly returns heatmap
- Risk rating (1-5 bars)
- Fee transparency: performance fee %, monthly fee

### Following a Provider
- Click **Follow** to start copying
- Set allocation (% of your account)
- Choose lot sizing: proportional, fixed, or equity-based
- Set your personal max drawdown limit per strategy
- Filter instruments: skip certain trades if you want
- Pause/resume at any time

### Becoming a Provider
- Apply from the copy trading page (requires broker approval)
- Set your fees and strategy description
- Track your followers and communicate updates

---

## Social Trading (`/dashboard/social`)

### Feed
- Share closed trades with P&L and commentary
- Post market opinions with chart screenshots
- Share NEXUS insights and chart ideas
- React with: like, insightful, risky, agree, disagree
- Comment on any post

### Leaderboards
- **Return leaderboard** (Sharpe-adjusted)
- **Win rate leaderboard** (minimum 50 trades)
- **Consistency leaderboard** (most green months)
- **Prop challenge leaderboard**
- Filter by period: weekly, monthly, quarterly, yearly
- All participation is opt-in — privacy first

### Community
- Discussion forums per instrument and strategy type
- Live trading rooms with screen sharing
- Study groups for collaborative learning
- Trading competitions with rewards
- NEXUS Q&A: ask questions, get AI + community answers

---

## Prop Trading Challenges (`/dashboard/prop-challenge`)

### Finding a Challenge
- Browse available challenges: 1-phase, 2-phase, instant funding
- Compare: profit target, max drawdown, daily loss limit, duration, price, profit split
- Clear rules in plain English

### Active Challenge Dashboard
- **Progress gauges:** Profit target (%), daily loss used (%), max drawdown used (%)
- **Trading day counter** with minimum days requirement
- **Daily P&L calendar** — see each day's result
- **Violation risk warning:** "You are 2% away from daily loss limit"
- **Live equity curve** for your challenge

### Funded Account
- Same trading experience with profit split awareness
- Profit split calculator
- Withdrawal request for funded profits
- Scaling plan to larger accounts

---

## PAMM / MAM Investing (`/dashboard/pamm`)
- Browse fund managers with verified track records
- See: net return, max DD, Sharpe, fees, minimum investment
- Invest by selecting amount and confirming fees
- Track current value, returns, and fees paid
- Request redemption with settlement timeline
- Monthly PDF statements auto-generated

---

## Algorithmic Trading

### RAPTOR Script IDE (`/dashboard/script-ide`)
Write and test your own trading strategies:
- TypeScript-native scripting language
- Full autocomplete for all RAPTOR APIs
- Lifecycle hooks: onInit, onTick, onBar, onOrder, onPosition, onDeinit
- Built-in code snippets for common patterns
- Deploy to live, demo, or paper trading

### Backtest Engine
- Test against historical data with real spreads and swaps
- 20+ performance metrics
- Monthly returns breakdown
- Equity curve and drawdown chart
- Export as PDF report or CSV trade list

### EA/Indicator Converter (`/converter`)
If you have MQL5 scripts from a previous platform:
1. Upload your .mq5 files (drag and drop, up to 50 at once)
2. RAPTOR automatically converts to native format
3. Review side-by-side comparison
4. Check confidence score and risk flags
5. Deploy with one click

### Marketplace (`/marketplace/hub`)
- Browse EAs, indicators, and scripts from other traders
- Signal provider marketplace with verified performance
- Plugin and extension marketplace
- Free, paid, subscription, and revenue-share options
- Reviews and ratings from live users

---

## Finance Portal (`/dashboard/finance`)

### Deposits
- Card (Visa/Mastercard), bank wire, crypto (BTC, ETH, USDT)
- Local methods based on your country
- Deposit history with status tracking

### Withdrawals
- Request withdrawal to your preferred method
- Track status: pending → processing → completed
- Estimated processing time shown

### Statements
- Full transaction history: trades, deposits, withdrawals, swaps, commissions
- Export as CSV or PDF
- Annual tax summary with country-specific formats

### Internal Transfers
- Transfer between your own accounts (live, demo, prop)
- Currency conversion at live rates

---

## Smart Alerts (`/dashboard/smart-alerts`)
Set alerts that notify you across multiple channels:
- **Price alerts:** Above/below a specific price
- **Indicator alerts:** RSI overbought, MACD cross, Bollinger Band breach
- **Pattern alerts:** AI detects chart patterns on your watchlist
- **Calendar alerts:** Notify before economic events
- **Position alerts:** P&L threshold or margin level warning
- **News sentiment alerts:** Significant news for your instruments

**Delivery:** In-app, push notification, email, SMS, Telegram, Discord, webhook

---

## RAPTOR Academy (`/dashboard/academy`)
Learn to trade with structured education:
- Courses from beginner to professional
- **XP system:** Earn XP for completing lessons, quizzes, and trades
- **Levels:** Progress from Level 1 to Level 100
- **Badges:** 100+ achievement badges (first trade, 100-trade streak, profitable month)
- **Streaks:** Daily login streak tracking
- Video library with bookmarks and progress
- Live webinars with registration
- **AI Tutor:** Ask NEXUS any trading question
- Paper trading mode: practice with virtual money

---

## NEXUS — Your AI Trading Companion (`/dashboard/nexus`)

NEXUS is always available via the pulsing orb in the bottom-right corner of every page.

### What NEXUS Does
- **Pre-trade analysis:** When you're about to place a trade, NEXUS analyzes the setup, checks your positions, assesses margin impact, reviews market context, and gives a verdict
- **Live monitoring:** While your trades are open, NEXUS watches for divergences, approaching levels, and sentiment shifts
- **Entry/exit signals:** NEXUS identifies high-probability setups on your watchlist (always with mandatory disclaimer)
- **Psychology coaching:** Detects overtrading, revenge trading, FOMO, and early profit-taking patterns
- **Weekly report:** Every Sunday, a personalized performance review with specific improvement suggestions

### How to Use NEXUS
- **Click the orb** to open the NEXUS sidebar
- **Type any question:** "Why did GBPUSD drop?" or "Give me 3 setups on EUR/USD"
- **Quick actions:** Trade Ideas, Analyze Position, SL/TP Suggestion, Market Briefing, Pre-trade Check, Review Last Trade
- **Insights tab:** View personalized insights about your trading patterns
- **Report tab:** Read your weekly performance report

### Important Notes
- NEXUS provides analysis, NOT financial advice
- All signals include mandatory disclaimers — you must acknowledge before viewing
- High-risk trades require explicit "I understand the risk" confirmation
- NEXUS can be snoozed (15m/1h/4h) but cannot be permanently silenced (safety feature)
- NEXUS remembers your trading style, risk tolerance, and rules to personalize advice

---

## Responsible Trading
Your wellbeing matters. These tools are available in your settings:
- **Deposit limits:** Set daily, weekly, or monthly caps
- **Loss limits:** Set daily or weekly loss limits (binding for 24 hours)
- **Session time limits:** Get notified after X hours of trading
- **Reality check:** Periodic popup showing time spent and P&L
- **Cooling-off:** Temporarily exclude yourself (24h, 7d, 30d, or permanent)
- **Self-exclusion:** Immediate, funds returned
- **Help resources:** Links to GamCare, BeGambleAware, and national support services

If NEXUS detects distress signals, it will proactively reach out with supportive messages and resources.

---

## Account Settings (`/dashboard/settings`)
- Personal information and password
- Two-factor authentication (SMS, authenticator app, security key)
- Notification preferences per channel
- Trading preferences (default lot size, confirmation settings)
- Trusted devices
- Push notification settings with quiet hours

---

## Need Help?
- **NEXUS:** Ask any platform-related question
- **Support tickets:** Submit via `/dashboard/support`
- **Live chat:** Available 24/7
- **Help center:** Searchable knowledge base
- **Email:** Contact your broker's support team directly
