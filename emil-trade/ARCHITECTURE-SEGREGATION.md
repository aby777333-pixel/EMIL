# GIO RAPTOR — B2B / B2C Architecture Segregation

## Enforcement Layers

Access control is enforced at 3 independent layers. If ANY layer denies, access is blocked.

### Layer 1: Middleware (Route-Level)
File: `src/lib/supabase/middleware.ts`

| Role | `/dashboard/*` | `/broker/*` | `/admin/*` | `/converter` | `/terminal/*` | `/marketplace/*` |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| trader | ALLOW | DENY→/dashboard | DENY→/dashboard | ALLOW | ALLOW | ALLOW |
| broker_admin | ALLOW | ALLOW | DENY→/broker | ALLOW | ALLOW | ALLOW |
| gio4x_admin | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| unknown | DENY→/login | DENY→/login | DENY→/login | DENY→/login | DENY→/login | DENY→/login |

**Fail-safe:** Unrecognized role = deny all protected routes.

### Layer 2: API Role Guard
File: `src/lib/api/role-guard.ts`

Functions:
- `requireBrokerAccess()` — only broker_admin + gio4x_admin
- `requireSuperAdmin()` — only gio4x_admin
- `requireAuthenticated()` — any logged-in user
- `enforceDataIsolation(auth, resourceUserId, resourceBrokerId)` — traders see ONLY own data

### Layer 3: Database RLS (Supabase)
Every table has Row-Level Security:
- Trader tables: `auth.uid() = user_id`
- Broker tables: `USING (true)` (middleware handles access)
- NEXUS tables: `auth.uid() = user_id`

## B2B Modules (Broker-Only)

1. Command Center — `/broker/command-center`
2. Dealing Desk — `/broker/dealing-desk`
3. Risk Engine — `/broker/command-center`
4. Price Engine — `/broker/symbols`
5. Core Engine — `/broker/core-engine`
6. CRM Pipeline — `/broker/crm`
7. Communication Hub — `/broker/comms`
8. IB Management — `/broker/ib-management`
9. Client Management — `/broker/clients`
10. KYC/AML — `/broker/kyc`
11. Compliance — `/broker/compliance`
12. RAPTOR COMPLY — `/broker/comply`
13. Payments — `/broker/payments`
14. Reconciliation — `/broker/reconciliation`
15. RAPTOR INTEL — `/broker/intel`
16. Report Builder — `/broker/bi`
17. Integration Hub — `/broker/integrations`
18. Incident Center — `/broker/incidents`
19. Security Center — `/broker/security`
20. AI Guardian — `/broker/ai-guardian`
21. White-Label — `/broker/brand`
22. Symbol Manager — `/broker/symbols`
23. Staff Management — `/broker/staff`
24. Mobile Apps — `/broker/mobile-apps`
25. RAPTOR APP — `/broker/raptor-app`
26. Migration — `/broker/connect`
27. Operations — `/broker/operations`

## B2C Modules (Trader-Only)

1. Dashboard — `/dashboard`
2. Trading Terminal — `/dashboard/terminal`
3. RAPTOR Charts — `/dashboard/raptor-charts`
4. Positions — `/dashboard/positions`
5. Orders — `/dashboard/orders`
6. Trade History — `/dashboard/history`
7. Portfolio — `/dashboard/portfolio`
8. Analytics — `/dashboard/analytics`
9. Trade Journal — `/dashboard/journal`
10. Copy Trading — `/dashboard/copy-trading-v2`
11. Social Feed — `/dashboard/social`
12. Prop Challenges — `/dashboard/prop-challenge`
13. PAMM — `/dashboard/pamm`
14. Script IDE — `/dashboard/script-ide`
15. Smart Alerts — `/dashboard/smart-alerts`
16. Finance Portal — `/dashboard/finance`
17. Wallet — `/dashboard/wallet`
18. Markets — `/dashboard/markets`
19. News — `/dashboard/news`
20. Calendar — `/dashboard/calendar`
21. RAPTOR Academy — `/dashboard/academy`
22. NEXUS AI — `/dashboard/nexus`
23. Settings — `/dashboard/settings`
24. Support — `/dashboard/support`

## Shared (Both Roles, Auth Required)

1. EA Converter — `/converter`
2. Terminal — `/terminal/*`
3. Marketplace — `/marketplace/*`

## What B2C Can NEVER See

- LP providers, LP names, LP fill rates
- Spread markup logic, spread profiles
- A/B book routing rules and decisions
- Risk engine settings, exposure limits
- Other traders' data (any field)
- Broker P&L, revenue, commission structures
- Dealing desk operations, force close logs
- CRM data, internal notes
- Staff roles, audit trail
- System health, infrastructure metrics

## NEXUS Separation

- B2C NEXUS: trade copilot, psychology coach, signals, education
- B2B NEXUS: risk alerts, growth insights, compliance warnings, deal assist
- AI intelligence NEVER crosses layers
- B2C NEXUS cannot access broker data
- B2B NEXUS cannot modify trader accounts
