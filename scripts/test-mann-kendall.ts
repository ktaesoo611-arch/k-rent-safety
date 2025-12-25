import { config } from 'dotenv';
config({ path: '.env.local' });

/**
 * Mann-Kendall Trend Test
 * Non-parametric test for monotonic trends in time series data
 *
 * Returns:
 * - S: test statistic (positive = rising, negative = declining)
 * - Z: normalized test statistic
 * - p: two-tailed p-value
 * - trend: 'RISING' | 'DECLINING' | 'STABLE'
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  Z: number;
  pValue: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
  significant: boolean;
} {
  // Sort by x (time)
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) {
    return { S: 0, Z: 0, pValue: 1, trend: 'STABLE', significant: false };
  }

  // Calculate S statistic
  // S = sum of sign(y[j] - y[i]) for all j > i
  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = sorted[j].y - sorted[i].y;
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
      // ties contribute 0
    }
  }

  // Calculate variance of S
  // For data with ties, we need to adjust variance
  // Simplified formula (no ties adjustment): Var(S) = n(n-1)(2n+5)/18
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;

  // Calculate Z statistic
  let Z: number;
  if (S > 0) {
    Z = (S - 1) / Math.sqrt(varS);
  } else if (S < 0) {
    Z = (S + 1) / Math.sqrt(varS);
  } else {
    Z = 0;
  }

  // Calculate two-tailed p-value using standard normal distribution
  // Using error function approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(Z)));

  // Determine trend (using α = 0.05 significance level)
  const alpha = 0.05;
  let trend: 'RISING' | 'DECLINING' | 'STABLE';
  const significant = pValue < alpha;

  if (significant) {
    trend = S > 0 ? 'RISING' : 'DECLINING';
  } else {
    trend = 'STABLE';
  }

  return { S, Z, pValue, trend, significant };
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate Theil-Sen slope (median of pairwise slopes)
 */
function theilSenSlope(data: { x: number; y: number }[]): number {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 2) return 0;

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = sorted[j].x - sorted[i].x;
      if (dx !== 0) {
        slopes.push((sorted[j].y - sorted[i].y) / dx);
      }
    }
  }

  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0
    ? (slopes[mid - 1] + slopes[mid]) / 2
    : slopes[mid];
}

// Import the calculator to get real data
import { WolseRateCalculator } from '../lib/analyzers/wolse-rate-calculator';

async function testMannKendall() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const calculator = new WolseRateCalculator(apiKey);

  const testCases = [
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '센트라스', area: 85 },
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '텐즈힐1단지', area: 85 },
  ];

  console.log('='.repeat(70));
  console.log('MANN-KENDALL vs R² TREND DETECTION COMPARISON');
  console.log('='.repeat(70));

  const results: Array<{
    location: string;
    rSquaredDirection: string;
    rSquaredChange: number;
    rSquared: number;
    mkDirection: string;
    mkPValue: number;
    mkSignificant: boolean;
    theilSenSlope: number;
    pairCount: number;
  }> = [];

  for (const tc of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${tc.dong} ${tc.area}㎡`);
    console.log('='.repeat(70));

    const result = await calculator.calculateMarketRate(
      tc.city,
      tc.district,
      tc.dong,
      tc.building,
      tc.area
    );

    // Current R² method
    console.log('\n--- Current Method (Linear Regression + R²) ---');
    console.log(`Direction: ${result.trend.direction}`);
    console.log(`Change: ${result.trend.percentage.toFixed(1)}%`);
    console.log(`R²: ${(result.trend.rSquared * 100).toFixed(2)}%`);

    // Mann-Kendall on real data
    if (result.ratePairs && result.ratePairs.length > 3) {
      console.log('\n--- Mann-Kendall Test (Real Data) ---');
      const mkResult = mannKendallTest(result.ratePairs);
      const tsSlope = theilSenSlope(result.ratePairs);

      console.log(`Data points: ${result.ratePairs.length}`);
      console.log(`S statistic: ${mkResult.S}`);
      console.log(`Z statistic: ${mkResult.Z.toFixed(3)}`);
      console.log(`p-value: ${mkResult.pValue.toFixed(6)}`);
      console.log(`Significant (α=0.05): ${mkResult.significant}`);
      console.log(`Trend: ${mkResult.trend}`);
      console.log(`Theil-Sen slope: ${(tsSlope * 30).toFixed(4)}%/month`);

      results.push({
        location: tc.dong,
        rSquaredDirection: result.trend.direction,
        rSquaredChange: result.trend.percentage,
        rSquared: result.trend.rSquared,
        mkDirection: mkResult.trend,
        mkPValue: mkResult.pValue,
        mkSignificant: mkResult.significant,
        theilSenSlope: tsSlope * 30,
        pairCount: result.ratePairs.length
      });
    }
  }

  // Summary comparison table
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(70));
  console.log('\n| Location | R² Method | R² | MK Method | p-value | Theil-Sen |');
  console.log('|----------|-----------|-----|-----------|---------|-----------|');
  for (const r of results) {
    console.log(`| ${r.location.padEnd(8)} | ${r.rSquaredDirection.padEnd(9)} | ${(r.rSquared * 100).toFixed(1).padStart(4)}% | ${r.mkDirection.padEnd(9)} | ${r.mkPValue.toFixed(4).padStart(7)} | ${r.theilSenSlope.toFixed(3).padStart(9)}%/mo |`);
  }

  // Demonstrate with synthetic data
  console.log('\n' + '='.repeat(70));
  console.log('SYNTHETIC DATA DEMONSTRATION');
  console.log('='.repeat(70));

  // Case 1: Clear declining trend
  console.log('\n--- Case 1: Clear Declining Trend ---');
  const decliningData = Array.from({ length: 100 }, (_, i) => ({
    x: i,
    y: 6 - 0.01 * i + (Math.random() - 0.5) * 2 // 6% declining to 5% with noise
  }));
  const decliningResult = mannKendallTest(decliningData);
  const decliningSlope = theilSenSlope(decliningData);
  console.log(`S statistic: ${decliningResult.S}`);
  console.log(`Z statistic: ${decliningResult.Z.toFixed(3)}`);
  console.log(`p-value: ${decliningResult.pValue.toFixed(6)}`);
  console.log(`Significant (α=0.05): ${decliningResult.significant}`);
  console.log(`Trend: ${decliningResult.trend}`);
  console.log(`Theil-Sen slope: ${(decliningSlope * 30).toFixed(4)}%/month`);

  // Case 2: Noisy but stable (like real wolse data)
  console.log('\n--- Case 2: Noisy Stable (Simulating Wolse Data) ---');
  const noisyStableData = Array.from({ length: 500 }, (_, i) => ({
    x: i,
    y: 5 + (Math.random() - 0.5) * 10 // 5% ± 5% huge noise
  }));
  const noisyResult = mannKendallTest(noisyStableData);
  const noisySlope = theilSenSlope(noisyStableData);
  console.log(`S statistic: ${noisyResult.S}`);
  console.log(`Z statistic: ${noisyResult.Z.toFixed(3)}`);
  console.log(`p-value: ${noisyResult.pValue.toFixed(6)}`);
  console.log(`Significant (α=0.05): ${noisyResult.significant}`);
  console.log(`Trend: ${noisyResult.trend}`);
  console.log(`Theil-Sen slope: ${(noisySlope * 30).toFixed(4)}%/month`);

  // Case 3: Slight trend in noisy data
  console.log('\n--- Case 3: Slight Decline in Very Noisy Data ---');
  const slightTrendData = Array.from({ length: 500 }, (_, i) => ({
    x: i,
    y: 5.5 - 0.002 * i + (Math.random() - 0.5) * 8 // Very slight decline with huge noise
  }));
  const slightResult = mannKendallTest(slightTrendData);
  const slightSlope = theilSenSlope(slightTrendData);
  console.log(`S statistic: ${slightResult.S}`);
  console.log(`Z statistic: ${slightResult.Z.toFixed(3)}`);
  console.log(`p-value: ${slightResult.pValue.toFixed(6)}`);
  console.log(`Significant (α=0.05): ${slightResult.significant}`);
  console.log(`Trend: ${slightResult.trend}`);
  console.log(`Theil-Sen slope: ${(slightSlope * 30).toFixed(4)}%/month`);

  console.log('\n' + '='.repeat(70));
  console.log('INTERPRETATION');
  console.log('='.repeat(70));
  console.log(`
Mann-Kendall advantages:
1. p-value directly tells us statistical significance
2. Robust to outliers (uses ranks, not magnitudes)
3. Works with non-linear monotonic trends
4. No distributional assumptions

For wolse data:
- If p < 0.05: Trend is statistically significant
- If p ≥ 0.05: Cannot reject "no trend" hypothesis (STABLE)
- Theil-Sen slope gives robust estimate of trend magnitude
`);
}

testMannKendall().catch(console.error);
