/**
 * Check the most recent analysis to see why it's stuck
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function checkStuckAnalysis() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the most recent analysis (regardless of status)
  const { data: analyses, error } = await supabase
    .from('analysis_results')
    .select(`
      *,
      properties (*)
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !analyses || analyses.length === 0) {
    console.error('Error fetching analysis:', error);
    return;
  }

  const analysis = analyses[0];

  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING MOST RECENT ANALYSIS');
  console.log('='.repeat(80) + '\n');

  console.log(`Analysis ID: ${analysis.id}`);
  console.log(`Created: ${analysis.created_at}`);
  console.log(`Status: ${analysis.status}`);
  console.log(`Completed: ${analysis.completed_at || 'NOT YET'}`);
  console.log(`Safety Score: ${analysis.safety_score || 'N/A'}`);
  console.log(`Risk Level: ${analysis.risk_level || 'N/A'}\n`);

  // Check documents
  const { data: docs } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysis.id);

  console.log('📄 Documents:');
  if (docs && docs.length > 0) {
    docs.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.original_filename}`);
      console.log(`     Type: ${doc.document_type}`);
      console.log(`     Uploaded: ${doc.created_at}`);
      console.log(`     Has parsed_data: ${!!doc.parsed_data}`);
      console.log(`     Has OCR text: ${!!doc.ocr_text}`);
      if (doc.parsed_data) {
        console.log(`     Parsed data keys:`, Object.keys(doc.parsed_data));
        if (doc.parsed_data.mockData) {
          console.log(`     ⚠️  USING MOCK DATA!`);
        }
      }
    });
  } else {
    console.log('  No documents found');
  }

  console.log('\n📊 Analysis Data:');
  console.log(`  Has deunggibu_data: ${!!analysis.deunggibu_data}`);
  if (analysis.deunggibu_data) {
    console.log(`  deunggibu_data keys:`, Object.keys(analysis.deunggibu_data));
    console.log(`  Has valuation: ${!!analysis.deunggibu_data.valuation}`);
    console.log(`  Has deunggibu: ${!!analysis.deunggibu_data.deunggibu}`);
  }

  console.log('\n🎯 Status Analysis:');

  // Determine where it's stuck based on status and data
  if (analysis.status === 'pending') {
    console.log('❌ STUCK AT: Initial upload (25%)');
    console.log('   The analysis has not started processing yet.');
    console.log('   This means the /api/documents/parse endpoint was never called.');
  } else if (analysis.status === 'processing') {
    if (!docs || docs.length === 0) {
      console.log('❌ STUCK AT: Document upload (25%)');
      console.log('   Status is processing but no documents found.');
    } else if (docs.some(d => !d.parsed_data)) {
      console.log('❌ STUCK AT: Document parsing (50%)');
      console.log('   Documents uploaded but parsing has not completed.');
      console.log('   Check Vercel logs for parsing errors.');
    } else if (!analysis.deunggibu_data) {
      console.log('❌ STUCK AT: Risk analysis (75%)');
      console.log('   Documents parsed but risk analysis not saved.');
    } else {
      console.log('⚠️  Status is "processing" but all data exists?');
      console.log('   This might be a race condition or the status update failed.');
    }
  } else if (analysis.status === 'completed') {
    console.log('✅ Analysis is COMPLETED');
    if (!analysis.deunggibu_data?.valuation) {
      console.log('   BUT valuation is missing (fell back to mock data)');
    }
  } else if (analysis.status === 'failed') {
    console.log('❌ Analysis FAILED');
    console.log('   Error:', analysis.error || 'No error message recorded');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkStuckAnalysis();
