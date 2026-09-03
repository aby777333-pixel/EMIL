-- ============================================================================
-- GIORAPTOR Dealing Desk Schema Migration
-- Version: 001
-- Description: Complete schema for the GIORAPTOR dealing desk system including
--              all enum types, tables, foreign keys, indexes, and RLS policies.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES (idempotent with DO blocks)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin','admin','dealer','risk_manager','support','client'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trade_status AS ENUM (
    'pending','dealer_reviewing','requoted','requote_rejected','delayed',
    'routing_lp','lp_rejected','open','force_close_pending','closed',
    'rejected','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE execution_mode AS ENUM (
    'a_book','b_book','hybrid','auto'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE direction AS ENUM ('buy','sell');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM (
    'pending','approved','rejected','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_status AS ENUM (
    'pending','approved','rejected','processing','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'exposure_breach','toxic_flow','large_withdrawal','kyc_expiry',
    'lp_rejection','margin_call','news_spike','dealer_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE book_type AS ENUM ('a_book','b_book');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_risk_category AS ENUM (
    'low','medium','high','toxic'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dealer_action_type AS ENUM (
    'accept','reject','requote','add_slippage','delay','force_close',
    'book_switch','partial_fill','lp_retry','escalate','expert_mode_execute'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 2. HELPER FUNCTION: get current user role from profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1  profiles  (extends auth.users)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role    NOT NULL DEFAULT 'client',
  full_name   text         NOT NULL DEFAULT '',
  email       text         NOT NULL DEFAULT '',
  phone       text,
  avatar_url  text,
  is_active   boolean      NOT NULL DEFAULT true,
  last_login  timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.2  symbols
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symbols (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text         NOT NULL UNIQUE,           -- e.g. EURUSD
  display_name            text         NOT NULL DEFAULT '',       -- e.g. EUR/USD
  category                text         NOT NULL DEFAULT 'forex',  -- forex, crypto, indices, commodities
  pip_size                numeric      NOT NULL DEFAULT 0.0001,
  pip_value_per_lot       numeric      NOT NULL DEFAULT 10,
  contract_size           numeric      NOT NULL DEFAULT 100000,
  margin_pct              numeric      NOT NULL DEFAULT 1.0,      -- percentage
  min_volume              numeric      NOT NULL DEFAULT 0.01,
  max_volume              numeric      NOT NULL DEFAULT 100,
  volume_step             numeric      NOT NULL DEFAULT 0.01,
  swap_long               numeric      NOT NULL DEFAULT 0,
  swap_short              numeric      NOT NULL DEFAULT 0,
  spread_typical          numeric      NOT NULL DEFAULT 0,        -- in pips
  is_active               boolean      NOT NULL DEFAULT true,
  exposure_threshold_lots numeric      NOT NULL DEFAULT 500,
  created_at              timestamptz  NOT NULL DEFAULT now(),
  updated_at              timestamptz  NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.3  clients
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            text         NOT NULL DEFAULT 'active',
  country           text,
  nationality       text,
  date_of_birth     date,
  employment        text,
  income_bracket    text,
  trading_experience text,
  risk_appetite     text,
  risk_category     client_risk_category NOT NULL DEFAULT 'low',
  toxic_score       numeric      NOT NULL DEFAULT 0 CHECK (toxic_score >= 0 AND toxic_score <= 5),
  assigned_manager  uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             text,
  kyc_completed     boolean      NOT NULL DEFAULT false,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_profile_id ON public.clients(profile_id);

-- --------------------------------------------------------------------------
-- 3.4  trading_accounts
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid         NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  account_number  text         NOT NULL UNIQUE,  -- GR-XXXXXX
  currency        text         NOT NULL DEFAULT 'USD',
  balance         numeric      NOT NULL DEFAULT 0,
  equity          numeric      NOT NULL DEFAULT 0,
  margin          numeric      NOT NULL DEFAULT 0,
  free_margin     numeric      NOT NULL DEFAULT 0,
  margin_level    numeric      NOT NULL DEFAULT 0,
  leverage        integer      NOT NULL DEFAULT 100,
  status          text         NOT NULL DEFAULT 'active',
  default_book    book_type    NOT NULL DEFAULT 'b_book',
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_client_id ON public.trading_accounts(client_id);

-- --------------------------------------------------------------------------
-- 3.5  trades
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              uuid           NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  client_id               uuid           NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  symbol_id               uuid           NOT NULL REFERENCES public.symbols(id) ON DELETE RESTRICT,
  direction               direction      NOT NULL,
  volume_lots             numeric        NOT NULL CHECK (volume_lots > 0),
  volume_filled_lots      numeric        NOT NULL DEFAULT 0,
  requested_price         numeric        NOT NULL,
  fill_price              numeric,
  requote_price           numeric,
  requote_expires_at      timestamptz,
  sl                      numeric,       -- stop loss
  tp                      numeric,       -- take profit
  status                  trade_status   NOT NULL DEFAULT 'pending',
  execution_mode          execution_mode NOT NULL DEFAULT 'auto',
  slippage_pips           numeric        NOT NULL DEFAULT 0,
  delay_seconds           numeric        NOT NULL DEFAULT 0,
  execute_after           timestamptz,
  lp_name                 text,
  lp_fill_price           numeric,
  lp_response_ms          integer,
  lp_rejection_reason     text,
  dealer_id               uuid           REFERENCES public.profiles(id) ON DELETE SET NULL,
  dealer_notes            text,
  broker_pnl              numeric        NOT NULL DEFAULT 0,
  client_pnl              numeric        NOT NULL DEFAULT 0,
  commission              numeric        NOT NULL DEFAULT 0,
  swap                    numeric        NOT NULL DEFAULT 0,
  margin_required         numeric        NOT NULL DEFAULT 0,
  open_time               timestamptz,
  close_time              timestamptz,
  price_at_close          numeric,
  toxic_flag              boolean        NOT NULL DEFAULT false,
  news_flag               boolean        NOT NULL DEFAULT false,
  ai_routing_suggestion   execution_mode,
  ai_confidence           numeric        CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  created_at              timestamptz    NOT NULL DEFAULT now(),
  updated_at              timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_status     ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_client_id  ON public.trades(client_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON public.trades(account_id);

-- --------------------------------------------------------------------------
-- 3.6  price_ticks
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_ticks (
  id            bigserial   PRIMARY KEY,
  symbol        text        NOT NULL,
  bid           numeric     NOT NULL,
  ask           numeric     NOT NULL,
  spread_pips   numeric     NOT NULL DEFAULT 0,
  tick_volume   numeric     NOT NULL DEFAULT 0,
  timestamp     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_ticks_symbol_ts ON public.price_ticks(symbol, timestamp DESC);

-- --------------------------------------------------------------------------
-- 3.7  symbol_exposure
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symbol_exposure (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id           uuid           NOT NULL UNIQUE REFERENCES public.symbols(id) ON DELETE CASCADE,
  net_lots_long       numeric        NOT NULL DEFAULT 0,
  net_lots_short      numeric        NOT NULL DEFAULT 0,
  net_exposure_lots   numeric        NOT NULL DEFAULT 0,
  gross_exposure_lots numeric        NOT NULL DEFAULT 0,
  gross_exposure_usd  numeric        NOT NULL DEFAULT 0,
  threshold_lots      numeric        NOT NULL DEFAULT 500,
  alert_triggered     boolean        NOT NULL DEFAULT false,
  alert_pct           numeric        NOT NULL DEFAULT 0,
  b_book_long         numeric        NOT NULL DEFAULT 0,
  b_book_short        numeric        NOT NULL DEFAULT 0,
  a_book_long         numeric        NOT NULL DEFAULT 0,
  a_book_short        numeric        NOT NULL DEFAULT 0,
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_symbol_exposure_symbol ON public.symbol_exposure(symbol_id);

-- --------------------------------------------------------------------------
-- 3.8  dealer_actions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealer_actions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id             uuid               NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_id              uuid               NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  action_type           dealer_action_type NOT NULL,
  previous_status       trade_status,
  new_status            trade_status,
  slippage_applied      numeric            NOT NULL DEFAULT 0,
  delay_applied         numeric            NOT NULL DEFAULT 0,
  requote_price         numeric,
  fill_price_used       numeric,
  execution_mode_used   execution_mode,
  partial_lots          numeric,
  lp_used               text,
  expert_mode           boolean            NOT NULL DEFAULT false,
  notes                 text,
  ip_address            inet,
  response_time_ms      integer,
  created_at            timestamptz        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_actions_trade_id ON public.dealer_actions(trade_id);

-- --------------------------------------------------------------------------
-- 3.9  kyc_documents
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  doc_type          text        NOT NULL,   -- passport, id_card, utility_bill, bank_statement, etc.
  file_url          text        NOT NULL,
  file_name         text        NOT NULL DEFAULT '',
  file_size         bigint      NOT NULL DEFAULT 0,
  status            kyc_status  NOT NULL DEFAULT 'pending',
  rejection_reason  text,
  reviewed_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  expires_at        date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_client_id ON public.kyc_documents(client_id);

-- --------------------------------------------------------------------------
-- 3.10  wallet_transactions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid           NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id              uuid           NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  type                    text           NOT NULL,  -- deposit, withdrawal, transfer, bonus, adjustment
  amount                  numeric        NOT NULL CHECK (amount > 0),
  currency                text           NOT NULL DEFAULT 'USD',
  status                  wallet_status  NOT NULL DEFAULT 'pending',
  payment_method          text,
  payment_reference       text,
  approved_by             uuid           REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at             timestamptz,
  rejection_reason        text,
  large_transaction_flag  boolean        NOT NULL DEFAULT false,
  notes                   text,
  created_at              timestamptz    NOT NULL DEFAULT now(),
  updated_at              timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client_id ON public.wallet_transactions(client_id);

-- --------------------------------------------------------------------------
-- 3.11  system_alerts
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            alert_type     NOT NULL,
  severity        alert_severity NOT NULL DEFAULT 'info',
  title           text           NOT NULL,
  message         text           NOT NULL DEFAULT '',
  entity_type     text,          -- trade, client, symbol, etc.
  entity_id       uuid,
  resolved        boolean        NOT NULL DEFAULT false,
  resolved_by     uuid           REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  auto_resolved   boolean        NOT NULL DEFAULT false,
  created_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_severity
  ON public.system_alerts(resolved, severity);

-- --------------------------------------------------------------------------
-- 3.12  audit_log
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  role          user_role,
  action        text        NOT NULL,
  entity_type   text,
  entity_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    inet,
  user_agent    text,
  session_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- --------------------------------------------------------------------------
-- 3.13  client_score_history
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_score_history (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  toxic_score                 numeric     NOT NULL DEFAULT 0,
  win_rate_7d                 numeric     NOT NULL DEFAULT 0,
  avg_hold_seconds            numeric     NOT NULL DEFAULT 0,
  trade_frequency_per_day     numeric     NOT NULL DEFAULT 0,
  news_trading_count          integer     NOT NULL DEFAULT 0,
  consistent_profitable_days  integer     NOT NULL DEFAULT 0,
  recommended_routing         execution_mode,
  computed_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_score_history_client_id
  ON public.client_score_history(client_id, computed_at DESC);

-- --------------------------------------------------------------------------
-- 3.14  news_events
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  symbols_affected  text[]      NOT NULL DEFAULT '{}',
  impact            text        NOT NULL DEFAULT 'low',  -- low, medium, high
  event_time        timestamptz NOT NULL,
  actual_value      text,
  forecast_value    text,
  previous_value    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_events_event_time ON public.news_events(event_time DESC);


-- ============================================================================
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply the trigger to every table that has an updated_at column
DO $$
DECLARE
  _tbl text;
BEGIN
  FOR _tbl IN
    SELECT unnest(ARRAY[
      'profiles','symbols','clients','trading_accounts','trades',
      'symbol_exposure','kyc_documents','wallet_transactions'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I; '
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      _tbl, _tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbols              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_ticks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbol_exposure      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_actions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events          ENABLE ROW LEVEL SECURITY;

-- Helper expression: staff roles
-- (used inline since Supabase RLS doesn't support stored expressions well)

-- -------------------------------------------------------------------------
-- 5.1  profiles
-- -------------------------------------------------------------------------
-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Staff can read all profiles
CREATE POLICY profiles_select_staff ON public.profiles
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

-- Users can update their own profile (non-role fields)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Staff can update any profile
CREATE POLICY profiles_update_staff ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin')
  );

-- Allow insert during signup (service role or own record)
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- -------------------------------------------------------------------------
-- 5.2  symbols  (public read, staff write)
-- -------------------------------------------------------------------------
CREATE POLICY symbols_select_all ON public.symbols
  FOR SELECT USING (true);

CREATE POLICY symbols_insert_staff ON public.symbols
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin')
  );

CREATE POLICY symbols_update_staff ON public.symbols
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin')
  );

-- -------------------------------------------------------------------------
-- 5.3  clients
-- -------------------------------------------------------------------------
CREATE POLICY clients_select_own ON public.clients
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY clients_select_staff ON public.clients
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

CREATE POLICY clients_update_staff ON public.clients
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','risk_manager','support')
  );

CREATE POLICY clients_insert_staff ON public.clients
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','support')
    OR profile_id = auth.uid()
  );

-- -------------------------------------------------------------------------
-- 5.4  trading_accounts
-- -------------------------------------------------------------------------
-- Clients see own accounts (via client -> profile)
CREATE POLICY trading_accounts_select_own ON public.trading_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = trading_accounts.client_id
        AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY trading_accounts_select_staff ON public.trading_accounts
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

CREATE POLICY trading_accounts_update_staff ON public.trading_accounts
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

CREATE POLICY trading_accounts_insert_staff ON public.trading_accounts
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','support')
  );

-- -------------------------------------------------------------------------
-- 5.5  trades
-- -------------------------------------------------------------------------
-- Clients see own trades
CREATE POLICY trades_select_own ON public.trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = trades.client_id
        AND c.profile_id = auth.uid()
    )
  );

-- Staff can see all trades
CREATE POLICY trades_select_staff ON public.trades
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

-- Dealers (and admins) can update trades (accept, requote, reject, etc.)
CREATE POLICY trades_update_dealer ON public.trades
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager')
  );

-- System / staff can insert trades
CREATE POLICY trades_insert ON public.trades
  FOR INSERT WITH CHECK (true);  -- Trades created via API / service role

-- -------------------------------------------------------------------------
-- 5.6  price_ticks  (public read for realtime, insert via service role)
-- -------------------------------------------------------------------------
CREATE POLICY price_ticks_select_all ON public.price_ticks
  FOR SELECT USING (true);

CREATE POLICY price_ticks_insert ON public.price_ticks
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','dealer')
  );

-- -------------------------------------------------------------------------
-- 5.7  symbol_exposure  (staff only)
-- -------------------------------------------------------------------------
CREATE POLICY symbol_exposure_select_staff ON public.symbol_exposure
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager')
  );

CREATE POLICY symbol_exposure_modify_staff ON public.symbol_exposure
  FOR ALL USING (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

-- -------------------------------------------------------------------------
-- 5.8  dealer_actions  (staff only)
-- -------------------------------------------------------------------------
CREATE POLICY dealer_actions_select_staff ON public.dealer_actions
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager')
  );

CREATE POLICY dealer_actions_insert_staff ON public.dealer_actions
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','dealer')
  );

-- -------------------------------------------------------------------------
-- 5.9  kyc_documents
-- -------------------------------------------------------------------------
CREATE POLICY kyc_documents_select_own ON public.kyc_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = kyc_documents.client_id
        AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY kyc_documents_select_staff ON public.kyc_documents
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

CREATE POLICY kyc_documents_insert ON public.kyc_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = kyc_documents.client_id
        AND c.profile_id = auth.uid()
    )
    OR public.get_my_role() IN ('super_admin','admin','support')
  );

CREATE POLICY kyc_documents_update_staff ON public.kyc_documents
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','support')
  );

-- -------------------------------------------------------------------------
-- 5.10  wallet_transactions
-- -------------------------------------------------------------------------
CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = wallet_transactions.client_id
        AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY wallet_transactions_select_staff ON public.wallet_transactions
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

CREATE POLICY wallet_transactions_insert ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = wallet_transactions.client_id
        AND c.profile_id = auth.uid()
    )
    OR public.get_my_role() IN ('super_admin','admin','support')
  );

CREATE POLICY wallet_transactions_update_staff ON public.wallet_transactions
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','support')
  );

-- -------------------------------------------------------------------------
-- 5.11  system_alerts  (staff only)
-- -------------------------------------------------------------------------
CREATE POLICY system_alerts_select_staff ON public.system_alerts
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

CREATE POLICY system_alerts_insert_staff ON public.system_alerts
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

CREATE POLICY system_alerts_update_staff ON public.system_alerts
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

-- -------------------------------------------------------------------------
-- 5.12  audit_log  (super_admin read, staff insert)
-- -------------------------------------------------------------------------
CREATE POLICY audit_log_select_super_admin ON public.audit_log
  FOR SELECT USING (
    public.get_my_role() = 'super_admin'
  );

CREATE POLICY audit_log_insert_staff ON public.audit_log
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager','support')
  );

-- -------------------------------------------------------------------------
-- 5.13  client_score_history  (staff only)
-- -------------------------------------------------------------------------
CREATE POLICY client_score_history_select_staff ON public.client_score_history
  FOR SELECT USING (
    public.get_my_role() IN ('super_admin','admin','dealer','risk_manager')
  );

CREATE POLICY client_score_history_insert_staff ON public.client_score_history
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

-- -------------------------------------------------------------------------
-- 5.14  news_events  (all authenticated can read, staff can write)
-- -------------------------------------------------------------------------
CREATE POLICY news_events_select_all ON public.news_events
  FOR SELECT USING (true);

CREATE POLICY news_events_insert_staff ON public.news_events
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );

CREATE POLICY news_events_update_staff ON public.news_events
  FOR UPDATE USING (
    public.get_my_role() IN ('super_admin','admin','risk_manager')
  );


-- ============================================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP (trigger on auth.users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'client'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 7. REALTIME PUBLICATION (optional, enable for live dealing desk)
-- ============================================================================

-- Uncomment to enable realtime on key tables:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.price_ticks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.symbol_exposure;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;


COMMIT;
