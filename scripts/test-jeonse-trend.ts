import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

/**
 * Mann-Kendall Trend Test
 */
function mannKendallTest(data: { x: number; y: number }[]): {
  S: number;
  Z: number;
  pValue: number;
  trend: 'RISING' | 'DECLINING' | 'STABLE';
  significant: boolean;
} {
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  if (n < 4) {
    return { S: 0, Z: 0, pValue: 1, trend: 'STABLE', significant: false };
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

  const alpha = 0.05;
  const significant = pValue < alpha;
  let trend: 'RISING' | 'DECLINING' | 'STABLE';

  if (significant) {
    trend = S > 0 ? 'RISING' : 'DECLINING';
  } else {
    trend = 'STABLE';
  }

  return { S, Z, pValue, trend, significant };
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

async function testJeonseTrend() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const api = new MolitWolseAPI(apiKey);

  const testCases = [
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '센트라스', area: 85 },
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '텐즈힐1단지', area: 85 },
  ];

  console.log('='.repeat(70));
  console.log('JEONSE TREND ANALYSIS (Mann-Kendall)');
  console.log('='.repeat(70));

  for (const tc of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${tc.building} ${tc.area}㎡ (${tc.dong})`);
    console.log('='.repeat(70));

    const lawdCd = getDistrictCode(tc.city, tc.district);
    if (!lawdCd) {
      console.log('District code not found');
      continue;
    }

    // Fetch 12 months of data
    const jeonseTransactions: Array<{ deposit: number; daysAgo: number; date: string }> = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

      const transactions = await api.getRentTransactions(lawdCd, yearMonth);

      // Filter for matching building and area (±10%), and JEONSE only (monthlyRent = 0)
      const areaMin = tc.area * 0.9;
      const areaMax = tc.area * 1.1;

      for (const t of transactions) {
        const nameMatch = t.apartmentName.includes(tc.building) || tc.building.includes(t.apartmentName);
        const areaMatch = t.exclusiveArea >= areaMin && t.exclusiveArea <= areaMax;
        const isJeonse = t.monthlyRent === 0;

        if (nameMatch && areaMatch && isJeonse) {
          const txDate = new Date(t.year, t.month - 1, t.day);
          const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

          jeonseTransactions.push({
            deposit: t.deposit,
            daysAgo,
            date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
          });
        }
      }
    }

    console.log(`\n📊 Found ${jeonseTransactions.length} jeonse transactions`);

    if (jeonseTransactions.length < 4) {
      console.log('❌ Insufficient data for trend analysis');
      continue;
    }

    // Show sample transactions
    console.log('\nSample transactions:');
    const sorted = [...jeonseTransactions].sort((a, b) => a.daysAgo - b.daysAgo);
    for (const t of sorted.slice(0, 5)) {
      console.log(`   ${t.date}: ${(t.deposit / 10000).toFixed(0)}만원 (${t.daysAgo} days ago)`);
    }
    console.log('   ...');
    for (const t of sorted.slice(-3)) {
      console.log(`   ${t.date}: ${(t.deposit / 10000).toFixed(0)}만원 (${t.daysAgo} days ago)`);
    }

    // Prepare data for Mann-Kendall (x = days from oldest, y = deposit)
    const maxDaysAgo = Math.max(...jeonseTransactions.map(t => t.daysAgo));
    const dataPoints = jeonseTransactions.map(t => ({
      x: maxDaysAgo - t.daysAgo,  // Chronological order
      y: t.deposit / 10000  // In 만원
    }));

    // Run Mann-Kendall
    const mkResult = mannKendallTest(dataPoints);
    const tsSlope = theilSenSlope(dataPoints);

    // Calculate basic stats
    const deposits = jeonseTransactions.map(t => t.deposit / 10000);
    const avgDeposit = deposits.reduce((a, b) => a + b, 0) / deposits.length;
    const minDeposit = Math.min(...deposits);
    const maxDeposit = Math.max(...deposits);

    console.log('\n--- Jeonse Deposit Statistics ---');
    console.log(`Average: ${avgDeposit.toFixed(0)}만원`);
    console.log(`Range: ${minDeposit.toFixed(0)} ~ ${maxDeposit.toFixed(0)}만원`);

    console.log('\n--- Mann-Kendall Trend Test ---');
    console.log(`Data points: ${dataPoints.length}`);
    console.log(`S statistic: ${mkResult.S}`);
    console.log(`Z statistic: ${mkResult.Z.toFixed(3)}`);
    console.log(`p-value: ${mkResult.pValue.toFixed(6)}`);
    console.log(`Significant (α=0.05): ${mkResult.significant}`);
    console.log(`Trend: ${mkResult.trend}`);
    console.log(`Theil-Sen slope: ${tsSlope.toFixed(2)}만원/day = ${(tsSlope * 30).toFixed(0)}만원/month`);

    // Calculate percentage change
    const firstDeposit = tsSlope * 0 + (avgDeposit - tsSlope * (maxDaysAgo / 2));  // Intercept estimate
    const percentChange = (tsSlope * maxDaysAgo / avgDeposit) * 100;
    console.log(`Estimated change over ${maxDaysAgo} days: ${percentChange.toFixed(1)}%`);
  }
}

testJeonseTrend().catch(console.error);
