-- ═══════════════════════════════════════════════════════════
-- GIO RAPTOR — CRM, IB/Affiliate, Client Portal Schema
-- Full-fledged brokerage operations tables
-- ═══════════════════════════════════════════════════════════

-- ─── CRM Pipeline ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  user_id UUID REFERENCES auth.users,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  language TEXT DEFAULT 'en',
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead','contacted','demo','documents','live','active','vip','churned')),
  source TEXT,
  campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  landing_page TEXT,
  referral_code TEXT,
  score INTEGER DEFAULT 0,
  assigned_agent UUID REFERENCES auth.users,
  assigned_agent_name TEXT,
  ai_suggested_action TEXT,
  tags TEXT[] DEFAULT '{}',
  total_deposits NUMERIC(14,2) DEFAULT 0,
  total_withdrawals NUMERIC(14,2) DEFAULT 0,
  net_pnl NUMERIC(14,2) DEFAULT 0,
  total_volume NUMERIC(18,4) DEFAULT 0,
  account_count INTEGER DEFAULT 0,
  kyc_status TEXT DEFAULT 'none',
  risk_category TEXT DEFAULT 'low',
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  sla_hours INTEGER,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#00b4ff',
  sort_order INTEGER NOT NULL,
  sla_hours INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  client_id UUID REFERENCES crm_leads(id),
  client_name TEXT,
  type TEXT DEFAULT 'follow_up' CHECK (type IN ('call','email','follow_up','document_request','account_review','meeting','custom')),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users,
  assigned_to_name TEXT,
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','overdue')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  client_id UUID,
  agent_id UUID REFERENCES auth.users,
  agent_name TEXT,
  channel TEXT CHECK (channel IN ('email','sms','whatsapp','chat','call','note','system')),
  direction TEXT CHECK (direction IN ('inbound','outbound','internal')),
  subject TEXT,
  body TEXT,
  sentiment_score NUMERIC(3,2),
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  name TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused')),
  template_html TEXT,
  segment_name TEXT,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  unsubscribe_rate NUMERIC(5,2) DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Client Notes ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users,
  author_name TEXT,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── IB / Affiliate System ───────────────────────────────

CREATE TABLE IF NOT EXISTS ib_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  broker_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  tier INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','active','suspended','terminated')),
  commission_type TEXT DEFAULT 'per_lot' CHECK (commission_type IN ('per_lot','per_pip','pct_spread','cpa','revshare','hybrid')),
  per_lot_rate NUMERIC(8,4) DEFAULT 0,
  per_pip_rate NUMERIC(8,4) DEFAULT 0,
  spread_pct NUMERIC(5,2) DEFAULT 0,
  cpa_amount NUMERIC(10,2) DEFAULT 0,
  revshare_pct NUMERIC(5,2) DEFAULT 0,
  sub_ib_split NUMERIC(5,2) DEFAULT 20,
  parent_ib_id UUID REFERENCES ib_profiles(id),
  referred_clients INTEGER DEFAULT 0,
  active_traders INTEGER DEFAULT 0,
  total_volume_lots NUMERIC(18,4) DEFAULT 0,
  total_commission_earned NUMERIC(14,2) DEFAULT 0,
  total_commission_paid NUMERIC(14,2) DEFAULT 0,
  pending_payout NUMERIC(14,2) DEFAULT 0,
  performance_score INTEGER DEFAULT 50,
  is_at_risk BOOLEAN DEFAULT false,
  at_risk_reason TEXT,
  marketing_materials JSONB DEFAULT '[]',
  referral_link TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ib_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ib_id UUID REFERENCES ib_profiles(id),
  broker_id UUID,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  period TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','disputed','adjusted')),
  method TEXT,
  client_breakdown JSONB DEFAULT '[]',
  approved_by UUID REFERENCES auth.users,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ib_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ib_id UUID REFERENCES ib_profiles(id),
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered','funded','active','churned')),
  total_volume NUMERIC(18,4) DEFAULT 0,
  total_commission NUMERIC(14,2) DEFAULT 0,
  first_deposit_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Client Portal (B2C) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  currency TEXT DEFAULT 'USD',
  balance NUMERIC(14,2) DEFAULT 0,
  locked_balance NUMERIC(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  wallet_id UUID REFERENCES client_wallets(id),
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer','commission','bonus','fee','adjustment')),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled','reversed')),
  reference TEXT,
  psp_reference TEXT,
  fee NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  approved_by UUID REFERENCES auth.users,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users NOT NULL,
  referred_id UUID REFERENCES auth.users,
  referred_email TEXT,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','registered','funded','rewarded')),
  reward_amount NUMERIC(10,2) DEFAULT 0,
  reward_paid BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  broker_id UUID,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general','technical','billing','kyc','trading','withdrawal','deposit','account','other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  assigned_to UUID REFERENCES auth.users,
  assigned_to_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  sender_name TEXT,
  sender_role TEXT DEFAULT 'client' CHECK (sender_role IN ('client','agent','system')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Comm Threads ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID,
  client_id UUID,
  client_name TEXT,
  channel TEXT CHECK (channel IN ('email','sms','whatsapp','in_app_chat','telegram','call')),
  subject TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')),
  sla_minutes_remaining INTEGER,
  tags TEXT[] DEFAULT '{}',
  assigned_agent UUID REFERENCES auth.users,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES comm_threads(id) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound','outbound','internal')),
  channel TEXT,
  sender_name TEXT,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  sentiment_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS Policies ─────────────────────────────────────────

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_messages ENABLE ROW LEVEL SECURITY;

-- Broker-level (middleware handles role check)
CREATE POLICY "broker_crm_access" ON crm_leads FOR ALL USING (true);
CREATE POLICY "broker_stages_access" ON crm_pipeline_stages FOR ALL USING (true);
CREATE POLICY "broker_tasks_access" ON crm_tasks FOR ALL USING (true);
CREATE POLICY "broker_activities_access" ON crm_activities FOR ALL USING (true);
CREATE POLICY "broker_campaigns_access" ON crm_email_campaigns FOR ALL USING (true);
CREATE POLICY "broker_notes_access" ON client_notes FOR ALL USING (true);
CREATE POLICY "broker_ib_access" ON ib_profiles FOR ALL USING (true);
CREATE POLICY "broker_payouts_access" ON ib_payouts FOR ALL USING (true);
CREATE POLICY "broker_referrals_access" ON ib_referrals FOR ALL USING (true);
CREATE POLICY "broker_comms_access" ON comm_threads FOR ALL USING (true);
CREATE POLICY "broker_comm_msgs_access" ON comm_messages FOR ALL USING (true);

-- Client-level (traders see only own data)
CREATE POLICY "client_wallet_access" ON client_wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "client_txn_access" ON client_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "client_ref_access" ON client_referrals FOR ALL USING (auth.uid() = referrer_id);
CREATE POLICY "client_ticket_access" ON support_tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "client_msg_access" ON support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);

-- ─── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_score ON crm_leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ib_profiles_status ON ib_profiles(status);
CREATE INDEX IF NOT EXISTS idx_ib_profiles_parent ON ib_profiles(parent_ib_id);
CREATE INDEX IF NOT EXISTS idx_ib_payouts_status ON ib_payouts(status);
CREATE INDEX IF NOT EXISTS idx_client_wallets_user ON client_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_client_txn_user ON client_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_txn_status ON client_transactions(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_comm_threads_resolved ON comm_threads(is_resolved, last_message_at DESC);
