/**
 * Check if 신규 (new) contracts still have 임대주택 mixed in
 */

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not set');
    process.exit(1);
  }

  const api = new MolitWolseAPI(apiKey);
  const lawdCd = getDistrictCode('서울특별시', '강동구');

  const transactions = await api.getRecentWolseForApartment(
    lawdCd!,
    '고덕그라시움',
    59.785, // Focus on one area type
    12
  );

  console.log('\n=== 고덕그라시움 59.785㎡ - NEW CONTRACTS ONLY ===\n');

  // Filter to new contracts only
  const newContracts = transactions.filter(t => t.contractType === '신규');
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`New contracts (신규): ${newContracts.length}`);
  console.log(`Renewals (갱신): ${transactions.filter(t => t.contractType === '갱신').length}`);

  // Sort by rent
  const sorted = [...newContracts].sort((a, b) => a.monthlyRent - b.monthlyRent);

  console.log('\n=== NEW CONTRACTS SORTED BY RENT ===\n');
  sorted.forEach((t, idx) => {
    const depositWon = (t.deposit / 10000).toLocaleString();
    const rentWon = (t.monthlyRent / 10000).toLocaleString();
    // Flag potentially suspicious low-rent transactions
    const flag = t.monthlyRent < 1000000 ? '⚠️ LOW' : '';
    console.log(`${idx + 1}. ${t.year}.${t.month}.${t.day} | ${depositWon}만 / ${rentWon}만 ${flag}`);
  });

  // Calculate statistics
  const rents = newContracts.map(t => t.monthlyRent / 10000);
  const mean = rents.reduce((a, b) => a + b, 0) / rents.length;
  rents.sort((a, b) => a - b);
  const median = rents[Math.floor(rents.length / 2)];
  const min = rents[0];
  const max = rents[rents.length - 1];

  console.log('\n=== STATISTICS (NEW CONTRACTS) ===');
  console.log(`Mean: ${mean.toFixed(1)}만원`);
  console.log(`Median: ${median.toFixed(1)}만원`);
  console.log(`Range: ${min.toFixed(0)} ~ ${max.toFixed(0)}만원`);

  // Check for outliers using IQR
  const q1 = rents[Math.floor(rents.length * 0.25)];
  const q3 = rents[Math.floor(rents.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  console.log(`\nIQR Analysis:`);
  console.log(`Q1: ${q1.toFixed(0)}만원, Q3: ${q3.toFixed(0)}만원`);
  console.log(`IQR: ${iqr.toFixed(0)}만원`);
  console.log(`Lower bound (Q1 - 1.5×IQR): ${lowerBound.toFixed(0)}만원`);

  const belowLowerBound = rents.filter(r => r < lowerBound);
  console.log(`\nTransactions below lower bound: ${belowLowerBound.length}`);
  if (belowLowerBound.length > 0) {
    console.log(`These would be removed as outliers: ${belowLowerBound.map(r => r.toFixed(0) + '만원').join(', ')}`);
  }
}

main().catch(console.error);
