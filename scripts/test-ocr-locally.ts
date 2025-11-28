/**
 * Test OCR and parsing locally to debug production failures
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { OCRService } from '../lib/services/ocr';
import { DeunggibuParser } from '../lib/parsers/deunggibu-parser';

config({ path: '.env.local' });

async function testOCRLocally() {
  console.log('Testing OCR and parsing locally...\n');

  // Path to the test PDF
  const pdfPath = 'C:\\Users\\Lenovo\\Downloads\\행당한진타운 제110동 제1201호.pdf';

  try {
    console.log('1. Reading PDF file...');
    const buffer = readFileSync(pdfPath);
    console.log(`   ✓ File size: ${buffer.length} bytes\n`);

    console.log('2. Initializing OCR service...');
    const ocrService = new OCRService(
      process.env.GOOGLE_CLOUD_PROJECT_ID!,
      process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL!
    );
    console.log('   ✓ OCR service initialized\n');

    console.log('3. Extracting text from PDF (this may take 30-60 seconds)...');
    const startTime = Date.now();
    const ocrText = await ocrService.extractTextFromPDF(buffer);
    const elapsed = Date.now() - startTime;
    console.log(`   ✓ OCR completed in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   ✓ Extracted ${ocrText.length} characters\n`);

    console.log('4. Parsing deunggibu data...');
    const parser = new DeunggibuParser();
    const deunggibuData = parser.parse(ocrText);
    console.log(`   ✓ Parsing complete\n`);

    console.log('5. Parsed Data Summary:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Address: ${deunggibuData.address}`);
    console.log(`   Building: ${deunggibuData.buildingName}`);
    console.log(`   Area: ${deunggibuData.area}㎡`);
    console.log(`   Owner: ${deunggibuData.owner}`);
    console.log(`   Building Year: ${deunggibuData.buildingYear}`);
    console.log(`   Mortgages: ${deunggibuData.mortgages.length}`);
    if (deunggibuData.mortgages.length > 0) {
      deunggibuData.mortgages.forEach((m, i) => {
        console.log(`     ${i + 1}. ${m.creditor}: ₩${(m.estimatedPrincipal / 100000000).toFixed(2)}억`);
      });
    }
    console.log(`   Jeonse Rights: ${deunggibuData.jeonseRights.length}`);
    console.log(`   Total Debt: ₩${(deunggibuData.totalEstimatedPrincipal / 100000000).toFixed(2)}억`);
    console.log(`   Confidence: ${(deunggibuData.confidence * 100).toFixed(1)}%\n`);

    console.log('✅ SUCCESS: OCR and parsing completed without errors\n');

  } catch (error) {
    console.error('\n❌ ERROR during processing:');
    console.error('   Type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.log('\n🔍 This error is likely what causes production to fall back to mock data.\n');
  }
}

testOCRLocally();
