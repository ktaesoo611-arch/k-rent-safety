/**
 * Check 고덕그라시움 data to understand 임대주택 pattern
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

  if (!lawdCd) {
    console.error('District code not found');
    process.exit(1);
  }

  console.log('\n=== CHECKING 고덕그라시움 DATA ===\n');
  console.log(`District: 강동구 (${lawdCd})`);

  // Fetch transactions for 고덕그라시움
  const transactions = await api.getRecentWolseForApartment(
    lawdCd,
    '고덕그라시움',
    undefined, // all areas
    12 // 12 months
  );

  console.log(`\nTotal transactions: ${transactions.length}`);

  // Group by apartment name variation
  const byName: Record<string, any[]> = {};
  for (const t of transactions) {
    const name = t.apartmentName;
    if (!byName[name]) byName[name] = [];
    byName[name].push(t);
  }

  console.log('\n=== BY APARTMENT NAME ===');
  for (const [name, txs] of Object.entries(byName)) {
    const avgRent = txs.reduce((s, t) => s + t.monthlyRent, 0) / txs.length / 10000;
    const avgDeposit = txs.reduce((s, t) => s + t.deposit, 0) / txs.length / 10000;
    console.log(`\n"${name}" (${txs.length} transactions)`);
    console.log(`  Avg deposit: ${avgDeposit.toFixed(0)}만원`);
    console.log(`  Avg rent: ${avgRent.toFixed(1)}만원`);

    // Show sample
    console.log('  Samples:');
    txs.slice(0, 3).forEach(t => {
      console.log(`    ${t.year}.${t.month}.${t.day} | ${t.exclusiveArea}㎡ | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만 | ${t.contractType || 'N/A'}`);
    });
  }

  // Group by exclusive area
  console.log('\n\n=== BY EXCLUSIVE AREA ===');
  const byArea: Record<string, any[]> = {};
  for (const t of transactions) {
    const areaKey = `${Math.round(t.exclusiveArea)}㎡`;
    if (!byArea[areaKey]) byArea[areaKey] = [];
    byArea[areaKey].push(t);
  }

  const sortedAreas = Object.entries(byArea).sort((a, b) =>
    parseFloat(a[0]) - parseFloat(b[0])
  );

  for (const [area, txs] of sortedAreas) {
    const avgRent = txs.reduce((s, t) => s + t.monthlyRent, 0) / txs.length / 10000;
    const avgDeposit = txs.reduce((s, t) => s + t.deposit, 0) / txs.length / 10000;
    const newOnly = txs.filter(t => t.contractType === '신규');
    const avgRentNew = newOnly.length > 0
      ? newOnly.reduce((s, t) => s + t.monthlyRent, 0) / newOnly.length / 10000
      : 0;

    console.log(`\n${area}: ${txs.length} transactions (${newOnly.length} new)`);
    console.log(`  All: avg ${avgDeposit.toFixed(0)}만원 deposit, ${avgRent.toFixed(1)}만원 rent`);
    if (newOnly.length > 0) {
      console.log(`  New only: avg ${avgRentNew.toFixed(1)}만원 rent`);
    }

    // Show price distribution
    const rents = txs.map(t => t.monthlyRent / 10000).sort((a, b) => a - b);
    console.log(`  Rent range: ${rents[0].toFixed(0)} ~ ${rents[rents.length-1].toFixed(0)}만원`);
  }

  // Check for bimodal distribution (indicator of mixed 임대/분양)
  console.log('\n\n=== CHECKING FOR BIMODAL DISTRIBUTION ===');
  const allRents = transactions.map(t => t.monthlyRent / 10000).sort((a, b) => a - b);
  const median = allRents[Math.floor(allRents.length / 2)];
  const belowMedian = allRents.filter(r => r < median * 0.7);
  const aboveMedian = allRents.filter(r => r >= median * 0.7);

  console.log(`Total transactions: ${transactions.length}`);
  console.log(`Median rent: ${median.toFixed(1)}만원`);
  console.log(`Below 70% of median (${(median * 0.7).toFixed(0)}만원): ${belowMedian.length} (${((belowMedian.length / transactions.length) * 100).toFixed(1)}%)`);
  console.log(`At or above 70% of median: ${aboveMedian.length} (${((aboveMedian.length / transactions.length) * 100).toFixed(1)}%)`);

  if (belowMedian.length > 0) {
    console.log('\nLow-rent transactions (potential 임대주택):');
    const lowRentTxs = transactions.filter(t => t.monthlyRent / 10000 < median * 0.7);
    lowRentTxs.slice(0, 10).forEach(t => {
      console.log(`  ${t.apartmentName} | ${t.exclusiveArea}㎡ | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만 | ${t.contractType || 'N/A'}`);
    });
  }
}

main().catch(console.error);
