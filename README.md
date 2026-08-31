# EMIL Control Cockpit

Evolutionary Market Intelligence Layer — the trader's best buddy. Multi-agent trading
intelligence cockpit (Next.js 14 + Prisma + NextAuth) covering forex, metals, indices,
energies, crypto, stocks **and the Indian market (NSE / BSE / MCX)**.

- Product: https://emil.abacusai.app/
- Database: Supabase project `jnjxudsjyrftehwwdufs` (schema + seed already applied)

## India Market API Hub (`/api-hub`)

- **AI signals (primary)**: [DalalAI Developer API](https://dalalai.com/developer-api)
  — single `X-API-Key` key, endpoints for daily AI predictions, convergence scores,
  smart-money/institutional flow, FII/DII flows, insider trading, fundamentals,
  delivery volume, earnings calendar, market-regime detection and a breakout scanner
  over 500+ NSE stocks.
- **Market data (alternate)**: [IndianAPI.in Indian Stock Market API](https://indianapi.in/indian-stock-market)
  — stock details, trending, NSE/BSE most active, price shockers, 52-week high/low,
  MCX commodities, mutual funds, historical data and forecasts.
  Save either key on the API Hub page; live previews and the `/api/india/market`
  proxy start working immediately (keys never reach the browser).
- **Execution (broker APIs)**: Zerodha Kite Connect, Upstox v2, Angel One SmartAPI,
  DhanHQ v2, Fyers v3, ICICI Breeze — credential storage, connection tests, and a
  primary-execution selector. Orders stay disabled until a broker is connected AND
  EMIL is armed.
- **Normalization**: 17 seeded Indian instruments (NIFTY50, BANKNIFTY, FINNIFTY, SENSEX,
  8 NSE equities, 5 MCX commodities) with lot sizes, tick sizes, price bands, INR quoting.
- **Sessions & holidays**: IST session clocks for NSE/BSE equity + derivatives and the MCX
  evening session; fixed-date national holidays seeded (sync lunar-calendar holidays from
  the exchange calendar).
- **Risk law unchanged**: Indian exposure counts toward the same aggregate cap; if one
  exchange lot exceeds permitted monetary risk, the trade is rejected — never rounded up.

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env   # paste the Supabase DB password into DATABASE_URL
npx prisma generate
npx prisma db push     # no-op if schema already applied
npx prisma db seed     # full demo seed (idempotent)
npm run dev
```

`scripts/emit-seed-sql.ts` regenerates the SQL used to bootstrap Supabase through the
dashboard/MCP when no direct DATABASE_URL connection is available.

## Before going live

- Provider API credentials are stored in Postgres (`india_api_providers`) in plain text —
  encrypt at rest or move to a secrets manager before real-money use.
- Rotate the seeded test-admin login and set a strong `NEXTAUTH_SECRET`.
