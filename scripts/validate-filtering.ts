/**
 * Validate that we can identify:
 * 1. Renewal contracts (갱신) via contractType field
 * 2. Public housing (임대주택) via apartment name keywords
 */

import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

const PUBLIC_HOUSING_KEYWORDS = [
  '임대', 'LH', 'SH', '행복주택', '국민임대', '공공임대',
  '영구임대', '장기전세', '매입임대', '분납임대', '10년임대',
  '5년임대', '공공분양', '보금자리', '휴먼시아'
];

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not set');
    process.exit(1);
  }

  const api = new MolitWolseAPI(apiKey);

  // Test with a district that has a lot of data (강남구)
  const lawdCd = getDistrictCode('서울특별시', '강남구');
  if (!lawdCd) {
    console.error('District code not found');
    process.exit(1);
  }

  console.log('\n=== VALIDATING FILTERING APPROACH ===\n');
  console.log(`Testing district: 강남구 (${lawdCd})`);

  // Fetch last 3 months of data
  const today = new Date();
  const allTransactions: any[] = [];

  for (let i = 0; i < 3; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

    console.log(`\nFetching ${yearMonth}...`);
    const transactions = await api.getWolseTransactions(lawdCd, yearMonth);
    console.log(`  Found ${transactions.length} transactions`);
    allTransactions.push(...transactions);
  }

  console.log(`\n\nTotal transactions: ${allTransactions.length}`);

  // Analyze contractType distribution
  const contractTypes: Record<string, number> = {};
  for (const t of allTransactions) {
    const type = t.contractType || 'undefined';
    contractTypes[type] = (contractTypes[type] || 0) + 1;
  }

  console.log('\n=== CONTRACT TYPE DISTRIBUTION ===');
  for (const [type, count] of Object.entries(contractTypes)) {
    const pct = ((count / allTransactions.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
  }

  // Show sample renewal contracts
  const renewals = allTransactions.filter(t => t.contractType === '갱신');
  if (renewals.length > 0) {
    console.log('\n=== SAMPLE RENEWAL CONTRACTS (갱신) ===');
    renewals.slice(0, 5).forEach(t => {
      console.log(`  ${t.year}.${t.month}.${t.day} | ${t.apartmentName} | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만`);
    });
  }

  // Show sample new contracts
  const newContracts = allTransactions.filter(t => t.contractType === '신규');
  if (newContracts.length > 0) {
    console.log('\n=== SAMPLE NEW CONTRACTS (신규) ===');
    newContracts.slice(0, 5).forEach(t => {
      console.log(`  ${t.year}.${t.month}.${t.day} | ${t.apartmentName} | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만`);
    });
  }

  // Find public housing
  const publicHousing = allTransactions.filter(t =>
    PUBLIC_HOUSING_KEYWORDS.some(kw => t.apartmentName.toUpperCase().includes(kw.toUpperCase()))
  );

  console.log(`\n=== PUBLIC HOUSING (임대주택) DETECTION ===`);
  console.log(`  Found: ${publicHousing.length} transactions (${((publicHousing.length / allTransactions.length) * 100).toFixed(1)}%)`);

  if (publicHousing.length > 0) {
    console.log('\n  Sample public housing:');
    publicHousing.slice(0, 10).forEach(t => {
      console.log(`    ${t.apartmentName} | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만`);
    });
  }

  // Compare rent levels: renewal vs new vs public housing
  console.log('\n=== RENT LEVEL COMPARISON ===');

  const avgRent = (transactions: any[]) => {
    if (transactions.length === 0) return 0;
    return transactions.reduce((sum, t) => sum + t.monthlyRent, 0) / transactions.length / 10000;
  };

  const regularNew = newContracts.filter(t =>
    !PUBLIC_HOUSING_KEYWORDS.some(kw => t.apartmentName.toUpperCase().includes(kw.toUpperCase()))
  );

  console.log(`  New contracts (regular): avg rent ${avgRent(regularNew).toFixed(1)}만원 (n=${regularNew.length})`);
  console.log(`  Renewal contracts: avg rent ${avgRent(renewals).toFixed(1)}만원 (n=${renewals.length})`);
  console.log(`  Public housing: avg rent ${avgRent(publicHousing).toFixed(1)}만원 (n=${publicHousing.length})`);

  if (renewals.length > 0 && regularNew.length > 0) {
    const diff = ((avgRent(regularNew) - avgRent(renewals)) / avgRent(regularNew) * 100).toFixed(1);
    console.log(`\n  📊 Renewal contracts are ${diff}% lower than new contracts`);
  }

  if (publicHousing.length > 0 && regularNew.length > 0) {
    const diff = ((avgRent(regularNew) - avgRent(publicHousing)) / avgRent(regularNew) * 100).toFixed(1);
    console.log(`  📊 Public housing is ${diff}% lower than regular new contracts`);
  }
}

main().catch(console.error);
