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

async function testApproach5() {
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
  console.log('APPROACH 5: FULL MONTHLY COST (Zero-Deposit Equivalent)');
  console.log('='.repeat(70));
  console.log('\nFormula: full_monthly = rent + (deposit × market_rate / 12)');
  console.log('This converts each transaction to equivalent monthly cost if deposit was 0.\n');

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
      fullMonthlyCost: number;
      daysAgo: number;
      date: string;
    }> = [];

    const jeonseTransactions: Array<{
      deposit: number;
      fullMonthlyCost: number;
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

          // full_monthly = rent + (deposit × rate / 12)
          const fullMonthlyCost = t.monthlyRent + (t.deposit * (tc.marketRate / 100) / 12);

          if (t.monthlyRent > 0) {
            // Wolse transaction
            wolseTransactions.push({
              deposit: t.deposit,
              rent: t.monthlyRent,
              fullMonthlyCost,
              daysAgo,
              date: dateStr
            });
          } else {
            // Pure jeonse transaction (rent = 0, so full cost = deposit × rate / 12)
            jeonseTransactions.push({
              deposit: t.deposit,
              fullMonthlyCost,
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

    // Show sample wolse transactions with full monthly cost
    console.log('\nSample wolse → full monthly cost:');
    const sortedWolse = [...wolseTransactions].sort((a, b) => a.daysAgo - b.daysAgo);
    for (const t of sortedWolse.slice(0, 5)) {
      console.log(`   ${t.date}: 보증금 ${(t.deposit / 10000).toFixed(0)}만 + 월세 ${(t.rent / 10000).toFixed(0)}만 → 월환산 ${(t.fullMonthlyCost / 10000).toFixed(1)}만`);
    }

    const maxDaysAgo = Math.max(
      ...wolseTransactions.map(t => t.daysAgo),
      ...jeonseTransactions.map(t => t.daysAgo)
    );

    // === Wolse Full Monthly Cost Trend ===
    console.log('\n' + '-'.repeat(50));
    console.log('WOLSE → FULL MONTHLY COST TREND');
    console.log('-'.repeat(50));

    const wolseCostData = wolseTransactions.map(t => ({
      x: maxDaysAgo - t.daysAgo,
      y: t.fullMonthlyCost / 10000
    }));

    const wolseCostMK = mannKendallTest(wolseCostData);
    const wolseCostSlope = theilSenSlope(wolseCostData);
    const avgWolseCost = wolseTransactions.reduce((s, t) => s + t.fullMonthlyCost, 0) / wolseTransactions.length / 10000;

    console.log(`Transactions: ${wolseTransactions.length}`);
    console.log(`Average full monthly cost: ${avgWolseCost.toFixed(1)}만원`);
    console.log(`S statistic: ${wolseCostMK.S}`);
    console.log(`Z statistic: ${wolseCostMK.Z.toFixed(3)}`);
    console.log(`p-value: ${wolseCostMK.pValue.toFixed(6)}`);
    console.log(`Trend: ${wolseCostMK.trend} ${wolseCostMK.significant ? '✓' : ''}`);
    console.log(`Theil-Sen slope: ${(wolseCostSlope * 30).toFixed(2)}만원/month`);
    console.log(`Change over ${maxDaysAgo} days: ${((wolseCostSlope * maxDaysAgo) / avgWolseCost * 100).toFixed(1)}%`);

    // === Jeonse Full Monthly Cost Trend (for comparison) ===
    if (jeonseTransactions.length >= 4) {
      console.log('\n' + '-'.repeat(50));
      console.log('JEONSE → FULL MONTHLY COST TREND (for comparison)');
      console.log('-'.repeat(50));

      const jeonseCostData = jeonseTransactions.map(t => ({
        x: maxDaysAgo - t.daysAgo,
        y: t.fullMonthlyCost / 10000
      }));

      const jeonseCostMK = mannKendallTest(jeonseCostData);
      const jeonseCostSlope = theilSenSlope(jeonseCostData);
      const avgJeonseCost = jeonseTransactions.reduce((s, t) => s + t.fullMonthlyCost, 0) / jeonseTransactions.length / 10000;

      console.log(`Transactions: ${jeonseTransactions.length}`);
      console.log(`Average full monthly cost: ${avgJeonseCost.toFixed(1)}만원`);
      console.log(`S statistic: ${jeonseCostMK.S}`);
      console.log(`Z statistic: ${jeonseCostMK.Z.toFixed(3)}`);
      console.log(`p-value: ${jeonseCostMK.pValue.toFixed(6)}`);
      console.log(`Trend: ${jeonseCostMK.trend} ${jeonseCostMK.significant ? '✓' : ''}`);
      console.log(`Theil-Sen slope: ${(jeonseCostSlope * 30).toFixed(2)}만원/month`);
      console.log(`Change over ${maxDaysAgo} days: ${((jeonseCostSlope * maxDaysAgo) / avgJeonseCost * 100).toFixed(1)}%`);

      // === Comparison ===
      console.log('\n' + '='.repeat(50));
      console.log('COMPARISON: Wolse vs Jeonse (Full Monthly Cost)');
      console.log('='.repeat(50));
      console.log(`| Metric              | Wolse Monthly | Jeonse Monthly |`);
      console.log(`|---------------------|---------------|----------------|`);
      console.log(`| Transactions        | ${String(wolseTransactions.length).padStart(13)} | ${String(jeonseTransactions.length).padStart(14)} |`);
      console.log(`| Average (만원/mo)    | ${avgWolseCost.toFixed(1).padStart(13)} | ${avgJeonseCost.toFixed(1).padStart(14)} |`);
      console.log(`| Trend               | ${wolseCostMK.trend.padStart(13)} | ${jeonseCostMK.trend.padStart(14)} |`);
      console.log(`| p-value             | ${wolseCostMK.pValue.toFixed(4).padStart(13)} | ${jeonseCostMK.pValue.toFixed(4).padStart(14)} |`);
      console.log(`| Slope (만원/month)   | ${(wolseCostSlope * 30).toFixed(2).padStart(13)} | ${(jeonseCostSlope * 30).toFixed(2).padStart(14)} |`);

      const match = wolseCostMK.trend === jeonseCostMK.trend;
      console.log(`\n${match ? '✅' : '❌'} Trends ${match ? 'MATCH' : 'DO NOT MATCH'}!`);
    } else {
      console.log('\n⚠️ Insufficient jeonse data for comparison');
    }
  }
}

testApproach5().catch(console.error);
