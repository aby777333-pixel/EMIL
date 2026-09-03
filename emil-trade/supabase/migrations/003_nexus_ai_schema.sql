-- ═══════════════════════════════════════════════════════════
-- GIO RAPTOR — NEXUS AI Engine Core Tables
-- Superprompt Section 14: Database Schema
-- All monetary values: NUMERIC (Decimal.js on frontend)
-- ═══════════════════════════════════════════════════════════

-- Core trader risk profile
CREATE TABLE IF NOT EXISTS trader_risk_profiles (
  trader_id UUID PRIMARY KEY REFERENCES auth.users,
  behavior_type TEXT CHECK (behavior_type IN ('SCALPER','SWING','NEWS','BOT','RETAIL')),
  toxicity_score NUMERIC(5,2) DEFAULT 0,
  win_rate NUMERIC(5,2),
  ltv_estimate NUMERIC(12,2),
  churn_probability NUMERIC(5,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Trade execution log with AI decision
CREATE TABLE IF NOT EXISTS trade_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID REFERENCES auth.users,
  symbol TEXT NOT NULL,
  lot_size NUMERIC(10,4) NOT NULL,
  route TEXT CHECK (route IN ('A_BOOK','B_BOOK','HYBRID')),
  ai_win_probability NUMERIC(5,2),
  ai_confidence TEXT CHECK (ai_confidence IN ('HIGH','MEDIUM','LOW')),
  ai_reason TEXT,
  simulated_broker_pnl NUMERIC(12,2),
  dealer_override BOOLEAN DEFAULT FALSE,
  actual_outcome NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealer override audit log
CREATE TABLE IF NOT EXISTS dealer_override_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES auth.users,
  trade_id UUID REFERENCES trade_executions,
  original_route TEXT,
  override_route TEXT,
  reason TEXT,
  outcome NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time exposure tracking
CREATE TABLE IF NOT EXISTS exposure_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  net_exposure NUMERIC(18,4) NOT NULL,
  long_volume NUMERIC(18,4),
  short_volume NUMERIC(18,4),
  retail_bias NUMERIC(5,2),
  risk_level TEXT CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly events
CREATE TABLE IF NOT EXISTS anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description TEXT,
  affected_traders UUID[],
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-trade consent log (legally required)
CREATE TABLE IF NOT EXISTS auto_trade_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID REFERENCES auth.users,
  accepted_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  parameters JSONB,
  revoked_at TIMESTAMPTZ
);

-- AI inference log (for cost monitoring and audit)
CREATE TABLE IF NOT EXISTS ai_inference_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  user_id UUID REFERENCES auth.users,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ──────────────────────────────────

ALTER TABLE trader_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_override_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE exposure_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trade_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inference_log ENABLE ROW LEVEL SECURITY;

-- Traders can read only their own risk profile
CREATE POLICY "traders_own_risk_profile" ON trader_risk_profiles
  FOR SELECT USING (auth.uid() = trader_id);

-- Traders can read only their own trade executions
CREATE POLICY "traders_own_executions" ON trade_executions
  FOR SELECT USING (auth.uid() = trader_id);

-- Auto-trade consents: traders see only their own
CREATE POLICY "traders_own_consents" ON auto_trade_consents
  FOR ALL USING (auth.uid() = trader_id);

-- AI inference log: users see only their own
CREATE POLICY "users_own_inference_log" ON ai_inference_log
  FOR ALL USING (auth.uid() = user_id);

-- Broker-level tables: middleware handles access (USING true)
CREATE POLICY "broker_exposure_access" ON exposure_snapshots
  FOR SELECT USING (true);

CREATE POLICY "broker_anomaly_access" ON anomaly_events
  FOR SELECT USING (true);

CREATE POLICY "broker_dealer_override_access" ON dealer_override_log
  FOR SELECT USING (true);

-- ─── Indexes for performance ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trade_executions_trader ON trade_executions(trader_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON trade_executions(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_executions_created ON trade_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exposure_snapshots_symbol ON exposure_snapshots(symbol, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_trade_consents_trader ON auto_trade_consents(trader_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_ai_inference_log_feature ON ai_inference_log(feature, created_at DESC);
