import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

/**
 * Theil-Sen Slope Estimator (for deposit-rent relationship)
 */
function theilSenRegression(data: { deposit: number; rent: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  // Calculate all pairwise slopes
  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = data[j].deposit - data[i].deposit;
      if (Math.abs(dx) > 1000000) { // At least 100만원 difference
        slopes.push((data[j].rent - data[i].rent) / dx);
      }
    }
  }

  if (slopes.length === 0) return { slope: 0, intercept: data.reduce((s, d) => s + d.rent, 0) / n };

  // Median slope
  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // Median intercept
  const intercepts = data.map(d => d.rent - slope * d.deposit);
  intercepts.sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];

  return { slope, intercept };
}

/**
 * Mann-Kendall test for trend
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  Z: number;
  pValue: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
} {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) return { S: 0, Z: 0, pValue: 1, trend: 'STABLE' };

  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = sorted[j].y - sorted[i].y;
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
    }
  }

  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  let Z: number;
  if (S > 0) Z = (S - 1) / Math.sqrt(varS);
  else if (S < 0) Z = (S + 1) / Math.sqrt(varS);
  else Z = 0;

  const pValue = 2 * (1 - normalCDF(Math.abs(Z)));
  const significant = pValue < 0.05;

  return {
    S, Z, pValue,
    trend: significant ? (S > 0 ? 'RISING' : 'DECLINING') : 'STABLE'
  };
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

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

  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}

async function testOptionC() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const api = new MolitWolseAPI(apiKey);
  const lawdCd = getDistrictCode('서울특별시', '성동구')!;

  // Test case: 센트라스 59m2
  const building = '센트라스';
  const targetArea = 59;
  const userDeposit = 30000 * 10000; // 30000만원 = 3억 (typical deposit)
  const marketRate = 5.83; // From previous test

  console.log('='.repeat(70));
  console.log('OPTION C TEST: 센트라스 59㎡');
  console.log('='.repeat(70));
  console.log(`User Deposit: ${userDeposit / 10000}만원`);
  console.log(`Market Rate: ${marketRate}%`);

  // Fetch 12 months of RAW transactions
  const transactions: Array<{
    deposit: number;
    rent: number;
    daysAgo: number;
    date: string;
    fullMonthlyCost: number;
  }> = [];

  const now = new Date();
  const rateMonthly = marketRate / 100 / 12;

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    const txs = await api.getRentTransactions(lawdCd, yearMonth);
    const areaMin = targetArea * 0.9;
    const areaMax = targetArea * 1.1;

    for (const t of txs) {
      const nameMatch = t.apartmentName.includes(building);
      const areaMatch = t.exclusiveArea >= areaMin && t.exclusiveArea <= areaMax;
      const isWolse = t.monthlyRent > 0;

      if (nameMatch && areaMatch && isWolse) {
        const txDate = new Date(t.year, t.month - 1, t.day);
        const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        const fullMonthlyCost = t.monthlyRent + t.deposit * rateMonthly;

        transactions.push({
          deposit: t.deposit,
          rent: t.monthlyRent,
          daysAgo,
          date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
          fullMonthlyCost
        });
      }
    }
  }

  console.log(`\n📊 Found ${transactions.length} wolse transactions`);

  // Show recent vs old transactions
  const sorted = [...transactions].sort((a, b) => a.daysAgo - b.daysAgo);
  console.log('\n--- Recent Transactions (last 2 months) ---');
  const recent = sorted.filter(t => t.daysAgo <= 60);
  recent.forEach(t => {
    console.log(`   ${t.date}: 보증금 ${t.deposit/10000}만 / 월세 ${t.rent/10000}만 (Full: ${(t.fullMonthlyCost/10000).toFixed(1)}만)`);
  });

  console.log('\n--- Old Transactions (10-12 months ago) ---');
  const old = sorted.filter(t => t.daysAgo >= 300);
  old.forEach(t => {
    console.log(`   ${t.date}: 보증금 ${t.deposit/10000}만 / 월세 ${t.rent/10000}만 (Full: ${(t.fullMonthlyCost/10000).toFixed(1)}만)`);
  });

  // ============================================
  // STEP 1: Theil-Sen Regression on RAW data
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Theil-Sen Regression (RAW transactions)');
  console.log('='.repeat(50));

  const regData = transactions.map(t => ({ deposit: t.deposit, rent: t.rent }));
  const { slope, intercept } = theilSenRegression(regData);

  const expectedRentRaw = intercept + slope * userDeposit;
  const slopePerEok = slope * 100000000 / 10000; // 만원 per 1억

  console.log(`Slope: ${slopePerEok.toFixed(2)}만원 per 1억 deposit`);
  console.log(`Intercept: ${(intercept/10000).toFixed(1)}만원`);
  console.log(`Expected Rent (at ${userDeposit/10000}만 deposit): ${(expectedRentRaw/10000).toFixed(1)}만원`);
  console.log(`   → This is the "midpoint" expected rent (avg of 12 months)`);

  // ============================================
  // STEP 2: Mann-Kendall Trend on Full Monthly Cost
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Mann-Kendall Trend (Full Monthly Cost)');
  console.log('='.repeat(50));

  const maxDaysAgo = Math.max(...transactions.map(t => t.daysAgo));
  const trendData = transactions.map(t => ({
    x: maxDaysAgo - t.daysAgo,
    y: t.fullMonthlyCost / 10000
  }));

  const mk = mannKendallTest(trendData);
  const trendSlope = theilSenSlope(trendData); // 만원 per day

  const avgFullCost = trendData.reduce((s, d) => s + d.y, 0) / trendData.length;
  const percentChange = (trendSlope * maxDaysAgo / avgFullCost) * 100;

  console.log(`S statistic: ${mk.S}`);
  console.log(`p-value: ${mk.pValue.toFixed(6)}`);
  console.log(`Trend: ${mk.trend}`);
  console.log(`Theil-Sen slope: ${(trendSlope * 30).toFixed(2)}만원/month`);
  console.log(`Period change: ${percentChange.toFixed(1)}%`);

  // ============================================
  // STEP 3: Apply Trend Adjustment
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Apply Trend Adjustment');
  console.log('='.repeat(50));

  const monthsForward = 6; // Midpoint to today
  const trendAdjustment = trendSlope * 30 * monthsForward * 10000; // Convert back to won

  // Only apply if trend is significant
  let expectedRentFinal: number;
  if (mk.trend !== 'STABLE') {
    expectedRentFinal = expectedRentRaw + trendAdjustment;
    console.log(`Trend is ${mk.trend} → Apply adjustment`);
    console.log(`Adjustment: ${(trendSlope * 30).toFixed(2)}만원/month × ${monthsForward} months = ${(trendAdjustment/10000).toFixed(1)}만원`);
  } else {
    expectedRentFinal = expectedRentRaw;
    console.log(`Trend is STABLE → No adjustment`);
  }

  // ============================================
  // FINAL COMPARISON
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('FINAL COMPARISON');
  console.log('='.repeat(50));

  const recentAvgRent = recent.length > 0
    ? recent.reduce((s, t) => s + t.rent, 0) / recent.length
    : 0;

  console.log(`\n| Metric                    | Value        |`);
  console.log(`|---------------------------|--------------|`);
  console.log(`| Recent avg rent (2mo)     | ${(recentAvgRent/10000).toFixed(1).padStart(10)}만원 |`);
  console.log(`| Expected (regression only)| ${(expectedRentRaw/10000).toFixed(1).padStart(10)}만원 |`);
  console.log(`| Expected (trend-adjusted) | ${(expectedRentFinal/10000).toFixed(1).padStart(10)}만원 |`);
  console.log(`| Current report            | ${('183.0').padStart(10)}만원 |`);

  console.log(`\n✅ Trend-adjusted expected rent: ${(expectedRentFinal/10000).toFixed(1)}만원`);
  console.log(`   vs Current report: 183만원`);
  console.log(`   vs Recent transactions avg: ${(recentAvgRent/10000).toFixed(1)}만원`);
}

testOptionC().catch(console.error);
