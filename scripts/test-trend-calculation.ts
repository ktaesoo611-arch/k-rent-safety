import { config } from 'dotenv';
config({ path: '.env.local' });
import { WolseRateCalculator } from '../lib/analyzers/wolse-rate-calculator';

async function testTrendCalculation() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('MOLIT_API_KEY not found');
    return;
  }

  const calculator = new WolseRateCalculator(apiKey);

  // Test with multiple locations to compare trend detection
  const testCases = [
    { city: '서울특별시', district: '강남구', dong: '역삼동', building: '래미안역삼', area: 84 },
    { city: '서울특별시', district: '마포구', dong: '상암동', building: '상암월드컵파크', area: 84 },
    { city: '서울특별시', district: '송파구', dong: '잠실동', building: '잠실엘스', area: 84 },
  ];

  for (const tc of testCases) {
    console.log('\n' + '='.repeat(70));
    console.log(`TREND TEST - ${tc.dong} ${tc.area}㎡`);
    console.log('='.repeat(70));

    const result = await calculator.calculateMarketRate(
      tc.city,
      tc.district,
      tc.dong,
      tc.building,
      tc.area
    );

    console.log('\n' + '-'.repeat(40));
    console.log(`RESULT: ${tc.dong}`);
    console.log('-'.repeat(40));
    console.log(`Market Rate: ${result.marketRate.toFixed(2)}%`);
    console.log(`Trend: ${result.trend.direction} (${result.trend.percentage.toFixed(1)}%)`);
    console.log(`R²: ${(result.trend.rSquared * 100).toFixed(1)}%`);
    console.log(`Valid Pairs: ${result.validPairCount}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('Observation: If all locations show STABLE despite notable % changes,');
  console.log('the R² threshold may be too strict for naturally noisy wolse data.');

}

testTrendCalculation().catch(console.error);
