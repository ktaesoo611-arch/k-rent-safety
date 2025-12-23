# Pending Issues

(No pending issues)

---

# Resolved Issues

## Market Rate Calculation Methodology Overhaul

**Date:** 2025-12-23

**Status:** Resolved

### Problems Addressed

1. **IQR Outlier Removal Too Lenient for Dong-Level Data**
   - IQR bounds were too wide due to high variance in dong-level data
   - Fixed by using 1.0×IQR multiplier for dong-level (vs 1.5× for building-level)

2. **Cross-Building Pair Comparisons**
   - Comparing transactions from different buildings produced meaningless conversion rates
   - Fixed by grouping transactions by building name before pair calculation

3. **Market Trend Conflation**
   - Comparing old vs new transactions conflated conversion rate with market trend
   - Fixed by implementing time-adjusted rent comparison methodology

4. **Dong-Level Parameters Too Loose**
   - 6 months period and ±10% area tolerance produced insufficient data
   - Changed to 12 months period and ±5% area tolerance

### Solution Implemented

**Time-Adjusted Rent Comparison (for dong-level data):**

1. Group transactions by building name (before time adjustment)
2. For each building with ≥2 transactions:
   a. Calculate reference deposit (median of building's deposits)
   b. Group transactions by month
   c. Skip months with <3 transactions
   d. For each valid month, use linear regression to estimate rent at reference deposit
   e. Apply 3-month moving average smoothing
   f. Calculate adjustment factors (latest smoothed rent / each month's smoothed rent)
   g. Adjust all transaction rents by their month's factor
3. Calculate pairs using time-adjusted rents (within same building only)
4. Calculate market rate (median of all valid pairs)

**Example adjustment factors from logs:**
```
e-편한세상: 19 txs, ref deposit 60000만, 4 trend points
  Adjustment factors: [1.13→1.11→1.06→1.00]
```
This shows a rising market - older transactions get their rents adjusted up by 13%→11%→6%→0% respectively.

### Files Modified

- `lib/analyzers/wolse-rate-calculator.ts`
  - Added `calculateTimeAdjustmentFactors()` method
  - Added `applyTimeAdjustment()` method
  - Added `calculateConversionRatePairsWithTimeAdjustment()` method
  - Modified `removeOutliers()` to accept dataSource parameter
  - Modified `calculateMarketRate()` to use time-adjusted method for dong-level

- `lib/apis/molit-wolse.ts`
  - Added `areaToleranceRatio` parameter to `getWolseForDong()` method

- `lib/analyzers/wolse-price-analyzer.ts`
  - Updated `removeOutliers()` to accept dataSource parameter

### Test Results

역삼동 84㎡ test case:
- 144 transactions → 140 after IQR (4 outliers removed)
- 28 buildings identified
- 505 valid rate pairs generated
- Market rate: 4.80% (median)
- Range: 3.54% ~ 6.00% (25th-75th percentile)
