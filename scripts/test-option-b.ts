import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

/**
 * Theil-Sen Regression for deposit-rent relationship
 */
function theilSenRegression(data: { deposit: number; rent: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.rent || 0 };

  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = data[j].deposit - data[i].deposit;
      if (Math.abs(dx) > 1000000) {
        slopes.push((data[j].rent - data[i].rent) / dx);
      }
    }
  }

  if (slopes.length === 0) {
    return { slope: 0, intercept: data.reduce((s, d) => s + d.rent, 0) / n };
  }

  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  const intercepts = data.map(d => d.rent - slope * d.deposit);
  intercepts.sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];

  return { slope, intercept };
}

/**
 * Mann-Kendall test
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  pValue: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
} {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) return { S: 0, pValue: 1, trend: 'STABLE' };

  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = sorted[j].y - sorted[i].y;
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
    }
  }

  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  let Z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(Z)));

  return {
    S, pValue,
    trend: pValue < 0.05 ? (S > 0 ? 'RISING' : 'DECLINING') : 'STABLE'
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
      if (dx !== 0) slopes.push((sorted[j].y - sorted[i].y) / dx);
    }
  }

  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  return slopes[Math.floor(slopes.length / 2)];
}

async function testOptionB() {
  const api = new MolitWolseAPI(process.env.MOLIT_API_KEY!);
  const lawdCd = getDistrictCode('서울특별시', '성동구')!;

  const building = '센트라스';
  const targetArea = 59;
  const refDeposit = 30000 * 10000; // 3억 = 30000만원
  const marketRate = 5.8;

  console.log('='.repeat(70));
  console.log('OPTION B TEST: Raw Regression + Mann-Kendall Adjustment');
  console.log('='.repeat(70));
  console.log(`Building: ${building} ${targetArea}㎡`);
  console.log(`Reference Deposit: ${refDeposit / 10000}만원`);
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

    for (const t of txs) {
      if (t.apartmentName.includes(building) &&
          t.exclusiveArea >= targetArea * 0.9 &&
          t.exclusiveArea <= targetArea * 1.1 &&
          t.monthlyRent > 0) {
        const txDate = new Date(t.year, t.month - 1, t.day);
        const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        transactions.push({
          deposit: t.deposit,
          rent: t.monthlyRent,
          daysAgo,
          date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
          fullMonthlyCost: t.monthlyRent + t.deposit * rateMonthly
        });
      }
    }
  }

  console.log(`\n📊 Found ${transactions.length} RAW transactions (no time adjustment)\n`);

  // ============================================
  // STEP 1: Theil-Sen Regression on RAW data
  // ============================================
  console.log('='.repeat(50));
  console.log('STEP 1: Theil-Sen Regression on RAW transactions');
  console.log('='.repeat(50));

  const regData = transactions.map(t => ({ deposit: t.deposit, rent: t.rent }));
  const { slope, intercept } = theilSenRegression(regData);

  const expectedRentMidpoint = intercept + slope * refDeposit;
  const slopePerEok = slope * 100000000 / 10000;

  console.log(`Data points: ${transactions.length}`);
  console.log(`Slope: ${slopePerEok.toFixed(2)}만원 per 1억 deposit`);
  console.log(`Intercept: ${(intercept / 10000).toFixed(1)}만원`);
  console.log(`\nExpected Rent at ${refDeposit / 10000}만 deposit: ${(expectedRentMidpoint / 10000).toFixed(1)}만원`);
  console.log(`   → This is the "midpoint" expected rent (center of 12 months)`);

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
  const trendSlopePerDay = theilSenSlope(trendData); // 만원 per day
  const trendSlopePerMonth = trendSlopePerDay * 30;

  console.log(`S statistic: ${mk.S}`);
  console.log(`p-value: ${mk.pValue.toFixed(6)}`);
  console.log(`Trend: ${mk.trend}`);
  console.log(`Theil-Sen slope: ${trendSlopePerMonth.toFixed(2)}만원/month (Full Monthly Cost)`);

  // ============================================
  // STEP 3: Convert Full Monthly Cost slope to Rent slope
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Convert to Rent Slope');
  console.log('='.repeat(50));

  // Full Monthly Cost = Rent + Deposit × rate / 12
  // At reference deposit, the rent portion of the change
  const avgFullCost = trendData.reduce((s, d) => s + d.y, 0) / trendData.length;
  const depositContribution = (refDeposit / 10000) * (marketRate / 100 / 12);
  const avgRentAtRef = avgFullCost - depositContribution;
  const rentPortion = avgRentAtRef / avgFullCost;

  console.log(`Average Full Monthly Cost: ${avgFullCost.toFixed(1)}만원`);
  console.log(`Deposit contribution at ${refDeposit/10000}만: ${depositContribution.toFixed(1)}만원`);
  console.log(`Average Rent at ref deposit: ${avgRentAtRef.toFixed(1)}만원`);
  console.log(`Rent portion: ${(rentPortion * 100).toFixed(1)}%`);

  // The rent slope is the full cost slope (since deposit is fixed at reference)
  const rentSlopePerMonth = trendSlopePerMonth;
  console.log(`\nRent slope: ${rentSlopePerMonth.toFixed(2)}만원/month`);

  // ============================================
  // STEP 4: Apply Trend Adjustment
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: Apply Trend Adjustment');
  console.log('='.repeat(50));

  const monthsForward = 6; // Midpoint to today

  let expectedRentFinal: number;
  let adjustment = 0;

  if (mk.trend !== 'STABLE') {
    adjustment = rentSlopePerMonth * monthsForward * 10000;
    expectedRentFinal = expectedRentMidpoint + adjustment;
    console.log(`Trend is ${mk.trend} (p=${mk.pValue.toFixed(4)}) → Apply adjustment`);
    console.log(`Adjustment: ${rentSlopePerMonth.toFixed(2)}만원/month × ${monthsForward} months = ${(adjustment / 10000).toFixed(1)}만원`);
  } else {
    expectedRentFinal = expectedRentMidpoint;
    console.log(`Trend is STABLE → No adjustment`);
  }

  console.log(`\nExpected Rent (midpoint): ${(expectedRentMidpoint / 10000).toFixed(1)}만원`);
  console.log(`Expected Rent (today):    ${(expectedRentFinal / 10000).toFixed(1)}만원`);

  // ============================================
  // VALIDATION: Compare with recent transactions
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('VALIDATION: Compare with Recent Transactions');
  console.log('='.repeat(50));

  const recentTxs = transactions.filter(t => t.daysAgo <= 60);
  console.log(`\nRecent transactions (last 2 months): ${recentTxs.length}`);

  // Calculate rent at reference deposit for each recent transaction
  const recentRentsAtRef = recentTxs.map(t => {
    const rentAtRef = t.rent + (t.deposit - refDeposit) * (marketRate / 100 / 12);
    return rentAtRef;
  });

  const recentAvgRentAtRef = recentRentsAtRef.reduce((s, r) => s + r, 0) / recentRentsAtRef.length;

  console.log('\nRecent transactions normalized to reference deposit:');
  recentTxs.forEach((t, i) => {
    console.log(`   ${t.date}: ${(t.deposit/10000)}만 deposit, ${(t.rent/10000)}만 rent → ${(recentRentsAtRef[i]/10000).toFixed(1)}만 at ref`);
  });

  // Exclude outliers (IQR method)
  const sortedRents = [...recentRentsAtRef].sort((a, b) => a - b);
  const q1 = sortedRents[Math.floor(sortedRents.length * 0.25)];
  const q3 = sortedRents[Math.floor(sortedRents.length * 0.75)];
  const iqr = q3 - q1;
  const validRents = recentRentsAtRef.filter(r => r >= q1 - 1.5 * iqr && r <= q3 + 1.5 * iqr);
  const recentAvgExclOutliers = validRents.reduce((s, r) => s + r, 0) / validRents.length;

  console.log(`\nRecent avg (all): ${(recentAvgRentAtRef / 10000).toFixed(1)}만원`);
  console.log(`Recent avg (excl outliers): ${(recentAvgExclOutliers / 10000).toFixed(1)}만원`);

  // ============================================
  // FINAL COMPARISON
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('FINAL COMPARISON');
  console.log('='.repeat(50));

  console.log(`\n| Metric                          | Value       |`);
  console.log(`|---------------------------------|-------------|`);
  console.log(`| Current report                  | ${('183.0만원').padStart(11)} |`);
  console.log(`| Option B: Midpoint (raw reg)    | ${((expectedRentMidpoint/10000).toFixed(1) + '만원').padStart(11)} |`);
  console.log(`| Option B: Today (+ MK adj)      | ${((expectedRentFinal/10000).toFixed(1) + '만원').padStart(11)} |`);
  console.log(`| Recent 2mo avg (at ref deposit) | ${((recentAvgExclOutliers/10000).toFixed(1) + '만원').padStart(11)} |`);

  const gap = Math.abs(expectedRentFinal / 10000 - recentAvgExclOutliers / 10000);
  console.log(`\n✅ Option B expected rent: ${(expectedRentFinal/10000).toFixed(1)}만원`);
  console.log(`   Gap from recent avg: ${gap.toFixed(1)}만원`);
}

testOptionB().catch(console.error);
