import { config } from 'dotenv';
config({ path: '.env.local' });

import { MolitWolseAPI, getDistrictCode, DISTRICT_CODES } from '../lib/apis/molit-wolse';

async function searchBuildings() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const api = new MolitWolseAPI(apiKey);

  // Search term
  const searchTerm = '센트라스';
  console.log(`Searching for "${searchTerm}" across Seoul districts...\n`);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Search across all Seoul districts
  const seoulDistricts = Object.keys(DISTRICT_CODES['서울특별시']);

  for (const district of seoulDistricts) {
    const lawdCd = getDistrictCode('서울특별시', district);
    if (!lawdCd) continue;

    const transactions = await api.getRentTransactions(lawdCd, yearMonth);

    // Find matching buildings
    const matches = transactions.filter(t =>
      t.apartmentName.includes(searchTerm) || t.apartmentName.includes('텐즈힐')
    );

    if (matches.length > 0) {
      console.log(`\n📍 ${district} (${lawdCd}):`);
      const seen = new Set<string>();
      for (const m of matches) {
        const key = `${m.apartmentName}-${m.exclusiveArea}`;
        if (!seen.has(key)) {
          seen.add(key);
          console.log(`   - ${m.apartmentName} (${m.exclusiveArea}㎡) in ${m.dong}`);
        }
      }
    }
  }
}

searchBuildings().catch(console.error);

  // Find unique building names containing "센트라스" or "텐즈"
  const buildingNames = new Set<string>();
  const matchingBuildings: Array<{ name: string; area: number; dong: string }> = [];

  for (const t of transactions) {
    buildingNames.add(t.apartmentName);

    const nameLower = t.apartmentName.toLowerCase();
    if (nameLower.includes('센트라스') || nameLower.includes('텐즈') ||
        nameLower.includes('centras') || nameLower.includes('tenz')) {
      matchingBuildings.push({
        name: t.apartmentName,
        area: t.exclusiveArea,
        dong: t.dong
      });
    }
  }

  console.log(`Total unique buildings in 마포구: ${buildingNames.size}`);
  console.log(`\nBuildings containing "센트라스" or "텐즈":`);

  // Dedupe matching buildings
  const seen = new Set<string>();
  for (const b of matchingBuildings) {
    const key = `${b.name}-${b.area}`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`  - ${b.name} (${b.area}㎡) in ${b.dong}`);
    }
  }

  // Also show all building names for reference
  console.log('\n--- All building names in this month ---');
  const sortedNames = [...buildingNames].sort();
  for (const name of sortedNames) {
    if (name.includes('센트') || name.includes('텐즈') || name.includes('DMC') || name.includes('상암')) {
      console.log(`  * ${name}`);
    }
  }
}

searchBuildings().catch(console.error);
