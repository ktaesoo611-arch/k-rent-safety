/**
 * Find transactions with contractType populated
 */

import axios from 'axios';

async function fetchMonth(apiKey: string, lawdCd: string, yearMonth: string) {
  const response = await axios.get(
    'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
    {
      params: {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: 1000,
        LAWD_CD: lawdCd,
        DEAL_YMD: yearMonth
      },
      timeout: 30000
    }
  );

  const items = response.data.response?.body?.items?.item || [];
  return Array.isArray(items) ? items : (items ? [items] : []);
}

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not set');
    process.exit(1);
  }

  const districts = [
    { name: '강남구', code: '11680' },
    { name: '서초구', code: '11650' },
    { name: '송파구', code: '11710' },
  ];

  console.log('\n=== SEARCHING FOR TRANSACTIONS WITH contractType POPULATED ===\n');

  for (const district of districts) {
    console.log(`\n--- ${district.name} ---`);

    const today = new Date();
    let found = false;

    for (let i = 0; i < 6 && !found; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      const transactions = await fetchMonth(apiKey, district.code, yearMonth);
      console.log(`  ${yearMonth}: ${transactions.length} transactions`);

      // Count by contractType
      const byType: Record<string, number> = {};
      for (const t of transactions) {
        const type = t.contractType?.trim() || 'empty';
        byType[type] = (byType[type] || 0) + 1;
      }

      for (const [type, count] of Object.entries(byType)) {
        if (type !== 'empty') {
          console.log(`    📌 contractType="${type}": ${count} transactions`);
          found = true;

          // Show samples
          const samples = transactions.filter((t: any) => t.contractType?.trim() === type).slice(0, 2);
          for (const s of samples) {
            console.log(`       ${s.aptNm} | ${s.deposit}만/${s.monthlyRent}만 | preDeposit=${s.preDeposit?.trim() || 'N/A'}`);
          }
        }
      }
    }

    if (!found) {
      console.log(`  ⚠️ No contractType values found in last 6 months`);
    }
  }

  console.log('\n\n=== CONCLUSION ===');
  console.log('If no contractType values found, the MOLIT API may not provide this data');
  console.log('for the 아파트 전월세 endpoint, or it requires specific conditions.');
}

main().catch(console.error);
