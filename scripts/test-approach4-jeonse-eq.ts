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

async function testApproach4() {
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
  console.log('APPROACH 4: JEONSE-EQUIVALENT TREND');
  console.log('='.repeat(70));
  console.log('\nFormula: jeonse_eq = deposit + (rent × 12 / market_rate)');
  console.log('This converts each wolse transaction to its jeonse equivalent value.\n');

  for (const tc of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${tc.building} ${tc.area}㎡ (Market Rate: ${tc.marketRate}%)`);
    console.log('='.repeat(70));

    const lawdCd = getDistrictCode(tc.city, tc.district);
    if (!lawdCd) {
      console.log('District code not found');
      continue;
    }

    // Fetch 12 months of data
    const wolseTransactions: Array<{
      deposit: number;
      rent: number;
      jeonseEquivalent: number;
      daysAgo: number;
      date: string;
    }> = [];

    const jeonseTransactions: Array<{
      deposit: number;
      daysAgo: number;
      date: string;
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
          const dateStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;

          if (t.monthlyRent > 0) {
            // Wolse transaction
            // jeonse_eq = deposit + (rent × 12 / rate)
            const jeonseEquivalent = t.deposit + (t.monthlyRent * 12 / (tc.marketRate / 100));

            wolseTransactions.push({
              deposit: t.deposit,
              rent: t.monthlyRent,
              jeonseEquivalent,
              daysAgo,
              date: dateStr
            });
          } else {
            // Pure jeonse transaction
            jeonseTransactions.push({
              deposit: t.deposit,
              daysAgo,
              date: dateStr
            });
          }
        }
      }
    }

    console.log(`\n📊 Found ${wolseTransactions.length} wolse transactions`);
    console.log(`📊 Found ${jeonseTransactions.length} jeonse transactions`);

    if (wolseTransactions.length < 4) {
      console.log('❌ Insufficient wolse data');
      continue;
    }

    // Show sample wolse transactions with jeonse equivalent
    console.log('\nSample wolse → jeonse equivalent:');
    const sortedWolse = [...wolseTransactions].sort((a, b) => a.daysAgo - b.daysAgo);
    for (const t of sortedWolse.slice(0, 5)) {
      console.log(`   ${t.date}: 보증금 ${(t.deposit / 10000).toFixed(0)}만 + 월세 ${(t.rent / 10000).toFixed(0)}만 → 전세환산 ${(t.jeonseEquivalent / 10000).toFixed(0)}만`);
    }

    const maxDaysAgo = Math.max(
      ...wolseTransactions.map(t => t.daysAgo),
      ...jeonseTransactions.map(t => t.daysAgo)
    );

    // === Wolse Jeonse-Equivalent Trend ===
    console.log('\n' + '-'.repeat(50));
    console.log('WOLSE → JEONSE-EQUIVALENT TREND');
    console.log('-'.repeat(50));

    const wolseJeonseEqData = wolseTransactions.map(t => ({
      x: maxDaysAgo - t.daysAgo,
      y: t.jeonseEquivalent / 10000
    }));

    const wolseEqMK = mannKendallTest(wolseJeonseEqData);
    const wolseEqSlope = theilSenSlope(wolseJeonseEqData);
    const avgWolseEq = wolseTransactions.reduce((s, t) => s + t.jeonseEquivalent, 0) / wolseTransactions.length / 10000;

    console.log(`Transactions: ${wolseTransactions.length}`);
    console.log(`Average jeonse-equivalent: ${avgWolseEq.toFixed(0)}만원`);
    console.log(`S statistic: ${wolseEqMK.S}`);
    console.log(`Z statistic: ${wolseEqMK.Z.toFixed(3)}`);
    console.log(`p-value: ${wolseEqMK.pValue.toFixed(6)}`);
    console.log(`Trend: ${wolseEqMK.trend} ${wolseEqMK.significant ? '✓' : ''}`);
    console.log(`Theil-Sen slope: ${(wolseEqSlope * 30).toFixed(0)}만원/month`);
    console.log(`Change over ${maxDaysAgo} days: ${((wolseEqSlope * maxDaysAgo) / avgWolseEq * 100).toFixed(1)}%`);

    // === Actual Jeonse Trend (for comparison) ===
    if (jeonseTransactions.length >= 4) {
      console.log('\n' + '-'.repeat(50));
      console.log('ACTUAL JEONSE TREND (for comparison)');
      console.log('-'.repeat(50));

      const jeonseData = jeonseTransactions.map(t => ({
        x: maxDaysAgo - t.daysAgo,
        y: t.deposit / 10000
      }));

      const jeonseMK = mannKendallTest(jeonseData);
      const jeonseSlope = theilSenSlope(jeonseData);
      const avgJeonse = jeonseTransactions.reduce((s, t) => s + t.deposit, 0) / jeonseTransactions.length / 10000;

      console.log(`Transactions: ${jeonseTransactions.length}`);
      console.log(`Average jeonse: ${avgJeonse.toFixed(0)}만원`);
      console.log(`S statistic: ${jeonseMK.S}`);
      console.log(`Z statistic: ${jeonseMK.Z.toFixed(3)}`);
      console.log(`p-value: ${jeonseMK.pValue.toFixed(6)}`);
      console.log(`Trend: ${jeonseMK.trend} ${jeonseMK.significant ? '✓' : ''}`);
      console.log(`Theil-Sen slope: ${(jeonseSlope * 30).toFixed(0)}만원/month`);
      console.log(`Change over ${maxDaysAgo} days: ${((jeonseSlope * maxDaysAgo) / avgJeonse * 100).toFixed(1)}%`);

      // === Comparison ===
      console.log('\n' + '='.repeat(50));
      console.log('COMPARISON: Wolse→Jeonse-Eq vs Actual Jeonse');
      console.log('='.repeat(50));
      console.log(`| Metric              | Wolse→JeonseEq | Actual Jeonse |`);
      console.log(`|---------------------|----------------|---------------|`);
      console.log(`| Transactions        | ${String(wolseTransactions.length).padStart(14)} | ${String(jeonseTransactions.length).padStart(13)} |`);
      console.log(`| Average (만원)       | ${avgWolseEq.toFixed(0).padStart(14)} | ${avgJeonse.toFixed(0).padStart(13)} |`);
      console.log(`| Trend               | ${wolseEqMK.trend.padStart(14)} | ${jeonseMK.trend.padStart(13)} |`);
      console.log(`| p-value             | ${wolseEqMK.pValue.toFixed(4).padStart(14)} | ${jeonseMK.pValue.toFixed(4).padStart(13)} |`);
      console.log(`| Slope (만원/month)   | ${(wolseEqSlope * 30).toFixed(0).padStart(14)} | ${(jeonseSlope * 30).toFixed(0).padStart(13)} |`);

      const match = wolseEqMK.trend === jeonseMK.trend;
      console.log(`\n${match ? '✅' : '❌'} Trends ${match ? 'MATCH' : 'DO NOT MATCH'}!`);
    } else {
      console.log('\n⚠️ Insufficient jeonse data for comparison');
    }
  }
}

testApproach4().catch(console.error);
