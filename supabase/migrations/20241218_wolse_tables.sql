-- Wolse Market Rate Cache Table
-- Caches calculated market conversion rates with 7-day expiry

CREATE TABLE IF NOT EXISTS wolse_market_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawd_cd VARCHAR(5) NOT NULL,
  apartment_name VARCHAR(255) NOT NULL,
  area_range_min NUMERIC(6, 2) NOT NULL,
  area_range_max NUMERIC(6, 2) NOT NULL,
  market_rate NUMERIC(5, 2) NOT NULL,
  rate_25th_percentile NUMERIC(5, 2) NOT NULL,
  rate_75th_percentile NUMERIC(5, 2) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL,
  contract_count INTEGER NOT NULL DEFAULT 0,
  trend_direction VARCHAR(20) NOT NULL DEFAULT 'STABLE',
  trend_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Unique constraint for upsert
  UNIQUE(lawd_cd, apartment_name, area_range_min, area_range_max)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_wolse_market_rates_lookup
  ON wolse_market_rates(lawd_cd, apartment_name, expires_at);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_wolse_market_rates_expires
  ON wolse_market_rates(expires_at);


-- Wolse Analysis Results Table
-- Stores user's wolse analysis results

CREATE TABLE IF NOT EXISTS wolse_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- User's quote
  user_deposit BIGINT NOT NULL,
  user_monthly_rent BIGINT NOT NULL,
  user_implied_rate NUMERIC(5, 2) NOT NULL,

  -- Market data
  market_rate NUMERIC(5, 2) NOT NULL,
  market_rate_low NUMERIC(5, 2) NOT NULL,
  market_rate_high NUMERIC(5, 2) NOT NULL,
  legal_rate NUMERIC(5, 2) NOT NULL,
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
  trend_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  trend_advice TEXT,

  -- Recommendations (JSON)
  negotiation_options JSONB,
  recent_transactions JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_wolse_analyses_user
  ON wolse_analyses(user_id, created_at DESC);

-- Index for property lookups
CREATE INDEX IF NOT EXISTS idx_wolse_analyses_property
  ON wolse_analyses(property_id, created_at DESC);


-- Enable Row Level Security
ALTER TABLE wolse_market_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolse_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wolse_market_rates (read-only for all, write for service role)
CREATE POLICY "Anyone can read market rates"
  ON wolse_market_rates FOR SELECT
  USING (true);

-- RLS Policies for wolse_analyses
CREATE POLICY "Users can view their own analyses"
  ON wolse_analyses FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create analyses"
  ON wolse_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- Comments for documentation
COMMENT ON TABLE wolse_market_rates IS 'Cache for calculated market conversion rates (전환율) with 7-day expiry';
COMMENT ON TABLE wolse_analyses IS 'User wolse analysis results with negotiation recommendations';
COMMENT ON COLUMN wolse_market_rates.lawd_cd IS 'Legal district code (법정동코드, 5 digits)';
COMMENT ON COLUMN wolse_market_rates.market_rate IS 'Median market conversion rate (%)';
COMMENT ON COLUMN wolse_analyses.user_implied_rate IS 'Conversion rate implied by user quote (%)';
COMMENT ON COLUMN wolse_analyses.assessment IS 'GOOD_DEAL, FAIR, OVERPRICED, or SEVERELY_OVERPRICED';
