/**
 * Check raw API response to see available fields
 */

import axios from 'axios';

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not set');
    process.exit(1);
  }

  // Fetch raw data
  const response = await axios.get(
    'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
    {
      params: {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: 10,
        LAWD_CD: '11680', // 강남구
        DEAL_YMD: '202512'
      },
      timeout: 30000
    }
  );

  const items = response.data.response?.body?.items?.item || [];
  const transactions = Array.isArray(items) ? items : (items ? [items] : []);

  console.log('\n=== RAW API RESPONSE (first 3 items) ===\n');

  transactions.slice(0, 3).forEach((item: any, idx: number) => {
    console.log(`\n--- Transaction ${idx + 1} ---`);
    for (const [key, value] of Object.entries(item)) {
      console.log(`  ${key}: "${value}"`);
    }
  });

  // Check for contract type field specifically
  console.log('\n\n=== CHECKING FOR CONTRACT TYPE FIELD ===');
  const firstItem = transactions[0];
  if (firstItem) {
    const possibleFields = ['cdealType', 'cdeal_type', 'cDealType', 'dealType', 'contractType', 'cntrctType'];
    for (const field of possibleFields) {
      console.log(`  ${field}: ${firstItem[field] !== undefined ? `"${firstItem[field]}"` : 'NOT FOUND'}`);
    }

    // Check all fields that might contain contract info
    console.log('\n  All fields containing "deal" or "type" or "cntr":');
    for (const [key, value] of Object.entries(firstItem)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('deal') || lowerKey.includes('type') || lowerKey.includes('cntr')) {
        console.log(`    ${key}: "${value}"`);
      }
    }
  }
}

main().catch(console.error);
