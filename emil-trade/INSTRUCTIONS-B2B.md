# GIO RAPTOR — B2B Broker Admin Guide

## Getting Started

### Accessing the Broker Admin Panel
1. Navigate to `/broker/overview` after logging in with an admin account
2. The sidebar provides access to all broker modules
3. Your role determines which sections are visible (configured by Super Admin)

---

## Command Center (`/broker/command-center`)
Your real-time operations dashboard. Monitor all critical KPIs at a glance:
- **Top row:** Active clients, AUM, today's P&L, net exposure, live volume
- **Second row:** Pending withdrawals, failed KYC, margin call alerts, API latency, bridge status
- **Revenue waterfall:** Daily breakdown by spread, commission, swap, fees
- **Exposure monitor:** Net long/short per symbol with VaR and risk bars
- **Toxic flow alerts:** AI-detected suspicious trading patterns with investigate/resolve actions
- **A/B book routing:** Current distribution, rule toggles, recent routing decisions

## Client Management (`/broker/crm`)
Manage your entire client lifecycle:
- **Kanban pipeline:** Drag cards between stages (Lead → Contacted → Demo → Documents → Live → Active → VIP)
- **List view:** Sortable table with all client fields
- **Each card shows:** Name, tags, deposits, SLA timer, KYC status, risk category, AI-suggested next action
- Click any card to open the 360-degree client profile

## Communication Hub (`/broker/comms`)
Unified inbox across all channels:
- **Left panel:** Thread list with channel icons, sentiment dots, unread badges, SLA timers
- **Right panel:** Full conversation with reply composer
- **Internal notes:** Toggle the Eye icon to write notes only staff can see
- **AI Draft:** Click the sparkle icon for NEXUS to draft a response in your brand voice
- Threads can be resolved, tagged, and assigned to agents

## Risk Management (`/broker/command-center` + `/broker/risk`)
- **Exposure monitor:** Real-time net exposure per symbol with % of capital and VaR
- **Sort by:** Exposure amount, VaR, or client count
- **Color coding:** Green (<5%), Blue (<15%), Amber (<25%), Red (>25% of capital)

## A/B Book Routing (`/broker/command-center`)
- Toggle individual routing rules on/off
- See distribution bar: A-Book (green) / B-Book (red) / Hybrid (amber)
- View recent routing decisions with rule attribution
- Override any trade manually from the dealing desk

## Toxic Flow Detection (`/broker/command-center`)
- AI monitors for: latency arbitrage, news scalping, reverse trading, VPN use, coordinated accounts
- Each alert shows: severity, client name, description, evidence
- Actions: Investigate, Resolve, Dismiss

## Dealing Desk (`/broker/dealing-desk`)
Your institutional trading operations center:
- **Positions tab:** All open positions across all clients with force-close and modify buttons
- **Order Flow tab:** Live order stream with reject and requote actions for pending orders
- **Dealer Log tab:** Immutable audit trail of all dealer interventions
- Search by client name or account number, filter by symbol

## Price Engine (Configured via `/broker/symbols`)
- Set spread type (fixed/variable) and markup per symbol
- Configure swap rates (long/short) per symbol
- Set leverage limits per symbol
- Define trading sessions and restricted countries
- Toggle symbols on/off with one click

## IB & Affiliate Management (`/broker/ib-management`)
- **Registry:** All IBs with tier, status, clients, volume, earned, pending payout, performance score
- **Payouts:** Approve/reject commission payouts per period
- **Network Tree:** Visual hierarchy of IB relationships (expandable, multi-level)
- **Analytics:** Top IBs by volume and ROI

## Compliance (`/broker/comply`)
- **Responsible Trading:** View NEXUS-flagged at-risk clients with recommended actions
- **Regulatory Reports:** Generate, download, and submit reports per jurisdiction
- **Deadline Calendar:** Color-coded deadlines (overdue=red, due soon=amber, upcoming=green)
- **Jurisdictions:** Configure active jurisdictions (MiFID II, EMIR, ASIC, FSCA, CySEC, FCA, BVI, Cayman)

## AI Intelligence (`/broker/ai-guardian`)
- **RAPTOR GUARDIAN tab:** Client risk scores, predictive alerts (margin call, revenge trading), churn predictions
- **RAPTOR BRAIN tab:** Model registry, usage KPIs, daily cost chart, feature-level analytics

## Business Intelligence (`/broker/intel`)
- **Executive:** 4 KPI sparklines, conversion funnel, asset class breakdown, top clients, geographic revenue
- **Revenue:** Waterfall chart, by-instrument table, 30-day ML forecast
- **Clients:** Health distribution, activation funnel, churn factors
- **Trading:** Execution quality metrics vs benchmarks, session volume, order type breakdown

## Security Center (`/broker/security`)
6 tabs covering your entire security posture:
- **Overview:** Security score gauge, threat stats, WAF/encryption/TLS status, certifications, pen test tracker
- **Authentication:** Token config, 2FA settings, password policy, FIDO2/SAML status
- **Encryption:** At-rest (AES-256), in-transit (TLS 1.3), field-level, key rotation schedule
- **Network:** WAF rules, security headers, rate limit rules
- **Audit Log:** Immutable append-only log with outcome badges
- **Compliance:** PCI-DSS, SOC 2, ISO 27001 certification cards

## Integration Hub (`/broker/integrations`)
- **All Integrations:** 22 connectors across 10 categories with connect/configure buttons
- **LP Monitor:** Fill rate, slippage, latency, uptime per LP
- **API & Webhooks:** Manage API keys, webhook endpoints, and view delivery logs

## Incident Response (`/broker/incidents`)
- **Incidents tab:** Active and resolved incidents with severity-based sorting, expandable timelines, root cause tracking
- **Playbooks tab:** 7+ pre-configured incident playbooks with drill mode
- **System Health tab:** Per-service status, operational alerts with ACK flow, maintenance windows

## Mobile Apps (`/broker/mobile-apps`)
Configure branded iOS and Android apps:
- Platform toggle (iOS/Android) with status badge
- **Preview:** Live phone mockup that updates with your colors
- **Config:** App name, bundle ID, colors, security settings
- **Features:** 14 toggleable feature flags
- **Submissions:** App Store submission history with status tracking

## White-Label Brand Studio (`/broker/brand`)
- **Colors:** 5 palette slots with color picker and hex input
- **Typography:** Select from fonts for heading, body, and mono
- **Domain:** Custom domain, SMTP, meta title/description
- **Live Preview:** See your brand applied to a UI mockup (desktop/mobile toggle, dark/light toggle)

## Staff Management (`/broker/staff`)
- **Staff Members:** List with role, online status, actions today, last login
- **Roles & Permissions:** 6+ pre-built roles with customizable permission matrix
- **Audit Log:** Every staff action logged with timestamp, IP, and details

## Report Builder (`/broker/bi`)
- Choose data source (clients, trades, revenue, payments, IB, compliance)
- Select columns and chart type (line, bar, pie, heatmap, funnel, table)
- Configure sort and date range
- Save reports for reuse
- Schedule automated delivery (email PDF/Excel)
- Export in PDF, XLSX, CSV

## Broker Onboarding (`/broker/operations`)
12-step wizard for new broker setup:
1. Entity details → 2. Brand kit → 3. Domain → 4. LP connections → 5. Symbols → 6. Account groups → 7. Payments → 8. KYC → 9. Staff → 10. Compliance → 11. NEXUS → 12. Go-live checklist

## Multi-Entity Management (`/broker/operations`)
For broker groups with multiple brands:
- Consolidated view across all entities
- Per-entity KPIs: clients, AUM, revenue, P&L
- Side-by-side entity comparison

## Core Engine (`/broker/core-engine`)
Monitor your RAPTOR matching engine:
- 8 execution KPIs (orders/sec, avg/p99 latency, fill rate, slippage, price improvement)
- All 23 supported order types listed
- Position modes and operations
- Migration bridges: MT5/cTrader → RAPTOR with progress bars and cutover button

## Platform Migration (`/broker/connect`)
- Per-platform migration dashboard with 7-phase progress
- Per-client migration status table (accounts, history, positions, email sent)
- Third-party terminal connections (FIX, REST, WebSocket)

---

## NEXUS (AI) — Available Everywhere
NEXUS is integrated across all broker modules. Look for the NEXUS orb (pulsing purple/blue) or sparkle icons throughout the interface. NEXUS provides:
- Risk advice on the dealing desk
- Routing recommendations
- Churn predictions in CRM
- Email drafting in communications
- Regulatory alerts in compliance
- Incident classification and playbook selection
- Natural language querying of any business metric

All NEXUS outputs include mandatory disclaimers and pass through content safety guardrails.
