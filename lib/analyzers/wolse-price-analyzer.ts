import { WolseRateCalculator, MarketRateResult } from './wolse-rate-calculator';
import {
  WolseQuote,
  WolseAnalysisResult,
  WolseNegotiationOption,
  WolseTransaction
} from '../types';

/**
 * Result of user rent comparison against market expectation
 */
interface UserRentComparison {
  expectedRent: number;        // Expected rent at user's deposit level
  actualRent: number;          // User's actual rent
  rentDifference: number;      // actualRent - expectedRent (positive = overpaying)
  rentDifferencePercent: number; // Percentage difference
  meanDeposit: number;         // Mean deposit from clean transactions
  meanRent: number;            // Mean rent from clean transactions
  cleanTransactionCount: number; // Number of transactions after outlier removal
  outliersRemoved: number;     // Number of outliers removed
}

/**
 * Wolse Price Analyzer
 *
 * Analyzes a user's wolse quote against market data and legal limits.
 * Uses market rate regression to calculate expected rent at user's deposit level.
 */
export class WolsePriceAnalyzer {
  private rateCalculator: WolseRateCalculator;

  constructor(apiKey: string) {
    this.rateCalculator = new WolseRateCalculator(apiKey);
  }

  /**
   * Remove outliers from transactions using IQR method
   * Outliers are transactions where deposit OR rent falls outside IQR bounds
   * Uses tighter bounds (1.0×IQR) for dong/district level data due to higher variance
   */
  private removeOutliers(
    transactions: WolseTransaction[],
    dataSource: 'building' | 'dong' | 'district' = 'building'
  ): {
    clean: WolseTransaction[];
    removed: WolseTransaction[];
  } {
    if (transactions.length < 4) {
      return { clean: transactions, removed: [] };
    }

    // Use tighter bounds for dong/district level data (higher variance)
    const multiplier = dataSource === 'building' ? 1.5 : 1.0;

    // Calculate IQR for deposits
    const sortedDeposits = [...transactions].sort((a, b) => a.deposit - b.deposit);
    const q1DepositIdx = Math.floor(transactions.length * 0.25);
    const q3DepositIdx = Math.floor(transactions.length * 0.75);
    const q1Deposit = sortedDeposits[q1DepositIdx].deposit;
    const q3Deposit = sortedDeposits[q3DepositIdx].deposit;
    const iqrDeposit = q3Deposit - q1Deposit;
    const depositLower = q1Deposit - multiplier * iqrDeposit;
    const depositUpper = q3Deposit + multiplier * iqrDeposit;

    // Calculate IQR for rents
    const sortedRents = [...transactions].sort((a, b) => a.monthlyRent - b.monthlyRent);
    const q1Rent = sortedRents[q1DepositIdx].monthlyRent;
    const q3Rent = sortedRents[q3DepositIdx].monthlyRent;
    const iqrRent = q3Rent - q1Rent;
    const rentLower = q1Rent - multiplier * iqrRent;
    const rentUpper = q3Rent + multiplier * iqrRent;

    const clean: WolseTransaction[] = [];
    const removed: WolseTransaction[] = [];

    for (const t of transactions) {
      const depositOutlier = t.deposit < depositLower || t.deposit > depositUpper;
      const rentOutlier = t.monthlyRent < rentLower || t.monthlyRent > rentUpper;

      if (depositOutlier || rentOutlier) {
        removed.push(t);
      } else {
        clean.push(t);
      }
    }

    return { clean, removed };
  }

  /**
   * Analyze a user's wolse quote
   */
  async analyzeQuote(
    city: string,
    district: string,
    dong: string,
    apartmentName: string,
    exclusiveArea: number,
    quote: WolseQuote
  ): Promise<WolseAnalysisResult> {
    console.log('\n🔍 Starting Wolse Price Analysis');
    console.log(`   Quote: ${(quote.deposit / 10000).toLocaleString()}만원 보증금 / ${(quote.monthlyRent / 10000).toLocaleString()}만원 월세`);

    // Step 1: Get market rate data
    const marketData = await this.rateCalculator.calculateMarketRate(
      city,
      district,
      dong,
      apartmentName,
      exclusiveArea
    );

    // Step 2: Compare user's rent to market expectation (NEW METHODOLOGY)
    const rentComparison = this.compareUserRentToMarket(
      quote,
      marketData.transactions,
      marketData.marketRate,
      marketData.dataSource
    );

    // Step 3: Derive user's implied rate for backwards compatibility
    const userImpliedRate = this.deriveUserImpliedRate(rentComparison, marketData.marketRate);

    // Step 4: Generate assessment based on rent comparison
    const assessment = this.generateAssessmentFromComparison(rentComparison, marketData);

    // Step 5: Calculate savings potential based on rent difference
    const savingsPotential = this.calculateSavingsPotentialFromComparison(
      rentComparison,
      marketData.legalRate,
      quote,
      marketData.marketRate
    );

    // Step 6: Generate trend advice
    const trendAdvice = this.generateTrendAdvice(marketData.trend);

    // Step 7: Generate negotiation options
    const negotiationOptions = this.generateNegotiationOptionsFromComparison(
      quote,
      rentComparison,
      marketData
    );

    // Generate UUID
    const id = crypto.randomUUID();

    const result: WolseAnalysisResult = {
      id,
      propertyId: '', // To be set when saved to DB
      userDeposit: quote.deposit,
      userMonthlyRent: quote.monthlyRent,
      userImpliedRate,
      expectedRent: rentComparison.expectedRent,
      rentDifference: rentComparison.rentDifference,
      rentDifferencePercent: rentComparison.rentDifferencePercent,
      marketRate: marketData.marketRate,
      marketRateRange: {
        low: marketData.rate25thPercentile,
        high: marketData.rate75thPercentile
      },
      legalRate: marketData.legalRate,
      confidenceLevel: marketData.confidenceLevel,
      dataSource: marketData.dataSource,
      dataSourceNote: marketData.dataSourceNote,
      contractCount: marketData.contractCount,
      cleanTransactionCount: rentComparison.cleanTransactionCount,
      outliersRemoved: rentComparison.outliersRemoved,
      assessment: assessment.level,
      assessmentDetails: assessment.details,
      savingsPotential,
      trend: {
        direction: marketData.trend.direction,
        percentage: marketData.trend.percentage,
        advice: trendAdvice
      },
      negotiationOptions,
      recentTransactions: marketData.transactions.slice(0, 10),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    console.log('\n✅ Analysis Complete:');
    console.log(`   User Rent: ${(quote.monthlyRent / 10000).toLocaleString()}만원`);
    console.log(`   Expected Rent: ${(rentComparison.expectedRent / 10000).toLocaleString()}만원`);
    console.log(`   Difference: ${rentComparison.rentDifference >= 0 ? '+' : ''}${(rentComparison.rentDifference / 10000).toLocaleString()}만원`);
    console.log(`   Market Rate: ${marketData.marketRate.toFixed(2)}%`);
    console.log(`   Assessment: ${assessment.level}`);

    return result;
  }

  /**
   * Compare user's rent against market expectation using linear regression
   *
   * Methodology:
   * 1. Remove outliers from transactions
   * 2. Fit linear regression: Rent = intercept + slope × Deposit
   * 3. Predict expected rent at user's deposit
   * 4. Compare user's actual rent vs expected rent
   */
  private compareUserRentToMarket(
    quote: WolseQuote,
    transactions: WolseTransaction[],
    marketRate: number,
    dataSource: 'building' | 'dong' | 'district' = 'building'
  ): UserRentComparison {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARING USER RENT TO MARKET EXPECTATION');
    console.log('='.repeat(60));
    console.log(`   User Quote: ${(quote.deposit / 10000).toLocaleString()}만원 보증금 / ${(quote.monthlyRent / 10000).toLocaleString()}만원 월세`);
    console.log(`   Market Rate: ${marketRate.toFixed(2)}%`);
    console.log(`   Transactions available: ${transactions.length}`);

    // Default result for insufficient data
    const defaultResult: UserRentComparison = {
      expectedRent: quote.monthlyRent,
      actualRent: quote.monthlyRent,
      rentDifference: 0,
      rentDifferencePercent: 0,
      meanDeposit: quote.deposit,
      meanRent: quote.monthlyRent,
      cleanTransactionCount: 0,
      outliersRemoved: 0
    };

    if (transactions.length === 0) {
      console.log('   ⚠️ No transactions available - cannot compare');
      return defaultResult;
    }

    // Step 1: Remove outliers (use tighter bounds for dong/district level data)
    const { clean, removed } = this.removeOutliers(transactions, dataSource);
    console.log(`\n   🧹 OUTLIER REMOVAL (IQR method):`);
    console.log(`      Original: ${transactions.length} transactions`);
    console.log(`      Removed: ${removed.length} outliers`);
    console.log(`      Clean: ${clean.length} transactions`);

    if (removed.length > 0) {
      console.log('      Outliers removed:');
      removed.forEach(t => {
        console.log(`         - ${t.year}.${t.month}.${t.day} | ${(t.deposit / 10000).toLocaleString()}만원 / ${(t.monthlyRent / 10000).toLocaleString()}만원`);
      });
    }

    if (clean.length < 3) {
      console.log('   ⚠️ Not enough clean transactions - using all data with simple average');
      const allMeanRent = transactions.reduce((sum, t) => sum + t.monthlyRent, 0) / transactions.length;
      const rentDiff = quote.monthlyRent - allMeanRent;

      return {
        expectedRent: Math.round(allMeanRent),
        actualRent: quote.monthlyRent,
        rentDifference: Math.round(rentDiff),
        rentDifferencePercent: allMeanRent > 0 ? (rentDiff / allMeanRent) * 100 : 0,
        meanDeposit: transactions.reduce((sum, t) => sum + t.deposit, 0) / transactions.length,
        meanRent: allMeanRent,
        cleanTransactionCount: transactions.length,
        outliersRemoved: 0
      };
    }

    // Step 2: Calculate statistics for reference
    const meanDeposit = clean.reduce((sum, t) => sum + t.deposit, 0) / clean.length;
    const meanRent = clean.reduce((sum, t) => sum + t.monthlyRent, 0) / clean.length;

    // Log clean transactions for reference
    console.log('\n   📋 CLEAN TRANSACTIONS (sorted by deposit):');
    const sortedClean = [...clean].sort((a, b) => a.deposit - b.deposit);
    sortedClean.forEach((t, idx) => {
      console.log(`      ${idx + 1}. ${t.year}.${t.month}.${t.day} | ${(t.deposit / 10000).toLocaleString()}만원 / ${(t.monthlyRent / 10000).toLocaleString()}만원`);
    });

    // Step 3: Linear regression to predict rent at user's deposit
    // Rent = intercept + slope × Deposit
    const n = clean.length;
    const sumX = clean.reduce((sum, t) => sum + t.deposit, 0);
    const sumY = clean.reduce((sum, t) => sum + t.monthlyRent, 0);
    const sumXY = clean.reduce((sum, t) => sum + t.deposit * t.monthlyRent, 0);
    const sumX2 = clean.reduce((sum, t) => sum + t.deposit * t.deposit, 0);

    const denominator = n * sumX2 - sumX * sumX;
    let expectedRent: number;
    let slope = 0;
    let intercept = 0;
    let rSquared = 0;

    if (Math.abs(denominator) < 1e-10) {
      // Can't fit regression - use mean rent
      console.log('\n   ⚠️ Cannot fit regression (no variance in deposits) - using mean rent');
      expectedRent = meanRent;
    } else {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
      expectedRent = intercept + slope * quote.deposit;

      // Calculate R-squared
      const yMean = sumY / n;
      const ssTotal = clean.reduce((sum, t) => sum + Math.pow(t.monthlyRent - yMean, 2), 0);
      const ssResidual = clean.reduce((sum, t) => {
        const predicted = intercept + slope * t.deposit;
        return sum + Math.pow(t.monthlyRent - predicted, 2);
      }, 0);
      rSquared = ssTotal > 0 ? Math.max(0, 1 - ssResidual / ssTotal) : 0;

      console.log(`\n   📐 LINEAR REGRESSION:`);
      console.log('   ' + '-'.repeat(50));
      console.log(`      Formula: Rent = ${(intercept / 10000).toFixed(2)}만원 + (${(slope * 100000000).toFixed(2)}만원/1억) × Deposit`);
      console.log(`      Slope: ${(slope * 100000000).toFixed(2)}만원 per 1억 deposit`);
      console.log(`      Intercept: ${(intercept / 10000).toFixed(2)}만원 (rent at 0 deposit)`);
      console.log(`      R²: ${(rSquared * 100).toFixed(1)}% (goodness of fit)`);
      console.log('   ' + '-'.repeat(50));
      console.log(`      At user's deposit (${(quote.deposit / 10000).toLocaleString()}만원):`);
      console.log(`      Expected Rent = ${(intercept / 10000).toFixed(2)} + (${(slope * 100000000).toFixed(2)} × ${(quote.deposit / 100000000).toFixed(2)})`);
      console.log(`                    = ${(expectedRent / 10000).toFixed(2)}만원`);
      console.log('   ' + '-'.repeat(50));

      // Sanity check: if expected rent is negative or unreasonably high, fall back
      if (expectedRent < 0) {
        console.log('   ⚠️ Regression produced negative rent - using mean rent');
        expectedRent = meanRent;
      }
    }

    // Step 4: Compare user's actual rent vs expected rent
    const rentDifference = quote.monthlyRent - expectedRent;
    const rentDifferencePercent = expectedRent > 0 ? (rentDifference / expectedRent) * 100 : 0;

    console.log(`\n   📊 COMPARISON RESULT:`);
    console.log('   ' + '='.repeat(50));
    console.log(`      User's Rent: ${(quote.monthlyRent / 10000).toLocaleString()}만원`);
    console.log(`      Expected Rent: ${(expectedRent / 10000).toLocaleString()}만원`);
    console.log(`      Difference: ${rentDifference >= 0 ? '+' : ''}${(rentDifference / 10000).toLocaleString()}만원 (${rentDifferencePercent >= 0 ? '+' : ''}${rentDifferencePercent.toFixed(1)}%)`);
    console.log('   ' + '='.repeat(50));

    if (rentDifference > 0) {
      console.log(`      ⚠️ User paying ${(rentDifference / 10000).toLocaleString()}만원 MORE than market expectation`);
    } else if (rentDifference < 0) {
      console.log(`      ✅ User paying ${(Math.abs(rentDifference) / 10000).toLocaleString()}만원 LESS than market expectation`);
    } else {
      console.log(`      ✅ User paying exactly at market expectation`);
    }

    return {
      expectedRent: Math.round(expectedRent),
      actualRent: quote.monthlyRent,
      rentDifference: Math.round(rentDifference),
      rentDifferencePercent,
      meanDeposit,
      meanRent,
      cleanTransactionCount: clean.length,
      outliersRemoved: removed.length
    };
  }

  /**
   * Calculate user's implied rate (for backwards compatibility and negotiation scripts)
   * This derives a rate from the rent comparison for display purposes
   */
  private deriveUserImpliedRate(
    comparison: UserRentComparison,
    marketRate: number
  ): number {
    // If user is paying at or below expected, their effective rate <= market rate
    // If user is paying above expected, their effective rate > market rate
    // Scale proportionally based on rent difference
    if (comparison.expectedRent <= 0) return marketRate;

    const rentRatio = comparison.actualRent / comparison.expectedRent;
    return marketRate * rentRatio;
  }

  /**
   * Generate assessment based on rent comparison (NEW METHODOLOGY)
   */
  private generateAssessmentFromComparison(
    comparison: UserRentComparison,
    marketData: MarketRateResult
  ): { level: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED'; details: string } {
    const { rentDifference, rentDifferencePercent, expectedRent, actualRent } = comparison;

    // Format amounts for display
    const formatWon = (amount: number) => {
      if (Math.abs(amount) >= 10000) {
        return `${(amount / 10000).toLocaleString()}만원`;
      }
      return `${amount.toLocaleString()}원`;
    };

    // Assessment based on how much user pays vs expected
    if (rentDifferencePercent <= -10) {
      // Paying 10%+ less than expected
      return {
        level: 'GOOD_DEAL',
        details: `Great find! You're paying ${formatWon(Math.abs(rentDifference))}/month less than the market expectation of ${formatWon(expectedRent)}. Consider locking in this rate with a longer lease and negotiating other terms like repairs or appliances.`
      };
    }

    if (rentDifferencePercent <= 5) {
      // Within ±5% of expected - fair deal
      if (rentDifference <= 0) {
        return {
          level: 'FAIR',
          details: `Your rent of ${formatWon(actualRent)} is at or below the market expectation of ${formatWon(expectedRent)}. Focus on negotiating contract terms (lease length, repairs, deposit payment schedule) rather than price.`
        };
      }
      return {
        level: 'FAIR',
        details: `Your rent of ${formatWon(actualRent)} is close to the market expectation of ${formatWon(expectedRent)} (+${formatWon(rentDifference)}). Minor room for negotiation exists.`
      };
    }

    if (rentDifferencePercent <= 15) {
      // 5-15% above expected
      return {
        level: 'OVERPRICED',
        details: `You're paying ${formatWon(rentDifference)}/month more than the market expectation of ${formatWon(expectedRent)}. This is ${rentDifferencePercent.toFixed(0)}% above market. Room for negotiation.`
      };
    }

    // More than 15% above expected
    return {
      level: 'SEVERELY_OVERPRICED',
      details: `You're paying ${formatWon(rentDifference)}/month more than expected (${formatWon(expectedRent)}). At ${rentDifferencePercent.toFixed(0)}% above market, strong negotiation is recommended.`
    };
  }

  /**
   * Calculate potential savings based on rent comparison (NEW METHODOLOGY)
   */
  private calculateSavingsPotentialFromComparison(
    comparison: UserRentComparison,
    legalRate: number,
    quote: WolseQuote,
    marketRate: number
  ): { vsMarket: number; vsLegal: number } {
    // Savings vs market = how much user is overpaying vs expected rent at market rate
    const savingsVsMarket = Math.max(0, comparison.rentDifference * 12);

    // Calculate expected rent at legal rate
    // Formula: Expected_Rent = Mean_Rent + (Rate/12/100) × (Mean_Deposit - User_Deposit)
    // Since legal rate < market rate, expected rent at legal rate is HIGHER
    // (less discount for the same deposit increase)
    const legalRatePerMonth = legalRate / 12 / 100;
    const marketRatePerMonth = marketRate / 12 / 100;
    const depositDiffFromMean = comparison.meanDeposit - quote.deposit;

    // Difference in expected rent between legal and market rate
    // expectedRentAtLegal = meanRent + legalRatePerMonth × depositDiff
    // expectedRentAtMarket = meanRent + marketRatePerMonth × depositDiff (this is comparison.expectedRent)
    // rentDiffBetweenRates = (legalRatePerMonth - marketRatePerMonth) × depositDiff
    const expectedRentAtLegal = comparison.meanRent + legalRatePerMonth * depositDiffFromMean;
    const savingsVsLegal = Math.max(0, (quote.monthlyRent - expectedRentAtLegal) * 12);

    return {
      vsMarket: Math.round(savingsVsMarket),
      vsLegal: Math.round(savingsVsLegal)
    };
  }

  /**
   * Generate trend-based advice
   */
  private generateTrendAdvice(trend: { direction: 'RISING' | 'STABLE' | 'DECLINING'; percentage: number }): string {
    switch (trend.direction) {
      case 'DECLINING':
        if (trend.percentage > 15) {
          return `Market rates are declining significantly (-${trend.percentage.toFixed(0)}% over 6 months). Strong negotiation position - landlords have less pricing power.`;
        }
        return `Market rates are trending down (-${trend.percentage.toFixed(0)}%). Good time to negotiate or consider waiting for better rates.`;

      case 'RISING':
        if (trend.percentage > 15) {
          return `Market rates are rising rapidly (+${trend.percentage.toFixed(0)}% over 6 months). Consider securing a contract sooner if the price is reasonable.`;
        }
        return `Market rates are trending up (+${trend.percentage.toFixed(0)}%). Moderate urgency to finalize if you find a fair deal.`;

      case 'STABLE':
      default:
        return `Market rates are stable. Take your time to find the best deal and negotiate confidently.`;
    }
  }

  /**
   * Generate negotiation options based on rent comparison (NEW METHODOLOGY)
   */
  private generateNegotiationOptionsFromComparison(
    quote: WolseQuote,
    comparison: UserRentComparison,
    marketData: MarketRateResult
  ): WolseNegotiationOption[] {
    const options: WolseNegotiationOption[] = [];
    const { marketRate, trend } = marketData;
    const { expectedRent, rentDifference, rentDifferencePercent } = comparison;

    // Format amounts for display
    const formatWon = (amount: number) => `${(amount / 10000).toLocaleString()}만원`;

    // If user is already paying at or below market expectation, provide strategic advice
    if (rentDifferencePercent <= 0) {
      const options: WolseNegotiationOption[] = [];

      // Option 1: Accept and lock in with longer lease
      options.push({
        name: 'Accept & Lock In',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `I'd like to proceed with the ${formatWon(quote.deposit)} deposit and ${formatWon(quote.monthlyRent)} monthly rent. Could we sign a 2-year lease to lock in this rate? I'm a reliable tenant looking for long-term stability.`,
        recommended: true
      });

      // Option 2: Negotiate non-price terms
      options.push({
        name: 'Negotiate Terms',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `I'm happy with the rent terms. Before signing, I'd like to discuss: (1) Could you handle any minor repairs before move-in? (2) Is the deposit payable in 2 installments? (3) Could we include the washing machine/AC in the contract?`
      });

      // Option 3: Request move-in benefits
      options.push({
        name: 'Move-in Benefits',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: quote.monthlyRent,
        monthlySavings: 0,
        yearlySavings: 0,
        script: `The rent works for me. I'm ready to sign quickly. In exchange, would you consider: a few days of free rent for move-in preparation, or covering the first month's utility setup fees?`
      });

      return options;
    }

    // Option A: Market Rate (negotiate down to expected rent)
    if (rentDifference > 0) {
      options.push({
        name: 'Market Rate',
        rate: marketRate,
        deposit: quote.deposit,
        monthlyRent: expectedRent,
        monthlySavings: rentDifference,
        yearlySavings: rentDifference * 12,
        script: `Based on ${marketData.contractCount} recent contracts in this building, the market rate is ${marketRate.toFixed(1)}%. At my deposit of ${formatWon(quote.deposit)}, the expected rent is ${formatWon(expectedRent)}. I'd like to adjust to this market rate.`,
        recommended: true
      });
    }

    // Option B: Slight discount (5% below market)
    const discountedRent = Math.round(expectedRent * 0.95);
    const discountSavings = quote.monthlyRent - discountedRent;
    if (discountSavings > rentDifference) {
      options.push({
        name: 'Negotiated Discount',
        rate: marketRate * 0.95,
        deposit: quote.deposit,
        monthlyRent: discountedRent,
        monthlySavings: discountSavings,
        yearlySavings: discountSavings * 12,
        script: `I've researched recent transactions and the market average is ${formatWon(expectedRent)}. Given current market conditions, I'm hoping for ${formatWon(discountedRent)} - a modest 5% discount. I'm a reliable tenant and ready to sign immediately.`
      });
    }

    // Option C: Aggressive discount if market is declining
    if (trend.direction === 'DECLINING' && trend.percentage > 5) {
      const aggressiveRent = Math.round(expectedRent * 0.9);
      const aggressiveSavings = quote.monthlyRent - aggressiveRent;
      if (aggressiveSavings > 0) {
        options.push({
          name: 'Trend-Based Discount',
          rate: marketRate * 0.9,
          deposit: quote.deposit,
          monthlyRent: aggressiveRent,
          monthlySavings: aggressiveSavings,
          yearlySavings: aggressiveSavings * 12,
          script: `Market rents have declined ${trend.percentage.toFixed(0)}% over the past 6 months. Given this trend, I'm proposing ${formatWon(aggressiveRent)} - 10% below current market. I'm flexible on move-in date if this works for you.`
        });
      }
    }

    // Sort by yearly savings (highest first)
    return options.sort((a, b) => b.yearlySavings - a.yearlySavings);
  }
}
