-- ================================================================
-- GIO RAPTOR -- Dealing Desk Seed Data
-- Realistic seed for development and testing
-- All UUIDs are fixed so foreign key references work
-- ================================================================

-- Clean slate (order matters for FK constraints)
TRUNCATE
  wallet_transactions,
  system_alerts,
  news_events,
  client_score_history,
  trades,
  symbol_exposure,
  trading_accounts,
  clients,
  instruments,
  users
CASCADE;


-- ================================================================
-- 1. INSTRUMENTS (Symbols)
-- ================================================================
INSERT INTO instruments (
  id, symbol, description, type,
  base_currency, quote_currency, profit_currency,
  pricescale, min_lot, max_lot, lot_step,
  contract_size, point_value, margin_rate,
  swap_long, swap_short, spread_markup, is_active
) VALUES
  -- EURUSD
  (
    'a0000000-0000-0000-0000-000000000001',
    'EURUSD', 'Euro vs US Dollar', 'forex',
    'EUR', 'USD', 'USD',
    100000, 0.01, 100, 0.01,
    100000, 10.00, 0.01,
    -3.20, 0.80, 0.00008, true
  ),
  -- XAUUSD
  (
    'a0000000-0000-0000-0000-000000000002',
    'XAUUSD', 'Gold vs US Dollar', 'metal',
    'XAU', 'USD', 'USD',
    100, 0.01, 50, 0.01,
    100, 1.00, 0.02,
    -8.50, 2.10, 0.30, true
  ),
  -- BTCUSD
  (
    'a0000000-0000-0000-0000-000000000003',
    'BTCUSD', 'Bitcoin vs US Dollar', 'crypto',
    'BTC', 'USD', 'USD',
    100, 0.01, 10, 0.01,
    1, 1.00, 0.05,
    -15.00, -5.00, 0.50, true
  ),
  -- GBPJPY
  (
    'a0000000-0000-0000-0000-000000000004',
    'GBPJPY', 'British Pound vs Japanese Yen', 'forex',
    'GBP', 'JPY', 'JPY',
    1000, 0.01, 100, 0.01,
    100000, 6.50, 0.015,
    1.50, -6.80, 0.0015, true
  ),
  -- USDJPY
  (
    'a0000000-0000-0000-0000-000000000005',
    'USDJPY', 'US Dollar vs Japanese Yen', 'forex',
    'USD', 'JPY', 'JPY',
    1000, 0.01, 100, 0.01,
    100000, 6.50, 0.01,
    2.10, -7.20, 0.0007, true
  ),
  -- GBPUSD
  (
    'a0000000-0000-0000-0000-000000000006',
    'GBPUSD', 'British Pound vs US Dollar', 'forex',
    'GBP', 'USD', 'USD',
    100000, 0.01, 100, 0.01,
    100000, 10.00, 0.01,
    -2.80, 0.40, 0.00010, true
  );


-- ================================================================
-- 2. PROFILES (users table)
-- ================================================================
-- Roles: super_admin, admin, dealer, risk_manager, support, client

INSERT INTO users (
  id, user_id, full_name, email, role, country, phone, avatar_url, created_at
) VALUES
  -- Staff
  ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'GIO4X Admin',       'admin@gioraptor.com',       'super_admin',   'US', '+1-555-000-0001', NULL, NOW() - INTERVAL '365 days'),
  ('00000000-0000-0000-0000-000000000002', gen_random_uuid(), 'Sarah Chen',         'sarah.chen@gioraptor.com',  'admin',         'US', '+1-555-000-0002', NULL, NOW() - INTERVAL '300 days'),
  ('00000000-0000-0000-0000-000000000003', gen_random_uuid(), 'David Okafor',       'david.okafor@gioraptor.com','admin',         'NG', '+234-800-0003',   NULL, NOW() - INTERVAL '280 days'),
  ('00000000-0000-0000-0000-000000000004', gen_random_uuid(), 'Marcus Thompson',    'marcus.t@gioraptor.com',    'dealer',        'UK', '+44-7700-0004',   NULL, NOW() - INTERVAL '250 days'),
  ('00000000-0000-0000-0000-000000000005', gen_random_uuid(), 'Priya Sharma',       'priya.s@gioraptor.com',     'dealer',        'IN', '+91-98000-0005',  NULL, NOW() - INTERVAL '240 days'),
  ('00000000-0000-0000-0000-000000000006', gen_random_uuid(), 'Yuki Tanaka',        'yuki.t@gioraptor.com',      'risk_manager',  'JP', '+81-90-0006',     NULL, NOW() - INTERVAL '230 days'),
  ('00000000-0000-0000-0000-000000000007', gen_random_uuid(), 'Amara Nwosu',        'amara.n@gioraptor.com',     'support',       'NG', '+234-800-0007',   NULL, NOW() - INTERVAL '220 days'),

  -- 20 Clients (ids ...010 through ...029)
  ('00000000-0000-0000-0000-000000000010', gen_random_uuid(), 'James Whitfield',    'james.w@email.com',         'client', 'UK', '+44-7700-1010',   NULL, NOW() - INTERVAL '180 days'),
  ('00000000-0000-0000-0000-000000000011', gen_random_uuid(), 'Ananya Patel',       'ananya.p@email.com',        'client', 'IN', '+91-98000-1011',  NULL, NOW() - INTERVAL '170 days'),
  ('00000000-0000-0000-0000-000000000012', gen_random_uuid(), 'Omar Al-Rashid',     'omar.ar@email.com',         'client', 'AE', '+971-50-1012',    NULL, NOW() - INTERVAL '160 days'),
  ('00000000-0000-0000-0000-000000000013', gen_random_uuid(), 'Wei Zhang',          'wei.z@email.com',           'client', 'SG', '+65-9000-1013',   NULL, NOW() - INTERVAL '155 days'),
  ('00000000-0000-0000-0000-000000000014', gen_random_uuid(), 'Chidera Eze',        'chidera.e@email.com',       'client', 'NG', '+234-800-1014',   NULL, NOW() - INTERVAL '150 days'),
  ('00000000-0000-0000-0000-000000000015', gen_random_uuid(), 'Michael Rodriguez',  'michael.r@email.com',       'client', 'US', '+1-555-1015',     NULL, NOW() - INTERVAL '145 days'),
  ('00000000-0000-0000-0000-000000000016', gen_random_uuid(), 'Hans Mueller',       'hans.m@email.com',          'client', 'DE', '+49-170-1016',    NULL, NOW() - INTERVAL '140 days'),
  ('00000000-0000-0000-0000-000000000017', gen_random_uuid(), 'Takeshi Yamamoto',   'takeshi.y@email.com',       'client', 'JP', '+81-90-1017',     NULL, NOW() - INTERVAL '135 days'),
  ('00000000-0000-0000-0000-000000000018', gen_random_uuid(), 'Fatima Hassan',      'fatima.h@email.com',        'client', 'AE', '+971-55-1018',    NULL, NOW() - INTERVAL '130 days'),
  ('00000000-0000-0000-0000-000000000019', gen_random_uuid(), 'Raj Krishnamurthy',  'raj.k@email.com',           'client', 'IN', '+91-98000-1019',  NULL, NOW() - INTERVAL '125 days'),
  ('00000000-0000-0000-0000-000000000020', gen_random_uuid(), 'Charlotte Barnes',   'charlotte.b@email.com',     'client', 'UK', '+44-7700-1020',   NULL, NOW() - INTERVAL '120 days'),
  ('00000000-0000-0000-0000-000000000021', gen_random_uuid(), 'Emeka Obi',          'emeka.o@email.com',         'client', 'NG', '+234-800-1021',   NULL, NOW() - INTERVAL '115 days'),
  ('00000000-0000-0000-0000-000000000022', gen_random_uuid(), 'Lisa Bergmann',      'lisa.b@email.com',          'client', 'DE', '+49-170-1022',    NULL, NOW() - INTERVAL '110 days'),
  ('00000000-0000-0000-0000-000000000023', gen_random_uuid(), 'Arjun Mehta',        'arjun.m@email.com',         'client', 'SG', '+65-9000-1023',   NULL, NOW() - INTERVAL '105 days'),
  ('00000000-0000-0000-0000-000000000024', gen_random_uuid(), 'Yusuf Danjuma',      'yusuf.d@email.com',         'client', 'NG', '+234-800-1024',   NULL, NOW() - INTERVAL '100 days'),
  ('00000000-0000-0000-0000-000000000025', gen_random_uuid(), 'Sophia Williams',    'sophia.w@email.com',        'client', 'US', '+1-555-1025',     NULL, NOW() - INTERVAL '95 days'),
  ('00000000-0000-0000-0000-000000000026', gen_random_uuid(), 'Kenji Nakamura',     'kenji.n@email.com',         'client', 'JP', '+81-90-1026',     NULL, NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000027', gen_random_uuid(), 'Abdullah Qasim',     'abdullah.q@email.com',      'client', 'AE', '+971-50-1027',    NULL, NOW() - INTERVAL '85 days'),
  ('00000000-0000-0000-0000-000000000028', gen_random_uuid(), 'Daniel Adeyemi',     'daniel.a@email.com',        'client', 'UK', '+44-7700-1028',   NULL, NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000029', gen_random_uuid(), 'Mei Lin Tan',        'meilin.t@email.com',        'client', 'SG', '+65-9000-1029',   NULL, NOW() - INTERVAL '75 days');


-- ================================================================
-- 3. CLIENTS (extended client profiles)
-- ================================================================
-- risk_category: low(14), medium(3), high(2), toxic(1)
-- 3 toxic clients with toxic_score 3-5

INSERT INTO clients (
  id, user_id, risk_category, toxic_score,
  experience_level, income_bracket,
  kyc_completed, kyc_completed_at,
  created_at
) VALUES
  -- LOW risk (14)
  ('c0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '175 days', NOW() - INTERVAL '180 days'),
  ('c0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'low',    0, 'beginner',     '25k-50k',   true,  NOW() - INTERVAL '165 days', NOW() - INTERVAL '170 days'),
  ('c0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'low',    0, 'advanced',     '100k-250k', true,  NOW() - INTERVAL '155 days', NOW() - INTERVAL '160 days'),
  ('c0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '150 days', NOW() - INTERVAL '155 days'),
  ('c0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000015', 'low',    0, 'beginner',     '25k-50k',   true,  NOW() - INTERVAL '140 days', NOW() - INTERVAL '145 days'),
  ('c0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000016', 'low',    0, 'advanced',     '100k-250k', true,  NOW() - INTERVAL '135 days', NOW() - INTERVAL '140 days'),
  ('c0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000018', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '125 days', NOW() - INTERVAL '130 days'),
  ('c0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000019', 'low',    0, 'beginner',     '25k-50k',   false, NULL,                         NOW() - INTERVAL '125 days'),
  ('c0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000020', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '115 days', NOW() - INTERVAL '120 days'),
  ('c0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022', 'low',    0, 'advanced',     '100k-250k', true,  NOW() - INTERVAL '105 days', NOW() - INTERVAL '110 days'),
  ('c0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000024', 'low',    0, 'beginner',     'under-25k', true,  NOW() - INTERVAL '95 days',  NOW() - INTERVAL '100 days'),
  ('c0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000025', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '90 days',  NOW() - INTERVAL '95 days'),
  ('c0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000028', 'low',    0, 'intermediate', '50k-100k',  true,  NOW() - INTERVAL '75 days',  NOW() - INTERVAL '80 days'),
  ('c0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000029', 'low',    0, 'advanced',     '100k-250k', false, NULL,                         NOW() - INTERVAL '75 days'),

  -- MEDIUM risk (3)
  ('c0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', 'medium', 1, 'intermediate', '25k-50k',   true,  NOW() - INTERVAL '145 days', NOW() - INTERVAL '150 days'),
  ('c0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', 'medium', 1, 'advanced',     '50k-100k',  true,  NOW() - INTERVAL '110 days', NOW() - INTERVAL '115 days'),
  ('c0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000027', 'medium', 2, 'advanced',     '250k+',     true,  NOW() - INTERVAL '80 days',  NOW() - INTERVAL '85 days'),

  -- HIGH risk (2)
  ('c0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000017', 'high',   2, 'expert',       '250k+',     true,  NOW() - INTERVAL '130 days', NOW() - INTERVAL '135 days'),
  ('c0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000026', 'high',   2, 'expert',       '100k-250k', true,  NOW() - INTERVAL '85 days',  NOW() - INTERVAL '90 days'),

  -- TOXIC (1 toxic risk_category, but 3 clients with toxic_score >= 3)
  ('c0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000023', 'high',   3, 'expert',       '250k+',     true,  NOW() - INTERVAL '100 days', NOW() - INTERVAL '105 days');

-- Update the truly toxic ones with higher scores (Takeshi and Kenji already high)
UPDATE clients SET toxic_score = 4 WHERE user_id = '00000000-0000-0000-0000-000000000017';
UPDATE clients SET toxic_score = 5 WHERE user_id = '00000000-0000-0000-0000-000000000026';


-- ================================================================
-- 4. TRADING ACCOUNTS (30 accounts)
-- ================================================================

INSERT INTO trading_accounts (
  id, user_id, account_number, account_type, currency, leverage,
  balance, credit, is_demo, is_active, status, created_at
) VALUES
  -- James Whitfield (2 accounts)
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'GR-100001', 'standard',  'USD', 100, 15420.50,  0, false, true,  'active',      NOW() - INTERVAL '178 days'),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'GR-100002', 'raw_spread','USD', 200, 42300.00,  0, false, true,  'active',      NOW() - INTERVAL '120 days'),
  -- Ananya Patel
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'GR-100003', 'standard',  'USD', 100, 5250.75,   0, false, true,  'active',      NOW() - INTERVAL '168 days'),
  -- Omar Al-Rashid (2 accounts, 1 EUR)
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012', 'GR-100004', 'ecn',       'USD', 200, 125000.00, 0, false, true,  'active',      NOW() - INTERVAL '158 days'),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000012', 'GR-100005', 'islamic',   'EUR', 100, 35000.00,  0, false, true,  'active',      NOW() - INTERVAL '140 days'),
  -- Wei Zhang
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000013', 'GR-100006', 'standard',  'USD', 100, 8900.25,   0, false, true,  'active',      NOW() - INTERVAL '153 days'),
  -- Chidera Eze
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000014', 'GR-100007', 'standard',  'USD', 200, 3200.00,   0, false, true,  'active',      NOW() - INTERVAL '148 days'),
  -- Michael Rodriguez
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000015', 'GR-100008', 'standard',  'USD', 100, 12750.00,  0, false, true,  'active',      NOW() - INTERVAL '143 days'),
  -- Hans Mueller (2 accounts)
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000016', 'GR-100009', 'ecn',       'EUR', 200, 87500.00,  0, false, true,  'active',      NOW() - INTERVAL '138 days'),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000016', 'GR-100010', 'standard',  'USD', 100, 22000.00,  0, false, true,  'active',      NOW() - INTERVAL '100 days'),
  -- Takeshi Yamamoto (TOXIC - high risk, high leverage)
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000017', 'GR-100011', 'raw_spread','USD', 500, 250000.00, 0, false, true,  'active',      NOW() - INTERVAL '133 days'),
  -- Fatima Hassan
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000018', 'GR-100012', 'islamic',   'USD', 100, 18500.00,  0, false, true,  'active',      NOW() - INTERVAL '128 days'),
  -- Raj Krishnamurthy
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000019', 'GR-100013', 'standard',  'USD', 50,  500.00,    0, false, true,  'active',      NOW() - INTERVAL '123 days'),
  -- Charlotte Barnes (margin_call)
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000020', 'GR-100014', 'standard',  'USD', 200, 1850.00,   0, false, true,  'margin_call', NOW() - INTERVAL '118 days'),
  -- Emeka Obi
  ('b0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000021', 'GR-100015', 'standard',  'USD', 100, 7600.00,   0, false, true,  'active',      NOW() - INTERVAL '113 days'),
  -- Lisa Bergmann (2 accounts)
  ('b0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000022', 'GR-100016', 'ecn',       'EUR', 200, 56000.00,  0, false, true,  'active',      NOW() - INTERVAL '108 days'),
  ('b0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000022', 'GR-100017', 'standard',  'USD', 100, 14200.00,  0, false, true,  'active',      NOW() - INTERVAL '90 days'),
  -- Arjun Mehta (TOXIC)
  ('b0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000023', 'GR-100018', 'raw_spread','USD', 500, 180000.00, 0, false, true,  'active',      NOW() - INTERVAL '103 days'),
  -- Yusuf Danjuma
  ('b0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000024', 'GR-100019', 'standard',  'USD', 100, 2100.00,   0, false, true,  'active',      NOW() - INTERVAL '98 days'),
  -- Sophia Williams (margin_call)
  ('b0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000025', 'GR-100020', 'standard',  'USD', 200, 980.00,    0, false, true,  'margin_call', NOW() - INTERVAL '93 days'),
  -- Kenji Nakamura (TOXIC)
  ('b0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000026', 'GR-100021', 'raw_spread','USD', 500, 145000.00, 0, false, true,  'active',      NOW() - INTERVAL '88 days'),
  -- Abdullah Qasim (2 accounts)
  ('b0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000027', 'GR-100022', 'islamic',   'USD', 100, 45000.00,  0, false, true,  'active',      NOW() - INTERVAL '83 days'),
  ('b0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000027', 'GR-100023', 'ecn',       'EUR', 200, 62000.00,  0, false, true,  'active',      NOW() - INTERVAL '70 days'),
  -- Daniel Adeyemi (margin_call)
  ('b0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000028', 'GR-100024', 'standard',  'USD', 200, 1250.00,   0, false, true,  'margin_call', NOW() - INTERVAL '78 days'),
  -- Mei Lin Tan (2 accounts)
  ('b0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000029', 'GR-100025', 'raw_spread','USD', 200, 34000.00,  0, false, true,  'active',      NOW() - INTERVAL '73 days'),
  ('b0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000029', 'GR-100026', 'standard',  'EUR', 100, 11000.00,  0, false, true,  'active',      NOW() - INTERVAL '60 days'),
  -- Extra accounts for variety
  ('b0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000010', 'GR-100027', 'demo',      'USD', 500, 100000.00, 0, true,  true,  'active',      NOW() - INTERVAL '50 days'),
  ('b0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000015', 'GR-100028', 'demo',      'USD', 500, 100000.00, 0, true,  true,  'active',      NOW() - INTERVAL '45 days'),
  ('b0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000011', 'GR-100029', 'standard',  'USD', 100, 8500.00,   0, false, true,  'active',      NOW() - INTERVAL '40 days'),
  ('b0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000013', 'GR-100030', 'raw_spread','USD', 200, 21000.00,  0, false, true,  'active',      NOW() - INTERVAL '35 days');


-- ================================================================
-- 5. SYMBOL EXPOSURE
-- ================================================================

INSERT INTO symbol_exposure (
  id, symbol, current_lots, threshold_lots, utilization_pct,
  net_long_lots, net_short_lots, client_count, updated_at
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'EURUSD', 45.0,  50, 90.0,  28.5, 16.5, 12, NOW()),
  ('e0000000-0000-0000-0000-000000000002', 'XAUUSD', 12.0,  30, 40.0,   8.0,  4.0,  6, NOW()),
  ('e0000000-0000-0000-0000-000000000003', 'BTCUSD',  2.0,  10, 20.0,   1.5,  0.5,  3, NOW()),
  ('e0000000-0000-0000-0000-000000000004', 'GBPJPY', 35.0,  40, 87.5,  22.0, 13.0,  9, NOW()),
  ('e0000000-0000-0000-0000-000000000005', 'USDJPY', 20.0,  50, 40.0,  14.0,  6.0,  8, NOW()),
  ('e0000000-0000-0000-0000-000000000006', 'GBPUSD',  5.0,  50, 10.0,   3.0,  2.0,  4, NOW());


-- ================================================================
-- 6. TRADES (50 total: 5 pending, 10 open, 35 closed)
-- ================================================================

-- ---- 5 PENDING trades (dealer queue) ----
INSERT INTO trades (
  id, user_id, account_id, symbol, direction, volume,
  order_type, requested_price, fill_price,
  status, execution_mode, toxic_flag, news_flag,
  broker_pnl, client_pnl,
  created_at, executed_at, closed_at
) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'EURUSD', 'BUY',  2.0,  'market', 1.08250, NULL,     'pending', 'b_book', false, false, 0, 0,       NOW() - INTERVAL '2 minutes', NULL, NULL),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'XAUUSD', 'SELL', 1.0,  'limit',  2348.50, NULL,     'pending', 'b_book', false, true,  0, 0,       NOW() - INTERVAL '5 minutes', NULL, NULL),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000011', 'GBPJPY', 'BUY',  5.0,  'market', 191.850, NULL,     'pending', 'a_book', true,  false, 0, 0,       NOW() - INTERVAL '1 minute',  NULL, NULL),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000008', 'USDJPY', 'SELL', 1.5,  'market', 154.250, NULL,     'pending', 'b_book', false, false, 0, 0,       NOW() - INTERVAL '30 seconds',NULL, NULL),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000018', 'BTCUSD', 'BUY',  0.5,  'market', 67850.00,NULL,     'pending', 'a_book', true,  false, 0, 0,       NOW() - INTERVAL '15 seconds',NULL, NULL),

  -- ---- 10 OPEN trades ----
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'EURUSD', 'BUY',  3.0,  'market', 1.08100, 1.08105,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '4 hours',   NOW() - INTERVAL '4 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'XAUUSD', 'BUY',  2.0,  'market', 2340.00, 2340.30,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '6 hours',   NOW() - INTERVAL '6 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000009', 'GBPUSD', 'SELL', 1.5,  'market', 1.26850, 1.26845,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '2 hours',   NOW() - INTERVAL '2 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000011', 'USDJPY', 'BUY',  5.0,  'market', 154.100, 154.105,  'open', 'a_book', true,  false, 0, 0,          NOW() - INTERVAL '1 hour',    NOW() - INTERVAL '1 hour',    NULL),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000018', 'EURUSD', 'SELL', 4.0,  'market', 1.08300, 1.08295,  'open', 'a_book', true,  false, 0, 0,          NOW() - INTERVAL '3 hours',   NOW() - INTERVAL '3 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000014', 'GBPJPY', 'BUY',  2.0,  'market', 191.500, 191.510,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '8 hours',   NOW() - INTERVAL '8 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000021', 'BTCUSD', 'BUY',  0.3,  'market', 67500.00,67510.00, 'open', 'a_book', true,  false, 0, 0,          NOW() - INTERVAL '30 minutes',NOW() - INTERVAL '30 minutes',NULL),
  ('d0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000016', 'EURUSD', 'BUY',  1.0,  'market', 1.08050, 1.08055,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '5 hours',   NOW() - INTERVAL '5 hours',   NULL),
  ('d0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000022', 'XAUUSD', 'SELL', 1.0,  'market', 2350.00, 2349.80,  'open', 'b_book', false, true,  0, 0,          NOW() - INTERVAL '45 minutes',NOW() - INTERVAL '45 minutes',NULL),
  ('d0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000025', 'GBPUSD', 'BUY',  2.0,  'market', 1.26700, 1.26705,  'open', 'b_book', false, false, 0, 0,          NOW() - INTERVAL '90 minutes',NOW() - INTERVAL '90 minutes',NULL),

  -- ---- 35 CLOSED trades (last 30 days) ----
  -- Day -1
  ('d0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'EURUSD', 'BUY',  1.0,  'market', 1.07950, 1.07955, 'closed', 'b_book', false, false,  45.00,  -45.00, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day',   NOW() - INTERVAL '22 hours'),
  ('d0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'GBPUSD', 'SELL', 0.5,  'market', 1.26900, 1.26895, 'closed', 'b_book', false, false,  -22.50,  22.50, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day',   NOW() - INTERVAL '20 hours'),
  -- Day -2
  ('d0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'XAUUSD', 'BUY',  1.5,  'market', 2335.00, 2335.30, 'closed', 'b_book', false, false, 180.00, -180.00, NOW() - INTERVAL '2 days',  NOW() - INTERVAL '2 days',  NOW() - INTERVAL '1 day 18 hours'),
  ('d0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000006', 'USDJPY', 'BUY',  1.0,  'market', 153.800, 153.805, 'closed', 'b_book', false, false,  32.50,  -32.50, NOW() - INTERVAL '2 days',  NOW() - INTERVAL '2 days',  NOW() - INTERVAL '1 day 20 hours'),
  -- Day -3 (news day)
  ('d0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000007', 'EURUSD', 'SELL', 1.0,  'market', 1.08400, 1.08395, 'closed', 'b_book', false, true,  -65.00,  65.00, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days',  NOW() - INTERVAL '2 days 22 hours'),
  ('d0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000008', 'GBPJPY', 'BUY',  0.5,  'market', 191.200, 191.210, 'closed', 'b_book', false, true,   48.75,  -48.75, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days',  NOW() - INTERVAL '2 days 20 hours'),
  -- Day -4 to -5
  ('d0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000009', 'EURUSD', 'BUY',  2.0,  'market', 1.08000, 1.08005, 'closed', 'b_book', false, false, 120.00, -120.00, NOW() - INTERVAL '4 days',  NOW() - INTERVAL '4 days',  NOW() - INTERVAL '3 days 16 hours'),
  ('d0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000012', 'XAUUSD', 'SELL', 0.5,  'market', 2342.00, 2341.80, 'closed', 'b_book', false, false,  -35.00,  35.00, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days',  NOW() - INTERVAL '4 days 20 hours'),
  -- Day -6 to -8 (toxic trades)
  ('d0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000011', 'EURUSD', 'BUY',  5.0,  'market', 1.08150, 1.08152, 'closed', 'a_book', true,  false,-250.00,  250.00, NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days' + INTERVAL '45 seconds'),
  ('d0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000018', 'GBPJPY', 'SELL', 4.0,  'market', 192.100, 192.095, 'closed', 'a_book', true,  false,-195.00,  195.00, NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days' + INTERVAL '30 seconds'),
  ('d0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000021', 'USDJPY', 'BUY',  3.0,  'market', 153.950, 153.955, 'closed', 'a_book', true,  false,-162.50,  162.50, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days' + INTERVAL '55 seconds'),
  -- Day -9 to -12
  ('d0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000013', 'EURUSD', 'SELL', 0.1,  'market', 1.08500, 1.08495, 'closed', 'b_book', false, false,   5.00,   -5.00, NOW() - INTERVAL '9 days',  NOW() - INTERVAL '9 days',  NOW() - INTERVAL '8 days 18 hours'),
  ('d0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000015', 'GBPUSD', 'BUY',  1.0,  'market', 1.26500, 1.26505, 'closed', 'b_book', false, false,  75.00,  -75.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days 14 hours'),
  ('d0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000019', 'XAUUSD', 'BUY',  0.2,  'market', 2330.00, 2330.20, 'closed', 'b_book', false, false,  12.00,  -12.00, NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days 22 hours'),
  ('d0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000020', 'BTCUSD', 'SELL', 0.1,  'market', 68200.00,68195.00,'closed', 'b_book', false, false,  -50.00,  50.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days 16 hours'),
  -- Day -13 to -16
  ('d0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'GBPJPY', 'SELL', 1.0,  'market', 191.800, 191.795, 'closed', 'b_book', false, false,  32.50,  -32.50, NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days 20 hours'),
  ('d0000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005', 'EURUSD', 'BUY',  2.0,  'market', 1.07800, 1.07805, 'closed', 'b_book', false, false, 190.00, -190.00, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days 16 hours'),
  ('d0000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000010', 'USDJPY', 'SELL', 1.0,  'market', 154.500, 154.495, 'closed', 'b_book', false, false, -19.50,  19.50, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days 18 hours'),
  ('d0000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000023', 'GBPUSD', 'SELL', 1.5,  'market', 1.27000, 1.26995, 'closed', 'b_book', false, false,  52.50,  -52.50, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days 20 hours'),
  -- Day -17 to -20 (news events)
  ('d0000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000030', 'EURUSD', 'SELL', 1.0,  'market', 1.08600, 1.08595, 'closed', 'b_book', false, true,  -88.00,  88.00, NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days 22 hours'),
  ('d0000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000017', 'XAUUSD', 'BUY',  1.0,  'market', 2325.00, 2325.30, 'closed', 'b_book', false, true,  210.00, -210.00, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days 14 hours'),
  ('d0000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000024', 'GBPJPY', 'BUY',  0.5,  'market', 190.800, 190.810, 'closed', 'b_book', false, true,   26.00,  -26.00, NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days 18 hours'),
  ('d0000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000025', 'BTCUSD', 'BUY',  0.2,  'market', 66500.00,66510.00,'closed', 'b_book', false, false, -140.00, 140.00, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days 12 hours'),
  -- Day -21 to -25
  ('d0000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000007', 'USDJPY', 'BUY',  0.5,  'market', 153.200, 153.205, 'closed', 'b_book', false, false,  16.25,  -16.25, NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days 20 hours'),
  ('d0000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000008', 'EURUSD', 'BUY',  1.0,  'market', 1.07700, 1.07705, 'closed', 'b_book', false, false,  55.00,  -55.00, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days 16 hours'),
  ('d0000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000012', 'GBPUSD', 'BUY',  0.5,  'market', 1.26200, 1.26205, 'closed', 'b_book', false, false, -30.00,  30.00, NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days 14 hours'),
  ('d0000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000014', 'XAUUSD', 'SELL', 0.3,  'market', 2318.00, 2317.80, 'closed', 'b_book', false, false,  42.00,  -42.00, NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '23 days 20 hours'),
  ('d0000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000015', 'GBPJPY', 'SELL', 1.0,  'market', 190.500, 190.495, 'closed', 'a_book', false, false, -32.50,  32.50, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days 16 hours'),
  -- Day -26 to -30
  ('d0000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000029', 'EURUSD', 'SELL', 0.5,  'market', 1.07500, 1.07495, 'closed', 'b_book', false, false, -12.50,  12.50, NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days 18 hours'),
  ('d0000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000006', 'BTCUSD', 'SELL', 0.1,  'market', 65800.00,65795.00,'closed', 'b_book', false, false,  50.00,  -50.00, NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days', NOW() - INTERVAL '26 days 14 hours'),
  ('d0000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000020', 'USDJPY', 'SELL', 0.5,  'market', 152.800, 152.795, 'closed', 'b_book', false, false,  16.25,  -16.25, NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days 20 hours'),
  ('d0000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000009', 'GBPUSD', 'BUY',  2.0,  'market', 1.25900, 1.25905, 'closed', 'a_book', false, false, -85.00,  85.00, NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days 12 hours'),
  ('d0000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000022', 'XAUUSD', 'BUY',  0.5,  'market', 2310.00, 2310.30, 'closed', 'b_book', false, false, 150.00, -150.00, NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days 18 hours'),
  ('d0000000-0000-0000-0000-000000000049', '00000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000019', 'GBPJPY', 'BUY',  0.2,  'market', 190.200, 190.210, 'closed', 'b_book', false, false,   6.50,   -6.50, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days 16 hours'),
  ('d0000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'EURUSD', 'SELL', 1.0,  'market', 1.07300, 1.07295, 'closed', 'a_book', false, false, -35.00,  35.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days 20 hours');


-- ================================================================
-- 7. CLIENT SCORE HISTORY
-- ================================================================
-- 3 toxic clients: Takeshi (017), Arjun (023), Kenji (026)
-- 5 normal clients: James (010), Omar (012), Hans (016), Charlotte (020), Mei Lin (029)

INSERT INTO client_score_history (
  id, user_id, win_rate, avg_hold_time_seconds, trade_frequency_daily,
  avg_volume, profit_factor, toxic_score, evaluated_at
) VALUES
  -- Takeshi (toxic: high win rate, low hold time, high frequency)
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000017', 0.78, 35,  18, 4.5, 2.8, 4, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000017', 0.75, 42,  15, 4.2, 2.5, 4, NOW() - INTERVAL '7 days'),
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000017', 0.80, 28,  22, 5.0, 3.1, 5, NOW() - INTERVAL '14 days'),

  -- Arjun (toxic: latency arbitrage pattern)
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000023', 0.72, 25,  25, 3.8, 2.4, 3, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000023', 0.74, 30,  20, 3.5, 2.2, 3, NOW() - INTERVAL '7 days'),
  ('f0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000023', 0.71, 22,  28, 4.0, 2.6, 4, NOW() - INTERVAL '14 days'),

  -- Kenji (toxic: news scalping)
  ('f0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000026', 0.82, 18,  12, 3.0, 3.5, 5, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000026', 0.79, 20,  10, 2.8, 3.2, 5, NOW() - INTERVAL '7 days'),
  ('f0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000026', 0.85, 15,  14, 3.2, 3.8, 5, NOW() - INTERVAL '14 days'),

  -- James (normal)
  ('f0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 0.48, 3600,  2, 1.5, 0.95, 0, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 0.45, 4200,  2, 1.2, 0.88, 0, NOW() - INTERVAL '7 days'),

  -- Omar (normal, slightly above average)
  ('f0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 0.55, 7200,  3, 2.0, 1.20, 0, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000012', 0.52, 5400,  3, 1.8, 1.15, 0, NOW() - INTERVAL '7 days'),

  -- Hans (normal)
  ('f0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000016', 0.50, 14400, 1, 2.0, 1.02, 0, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000016', 0.47, 18000, 1, 1.5, 0.92, 0, NOW() - INTERVAL '7 days'),

  -- Charlotte (normal, struggling)
  ('f0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000020', 0.35, 1800,  4, 0.8, 0.65, 0, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000020', 0.38, 2400,  3, 0.7, 0.70, 0, NOW() - INTERVAL '7 days'),

  -- Mei Lin (normal, balanced)
  ('f0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000029', 0.52, 10800, 2, 1.5, 1.10, 0, NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000029', 0.50, 9000,  2, 1.3, 1.05, 0, NOW() - INTERVAL '7 days');


-- ================================================================
-- 8. NEWS EVENTS (5 upcoming)
-- ================================================================

INSERT INTO news_events (
  id, title, description, impact, source,
  symbols_affected, event_time, created_at
) VALUES
  (
    'n0000000-0000-0000-0000-000000000001',
    'US CPI (MoM) - April 2026',
    'Consumer Price Index month-over-month. Previous: 0.2%, Forecast: 0.3%.',
    'high',
    'Bureau of Labor Statistics',
    ARRAY['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
    NOW() + INTERVAL '2 days' + INTERVAL '13 hours 30 minutes',
    NOW()
  ),
  (
    'n0000000-0000-0000-0000-000000000002',
    'US Non-Farm Payrolls - May 2026',
    'Non-Farm Employment Change. Previous: 185K, Forecast: 200K.',
    'high',
    'Bureau of Labor Statistics',
    ARRAY['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
    NOW() + INTERVAL '5 days' + INTERVAL '13 hours 30 minutes',
    NOW()
  ),
  (
    'n0000000-0000-0000-0000-000000000003',
    'FOMC Interest Rate Decision',
    'Federal Reserve monetary policy decision. Current: 4.75%, Forecast: Hold.',
    'high',
    'Federal Reserve',
    ARRAY['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'GBPJPY'],
    NOW() + INTERVAL '8 days' + INTERVAL '19 hours',
    NOW()
  ),
  (
    'n0000000-0000-0000-0000-000000000004',
    'ECB Interest Rate Decision',
    'European Central Bank rate decision. Current: 3.50%, Forecast: Cut to 3.25%.',
    'high',
    'European Central Bank',
    ARRAY['EURUSD', 'GBPUSD', 'GBPJPY'],
    NOW() + INTERVAL '12 days' + INTERVAL '12 hours 45 minutes',
    NOW()
  ),
  (
    'n0000000-0000-0000-0000-000000000005',
    'UK GDP (QoQ) - Q1 2026',
    'Gross Domestic Product quarterly. Previous: 0.3%, Forecast: 0.2%.',
    'medium',
    'Office for National Statistics',
    ARRAY['GBPUSD', 'GBPJPY'],
    NOW() + INTERVAL '15 days' + INTERVAL '7 hours',
    NOW()
  );


-- ================================================================
-- 9. SYSTEM ALERTS (3 active)
-- ================================================================

INSERT INTO system_alerts (
  id, severity, title, message, category,
  is_active, acknowledged, created_at
) VALUES
  (
    'sa000000-0000-0000-0000-000000000001',
    'critical',
    'EURUSD Exposure Near Breach',
    'EURUSD net exposure is at 90% of threshold (45/50 lots). Auto-hedge triggered at 95%. Recommend reducing B-book allocation for new EURUSD orders.',
    'exposure',
    true, false, NOW() - INTERVAL '15 minutes'
  ),
  (
    'sa000000-0000-0000-0000-000000000002',
    'warning',
    'Toxic Flow Detected - Multiple Accounts',
    'Accounts GR-100011 (Takeshi Yamamoto), GR-100018 (Arjun Mehta), and GR-100021 (Kenji Nakamura) showing coordinated latency arbitrage patterns. Combined win rate >75% with average hold time under 40 seconds. Recommend A-book routing.',
    'toxic_flow',
    true, false, NOW() - INTERVAL '45 minutes'
  ),
  (
    'sa000000-0000-0000-0000-000000000003',
    'info',
    'Large Withdrawal Pending Approval',
    'Client Omar Al-Rashid (GR-100004) has submitted a withdrawal request for $25,000 via bank wire. Requires manual compliance review due to amount exceeding $10,000 threshold.',
    'compliance',
    true, false, NOW() - INTERVAL '2 hours'
  );


-- ================================================================
-- 10. WALLET TRANSACTIONS (15)
-- ================================================================

INSERT INTO wallet_transactions (
  id, user_id, account_id, type, amount, currency,
  payment_method, status, reference, created_at
) VALUES
  -- Approved deposits
  ('w0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'deposit',    5000.00,  'USD', 'bank_wire',   'approved', 'DEP-20260401-A1B2C3', NOW() - INTERVAL '25 days'),
  ('w0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'deposit',    50000.00, 'USD', 'bank_wire',   'approved', 'DEP-20260403-D4E5F6', NOW() - INTERVAL '22 days'),
  ('w0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000008', 'deposit',    2000.00,  'USD', 'credit_card', 'approved', 'DEP-20260405-G7H8I9', NOW() - INTERVAL '20 days'),
  ('w0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000011', 'deposit',    100000.00,'USD', 'bank_wire',   'approved', 'DEP-20260406-J0K1L2', NOW() - INTERVAL '18 days'),
  ('w0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000018', 'deposit',    75000.00, 'USD', 'crypto',      'approved', 'DEP-20260407-M3N4O5', NOW() - INTERVAL '16 days'),
  ('w0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000025', 'deposit',    10000.00, 'USD', 'credit_card', 'approved', 'DEP-20260408-P6Q7R8', NOW() - INTERVAL '14 days'),

  -- Approved withdrawals
  ('w0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'withdrawal', 2000.00,  'USD', 'bank_wire',   'approved', 'WIT-20260409-S9T0U1', NOW() - INTERVAL '12 days'),
  ('w0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000010', 'withdrawal', 5000.00,  'USD', 'bank_wire',   'approved', 'WIT-20260410-V2W3X4', NOW() - INTERVAL '10 days'),
  ('w0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000011', 'withdrawal', 15000.00, 'USD', 'crypto',      'approved', 'WIT-20260411-Y5Z6A7', NOW() - INTERVAL '8 days'),

  -- Pending deposits
  ('w0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'deposit',    3000.00,  'USD', 'credit_card', 'pending',  'DEP-20260411-B8C9D0', NOW() - INTERVAL '2 hours'),
  ('w0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000019', 'deposit',    500.00,   'USD', 'debit_card',  'pending',  'DEP-20260411-E1F2G3', NOW() - INTERVAL '1 hour'),

  -- Pending withdrawal (compliance review)
  ('w0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'withdrawal', 25000.00, 'USD', 'bank_wire',   'pending',  'WIT-20260411-H4I5J6', NOW() - INTERVAL '3 hours'),

  -- More approved for history
  ('w0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000022', 'deposit',    20000.00, 'USD', 'bank_wire',   'approved', 'DEP-20260402-K7L8M9', NOW() - INTERVAL '24 days'),
  ('w0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000016', 'deposit',    30000.00, 'EUR', 'bank_wire',   'approved', 'DEP-20260404-N0O1P2', NOW() - INTERVAL '21 days'),
  ('w0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000021', 'deposit',    80000.00, 'USD', 'crypto',      'approved', 'DEP-20260405-Q3R4S5', NOW() - INTERVAL '19 days');


-- ================================================================
-- Done! Summary:
-- 6 instruments, 27 profiles (7 staff + 20 clients),
-- 20 client records, 30 trading accounts,
-- 6 symbol exposure entries, 50 trades,
-- 19 client score history entries, 5 news events,
-- 3 system alerts, 15 wallet transactions
-- ================================================================
