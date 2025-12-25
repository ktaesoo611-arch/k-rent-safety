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

async function testWolseTrend() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const api = new MolitWolseAPI(apiKey);

  const testCases = [
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '센트라스', area: 85 },
    { city: '서울특별시', district: '성동구', dong: '하왕십리동', building: '텐즈힐', area: 85 },
  ];

  console.log('='.repeat(70));
  console.log('WOLSE (월세) TREND ANALYSIS - 12 MONTHS (Mann-Kendall)');
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
    const wolseTransactions: Array<{
      deposit: number;
      rent: number;
      daysAgo: number;
      date: string;
      conversionRate: number;
    }> = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

      const transactions = await api.getRentTransactions(lawdCd, yearMonth);

      // Filter for matching building and area (±10%), and WOLSE only (monthlyRent > 0)
      const areaMin = tc.area * 0.9;
      const areaMax = tc.area * 1.1;

      for (const t of transactions) {
        const nameMatch = t.apartmentName.includes(tc.building) || tc.building.includes(t.apartmentName);
        const areaMatch = t.exclusiveArea >= areaMin && t.exclusiveArea <= areaMax;
        const isWolse = t.monthlyRent > 0;

        if (nameMatch && areaMatch && isWolse) {
          const txDate = new Date(t.year, t.month - 1, t.day);
          const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

          // Calculate implied conversion rate (annualized)
          // Assuming full jeonse would be around average of similar units
          const conversionRate = t.deposit > 0 ? (t.monthlyRent * 12 / t.deposit) * 100 : 0;

          wolseTransactions.push({
            deposit: t.deposit,
            rent: t.monthlyRent,
            daysAgo,
            date: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
            conversionRate
          });
        }
      }
    }

    console.log(`\n📊 Found ${wolseTransactions.length} wolse transactions`);

    if (wolseTransactions.length < 4) {
      console.log('❌ Insufficient data for trend analysis');
      continue;
    }

    // Show sample transactions
    console.log('\nSample transactions (recent):');
    const sorted = [...wolseTransactions].sort((a, b) => a.daysAgo - b.daysAgo);
    for (const t of sorted.slice(0, 5)) {
      console.log(`   ${t.date}: 보증금 ${(t.deposit / 10000).toFixed(0)}만, 월세 ${(t.rent / 10000).toFixed(0)}만 (${t.daysAgo}일 전)`);
    }
    console.log('   ...');
    console.log('Sample transactions (oldest):');
    for (const t of sorted.slice(-3)) {
      console.log(`   ${t.date}: 보증금 ${(t.deposit / 10000).toFixed(0)}만, 월세 ${(t.rent / 10000).toFixed(0)}만 (${t.daysAgo}일 전)`);
    }

    const maxDaysAgo = Math.max(...wolseTransactions.map(t => t.daysAgo));

    // === Test 1: Monthly Rent Trend ===
    console.log('\n' + '-'.repeat(50));
    console.log('1. MONTHLY RENT (월세) TREND');
    console.log('-'.repeat(50));

    const rentData = wolseTransactions.map(t => ({
      x: maxDaysAgo - t.daysAgo,
      y: t.rent / 10000  // In 만원
    }));

    const rentMK = mannKendallTest(rentData);
    const rentSlope = theilSenSlope(rentData);
    const avgRent = wolseTransactions.reduce((s, t) => s + t.rent, 0) / wolseTransactions.length / 10000;

    console.log(`Average rent: ${avgRent.toFixed(0)}만원`);
    console.log(`S statistic: ${rentMK.S}`);
    console.log(`Z statistic: ${rentMK.Z.toFixed(3)}`);
    console.log(`p-value: ${rentMK.pValue.toFixed(6)}`);
    console.log(`Trend: ${rentMK.trend} ${rentMK.significant ? '✓' : ''}`);
    console.log(`Theil-Sen slope: ${(rentSlope * 30).toFixed(2)}만원/month`);
    console.log(`Change over ${maxDaysAgo} days: ${((rentSlope * maxDaysAgo) / avgRent * 100).toFixed(1)}%`);

    // === Test 2: Deposit Trend ===
    console.log('\n' + '-'.repeat(50));
    console.log('2. DEPOSIT (보증금) TREND');
    console.log('-'.repeat(50));

    const depositData = wolseTransactions.map(t => ({
      x: maxDaysAgo - t.daysAgo,
      y: t.deposit / 10000  // In 만원
    }));

    const depositMK = mannKendallTest(depositData);
    const depositSlope = theilSenSlope(depositData);
    const avgDeposit = wolseTransactions.reduce((s, t) => s + t.deposit, 0) / wolseTransactions.length / 10000;

    console.log(`Average deposit: ${avgDeposit.toFixed(0)}만원`);
    console.log(`S statistic: ${depositMK.S}`);
    console.log(`Z statistic: ${depositMK.Z.toFixed(3)}`);
    console.log(`p-value: ${depositMK.pValue.toFixed(6)}`);
    console.log(`Trend: ${depositMK.trend} ${depositMK.significant ? '✓' : ''}`);
    console.log(`Theil-Sen slope: ${(depositSlope * 30).toFixed(0)}만원/month`);
    console.log(`Change over ${maxDaysAgo} days: ${((depositSlope * maxDaysAgo) / avgDeposit * 100).toFixed(1)}%`);

    // === Test 3: Conversion Rate Trend ===
    console.log('\n' + '-'.repeat(50));
    console.log('3. CONVERSION RATE (전환율) TREND');
    console.log('-'.repeat(50));

    // Filter out extreme rates
    const validRates = wolseTransactions.filter(t => t.conversionRate > 0 && t.conversionRate < 20);
    const rateData = validRates.map(t => ({
      x: maxDaysAgo - t.daysAgo,
      y: t.conversionRate
    }));

    if (rateData.length >= 4) {
      const rateMK = mannKendallTest(rateData);
      const rateSlope = theilSenSlope(rateData);
      const avgRate = validRates.reduce((s, t) => s + t.conversionRate, 0) / validRates.length;

      console.log(`Average conversion rate: ${avgRate.toFixed(2)}%`);
      console.log(`S statistic: ${rateMK.S}`);
      console.log(`Z statistic: ${rateMK.Z.toFixed(3)}`);
      console.log(`p-value: ${rateMK.pValue.toFixed(6)}`);
      console.log(`Trend: ${rateMK.trend} ${rateMK.significant ? '✓' : ''}`);
      console.log(`Theil-Sen slope: ${(rateSlope * 30).toFixed(3)}%/month`);
    } else {
      console.log('Insufficient valid rate data');
    }

    // === Summary ===
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`| Metric          | Trend      | p-value  | Change/mo |`);
    console.log(`|-----------------|------------|----------|-----------|`);
    console.log(`| Monthly Rent    | ${rentMK.trend.padEnd(10)} | ${rentMK.pValue.toFixed(4).padStart(8)} | ${(rentSlope * 30).toFixed(1).padStart(6)}만원 |`);
    console.log(`| Deposit         | ${depositMK.trend.padEnd(10)} | ${depositMK.pValue.toFixed(4).padStart(8)} | ${(depositSlope * 30).toFixed(0).padStart(6)}만원 |`);
    if (rateData.length >= 4) {
      const rateMK = mannKendallTest(rateData);
      const rateSlope = theilSenSlope(rateData);
      console.log(`| Conversion Rate | ${rateMK.trend.padEnd(10)} | ${rateMK.pValue.toFixed(4).padStart(8)} | ${(rateSlope * 30).toFixed(2).padStart(7)}% |`);
    }
  }
}

testWolseTrend().catch(console.error);
