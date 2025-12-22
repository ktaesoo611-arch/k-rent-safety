-- ============================================================
-- MIGRATION: Option C (Base + Extension Pattern)
-- Run this in Supabase SQL Editor
-- ============================================================

-- PHASE 1: Create New Tables
-- ============================================================

-- 1.1 Create analysis type enum
DO $$ BEGIN
  CREATE TYPE analysis_type AS ENUM (
    'jeonse_safety',
    'wolse_price',
    'wolse_safety'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1.2 Create base analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type analysis_type NOT NULL,

  -- Common status fields
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Payment fields (shared across paid analyses)
  payment_amount INTEGER,
  payment_status VARCHAR(20),
  payment_key VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Indexes for analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_property ON analyses(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status) WHERE status != 'completed';

-- 1.3 Create jeonse_safety_data extension table
CREATE TABLE IF NOT EXISTS jeonse_safety_data (
  analysis_id UUID PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,

  -- Jeonse-specific fields
  proposed_jeonse BIGINT NOT NULL,
  safety_score INTEGER,
  risk_level VARCHAR(20),

  -- Document data (JSONB for flexibility)
  deunggibu_data JSONB,
  valuation_data JSONB,

  -- Risk analysis
  risks JSONB,
  recommendations JSONB,

  -- Computed scores (denormalized for quick access)
  ltv_ratio NUMERIC(5,2),
  ltv_score INTEGER,
  debt_score INTEGER,
  legal_score INTEGER,
  market_score INTEGER,
  building_score INTEGER
);

-- 1.4 Create wolse_price_data extension table
CREATE TABLE IF NOT EXISTS wolse_price_data (
  analysis_id UUID PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,

  -- User's quote
  user_deposit BIGINT NOT NULL,
  user_monthly_rent BIGINT NOT NULL,
  user_implied_rate NUMERIC(5,2) NOT NULL,

  -- Market data
  market_rate NUMERIC(5,2) NOT NULL,
  market_rate_low NUMERIC(5,2) NOT NULL,
  market_rate_high NUMERIC(5,2) NOT NULL,
  legal_rate NUMERIC(5,2) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL,
  contract_count INTEGER NOT NULL DEFAULT 0,

  -- Assessment
  assessment VARCHAR(30) NOT NULL,
  assessment_details TEXT NOT NULL,

  -- Savings
  savings_vs_market BIGINT NOT NULL DEFAULT 0,
  savings_vs_legal BIGINT NOT NULL DEFAULT 0,

  -- Trend
  trend_direction VARCHAR(20) NOT NULL DEFAULT 'STABLE',
  trend_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  trend_advice TEXT,

  -- Recommendations (JSON)
  negotiation_options JSONB,
  recent_transactions JSONB
);

-- 1.5 Create wolse_safety_data extension table (for future use)
CREATE TABLE IF NOT EXISTS wolse_safety_data (
  analysis_id UUID PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,

  -- Wolse quote
  deposit BIGINT NOT NULL,
  monthly_rent BIGINT NOT NULL,

  -- Safety analysis
  safety_score INTEGER,
  risk_level VARCHAR(20),

  -- Document data
  deunggibu_data JSONB,
  valuation_data JSONB,

  -- Risk analysis
  risks JSONB,
  recommendations JSONB,

  -- Computed scores
  ltv_ratio NUMERIC(5,2),
  deposit_safety_ratio NUMERIC(5,2)
);

-- ============================================================
-- PHASE 2: Enable RLS
-- ============================================================

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jeonse_safety_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolse_price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolse_safety_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses
CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for jeonse_safety_data
CREATE POLICY "Users can view own jeonse data"
  ON jeonse_safety_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert jeonse data"
  ON jeonse_safety_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update jeonse data"
  ON jeonse_safety_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

-- RLS Policies for wolse_price_data
CREATE POLICY "Users can view own wolse price data"
  ON wolse_price_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert wolse price data"
  ON wolse_price_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

-- RLS Policies for wolse_safety_data
CREATE POLICY "Users can view own wolse safety data"
  ON wolse_safety_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert wolse safety data"
  ON wolse_safety_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );

-- ============================================================
-- PHASE 3: Migrate Existing Data
-- ============================================================

-- 3.1 Migrate analysis_results → analyses + jeonse_safety_data
INSERT INTO analyses (id, user_id, property_id, type, status, payment_amount, payment_status, payment_key, created_at, completed_at)
SELECT
  id,
  user_id,
  property_id,
  'jeonse_safety'::analysis_type,
  status,
  payment_amount,
  payment_status,
  payment_key,
  created_at,
  completed_at
FROM analysis_results
ON CONFLICT (id) DO NOTHING;

-- Insert jeonse_safety_data for completed analyses
INSERT INTO jeonse_safety_data (
  analysis_id,
  proposed_jeonse,
  safety_score,
  risk_level,
  deunggibu_data,
  risks,
  ltv_ratio,
  ltv_score,
  debt_score,
  legal_score,
  market_score,
  building_score,
  valuation_data,
  recommendations
)
SELECT
  id,
  proposed_jeonse,
  safety_score,
  risk_level,
  deunggibu_data,
  risks,
  (deunggibu_data->>'ltvRatio')::NUMERIC,
  (deunggibu_data->>'ltvScore')::INTEGER,
  (deunggibu_data->>'debtScore')::INTEGER,
  (deunggibu_data->>'legalScore')::INTEGER,
  (deunggibu_data->>'marketScore')::INTEGER,
  (deunggibu_data->>'buildingScore')::INTEGER,
  deunggibu_data->'valuation',
  deunggibu_data->'recommendations'
FROM analysis_results
WHERE deunggibu_data IS NOT NULL
ON CONFLICT (analysis_id) DO NOTHING;

-- 3.2 Migrate wolse_analyses → analyses + wolse_price_data
INSERT INTO analyses (id, user_id, property_id, type, status, created_at, expires_at)
SELECT
  id,
  user_id,
  property_id,
  'wolse_price'::analysis_type,
  'completed',
  created_at,
  expires_at
FROM wolse_analyses
ON CONFLICT (id) DO NOTHING;

INSERT INTO wolse_price_data (
  analysis_id,
  user_deposit,
  user_monthly_rent,
  user_implied_rate,
  market_rate,
  market_rate_low,
  market_rate_high,
  legal_rate,
  confidence_level,
  contract_count,
  assessment,
  assessment_details,
  savings_vs_market,
  savings_vs_legal,
  trend_direction,
  trend_percentage,
  trend_advice,
  negotiation_options,
  recent_transactions
)
SELECT
  id,
  user_deposit,
  user_monthly_rent,
  user_implied_rate,
  market_rate,
  market_rate_low,
  market_rate_high,
  legal_rate,
  confidence_level,
  contract_count,
  assessment,
  assessment_details,
  savings_vs_market,
  savings_vs_legal,
  trend_direction,
  trend_percentage,
  trend_advice,
  negotiation_options,
  recent_transactions
FROM wolse_analyses
ON CONFLICT (analysis_id) DO NOTHING;

-- ============================================================
-- PHASE 4: Create Helper Views
-- ============================================================

-- User dashboard view
CREATE OR REPLACE VIEW user_analyses_dashboard AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  a.type,
  a.status,
  a.payment_status,
  a.created_at,
  a.completed_at,
  p.address,
  p.building_name,
  p.exclusive_area,

  -- Type-specific summary fields
  CASE a.type
    WHEN 'jeonse_safety' THEN js.safety_score
    WHEN 'wolse_safety' THEN ws.safety_score
    ELSE NULL
  END as safety_score,

  CASE a.type
    WHEN 'jeonse_safety' THEN js.risk_level
    WHEN 'wolse_safety' THEN ws.risk_level
    ELSE NULL
  END as risk_level,

  CASE a.type
    WHEN 'wolse_price' THEN wp.assessment
    ELSE NULL
  END as price_assessment,

  CASE a.type
    WHEN 'jeonse_safety' THEN js.proposed_jeonse
    WHEN 'wolse_price' THEN wp.user_deposit
    WHEN 'wolse_safety' THEN ws.deposit
    ELSE NULL
  END as deposit_amount

FROM analyses a
JOIN properties p ON a.property_id = p.id
LEFT JOIN jeonse_safety_data js ON a.id = js.analysis_id AND a.type = 'jeonse_safety'
LEFT JOIN wolse_price_data wp ON a.id = wp.analysis_id AND a.type = 'wolse_price'
LEFT JOIN wolse_safety_data ws ON a.id = ws.analysis_id AND a.type = 'wolse_safety';

-- Jeonse safety full view
CREATE OR REPLACE VIEW jeonse_safety_full AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  a.type,
  a.status,
  a.payment_amount,
  a.payment_status,
  a.payment_key,
  a.created_at,
  a.completed_at,
  js.proposed_jeonse,
  js.safety_score,
  js.risk_level,
  js.deunggibu_data,
  js.valuation_data,
  js.risks,
  js.recommendations,
  js.ltv_ratio,
  js.ltv_score,
  js.debt_score,
  js.legal_score,
  js.market_score,
  js.building_score,
  p.address,
  p.building_name,
  p.exclusive_area,
  p.city,
  p.district,
  p.dong
FROM analyses a
JOIN jeonse_safety_data js ON a.id = js.analysis_id
JOIN properties p ON a.property_id = p.id
WHERE a.type = 'jeonse_safety';

-- Wolse price full view
CREATE OR REPLACE VIEW wolse_price_full AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  a.type,
  a.status,
  a.created_at,
  a.expires_at,
  wp.*,
  p.address,
  p.building_name,
  p.exclusive_area,
  p.city,
  p.district,
  p.dong
FROM analyses a
JOIN wolse_price_data wp ON a.id = wp.analysis_id
JOIN properties p ON a.property_id = p.id
WHERE a.type = 'wolse_price';

-- ============================================================
-- PHASE 5: Verify Migration
-- ============================================================

SELECT 'Migration Summary' as info;

SELECT
  'analysis_results (old)' as table_name,
  COUNT(*) as count
FROM analysis_results
UNION ALL
SELECT
  'analyses (new base)' as table_name,
  COUNT(*) as count
FROM analyses
UNION ALL
SELECT
  'jeonse_safety_data (new)' as table_name,
  COUNT(*) as count
FROM jeonse_safety_data
UNION ALL
SELECT
  'wolse_analyses (old)' as table_name,
  COUNT(*) as count
FROM wolse_analyses
UNION ALL
SELECT
  'wolse_price_data (new)' as table_name,
  COUNT(*) as count
FROM wolse_price_data;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE analyses IS 'Base table for all analysis types (jeonse_safety, wolse_price, wolse_safety)';
COMMENT ON TABLE jeonse_safety_data IS 'Extension data for jeonse safety analyses';
COMMENT ON TABLE wolse_price_data IS 'Extension data for wolse price check analyses';
COMMENT ON TABLE wolse_safety_data IS 'Extension data for wolse safety analyses (future feature)';
COMMENT ON VIEW user_analyses_dashboard IS 'Unified view for user dashboard showing all analysis types';
