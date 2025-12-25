import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

/**
 * Linear Regression with R² (current method)
 */
function linearRegression(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  percentageChange: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
} {
  const n = data.length;
  if (n < 3) {
    return { slope: 0, intercept: 0, rSquared: 0, percentageChange: 0, trend: 'STABLE' };
  }

  const sorted = [...data].sort((a, b) => a.x - b.x);
  const maxX = Math.max(...sorted.map(p => p.x));

  const sumX = sorted.reduce((sum, p) => sum + p.x, 0);
  const sumY = sorted.reduce((sum, p) => sum + p.y, 0);
  const sumXY = sorted.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = sorted.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = sorted.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = sorted.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - (ssResidual / ssTotal))) : 0;

  // Calculate percentage change
  const firstRate = intercept; // Rate at x=0 (oldest)
  const lastRate = slope * maxX + intercept; // Rate at x=max (newest)
  const percentageChange = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;

  // Determine trend using tiered thresholds (current method)
  const absChange = Math.abs(percentageChange);
  const isSignificantTrend =
    absChange > 15 ||
    (absChange > 10 && rSquared > 0.1) ||
    (absChange > 5 && rSquared > 0.3);

  let trend: 'RISING' | 'DECLINING' | 'STABLE';
  if (isSignificantTrend) {
    trend = percentageChange > 0 ? 'RISING' : 'DECLINING';
  } else {
    trend = 'STABLE';
  }

  return { slope, intercept, rSquared, percentageChange, trend };
}

/**
 * Mann-Kendall for comparison
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  Z: number;
  pValue: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
} {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) {
    return { S: 0, Z: 0, pValue: 1, trend: 'STABLE' };
  }

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
    S,
    Z,
    pValue,
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

  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}

async function testApproach5Regression() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const api = new MolitWolseAPI(apiKey);

  const testCases = [
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '센트라스', area: 85, marketRate: 5.23 },
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '텐즈힐', area: 85, marketRate: 6.33 },
  ];

  console.log('='.repeat(70));
  console.log('APPROACH 5: REGRESSION + R² vs MANN-KENDALL COMPARISON');
  console.log('='.repeat(70));
  console.log('\nFormula: full_monthly = rent + (deposit × market_rate / 12)');
  console.log('Comparing Linear Regression + R² thresholds vs Mann-Kendall p-value\n');

  for (const tc of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${tc.building} ${tc.area}㎡ (Market Rate: ${tc.marketRate}%)`);
    console.log('='.repeat(70));

    const lawdCd = getDistrictCode(tc.city, tc.district);
    if (!lawdCd) continue;

    const wolseTransactions: Array<{
      deposit: number;
      rent: number;
      fullMonthlyCost: number;
      daysAgo: number;
    }> = [];

    const jeonseTransactions: Array<{
      deposit: number;
      fullMonthlyCost: number;
      daysAgo: number;
    }> = [];

    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

      const transactions = await api.getRentTransactions(lawdCd, yearMonth);
      const areaMin = tc.area * 0.9;
      const areaMax = tc.area * 1.1;

      for (const t of transactions) {
        const nameMatch = t.apartmentName.includes(tc.building) || tc.building.includes(t.apartmentName);
        const areaMatch = t.exclusiveArea >= areaMin && t.exclusiveArea <= areaMax;

        if (nameMatch && areaMatch) {
          const txDate = new Date(t.year, t.month - 1, t.day);
          const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
          const fullMonthlyCost = t.monthlyRent + (t.deposit * (tc.marketRate / 100) / 12);

          if (t.monthlyRent > 0) {
            wolseTransactions.push({ deposit: t.deposit, rent: t.monthlyRent, fullMonthlyCost, daysAgo });
          } else {
            jeonseTransactions.push({ deposit: t.deposit, fullMonthlyCost, daysAgo });
          }
        }
      }
    }

    console.log(`\n📊 Wolse: ${wolseTransactions.length}, Jeonse: ${jeonseTransactions.length}`);

    const maxDaysAgo = Math.max(
      ...wolseTransactions.map(t => t.daysAgo),
      ...jeonseTransactions.map(t => t.daysAgo)
    );

    // === WOLSE Analysis ===
    if (wolseTransactions.length >= 4) {
      console.log('\n' + '-'.repeat(50));
      console.log('WOLSE FULL MONTHLY COST');
      console.log('-'.repeat(50));

      const wolseData = wolseTransactions.map(t => ({
        x: maxDaysAgo - t.daysAgo,
        y: t.fullMonthlyCost / 10000
      }));

      const reg = linearRegression(wolseData);
      const mk = mannKendallTest(wolseData);
      const tsSlope = theilSenSlope(wolseData);

      console.log('\n--- Linear Regression + R² ---');
      console.log(`Slope: ${(reg.slope * 30).toFixed(3)}만/month`);
      console.log(`R²: ${(reg.rSquared * 100).toFixed(2)}%`);
      console.log(`% Change: ${reg.percentageChange.toFixed(1)}%`);
      console.log(`Trend: ${reg.trend}`);

      console.log('\n--- Mann-Kendall ---');
      console.log(`S: ${mk.S}, Z: ${mk.Z.toFixed(3)}`);
      console.log(`p-value: ${mk.pValue.toFixed(6)}`);
      console.log(`Theil-Sen slope: ${(tsSlope * 30).toFixed(3)}만/month`);
      console.log(`Trend: ${mk.trend}`);

      console.log(`\n${reg.trend === mk.trend ? '✅' : '❌'} Methods ${reg.trend === mk.trend ? 'AGREE' : 'DISAGREE'}: Regression=${reg.trend}, MK=${mk.trend}`);
    }

    // === JEONSE Analysis ===
    if (jeonseTransactions.length >= 4) {
      console.log('\n' + '-'.repeat(50));
      console.log('JEONSE FULL MONTHLY COST');
      console.log('-'.repeat(50));

      const jeonseData = jeonseTransactions.map(t => ({
        x: maxDaysAgo - t.daysAgo,
        y: t.fullMonthlyCost / 10000
      }));

      const reg = linearRegression(jeonseData);
      const mk = mannKendallTest(jeonseData);
      const tsSlope = theilSenSlope(jeonseData);

      console.log('\n--- Linear Regression + R² ---');
      console.log(`Slope: ${(reg.slope * 30).toFixed(3)}만/month`);
      console.log(`R²: ${(reg.rSquared * 100).toFixed(2)}%`);
      console.log(`% Change: ${reg.percentageChange.toFixed(1)}%`);
      console.log(`Trend: ${reg.trend}`);

      console.log('\n--- Mann-Kendall ---');
      console.log(`S: ${mk.S}, Z: ${mk.Z.toFixed(3)}`);
      console.log(`p-value: ${mk.pValue.toFixed(6)}`);
      console.log(`Theil-Sen slope: ${(tsSlope * 30).toFixed(3)}만/month`);
      console.log(`Trend: ${mk.trend}`);

      console.log(`\n${reg.trend === mk.trend ? '✅' : '❌'} Methods ${reg.trend === mk.trend ? 'AGREE' : 'DISAGREE'}: Regression=${reg.trend}, MK=${mk.trend}`);
    }

    // === SUMMARY TABLE ===
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));

    if (wolseTransactions.length >= 4 && jeonseTransactions.length >= 4) {
      const wolseData = wolseTransactions.map(t => ({ x: maxDaysAgo - t.daysAgo, y: t.fullMonthlyCost / 10000 }));
      const jeonseData = jeonseTransactions.map(t => ({ x: maxDaysAgo - t.daysAgo, y: t.fullMonthlyCost / 10000 }));

      const wolseReg = linearRegression(wolseData);
      const jeonsReg = linearRegression(jeonseData);
      const wolseMK = mannKendallTest(wolseData);
      const jeonsMK = mannKendallTest(jeonseData);

      console.log('\n| Data   | Reg Trend | R²     | MK Trend | p-value |');
      console.log('|--------|-----------|--------|----------|---------|');
      console.log(`| Wolse  | ${wolseReg.trend.padEnd(9)} | ${(wolseReg.rSquared * 100).toFixed(1).padStart(5)}% | ${wolseMK.trend.padEnd(8)} | ${wolseMK.pValue.toFixed(4).padStart(7)} |`);
      console.log(`| Jeonse | ${jeonsReg.trend.padEnd(9)} | ${(jeonsReg.rSquared * 100).toFixed(1).padStart(5)}% | ${jeonsMK.trend.padEnd(8)} | ${jeonsMK.pValue.toFixed(4).padStart(7)} |`);
    }
  }
}

testApproach5Regression().catch(console.error);
