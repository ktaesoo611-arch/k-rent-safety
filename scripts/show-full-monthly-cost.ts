import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

async function main() {
  const api = new MolitWolseAPI(process.env.MOLIT_API_KEY!);
  const lawdCd = getDistrictCode('서울특별시', '동작구');

  const transactions = await api.getRecentWolseForApartment(
    lawdCd!,
    '힐스테이트상도센트럴파크',
    59,
    12
  );

  // Filter to new contracts only (exclude 갱신)
  const newContracts = transactions.filter(t => t.contractType === '신규' || !t.contractType);

  // Market rate for full monthly cost calculation
  const marketRateAnnual = 3.69; // %
  const marketRateMonthly = marketRateAnnual / 100 / 12;

  console.log('\n=== FULL MONTHLY COST OVER 12 MONTHS ===');
  console.log(`Full Monthly Cost = Rent + (Deposit × ${marketRateAnnual}% / 12)\n`);

  // Sort by date (oldest first)
  const sorted = [...newContracts].sort((a, b) => {
    const dateA = new Date(a.year, a.month - 1, a.day);
    const dateB = new Date(b.year, b.month - 1, b.day);
    return dateA.getTime() - dateB.getTime();
  });

  console.log('Date        | Deposit    | Rent   | Full Monthly Cost');
  console.log('------------|------------|--------|------------------');

  const costs: number[] = [];

  sorted.forEach(t => {
    const deposit = t.deposit / 10000; // 만원
    const rent = t.monthlyRent / 10000; // 만원
    // Full Monthly Cost = Rent + (Deposit × annual_rate% / 12)
    const fullMonthlyCost = rent + (deposit * marketRateAnnual / 100 / 12);
    costs.push(fullMonthlyCost);

    const date = `${t.year}.${String(t.month).padStart(2, '0')}.${String(t.day).padStart(2, '0')}`;

    console.log(`${date} | ${deposit.toLocaleString().padStart(10)}만 | ${rent.toFixed(0).padStart(6)}만 | ${fullMonthlyCost.toFixed(1)}만원`);
  });

  // Calculate trend visually
  console.log('\n=== TREND VISUALIZATION ===\n');

  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const range = maxCost - minCost || 1;

  sorted.forEach((t, idx) => {
    const cost = costs[idx];
    const barLength = Math.round(((cost - minCost) / range) * 40) + 1;
    const bar = '█'.repeat(barLength);
    const date = `${t.year}.${String(t.month).padStart(2, '0')}`;
    console.log(`${date} | ${bar} ${cost.toFixed(1)}만`);
  });

  // Monthly averages
  console.log('\n=== MONTHLY AVERAGES ===\n');
  const byMonth: Record<string, number[]> = {};
  sorted.forEach((t, idx) => {
    const key = `${t.year}.${String(t.month).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(costs[idx]);
  });

  const monthlyAvgs: { month: string; avg: number }[] = [];
  Object.entries(byMonth).forEach(([month, monthlyCosts]) => {
    const avg = monthlyCosts.reduce((a, b) => a + b, 0) / monthlyCosts.length;
    monthlyAvgs.push({ month, avg });
    console.log(`${month}: ${avg.toFixed(1)}만원 (n=${monthlyCosts.length})`);
  });

  // Show trend summary
  console.log('\n=== TREND SUMMARY ===');
  const firstAvg = monthlyAvgs[0]?.avg || 0;
  const lastAvg = monthlyAvgs[monthlyAvgs.length - 1]?.avg || 0;
  const change = lastAvg - firstAvg;
  const changePercent = (change / firstAvg) * 100;

  console.log(`First month avg: ${firstAvg.toFixed(1)}만원`);
  console.log(`Last month avg: ${lastAvg.toFixed(1)}만원`);
  console.log(`Change: ${change >= 0 ? '+' : ''}${change.toFixed(1)}만원 (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
}

main().catch(console.error);
