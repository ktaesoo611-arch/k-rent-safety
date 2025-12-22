-- ============================================================
-- MIGRATION: Add rent comparison fields to wolse_price_data
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add new columns for regression-based rent comparison methodology
ALTER TABLE wolse_price_data
  ADD COLUMN IF NOT EXISTS expected_rent BIGINT,
  ADD COLUMN IF NOT EXISTS rent_difference BIGINT,
  ADD COLUMN IF NOT EXISTS rent_difference_percent NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS clean_transaction_count INTEGER,
  ADD COLUMN IF NOT EXISTS outliers_removed INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN wolse_price_data.expected_rent IS 'Expected monthly rent at user deposit level based on market rate regression';
COMMENT ON COLUMN wolse_price_data.rent_difference IS 'Difference between user rent and expected rent (positive = overpaying)';
COMMENT ON COLUMN wolse_price_data.rent_difference_percent IS 'Percentage difference from expected rent';
COMMENT ON COLUMN wolse_price_data.clean_transaction_count IS 'Number of transactions after outlier removal';
COMMENT ON COLUMN wolse_price_data.outliers_removed IS 'Number of outlier transactions removed from analysis';

-- Recreate the wolse_price_full view to include new columns
CREATE OR REPLACE VIEW wolse_price_full AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  a.type,
  a.status,
  a.created_at,
  a.expires_at,
  wp.analysis_id,
  wp.user_deposit,
  wp.user_monthly_rent,
  wp.user_implied_rate,
  wp.expected_rent,
  wp.rent_difference,
  wp.rent_difference_percent,
  wp.clean_transaction_count,
  wp.outliers_removed,
  wp.market_rate,
  wp.market_rate_low,
  wp.market_rate_high,
  wp.legal_rate,
  wp.confidence_level,
  wp.contract_count,
  wp.assessment,
  wp.assessment_details,
  wp.savings_vs_market,
  wp.savings_vs_legal,
  wp.trend_direction,
  wp.trend_percentage,
  wp.trend_advice,
  wp.negotiation_options,
  wp.recent_transactions,
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

-- Verify migration
SELECT 'Wolse price data columns after migration:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wolse_price_data'
ORDER BY ordinal_position;
