/**
 * Check if the analysis used mock or real data
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function checkIfMock() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the most recent completed analysis
  const { data: analyses, error } = await supabase
    .from('analysis_results')
    .select(`
      *,
      properties (*)
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !analyses || analyses.length === 0) {
    console.error('Error fetching analysis:', error);
    return;
  }

  const analysis = analyses[0];
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING IF MOCK OR REAL ANALYSIS');
  console.log('='.repeat(80) + '\n');

  console.log(`Analysis ID: ${analysis.id}`);
  console.log(`Created: ${analysis.created_at}`);
  console.log(`Status: ${analysis.status}\n`);

  // Check the uploaded_documents table for this analysis
  const { data: docs, error: docsError } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysis.id);

  if (docsError || !docs || docs.length === 0) {
    console.log('❌ No documents found for this analysis');
    return;
  }

  const doc = docs[0];
  console.log('📄 Document Info:');
  console.log(`   File: ${doc.original_filename}`);
  console.log(`   Type: ${doc.document_type}`);
  console.log(`   Has parsed_data: ${!!doc.parsed_data}`);

  if (doc.parsed_data) {
    console.log(`   Is Mock: ${doc.parsed_data.mockData === true ? '✅ YES - USING MOCK DATA' : '❌ NO - REAL DATA'}`);
    console.log(`   Parsed data keys:`, Object.keys(doc.parsed_data));

    if (doc.parsed_data.mockData) {
      console.log('\n⚠️  WARNING: This analysis used MOCK data!');
      console.log('   This means performRealAnalysis() threw an error and fell back to mock.');
      console.log('   Check Vercel logs for the error that caused the fallback.\n');
    } else {
      console.log('\n✅ This analysis used REAL data from OCR and MOLIT API\n');
    }
  }

  // Check if OCR text exists
  console.log(`   Has OCR text: ${!!doc.ocr_text}`);
  if (doc.ocr_text) {
    console.log(`   OCR text length: ${doc.ocr_text.length} characters`);
  }

  // Check deunggibu_data structure
  const riskData = analysis.deunggibu_data;
  console.log('\n📊 Risk Analysis Data:');
  console.log(`   Has deunggibu_data: ${!!riskData}`);

  if (riskData) {
    console.log(`   Has valuation: ${!!riskData.valuation}`);
    console.log(`   Has deunggibu: ${!!riskData.deunggibu}`);
    console.log(`   Has scores: ${!!riskData.scores}`);
    console.log(`   Has risks: ${!!riskData.risks}`);
    console.log(`   overallScore: ${riskData.overallScore}`);
    console.log(`   riskLevel: ${riskData.riskLevel}`);

    if (!riskData.valuation && !riskData.deunggibu) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   valuation and deunggibu fields are MISSING');
      console.log('   This could mean:');
      console.log('   1. The analysis is using mock data (check mockData flag above)');
      console.log('   2. performRealAnalysis() had an error and fell back to mock');
      console.log('   3. The MOLIT API timed out or failed\n');
    }
  }
}

checkIfMock();
