# GIO RAPTOR — Complete Feature List

## Platform Overview

GIO RAPTOR is an institutional-grade, AI-native, white-label brokerage platform.
Complete Broker-in-a-Box serving two tiers:
- **TIER 1 (B2B):** Brokerages, prop firms, hedge funds, family offices, banks
- **TIER 2 (B2C):** Retail traders, professional traders, algo traders, copy traders

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Supabase (PostgreSQL + RLS), TailwindCSS 4, Framer Motion, Zustand, TanStack Query, TradingView Charting Library

**Build:** 122 pages, 285 source files, 22 type definitions, 90+ database tables

---

## B2C FEATURES (TRADER-FACING)

### Trading Terminal
- Full TradingView charting with 155+ indicators
- 15 chart types: Candlestick, OHLC, Heikin Ashi, Renko, P&F, Kagi, Line Break, Range, Tick, Volume, Footprint, Delta, Cumulative Delta, Bid/Ask Split, Spread
- 30+ timeframes from tick to yearly
- Multi-chart layouts: 1, 2, 4, 6, 9 panels with detachable windows
- 50+ drawing tools: Fibonacci (7 types), Gann (5), Geometric (6), Shapes (5), Pattern templates (5), Text (4), Measurement (4), Elliott Wave (2), Harmonic (5)
- 23 order types: Market, Limit, Stop, Stop-Limit, Trailing, OCO, OTO, OCA, Basket, Iceberg, TWAP, VWAP, Scale-In/Out, Conditional, Time, News, Range + 5 time-in-force modes
- Position management: partial close, add, modify, flip, split, merge
- Real-time P&L with live equity tracking
- One-click trading with confirmation toggle
- On-chart order placement (drag SL/TP)
- Depth of Market (DOM) ladder with hotkey trading
- Watchlist with live prices
- Session highlighting (London, NY, Tokyo, Sydney)
- Bar replay for historical analysis
- Economic calendar integration with event markers on chart

### 8 RAPTOR-Exclusive Indicators
- RAPTOR PULSE: Multi-factor trend strength (0-100)
- RAPTOR MOMENTUM WAVE: Volatility-adjusted momentum
- RAPTOR LIQUIDITY MAP: Institutional order zone detection
- RAPTOR SMART MONEY: Accumulation/distribution detection
- RAPTOR FLOW: Real-time order flow imbalance
- RAPTOR REGIME: Market regime classification
- RAPTOR SENTIMENT BAR: Social + news sentiment overlay
- RAPTOR SIGNAL: Combined indicator confluence score

### 5 NEXUS AI Chart Overlays
- NEXUS Zones: AI-identified support/resistance (updates 4H)
- NEXUS Patterns: 55+ pattern detection in real-time
- NEXUS Divergence: Automatic RSI/MACD divergence detection
- NEXUS Entry: AI-suggested entry zone highlights
- NEXUS Exit: AI-suggested exit zone highlights

### Portfolio & Analytics
- Equity curve visualization with drawdown shading
- Performance metrics: Win rate, profit factor, Sharpe, Sortino, Calmar, expectancy, recovery factor
- Monthly returns calendar heatmap (green/red)
- Trade distribution: by symbol, hour of day, day of week
- Win/loss streak tracking
- Best/worst trade analysis
- Comparison vs benchmarks (S&P 500, Gold, BTC)
- P&L distribution histogram
- Holding time analysis

### Trade Journal
- Auto-captured trades with full details
- Manual notes per trade
- Tag system (breakout, reversal, news trade, etc.)
- Screenshot attachment
- Rule adherence self-assessment
- CSV/PDF export

### Copy Trading
- Strategy discovery with verified track records
- Provider cards: equity curve, monthly returns, Sharpe, max DD, followers
- Risk-adjusted copy: allocate % of account
- Lot sizing: proportional, fixed, equity-based
- Per-strategy max drawdown auto-stop
- Instrument filter (skip certain trades)
- Copy history and fee tracking
- Become a provider (broker approval required)

### Social Trading
- Trade sharing with P&L and chart screenshots
- Market opinion posts
- Chart idea sharing with annotations
- NEXUS insight sharing
- 5 reaction types: like, insightful, risky, agree, disagree
- Threaded comments
- Reputation scoring based on accuracy
- Leaderboards: return, win rate, consistency, prop challenge
- Leaderboard periods: weekly, monthly, quarterly, yearly
- Community forums per instrument
- Live rooms with screen sharing
- Study groups
- Trading competitions and events
- Mentor/mentee matching

### Prop Trading Challenges
- Challenge discovery: 1-phase, 2-phase, instant funding
- Progress gauges: profit target, daily loss limit, max drawdown
- Trading day counter
- Daily P&L calendar
- Real-time violation risk warnings
- Live equity curve per challenge
- Funded account portal with profit split calculator
- Scaling plan progression

### PAMM / MAM Investing
- Fund discovery with verified manager track records
- Performance: net return, max DD, Sharpe, fee structure
- Invest/redeem with settlement timeline
- Monthly PDF statements
- Automatic reinvestment option

### Algorithmic Trading
- RAPTOR SCRIPT IDE: TypeScript-native scripting
- Full IntelliSense autocomplete for RAPTOR Script API
- Lifecycle hooks: onInit, onTick, onBar, onOrder, onPosition, onDeinit
- 6 built-in code snippets
- Parameter editor without redeployment
- Strategy scheduler (run during specific sessions)
- Conflict detection between running scripts
- Backtest engine: tick-level simulation with real spread/swap/slippage
- 20+ backtest metrics (Sharpe, Sortino, Calmar, Ulcer Index, MAE/MFE)
- Monthly returns table
- Equity curve and drawdown chart
- Parameter optimization (grid search, Monte Carlo, walk-forward)
- Paper trading / forward test sandbox
- PDF/CSV backtest export

### EA/Indicator Converter
- MQL5 file upload (drag-and-drop, up to 50 files per batch)
- Full MQL5 lexer + parser + AST builder
- 5-stage conversion pipeline: Parse, Analyze, Convert, Test, Deploy
- Semantic analysis: detect trading logic, risk flags, indicator buffers
- Code generation: TypeScript class, Pine Script, Zod schema, React config panel, test scaffold
- Side-by-side diff view (original vs converted)
- Confidence score (0-100%) per file
- Risk flag detection (no SL, martingale, grid without limits)
- One-click deployment to live/demo/paper

### No-Code Strategy Builder
- Visual drag-and-drop logic builder
- Condition blocks (price, indicator, time)
- Action blocks (buy, sell, close, alert)
- Risk blocks (SL/TP, trailing stop, position size)
- Instant backtest on chart
- One-click deploy to live/paper

### Finance Portal
- Deposits: card, bank wire, crypto (BTC/ETH/USDT), local methods (UPI, FPX, PromptPay, iDEAL, Sofort)
- Withdrawal management with status tracking
- Account statements (trade, deposit, withdrawal, swap, commission)
- Internal transfers between own accounts
- Tax summary: annual P&L, country-specific formats (US 1099-B, UK CGT, EU, AU, IN)
- CSV/PDF export

### Smart Alerts
- 6 alert types: price, indicator, pattern detection, economic calendar, position P&L, news sentiment
- 6 delivery channels: in-app, push, email, SMS, Telegram, Discord, webhook
- Alert creation with condition builder
- Active/inactive toggle
- Triggered count and history

### Education Hub (RAPTOR Academy)
- Structured courses: beginner to professional
- XP system with levels (1-100)
- Streak tracking
- Badge system (100+ achievement badges)
- Quiz system with unlock progression
- Video library with progress tracking
- Live webinar schedule and registration
- AI Tutor: ask any trading question
- Paper trading mode (full terminal, no risk)

### NEXUS AI Companion (Trader-Facing)
- Always-on sidebar with context awareness
- Trade co-pilot: 10-point pre-trade analysis
- SL/TP suggestions based on ATR and structure
- Live position monitoring with alerts
- Entry/exit signal system with mandatory disclaimers
- Psychology coaching: overtrading, revenge trading, FOMO, loss aversion detection
- Weekly performance report (auto-generated every Sunday)
- Personalized insights: timing, instrument fit, risk patterns
- Custom memory: trading style, risk tolerance, rules
- Voice mode (text-to-speech responses)
- Morning brief / evening debrief via push notification
- Crisis support with professional resource links

### Responsible Trading Tools
- Self-set deposit limits (daily/weekly/monthly)
- Self-set loss limits (binding 24h)
- Session time limits
- Reality check popups
- Cooling-off periods (24h/7d/30d/permanent)
- Self-exclusion (immediate, funds returned)
- Problem gambling resource links

### Loyalty & Gamification
- XP system: earn for trades, education, community, referrals
- 6 tiers: Rookie, Trader, Pro, Expert, Elite, Legend
- Tier benefits: spread discounts, priority support, VIP events
- 100+ achievement badges
- Weekly/monthly trading challenges
- Referral rewards

---

## B2B FEATURES (BROKER-FACING)

### Command Center Dashboard
- 10 real-time KPIs: clients, AUM, P&L, exposure, volume, withdrawals, KYC, margin calls, latency, bridge status
- Revenue waterfall chart (spread/commission/swap/fees)
- Exposure monitor per symbol with VaR (95%/99%), CVaR
- Conversion funnel: leads to VIP
- Geographic revenue heatmap
- Top/bottom client ranking
- Asset class revenue breakdown

### Client Management (RAPTOR CRM)
- Lead capture: web forms, API, CSV import
- Lead scoring (0-100) with real-time updates
- Lead routing: round-robin, geography, language, expertise
- Nurture sequences (email + SMS + WhatsApp drips)
- UTM tracking (full source-to-conversion chain)
- 360-degree client profile: personal, KYC, risk, financial, trading, IB chain, compliance, tags
- CRM pipeline: configurable stages (Kanban + List + Table views)
- Drag-and-drop stage movement with automation triggers
- SLA timers per stage
- Task management: call, email, follow-up, meeting scheduling
- Activity timeline
- Bulk operations (mass email, stage change, tag)

### Communication Hub (RAPTOR COMMS)
- Unified inbox: email, SMS, WhatsApp, in-app chat, Telegram, calls
- Thread view with full conversation history
- Internal notes (never visible to client)
- AI-drafted reply suggestions
- Canned response templates
- Sentiment indicator per thread
- SLA timer with urgency coloring
- Email marketing suite: drag-and-drop editor, 50+ templates, A/B testing, personalization tokens, scheduling, analytics
- Multi-language campaign generation (20+ languages)
- Deliverability management (SPF/DKIM/DMARC)

### Risk Management Engine
- Real-time net exposure per symbol/sector/currency/client group
- Exposure as % of broker capital
- VaR (1-day, 5-day at 95% and 99% confidence)
- A/B book routing engine with rule configurator
- Routing rules by: client risk score, trade size, symbol, time of day
- Hybrid routing (partial A/B)
- Manual A/B override per client or trade
- Full routing decision audit log
- Margin call queue with automated workflow
- Stop-out queue with cascade prevention
- Negative balance protection enforcement

### Toxic Flow Detection (AI-Powered)
- Latency arbitrage detection
- News scalping detection
- Reverse trading detection
- VPN/proxy/data center IP flagging
- Coordinated account detection
- Behavior deviation analysis
- Auto-flagging with evidence package

### AI Risk Intelligence (RAPTOR GUARDIAN)
- Client risk scoring (0-100) with 6 dimensions
- Risk band classification: Conservative to Abusive
- Trajectory tracking (improving/stable/deteriorating)
- Predictive risk alerts: margin call prediction (72h), stop-out prediction, revenge trading detection
- Churn prediction engine (14 days advance warning)
- Lifetime value prediction
- Fraud detection: bonus abuse, multi-accounting, wash trading, payment fraud

### Finance & Treasury
- Pending deposit/withdrawal review and approval
- Withdrawal queue with prioritization
- Chargeback management
- PSP reconciliation
- Revenue analytics: by type, symbol, client tier, IB, time period
- Broker P&L dashboard
- EBITDA dashboard
- Cost analysis
- IB commission engine: per-lot, per-pip, % spread, CPA, RevShare, hybrid
- Multi-tier IB structure (unlimited depth)
- Commission accrual and payout generation
- IB performance scorecard
- Double-entry ledger
- Daily reconciliation report
- Month-end closing workflow

### Dealing Desk (RAPTOR DESK)
- Real-time position monitor (all clients, all symbols)
- Net position per symbol across all clients
- Dealer override: modify any position's SL/TP/lot
- Force close with confirmation + reason (logged)
- Order flow monitor with live order stream
- Order intervention: reject, requote, partial fill
- Mass cancel for emergency
- Internal dealer chat and client messaging

### Price Engine (RAPTOR PRICE)
- LP price aggregation from multiple sources
- Mid-price calculation (volume-weighted)
- Spread constructor: base + markup (fixed or %)
- Named spread profiles (ECN Raw, Standard, VIP, Islamic)
- Per-symbol spread override in real-time
- Scheduled spread events (news widening with auto-revert)
- Volatility-linked spread adjustment
- Session-based spread rules
- Minimum/maximum spread caps
- Swap rate configuration per symbol
- Commission layers
- Price distribution: WebSocket, FIX, REST API
- Stale quote detection
- Price latency monitoring

### Symbol & Market Configuration
- Full instrument library (FX, indices, commodities, crypto, stocks)
- Per-symbol overrides: spread, swap, leverage, margin, sessions
- Account-group specific settings
- Contract size, pip value, lot step configuration
- Session trading hours with holiday calendar
- Symbol availability by country, account tier, KYC level

### Compliance Suite (RAPTOR COMPLY)
- KYC/AML document review queue
- AI document verification with confidence scores
- PEP/Sanctions screening
- Risk scoring per client
- Enhanced Due Diligence workflow
- Transaction monitoring with ML anomaly detection
- SAR/STR auto-drafting with evidence package
- Regulatory reporting: MiFID II, EMIR, ASIC, FSCA, CySEC, FCA, BVI, Cayman
- Filing deadline calendar with countdown alerts
- Responsible trading compliance dashboard
- At-risk client detection and intervention

### White-Label Management
- Brand Studio: logo, colors (5 palette slots), fonts (heading/body/mono), custom CSS
- Live preview (desktop/mobile, dark/light)
- Custom domain mapping with auto-SSL
- Custom SMTP configuration
- Meta title/description
- Legal document generator (T&Cs, Risk Disclosure, Privacy Policy)
- Version-controlled legal documents

### Staff & Role Management
- 10+ pre-built roles (Super Admin, Compliance, Risk, Finance, Sales, Support, Marketing, IB Manager, Analyst + custom)
- Granular permission matrix (35+ permissions)
- Staff activity monitoring
- Every admin action logged (who, what, when, where)
- Two-person approval rule for sensitive actions
- Staff performance metrics

### IB & Affiliate Management
- IB portal: dashboard, referral tracker, commission breakdown, sub-IB tree
- Marketing assets and tracking links
- Custom landing pages per IB
- IB approval workflow
- IB P&L analysis (ROI per IB)
- At-risk IB alerts
- Commission dispute resolution
- Tax documentation generation

### Business Intelligence (RAPTOR INTEL)
- Executive dashboard with sparkline KPIs
- Revenue waterfall and ML-based 30-day forecast
- Revenue by instrument, IB, asset class, seasonality
- Client cohort analysis (30/60/90/180 day retention)
- Churn factor analysis
- Activation funnel tracking
- Client health distribution
- Dormancy analysis
- Trading analytics: volume, instrument ranking, order types, session analysis
- Execution quality dashboard (fill rate, slippage, requotes vs benchmarks)
- Custom report builder (drag-and-drop, 6 chart types, scheduled delivery)

### Incident Response Center
- 9 pre-defined incident playbooks (flash crash, LP loss, mass margin call, cyber breach, regulatory, PSP outage, AML, social crisis, key person risk)
- Active/resolved incident tracking with severity/status
- Expandable timeline per incident (auto-actions, comments, escalations)
- Root cause and prevention tracking
- Drill mode for team testing
- System health monitor: per-service status, latency, CPU, memory, errors
- Operational alerts with ACK flow and runbook links
- Maintenance window scheduler with alert suppression

### Integration Hub
- 22+ pre-built connectors across 10 categories
- Platform bridges: MT5, cTrader, RAPTOR Native
- Liquidity providers: LMAX, PrimeXM, Integral, Finalto, IS Prime + custom FIX
- LP performance monitor: fill rate, slippage, latency, uptime, rejects
- Smart order routing: best price, best fill, latency-optimal, hybrid
- FIX protocol gateway (4.2, 4.4, 5.0, 5.0 SP2)
- PSP connectors: Stripe, Nuvei, Checkout.com, B2BinPay + 10 more
- KYC providers: Sumsub, Onfido, Refinitiv, Chainalysis + 4 more
- Communication: Twilio, SendGrid, Firebase, Telegram, Discord, Slack
- Analytics: Segment, Mixpanel, GA4, Meta CAPI
- Data: Trading Economics, CoinGecko, Alpha Vantage
- Enterprise: Salesforce, HubSpot, QuickBooks, SAP
- API key management with rate limits
- Webhook system with 14 event types, retry logic, delivery log

### Mobile App Manager
- iOS + Android app configuration
- Live phone mockup preview
- App identity (name, bundle ID, version)
- Color customization
- Security settings (biometric, PIN, auto-lock)
- Feature flags (14 toggleable features)
- App Store submission tracker
- Apple Watch / WearOS configuration
- Home screen widget configuration
- Live Activities (iOS Dynamic Island)

### RAPTOR Marketplace
- EA & Indicator marketplace: categories, performance badges, pricing tiers
- Signal provider marketplace: verified track records, equity curves, risk ratings
- Plugin & extension marketplace: 9 categories, install tracking
- Developer portal
- Review and rating system
- Performance verification badges

### Core Engine (RAPTOR CORE)
- 23 native order types with full lifecycle management
- 3 position modes: netting, hedging, portfolio
- 9 position operations
- Sub-millisecond order processing
- Atomic operations (ACID)
- Price improvement pass-through
- Execution metrics dashboard

### Platform Migration (RAPTOR CONNECT)
- MT5 full migration: accounts, positions, history, EA scripts
- cTrader migration with cBot conversion
- 7-phase migration process with progress tracking
- Per-client migration status
- Zero-downtime gradual traffic shift
- Auto-generated migration client emails
- Third-party terminal support (FIX, REST, WebSocket)

### Security Center
- JWT + refresh token rotation
- OAuth 2.0 (Google, Microsoft, Apple)
- SAML 2.0 for enterprise SSO
- FIDO2/WebAuthn hardware key support
- 2FA enforcement (SMS, TOTP, FIDO2)
- AES-256 encryption at rest
- TLS 1.3 minimum
- Field-level encryption + tokenization
- 90-day automated key rotation
- Cloudflare Enterprise WAF (10 Tbps DDoS)
- Rate limiting per endpoint/user/IP
- Security headers (HSTS, CSP, X-Frame-Options)
- Immutable audit log (7-year retention)
- Compliance certifications: PCI-DSS Level 1, SOC 2 Type II, ISO 27001
- Penetration test tracker
- Security score dashboard

### Operations
- 12-step broker onboarding wizard with go-live checklist
- Multi-entity management (consolidated reporting, cross-entity operations)
- Islamic finance module (swap-free accounts, Shariah compliance)
- Loyalty engine configuration
- Tax center: annual summaries, country-specific formats, bulk export

### NEXUS AI (Broker-Facing)
- RAPTOR BRAIN: model registry, cost monitoring, A/B testing
- RAPTOR SENTINEL: market sentiment, pattern detection, regime analysis, price forecasts
- RAPTOR GUARDIAN: client risk scoring, predictive alerts, toxic flow, fraud detection
- RAPTOR GROWTH: churn prediction, LTV prediction, lead scoring, campaign optimization
- RAPTOR COMPLY: regulatory change monitor, AML scoring, SAR auto-drafting
- RAPTOR CARE: 24/7 AI support chatbot, internal AI assistant
- NEXUS integration across all 18 modules with module-specific system prompts
- Content guardrails: blocked patterns, language softening, disclaimer triggers
- Rate limiting per user per broker tenant

---

## INFRASTRUCTURE & QUALITY

### Database
- 90+ Supabase tables with Row-Level Security
- Traders see only their own data (enforced at DB layer)
- Brokers see only their tenancy data
- Immutable audit logs

### API
- RFC 7807 Problem Details error responses
- Zod validation on all inputs
- Idempotency keys on financial mutations
- 15 API routes

### Frontend Quality
- TypeScript strict mode (no `any`)
- Skeleton loading states (not spinners)
- Error states with retry actions
- All P&L color-coded consistently (green/red)
- All dates timezone-aware
- All currency locale-formatted
- All animations respect prefers-reduced-motion
- SEO metadata + JSON-LD structured data
- Dark theme default

### Design System
- Brand colors: #00b4ff (electric blue), #00dc82 (signal green), #f59e0b (gold)
- Alert colors: #ef4444 (red), #ff6b35 (orange), #8b5cf6 (violet/AI)
- Background: #0a0c10 (deep black), #0d1117 (panels)
- Glassmorphism on modals/sidebars
- Framer Motion animations (60fps, purpose-driven)
- Lucide React icons
