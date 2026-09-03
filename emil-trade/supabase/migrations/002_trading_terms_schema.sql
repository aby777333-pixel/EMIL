-- ============================================================================
-- GIORAPTOR Trading Terms Schema Migration
-- Version: 002
-- Description: Trading terms, instrument groups, trading sessions, holidays,
--              spread history, and per-term instrument overrides.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES (idempotent)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE spread_type AS ENUM ('fixed','variable','ecn','zero');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tradability AS ENUM ('full','close_only','disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE swap_type AS ENUM ('points','money','percentage','disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('per_lot','per_deal','percentage','none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE term_execution_mode AS ENUM ('instant','market','exchange');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1  instrument_groups
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instrument_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text         NOT NULL UNIQUE,
  display_name  text         NOT NULL DEFAULT '',
  icon          text         NOT NULL DEFAULT 'circle',
  color         text         NOT NULL DEFAULT '#6366f1',
  sort_order    integer      NOT NULL DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2.2  trading_terms
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_terms (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text             NOT NULL UNIQUE,
  description                 text             NOT NULL DEFAULT '',
  is_default                  boolean          NOT NULL DEFAULT false,
  base_currency               text             NOT NULL DEFAULT 'USD',
  leverage_default            integer          NOT NULL DEFAULT 100,
  margin_call_level           numeric          NOT NULL DEFAULT 100,   -- percentage
  stop_out_level              numeric          NOT NULL DEFAULT 50,    -- percentage
  hedging_allowed             boolean          NOT NULL DEFAULT true,
  max_open_positions          integer          NOT NULL DEFAULT 200,
  max_pending_orders          integer          NOT NULL DEFAULT 200,
  trailing_stop_allowed       boolean          NOT NULL DEFAULT true,
  expert_advisors_allowed     boolean          NOT NULL DEFAULT true,
  execution_mode              term_execution_mode NOT NULL DEFAULT 'market',
  instant_execution_deviation numeric          NOT NULL DEFAULT 0,
  requote_allowed             boolean          NOT NULL DEFAULT false,
  is_active                   boolean          NOT NULL DEFAULT true,
  created_at                  timestamptz      NOT NULL DEFAULT now(),
  updated_at                  timestamptz      NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2.3  trading_term_instruments  (per-term overrides per symbol)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_term_instruments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_term_id       uuid           NOT NULL REFERENCES public.trading_terms(id) ON DELETE CASCADE,
  symbol                text           NOT NULL REFERENCES public.symbols(name) ON DELETE CASCADE,
  spread_type           spread_type    NOT NULL DEFAULT 'variable',
  spread_value          numeric        NOT NULL DEFAULT 0,
  markup_value          numeric        NOT NULL DEFAULT 0,
  shift_bid             numeric        NOT NULL DEFAULT 0,
  shift_ask             numeric        NOT NULL DEFAULT 0,
  tradability           tradability    NOT NULL DEFAULT 'full',
  execution_mode        term_execution_mode NOT NULL DEFAULT 'market',
  leverage_override     integer,
  margin_pct_override   numeric,
  swap_long             numeric        NOT NULL DEFAULT 0,
  swap_short            numeric        NOT NULL DEFAULT 0,
  swap_type             swap_type      NOT NULL DEFAULT 'points',
  min_volume            numeric        NOT NULL DEFAULT 0.01,
  max_volume            numeric        NOT NULL DEFAULT 100,
  volume_step           numeric        NOT NULL DEFAULT 0.01,
  commission_type       commission_type NOT NULL DEFAULT 'none',
  commission_value      numeric        NOT NULL DEFAULT 0,
  trading_amount_min    numeric        NOT NULL DEFAULT 0,
  trading_amount_max    numeric        NOT NULL DEFAULT 0,
  is_active             boolean        NOT NULL DEFAULT true,
  created_at            timestamptz    NOT NULL DEFAULT now(),
  updated_at            timestamptz    NOT NULL DEFAULT now(),
  UNIQUE(trading_term_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_tti_trading_term_id ON public.trading_term_instruments(trading_term_id);
CREATE INDEX IF NOT EXISTS idx_tti_symbol ON public.trading_term_instruments(symbol);

-- --------------------------------------------------------------------------
-- 2.4  trading_sessions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol        text         NOT NULL REFERENCES public.symbols(name) ON DELETE CASCADE,
  day_of_week   smallint     NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time     time         NOT NULL DEFAULT '00:00',
  close_time    time         NOT NULL DEFAULT '23:59',
  timezone      text         NOT NULL DEFAULT 'UTC',
  break_start   time,
  break_end     time,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_symbol ON public.trading_sessions(symbol);

-- --------------------------------------------------------------------------
-- 2.5  market_holidays
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_holidays (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text         NOT NULL,
  holiday_date     date         NOT NULL,
  affected_groups  text[]       NOT NULL DEFAULT '{}',
  close_early_at   time,
  note             text,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_holidays_date ON public.market_holidays(holiday_date);

-- --------------------------------------------------------------------------
-- 2.6  spread_history  (audit log for spread changes)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spread_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_term_id   uuid         NOT NULL REFERENCES public.trading_terms(id) ON DELETE CASCADE,
  symbol            text         NOT NULL,
  changed_by        uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_spread_type   spread_type,
  old_spread_value  numeric,
  old_markup_value  numeric,
  new_spread_type   spread_type,
  new_spread_value  numeric,
  new_markup_value  numeric,
  reason            text,
  bulk_operation    boolean      NOT NULL DEFAULT false,
  affected_count    integer      NOT NULL DEFAULT 1,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spread_history_term ON public.spread_history(trading_term_id);
CREATE INDEX IF NOT EXISTS idx_spread_history_created ON public.spread_history(created_at);


-- ============================================================================
-- 3. ALTER EXISTING TABLES
-- ============================================================================

-- Add group_id to symbols
DO $$ BEGIN
  ALTER TABLE public.symbols ADD COLUMN group_id uuid REFERENCES public.instrument_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add trading_term_id to trading_accounts
DO $$ BEGIN
  ALTER TABLE public.trading_accounts ADD COLUMN trading_term_id uuid REFERENCES public.trading_terms(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;


-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.instrument_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_term_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spread_history ENABLE ROW LEVEL SECURITY;

-- Staff-only read
DO $$ BEGIN
  CREATE POLICY "Staff can view instrument_groups"
    ON public.instrument_groups FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can manage instrument_groups"
    ON public.instrument_groups FOR ALL
    USING (public.get_my_role() IN ('super_admin','admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can view trading_terms"
    ON public.trading_terms FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can manage trading_terms"
    ON public.trading_terms FOR ALL
    USING (public.get_my_role() IN ('super_admin','admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can view trading_term_instruments"
    ON public.trading_term_instruments FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can manage trading_term_instruments"
    ON public.trading_term_instruments FOR ALL
    USING (public.get_my_role() IN ('super_admin','admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can view trading_sessions"
    ON public.trading_sessions FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can manage trading_sessions"
    ON public.trading_sessions FOR ALL
    USING (public.get_my_role() IN ('super_admin','admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can view market_holidays"
    ON public.market_holidays FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can manage market_holidays"
    ON public.market_holidays FOR ALL
    USING (public.get_my_role() IN ('super_admin','admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can view spread_history"
    ON public.spread_history FOR SELECT
    USING (public.get_my_role() IN ('super_admin','admin','dealer','risk_manager'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff can insert spread_history"
    ON public.spread_history FOR INSERT
    WITH CHECK (public.get_my_role() IN ('super_admin','admin','dealer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 5. SEED DATA
-- ============================================================================

-- 5.1  Instrument Groups
INSERT INTO public.instrument_groups (name, display_name, icon, color, sort_order) VALUES
  ('Forex',         'Forex Majors',     'currency-dollar',  '#22d3ee', 1),
  ('ForexMinors',   'Forex Minors',     'currency-euro',    '#06b6d4', 2),
  ('ForexExotics',  'Forex Exotics',    'globe',            '#0891b2', 3),
  ('Metals',        'Precious Metals',  'gem',              '#f59e0b', 4),
  ('Energies',      'Energies',         'flame',            '#ef4444', 5),
  ('CryptoCurrency','Crypto Currency',  'bitcoin',          '#8b5cf6', 6),
  ('WorldIndices',  'World Indices',    'bar-chart-2',      '#10b981', 7),
  ('USStocks',      'US Stocks',        'landmark',         '#3b82f6', 8),
  ('Bonds',         'Bonds',            'banknote',         '#64748b', 9)
ON CONFLICT (name) DO NOTHING;

-- 5.2  Trading Terms
INSERT INTO public.trading_terms (name, description, is_default, leverage_default, margin_call_level, stop_out_level, hedging_allowed, max_open_positions, max_pending_orders, execution_mode, requote_allowed) VALUES
  ('GIO Standard',  'Standard trading conditions for retail traders.',          true,  200, 100, 50,  true,  200, 200, 'market',  false),
  ('GIO Premium',   'Premium conditions with tighter spreads and priority execution.', false, 300, 100, 40,  true,  500, 500, 'market',  false),
  ('GIO VIP',       'VIP institutional-grade conditions. Lowest spreads, highest leverage.', false, 500, 80,  30,  true,  1000, 1000, 'market', false),
  ('GIO Islamic',   'Swap-free account compliant with Islamic finance principles.', false, 200, 100, 50, false, 200, 200, 'market',  false),
  ('GIO TEST',      'Internal testing environment. Do not assign to live clients.', false, 1000, 100, 20, true, 9999, 9999, 'instant', true)
ON CONFLICT (name) DO NOTHING;

-- 5.3  Update symbols with group_id
DO $$
DECLARE
  v_forex_id uuid;
  v_metals_id uuid;
  v_crypto_id uuid;
  v_forex_minors_id uuid;
BEGIN
  SELECT id INTO v_forex_id FROM public.instrument_groups WHERE name = 'Forex';
  SELECT id INTO v_metals_id FROM public.instrument_groups WHERE name = 'Metals';
  SELECT id INTO v_crypto_id FROM public.instrument_groups WHERE name = 'CryptoCurrency';
  SELECT id INTO v_forex_minors_id FROM public.instrument_groups WHERE name = 'ForexMinors';

  UPDATE public.symbols SET group_id = v_forex_id WHERE name IN ('EURUSD', 'GBPUSD', 'USDJPY');
  UPDATE public.symbols SET group_id = v_metals_id WHERE name IN ('XAUUSD');
  UPDATE public.symbols SET group_id = v_crypto_id WHERE name IN ('BTCUSD');
  UPDATE public.symbols SET group_id = v_forex_minors_id WHERE name IN ('GBPJPY');
END $$;


COMMIT;
