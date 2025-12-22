# Local Development Changelog

This file tracks all features and improvements made locally that need to be deployed.

---

## Pending Deployment (as of 2025-12-19)

### 1. PropertyValuationEngine Integration
**Files Modified:**
- `app/api/documents/parse/route.ts`

**Changes:**
- Replaced simple valuation method with `PropertyValuationEngine`
- Now uses linear regression for market trend detection
- Uses R-squared for statistical confidence measurement
- Pulls 12 months of MOLIT transaction data (previously 6 months)
- Multi-factor confidence calculation

**Impact:** More accurate property valuations with statistical reliability metrics

---

### 2. LLM Parser Enhancements
**Files Modified:**
- `lib/services/llm-parser.ts`

**Changes:**
- Added `area` (전용면적) extraction
- Added 9 legal restriction boolean flags:
  - hasSeizure (압류)
  - hasAuction (경매개시결정)
  - hasProvisionalSeizure (가압류)
  - hasSuperficies (지상권)
  - hasProvisionalRegistration (가등기)
  - hasProvisionalDisposition (가처분)
  - hasEasement (지역권)
  - hasAdvanceNotice (예고등기)
  - hasUnregisteredLandRights (대지권미등기)
- Fixed false positive detection by using only "주요 등기사항 요약" section

**Impact:** Better detection of legal risks from 등기부등본 documents

---

### 3. Market Score Tooltip Update
**Files Modified:**
- `app/analyze/[id]/report/page.tsx`

**Changes:**
- Updated tooltip to match actual calculation methodology
- Corrected thresholds: High ≥70%, Medium 40-70%, Low <40%

**Impact:** Accurate user-facing documentation of scoring methodology

---

### 4. English Apartment Name System (NEW FEATURE)
**Files Created:**
- `lib/data/english-name-mappings.ts` - Brand dictionary + generator
- `scripts/update-english-names.ts` - Update script

**Files Modified:**
- `lib/data/apartment-database.json` - All 5,398 apartments updated

**Changes:**
- Created brand dictionary with 80+ entries (RAEMIAN, Xi, HILLSTATE, etc.)
- Pronunciation-based romanization (문래 → Mullae)
- Proper brand capitalization
- Complex numbering translation (1단지 → Complex 1)
- ~3,900 apartments improved with correct English names
- Search works with both Korean and English names

**Key Mappings:**
| Korean | English |
|--------|---------|
| 래미안 | RAEMIAN |
| 자이 | Xi |
| 힐스테이트 | HILLSTATE |
| 아이파크 | I'PARK |
| 푸르지오 | PRUGIO |
| 롯데캐슬 | LOTTE CASTLE |
| 더샵 | THE SHOP |
| 이편한세상 | e-PYUNHANSESANG |

**Impact:** Users can search apartments by English brand names

---

### 5. Landing Page Redesigns (NEW FEATURE)
**Files Created:**
- `app/page-v2.tsx` - Glassmorphism design (dark, tech-forward)
- `app/page-v3.tsx` - Cosmic/Minimalist design (dark, futuristic, scientific)
- `app/page-v4.tsx` - Warm/Neighborly design (light, trustworthy, home-focused)
- `app/preview/page.tsx` - Preview switcher for all versions

**Design Options:**

| Version | Theme | Style |
|---------|-------|-------|
| V2 | Glassmorphism | Dark slate, emerald/cyan gradients, floating glass cards |
| V3 | Cosmic | Pure black, nebula effects, particle network, shooting stars |
| V4 | Warm | Light cream, amber accents, animated house illustration |

**V3 Features (Cosmic/Scientific):**
- Canvas particle network animation with connections
- Nebula gradient clouds (purple, cyan, pink, blue, green)
- Star field with twinkling effect
- Shooting stars appearing randomly
- Scanning line effects
- TypeWriter text effect
- Animated stat counters
- Orbital data visualization

**V4 Features (Warm/Trustworthy):**
- Animated SVG house with:
  - Windows lighting up sequentially
  - Smoke rising from chimney
  - Floating heart animation
  - Shield badge for safety
- Staggered entrance animations on scroll
- Hover effects on all cards (lift, shadow, scale)
- Floating background blobs
- Trust signals and testimonial section
- Sample report preview card

**Preview Access:** `/preview` with version switcher (V2 Glass, V3 Cosmic, V4 Warm)

**Impact:** Multiple landing page options to choose from before deployment

---

### 6. Wolse Fair Price Verification Feature (NEW FEATURE)

**Status:** ✅ Tested locally, database migration complete

**Files Created:**
- `lib/apis/molit-wolse.ts` - MOLIT API wrapper for rent transactions
- `lib/analyzers/wolse-rate-calculator.ts` - Market rate calculation engine
- `lib/analyzers/wolse-price-analyzer.ts` - User quote analysis and recommendations
- `lib/services/wolse-cache.ts` - Market rate caching with 7-day expiry
- `app/api/wolse/analyze/route.ts` - API endpoint for wolse analysis
- `components/wolse/WolseInputForm.tsx` - Input form component
- `components/wolse/WolseResultsDisplay.tsx` - Results display with negotiation scripts
- `components/wolse/index.ts` - Component exports
- `app/analyze/wolse/page.tsx` - Main wolse analysis page
- `supabase/migrations/20241218_wolse_tables.sql` - Database migration

**Files Modified:**
- `lib/supabase.ts` - Added Wolse table types
- `lib/types/index.ts` - Added Wolse types

**Bug Fixes:**
- Fixed UUID generation (was using custom format, now uses `crypto.randomUUID()`)

**Core Features:**
1. **Market Rate Calculation**
   - Fetches recent wolse contracts from MOLIT API
   - Calculates implied conversion rates from transaction pairs
   - Uses time-weighted median for market rate
   - Linear regression for trend detection with R-squared confidence

2. **Legal Compliance Check**
   - Compares against Housing Lease Protection Act limits
   - Legal cap: min(10%, BOK base rate + 2%) = 4.5%
   - Flags quotes exceeding legal limits

3. **Assessment Levels**
   - GOOD_DEAL: ≥10% below legal cap
   - FAIR: At or below market rate
   - OVERPRICED: Above market, within legal
   - SEVERELY_OVERPRICED: >20% above legal cap

4. **Negotiation Options**
   - Market rate option with savings calculation
   - Legal maximum option (if above legal)
   - Aggressive/trend-based option (if declining market)
   - Ready-to-use negotiation scripts in Korean

5. **Data Fallback Strategy**
   - Building-level data (HIGH confidence)
   - Dong-level data (LOW confidence)
   - Legal rate only (INSUFFICIENT data)

**Conversion Rate Formula:**
```
rate = ((rent1 - rent2) × 12) / (deposit2 - deposit1) × 100
```

**Time-weighted Rate:**
```
weight = 1 / (1 + months_ago × 0.2)
```

**Database Tables:**
- `wolse_market_rates` - Cached market rates (7-day expiry)
- `wolse_analyses` - User analysis results

**Access:** `/analyze/wolse`

**Impact:** Helps foreigners verify if their monthly rent quotes are fair and provides negotiation leverage

---

---

### 8. Toss Payments Integration (COMPLETED)

**Status:** ✅ Live API keys configured, payment flow implemented

**Files Created:**
- `app/api/wolse/create/route.ts` - Creates pending analysis before payment
- `app/api/wolse/skip-payment/route.ts` - Free beta flow (skips payment, runs analysis)
- `app/api/wolse/run-analysis/route.ts` - Runs analysis after paid payment
- `app/api/wolse/status/route.ts` - Check analysis status
- `app/analyze/wolse/[id]/page.tsx` - Results display page
- `app/analyze/wolse/[id]/payment/page.tsx` - Payment page with Toss widget
- `app/analyze/wolse/[id]/payment/success/page.tsx` - Payment success handler
- `app/analyze/wolse/[id]/payment/fail/page.tsx` - Payment failure handler

**Files Modified:**
- `app/analyze/wolse/page.tsx` - Redirects to payment flow after form submission
- `.env.local` - Added Toss live API keys

**Payment Flow:**
1. User fills wolse form → Creates pending analysis
2. Redirects to payment page
3. User chooses: "Test Payment (₩9,900)" or "Continue Free (Beta)"
4. Free beta: Runs analysis immediately, redirects to results
5. Paid: Opens Toss payment widget → Success page → Runs analysis → Results

**Key Features:**
- Toss Payments SDK integration (`@tosspayments/payment-widget-sdk`)
- Customer key format fix (2-50 char limit for Toss)
- SessionStorage for passing input data between pages
- Free beta period support (₩0 payment)

**Environment Variables:**
```env
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=live_gck_...
TOSS_PAYMENTS_SECRET_KEY=live_gsk_...
```

**Impact:** Users can pay for wolse analysis (or use free during beta)

---

### 10. Jeonse Preview → Payment Flow (COMPLETED)

**Status:** ✅ New flow implemented, bug fixes applied

**Problem:** Previous flow required payment BEFORE showing any analysis results. Users had to pay without knowing what they would get.

**Solution:** Implemented preview → payment flow (similar to Wolse):
1. Form (Step 1 of 3) → Upload (Step 2 of 3) → Processing (Step 3 of 3) → Preview → Unlock → Full Report

**Files Created:**
- `components/jeonse/JeonsePreviewDisplay.tsx` - Preview component with blurred data
- `components/jeonse/index.ts` - Component exports
- `app/analyze/[id]/preview/page.tsx` - Preview page with unlock modal

**Files Modified:**
- `app/analyze/page.tsx` - Skip payment, go directly to upload
- `app/analyze/[id]/upload/page.tsx` - Updated step number (2 of 3)
- `app/analyze/[id]/processing/page.tsx` - Updated step number (3 of 3), redirect to preview based on paymentStatus
- `app/api/analysis/status/[id]/route.ts` - Added paymentStatus to response
- `app/analyze/[id]/payment/success/page.tsx` - Handle incomplete Toss parameters gracefully
- `app/api/payments/verify/route.ts` - Create payment record if none exists (for preview flow)

**New Flow:**
1. User fills form → Goes directly to upload (no payment)
2. Upload document → Start processing
3. Processing completes → Redirect to preview (not report)
4. Preview shows:
   - Risk level badge (SAFE, MODERATE, HIGH, CRITICAL) - visible
   - Verdict text - visible
   - Number of issues detected - visible
   - Jeonse deposit amount - visible
   - Safety score - BLURRED
   - LTV, debt metrics - BLURRED
   - Debt ranking table - LOCKED
   - Risk details - LOCKED
   - Recommendations - LOCKED
5. User clicks "Unlock" → Payment modal (free during beta)
6. After unlock → Full report

**Preview Features:**
- Blurred value component with lock icon
- Issues summary with severity badges
- Unlock CTA with feature list
- Payment modal with:
  - Free beta option (primary)
  - Paid option (₩14,900)
  - Toss payment widget integration

**Payment Policy Changes:**
- Payment is now deferred until AFTER analysis is complete
- Users see a preview of their results before deciding to pay
- Free beta option remains available during beta period
- Payment record is created at verification time (not upfront)

**Bug Fixes Applied:**
1. **Payment success page handling** - When Toss redirects with incomplete parameters (missing paymentKey/amount), the page now gracefully falls back to free beta flow instead of showing error
2. **Payment verification API** - Modified to create payment record if none exists, since preview flow doesn't create payment upfront. Extracts analysis ID from orderId format (`jeonse_UUID_timestamp`) to link payment to analysis
3. **Processing page redirect logic** - Checks `paymentStatus` to determine redirect destination (preview vs report)

**Impact:** Users can see if the analysis is worth paying for before unlocking full details

---

### 9. Wolse Rent Comparison Fields Fix (COMPLETED)

**Status:** ✅ Database migration applied, UI displays correct values

**Problem:** The "Expected Rent (Market)" card was showing 170만원 (user's rent) instead of 154만원 (calculated expected rent)

**Root Cause:** The new rent comparison fields from the regression-based methodology were not being saved to the database or included in the API response.

**Files Modified:**
- `lib/types/analysis.ts` - Added new fields to `WolsePriceData` interface
- `lib/services/analysis-service.ts` - Updated `saveWolsePriceData` to save new fields
- `app/api/wolse/skip-payment/route.ts` - Pass new fields when saving
- `app/api/wolse/analyze/route.ts` - Pass new fields when saving
- `app/api/wolse/run-analysis/route.ts` - Pass new fields when saving

**Files Created:**
- `supabase/migrations/20241222_add_wolse_rent_comparison_fields.sql`

**New Database Columns Added to `wolse_price_data`:**
- `expected_rent` - Expected monthly rent at user's deposit level
- `rent_difference` - Difference between user rent and expected rent
- `rent_difference_percent` - Percentage difference from expected
- `clean_transaction_count` - Transactions after outlier removal
- `outliers_removed` - Number of outliers removed from analysis

**SQL Migration Applied:**
```sql
DROP VIEW IF EXISTS wolse_price_full;
ALTER TABLE wolse_price_data
  ADD COLUMN IF NOT EXISTS expected_rent BIGINT,
  ADD COLUMN IF NOT EXISTS rent_difference BIGINT,
  ADD COLUMN IF NOT EXISTS rent_difference_percent NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS clean_transaction_count INTEGER,
  ADD COLUMN IF NOT EXISTS outliers_removed INTEGER;
-- Recreated wolse_price_full view with new columns
```

**Impact:** UI now correctly shows expected rent (154만원) vs user's rent (170만원) with proper difference calculation

---

### 7. Option C Schema Migration (COMPLETED)

**Status:** ✅ Migration complete, APIs updated

**Purpose:** Unify jeonse and wolse analyses into a single base table with extensions

**Files Created:**
- `supabase/migrations/20241219_option_c_migration.sql` - Full migration script
- `lib/types/analysis.ts` - Unified analysis types
- `lib/services/analysis-service.ts` - Unified analysis service

**Files Modified:**
- `lib/supabase.ts` - Added new table types (analyses, jeonse_safety_data, wolse_price_data, wolse_safety_data)
- `app/api/wolse/analyze/route.ts` - Uses new schema with fallback
- `app/api/analysis/create/route.ts` - Uses new schema with fallback
- `app/api/analysis/status/[id]/route.ts` - Tries new schema first, then old
- `app/api/analysis/report/[id]/route.ts` - Tries new schema first, then old
- `app/api/documents/parse/route.ts` - Dual-writes to both schemas

**New Database Tables:**
- `analyses` - Base table for all analysis types
- `jeonse_safety_data` - Extension for jeonse safety analyses
- `wolse_price_data` - Extension for wolse price analyses
- `wolse_safety_data` - Extension for future wolse safety feature

**New Database Views:**
- `user_analyses_dashboard` - Unified view for user dashboard
- `jeonse_safety_full` - Full jeonse data with property info
- `wolse_price_full` - Full wolse data with property info

**Migration Results:**
- 386 analyses migrated (base table)
- 316 jeonse_safety_data records
- 1 wolse_price_data record

**Benefits:**
- Unified user dashboard across all analysis types
- Single payment flow
- Easy to add Wolse Safety feature
- Shared risk analysis logic
- Backward compatible with old schema

---

## Future Tasks (Post-Deployment)

### Wolse Safety Check Feature
- **Status:** Schema ready (wolse_safety_data table created)
- **Purpose:** Safety analysis for wolse contracts (similar to jeonse safety)
- **Implementation:** TBD after Toss integration

---

## Deployment Checklist

- [x] Complete Toss Payment integration ✅
- [x] Run wolse rent comparison fields migration ✅
- [ ] Choose landing page version (V2/V3/V4)
- [x] Run database migration for Wolse tables ✅
- [x] Test Wolse feature locally ✅
- [x] Run Option C schema migration ✅
- [x] Update all APIs for new schema ✅
- [ ] Test all other features locally
- [ ] Push changes to GitHub
- [ ] Deploy to production
- [ ] Verify:
  - [ ] Property valuation works with new engine
  - [ ] LLM parser extracts all legal flags
  - [ ] English apartment search works
  - [ ] Market score tooltip is correct
  - [x] Toss Payment flow works end-to-end ✅
  - [ ] Landing page displays correctly
  - [x] Wolse analysis works at `/analyze/wolse` ✅
  - [x] Wolse expected rent displays correctly ✅
  - [x] Jeonse preview → payment flow works ✅
  - [ ] Jeonse analysis works with new schema

---

## Database Migrations Required

~~All migrations completed:~~ ✅ **COMPLETED**

```sql
-- 1. Wolse tables (supabase/migrations/20241218_wolse_tables.sql)
-- Creates: wolse_market_rates, wolse_analyses
-- Status: Applied to Supabase on 2025-12-19

-- 2. Option C Schema (supabase/migrations/20241219_option_c_migration.sql)
-- Creates: analyses, jeonse_safety_data, wolse_price_data, wolse_safety_data
-- Creates views: user_analyses_dashboard, jeonse_safety_full, wolse_price_full
-- Migrates existing data from analysis_results and wolse_analyses
-- Status: Applied to Supabase on 2025-12-19
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://ncqchpvhvoqeeydtmhut.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
MOLIT_API_KEY=<your-key>
DOCUMENT_AI_PROCESSOR_ID=ed844b91b5c440ef
ANTHROPIC_API_KEY=<your-key>
# Toss Payment keys (to be added)
TOSS_CLIENT_KEY=<your-key>
TOSS_SECRET_KEY=<your-key>
```

---

*Last updated: 2025-12-22 (Jeonse Preview → Payment Flow + Bug Fixes)*
