/**
 * Script to update apartment English names in the database
 *
 * Usage: npx tsx scripts/update-english-names.ts [--district=강남구] [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateEnglishName } from '../lib/data/english-name-mappings';

const DATABASE_PATH = path.join(__dirname, '../lib/data/apartment-database.json');

interface Apartment {
  name: string;
  nameEn?: string;
  district: string;
  districtCode: string;
  dongs: string[];
  transactionCount: number;
  areas: number[];
  priceRange: { min: number; max: number };
}

interface Database {
  generatedAt: string;
  months: string[];
  totalTransactions: number;
  totalApartments: number;
  apartments: Apartment[];
}

function updateEnglishNames(districtFilter?: string, dryRun: boolean = false) {
  console.log('📖 Reading apartment database...');

  const rawData = fs.readFileSync(DATABASE_PATH, 'utf-8');
  const database: Database = JSON.parse(rawData);

  console.log(`📊 Total apartments: ${database.apartments.length}`);

  // Filter by district if specified
  const apartmentsToUpdate = districtFilter
    ? database.apartments.filter(a => a.district === districtFilter)
    : database.apartments;

  console.log(`🎯 Apartments to update: ${apartmentsToUpdate.length}${districtFilter ? ` (${districtFilter})` : ''}`);

  let updatedCount = 0;
  let unchangedCount = 0;
  const changes: Array<{ name: string; oldEn: string; newEn: string }> = [];

  for (const apartment of apartmentsToUpdate) {
    const newEnglishName = generateEnglishName(apartment.name, apartment.district);
    const oldEnglishName = apartment.nameEn || '';

    if (newEnglishName !== oldEnglishName) {
      changes.push({
        name: apartment.name,
        oldEn: oldEnglishName,
        newEn: newEnglishName,
      });

      if (!dryRun) {
        apartment.nameEn = newEnglishName;
      }
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }

  // Print changes
  console.log('\n📝 Changes:');
  console.log('─'.repeat(80));

  for (const change of changes.slice(0, 50)) {
    console.log(`${change.name}`);
    console.log(`  OLD: ${change.oldEn || '(empty)'}`);
    console.log(`  NEW: ${change.newEn}`);
    console.log('');
  }

  if (changes.length > 50) {
    console.log(`... and ${changes.length - 50} more changes`);
  }

  console.log('─'.repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Unchanged: ${unchangedCount}`);
  console.log(`   Total: ${apartmentsToUpdate.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes written to file');
    console.log('   Run without --dry-run to apply changes');
  } else {
    // Write back to file
    console.log('\n💾 Writing changes to database...');
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
    console.log('✅ Database updated successfully!');
  }

  return { updatedCount, unchangedCount, changes };
}

// Parse command line arguments
const args = process.argv.slice(2);
const districtArg = args.find(a => a.startsWith('--district='));
const district = districtArg ? districtArg.split('=')[1] : undefined;
const dryRun = args.includes('--dry-run');

if (args.includes('--help')) {
  console.log(`
Usage: npx tsx scripts/update-english-names.ts [options]

Options:
  --district=<name>  Filter by district (e.g., --district=강남구)
  --dry-run          Preview changes without writing to file
  --help             Show this help message

Examples:
  npx tsx scripts/update-english-names.ts --district=강남구 --dry-run
  npx tsx scripts/update-english-names.ts --district=강남구
  npx tsx scripts/update-english-names.ts
`);
  process.exit(0);
}

updateEnglishNames(district, dryRun);
