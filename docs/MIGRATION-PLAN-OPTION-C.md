# Migration Plan: Option C (Base + Extension Pattern)

## Overview

Migrate from separate analysis tables to a unified base table with type-specific extensions.

---

## Current Schema

```
┌─────────────────┐
│   properties    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────────────┐  ┌─────────────────┐
│ analysis_results│  │ wolse_analyses  │
│ (jeonse safety) │  │ (wolse price)   │
└─────────────────┘  └─────────────────┘
```

### Current Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `properties` | Property info | ~100+ |
| `analysis_results` | Jeonse safety analysis | ~50+ |
| `wolse_analyses` | Wolse price analysis | New |
| `wolse_market_rates` | Cache (keep as-is) | New |

---

## Target Schema (Option C)

```
┌─────────────────┐
│   properties    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    analyses     │  ◄── Base table (common fields)
│   type: enum    │
└────────┬────────┘
         │
    ┌────┼────────────────┐
    │    │                │
    ▼    ▼                ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│  jeonse_   │ │  wolse_    │ │  wolse_    │
│safety_data │ │ price_data │ │safety_data │
└────────────┘ └────────────┘ └────────────┘
                              (future)
```

---

## Phase 1: Create New Tables (Non-Breaking)

### 1.1 Create Base `analyses` Table

```sql
-- Create analysis type enum
CREATE TYPE analysis_type AS ENUM (
  'jeonse_safety',
  'wolse_price',
  'wolse_safety'
);

-- Create base analyses table
CREATE TABLE analyses (
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

-- Indexes
CREATE INDEX idx_analyses_user ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_property ON analyses(property_id, created_at DESC);
CREATE INDEX idx_analyses_type ON analyses(type, created_at DESC);
CREATE INDEX idx_analyses_status ON analyses(status) WHERE status != 'completed';

-- RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  USING (auth.uid() = user_id);
```

### 1.2 Create `jeonse_safety_data` Extension Table

```sql
CREATE TABLE jeonse_safety_data (
  analysis_id UUID PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,

  -- Jeonse-specific fields
  proposed_jeonse BIGINT NOT NULL,
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
  ltv_score INTEGER,
  debt_score INTEGER,
  legal_score INTEGER,
  market_score INTEGER,
  building_score INTEGER
);

-- RLS (inherits from base table via JOIN)
ALTER TABLE jeonse_safety_data ENABLE ROW LEVEL SECURITY;

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
```

### 1.3 Create `wolse_price_data` Extension Table

```sql
CREATE TABLE wolse_price_data (
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

  -- Recommendations
  negotiation_options JSONB,
  recent_transactions JSONB
);

-- RLS
ALTER TABLE wolse_price_data ENABLE ROW LEVEL SECURITY;

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
```

### 1.4 Create `wolse_safety_data` Extension Table (Future)

```sql
CREATE TABLE wolse_safety_data (
  analysis_id UUID PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,

  -- Wolse quote
  deposit BIGINT NOT NULL,
  monthly_rent BIGINT NOT NULL,

  -- Safety analysis (similar to jeonse)
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
  deposit_safety_ratio NUMERIC(5,2)  -- deposit / property_value
);

-- RLS
ALTER TABLE wolse_safety_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wolse safety data"
  ON wolse_safety_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
      AND (a.user_id = auth.uid() OR a.user_id IS NULL)
    )
  );
```

---

## Phase 2: Data Migration

### 2.1 Migrate `analysis_results` → `analyses` + `jeonse_safety_data`

```sql
-- Step 1: Insert into base table
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
FROM analysis_results;

-- Step 2: Insert into extension table
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
WHERE status = 'completed';

-- Step 3: Verify migration
SELECT
  (SELECT COUNT(*) FROM analysis_results) as old_count,
  (SELECT COUNT(*) FROM analyses WHERE type = 'jeonse_safety') as new_base_count,
  (SELECT COUNT(*) FROM jeonse_safety_data) as new_extension_count;
```

### 2.2 Migrate `wolse_analyses` → `analyses` + `wolse_price_data`

```sql
-- Step 1: Insert into base table
INSERT INTO analyses (id, user_id, property_id, type, status, created_at, expires_at)
SELECT
  id,
  user_id,
  property_id,
  'wolse_price'::analysis_type,
  'completed',
  created_at,
  expires_at
FROM wolse_analyses;

-- Step 2: Insert into extension table
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
FROM wolse_analyses;

-- Step 3: Verify migration
SELECT
  (SELECT COUNT(*) FROM wolse_analyses) as old_count,
  (SELECT COUNT(*) FROM analyses WHERE type = 'wolse_price') as new_base_count,
  (SELECT COUNT(*) FROM wolse_price_data) as new_extension_count;
```

---

## Phase 3: Create Helper Views

### 3.1 Unified User Dashboard View

```sql
CREATE VIEW user_analyses_dashboard AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  a.type,
  a.status,
  a.payment_status,
  a.created_at,
  p.address,
  p.building_name,

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
```

### 3.2 Full Analysis View (for API responses)

```sql
-- Jeonse Safety Full View
CREATE VIEW jeonse_safety_full AS
SELECT
  a.*,
  js.*,
  p.address,
  p.building_name,
  p.exclusive_area
FROM analyses a
JOIN jeonse_safety_data js ON a.id = js.analysis_id
JOIN properties p ON a.property_id = p.id
WHERE a.type = 'jeonse_safety';

-- Wolse Price Full View
CREATE VIEW wolse_price_full AS
SELECT
  a.*,
  wp.*,
  p.address,
  p.building_name,
  p.exclusive_area
FROM analyses a
JOIN wolse_price_data wp ON a.id = wp.analysis_id
JOIN properties p ON a.property_id = p.id
WHERE a.type = 'wolse_price';
```

---

## Phase 4: Update Application Code

### 4.1 New TypeScript Types

```typescript
// lib/types/analysis.ts

export type AnalysisType = 'jeonse_safety' | 'wolse_price' | 'wolse_safety';

export interface AnalysisBase {
  id: string;
  userId?: string;
  propertyId: string;
  type: AnalysisType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentAmount?: number;
  paymentStatus?: string;
  paymentKey?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface JeonseSafetyAnalysis extends AnalysisBase {
  type: 'jeonse_safety';
  data: {
    proposedJeonse: number;
    safetyScore: number;
    riskLevel: string;
    deunggibuData: DeunggibuData;
    valuationData: ValuationResult;
    risks: RiskFinding[];
    recommendations: string[];
    scores: {
      ltv: number;
      debt: number;
      legal: number;
      market: number;
      building: number;
    };
  };
}

export interface WolsePriceAnalysis extends AnalysisBase {
  type: 'wolse_price';
  data: WolseAnalysisResult;
}

export interface WolseSafetyAnalysis extends AnalysisBase {
  type: 'wolse_safety';
  data: {
    deposit: number;
    monthlyRent: number;
    safetyScore: number;
    riskLevel: string;
    deunggibuData: DeunggibuData;
    valuationData: ValuationResult;
    risks: RiskFinding[];
    depositSafetyRatio: number;
  };
}

export type Analysis = JeonseSafetyAnalysis | WolsePriceAnalysis | WolseSafetyAnalysis;
```

### 4.2 New Database Service

```typescript
// lib/services/analysis-service.ts

export class AnalysisService {

  async createAnalysis(
    type: AnalysisType,
    propertyId: string,
    userId?: string
  ): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .insert({
        type,
        property_id: propertyId,
        user_id: userId,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async getAnalysis(id: string): Promise<Analysis> {
    // Get base analysis
    const { data: base } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    // Get extension data based on type
    switch (base.type) {
      case 'jeonse_safety':
        const { data: jsData } = await supabaseAdmin
          .from('jeonse_safety_data')
          .select('*')
          .eq('analysis_id', id)
          .single();
        return { ...base, data: jsData } as JeonseSafetyAnalysis;

      case 'wolse_price':
        const { data: wpData } = await supabaseAdmin
          .from('wolse_price_data')
          .select('*')
          .eq('analysis_id', id)
          .single();
        return { ...base, data: wpData } as WolsePriceAnalysis;

      // ... etc
    }
  }

  async getUserAnalyses(userId: string): Promise<Analysis[]> {
    const { data } = await supabaseAdmin
      .from('user_analyses_dashboard')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data;
  }
}
```

### 4.3 API Route Updates

```typescript
// app/api/analysis/create/route.ts - Updated

export async function POST(request: NextRequest) {
  const { type, propertyId, ...typeSpecificData } = await request.json();

  const analysisService = new AnalysisService();

  // Create base analysis
  const analysisId = await analysisService.createAnalysis(
    type,
    propertyId,
    user?.id
  );

  // Type-specific handling happens in processing
  return NextResponse.json({ analysisId });
}
```

---

## Phase 5: Deprecate Old Tables

### 5.1 Rename Old Tables (Keep as Backup)

```sql
-- After verifying migration is successful
ALTER TABLE analysis_results RENAME TO analysis_results_deprecated;
ALTER TABLE wolse_analyses RENAME TO wolse_analyses_deprecated;

-- Add comments
COMMENT ON TABLE analysis_results_deprecated IS
  'DEPRECATED: Migrated to analyses + jeonse_safety_data on YYYY-MM-DD';
COMMENT ON TABLE wolse_analyses_deprecated IS
  'DEPRECATED: Migrated to analyses + wolse_price_data on YYYY-MM-DD';
```

### 5.2 Create Compatibility Views (Optional)

```sql
-- For backward compatibility during transition
CREATE VIEW analysis_results AS
SELECT
  a.id,
  a.user_id,
  a.property_id,
  js.proposed_jeonse,
  js.safety_score,
  js.risk_level,
  js.deunggibu_data,
  js.risks,
  a.status,
  a.payment_amount,
  a.payment_status,
  a.payment_key,
  a.created_at,
  a.completed_at
FROM analyses a
JOIN jeonse_safety_data js ON a.id = js.analysis_id
WHERE a.type = 'jeonse_safety';
```

### 5.3 Drop Deprecated Tables (Final)

```sql
-- After 30 days and confirming no issues
DROP TABLE IF EXISTS analysis_results_deprecated;
DROP TABLE IF EXISTS wolse_analyses_deprecated;
```

---

## Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | Day 1 | Create new tables (non-breaking) |
| Phase 2 | Day 1-2 | Migrate data |
| Phase 3 | Day 2 | Create views |
| Phase 4 | Day 2-5 | Update application code |
| Phase 5a | Day 5 | Rename old tables |
| Testing | Day 5-10 | Verify everything works |
| Phase 5b | Day 30+ | Drop deprecated tables |

---

## Rollback Plan

If issues occur:

```sql
-- Restore original table names
ALTER TABLE analysis_results_deprecated RENAME TO analysis_results;
ALTER TABLE wolse_analyses_deprecated RENAME TO wolse_analyses;

-- Drop new tables
DROP TABLE IF EXISTS wolse_safety_data;
DROP TABLE IF EXISTS wolse_price_data;
DROP TABLE IF EXISTS jeonse_safety_data;
DROP TABLE IF EXISTS analyses;
DROP TYPE IF EXISTS analysis_type;
```

---

## Benefits After Migration

1. **Unified Dashboard Query**
   ```sql
   SELECT * FROM user_analyses_dashboard WHERE user_id = $1;
   ```

2. **Single Payment Flow**
   - All analysis types use same `analyses.payment_*` columns

3. **Easy to Add New Types**
   - Just add new enum value + extension table

4. **Shared Logic**
   - Risk analysis code works for both jeonse_safety and wolse_safety

5. **Clean Separation**
   - No nullable columns for type-specific data
   - Each extension table is focused

---

## Files to Update

| File | Changes |
|------|---------|
| `lib/supabase.ts` | Add new table types |
| `lib/types/index.ts` | Add unified Analysis types |
| `lib/services/analysis-service.ts` | New unified service |
| `app/api/analysis/create/route.ts` | Use new schema |
| `app/api/analysis/report/[id]/route.ts` | Query new tables |
| `app/api/wolse/analyze/route.ts` | Use new schema |
| `components/dashboard/*` | Use unified view |

---

*Created: 2025-12-19*
