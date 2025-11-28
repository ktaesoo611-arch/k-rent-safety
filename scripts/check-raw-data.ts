/**
 * Check the RAW database data to see exactly what's stored
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function checkRawData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the most recent analysis
  const { data, error } = await supabase
    .from('analysis_results')
    .select('id, created_at, deunggibu_data')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📄 RAW DATABASE DATA');
  console.log('='.repeat(80));
  console.log(`\nAnalysis ID: ${data.id}`);
  console.log(`Created: ${data.created_at}`);
  console.log(`\nFull deunggibu_data object:\n`);
  console.log(JSON.stringify(data.deunggibu_data, null, 2));

  console.log('\n\n🔍 KEY CHECKS:');
  console.log(`- deunggibu_data exists: ${!!data.deunggibu_data}`);
  console.log(`- deunggibu_data is object: ${typeof data.deunggibu_data === 'object'}`);
  console.log(`- deunggibu field exists: ${!!data.deunggibu_data?.deunggibu}`);
  console.log(`- valuation field exists: ${!!data.deunggibu_data?.valuation}`);

  if (data.deunggibu_data) {
    console.log(`\n- Top-level keys in deunggibu_data:`);
    Object.keys(data.deunggibu_data).forEach(key => {
      const value = data.deunggibu_data[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = type === 'object' && value !== null ? '{...}' :
                     type === 'array' ? `[${value.length} items]` :
                     type === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                     value;
      console.log(`    - ${key}: ${type} = ${preview}`);
    });
  }
}

checkRawData();
