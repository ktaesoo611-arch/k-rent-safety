import { MolitWolseAPI, getDistrictCode } from '../apis/molit-wolse';
import { WolseTransaction, WolseMarketRate } from '../types';

/**
 * Current legal conversion rate limits (Housing Lease Protection Act)
 * Legal cap = min(10%, BOK base rate + 2%)
 * Current BOK rate: 2.5% (as of Dec 2024)
 */
const CURRENT_BOK_RATE = 2.5;
const LEGAL_CAP = Math.min(10, CURRENT_BOK_RATE + 2); // = 4.5%

export interface ConversionRatePair {
  transaction1: WolseTransaction;
  transaction2: WolseTransaction;
  impliedRate: number;
  daysAgo: number;
  weight: number;
}

// Extended transaction with time-adjusted rent
interface TimeAdjustedTransaction extends WolseTransaction {
  adjustedMonthlyRent: number;
  adjustmentFactor: number;
}

// Monthly trend data for a building
interface MonthlyTrendPoint {
  yearMonth: string;
  medianDeposit: number;
  medianRent: number;
  normalizedRent: number;  // rent at reference deposit
  smoothedRent?: number;   // after moving average
  transactionCount: number;
}

export interface MarketRateResult {
  marketRate: number;
  rate25thPercentile: number;
  rate75thPercentile: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  dataSource: 'building' | 'dong' | 'district';
  dataSourceNote: string;
  contractCount: number;
  cleanTransactionCount: number;
  outliersRemoved: number;
  validPairCount: number;
  trend: {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;
    rSquared: number;
  };
  legalRate: number;
  transactions: WolseTransaction[];
}

/**
 * Wolse Market Rate Calculator
 *
 * Calculates the market conversion rate (전환율) from actual wolse transactions.
 * Uses pairs of transactions with different deposit-rent combinations to infer
 * the implicit interest rate used in deposit-rent tradeoffs.
 */
export class WolseRateCalculator {
  private wolseAPI: MolitWolseAPI;

  constructor(apiKey: string) {
    this.wolseAPI = new MolitWolseAPI(apiKey);
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

    // IQR bounds logging (concise)
    console.log(`\n   📊 IQR Bounds [${dataSource}, ${multiplier}×IQR]: Deposit ${(depositLower/10000).toFixed(0)}~${(depositUpper/10000).toFixed(0)}만, Rent ${(rentLower/10000).toFixed(0)}~${(rentUpper/10000).toFixed(0)}만`);

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
   * Calculate market rate for a specific apartment
   */
  async calculateMarketRate(
    city: string,
    district: string,
    dong: string,
    apartmentName: string,
    exclusiveArea: number,
    monthsBack: number = 6
  ): Promise<MarketRateResult> {
    const lawdCd = getDistrictCode(city, district);
    if (!lawdCd) {
      throw new Error(`District code not found for ${city} ${district}`);
    }

    console.log('\n📊 Starting Wolse Market Rate Calculation');
    console.log(`   Building: ${apartmentName}`);
    console.log(`   Area: ${exclusiveArea}㎡`);
    console.log(`   District: ${district} (${lawdCd})`);

    // Step 1: Fetch transactions from same building
    let transactions = await this.wolseAPI.getRecentWolseForApartment(
      lawdCd,
      apartmentName,
      exclusiveArea,
      monthsBack
    );

    let dataSource = 'building';
    let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'HIGH';

    // Step 2: Fall back to dong-level if insufficient data
    if (transactions.length < 5) {
      console.log(`\n⚠️ Only ${transactions.length} building transactions. Expanding to dong level...`);
      // Use 12 months and ±5% area tolerance for dong-level (stricter filtering, more data)
      const dongMonthsBack = 12;
      const dongTransactions = await this.wolseAPI.getWolseForDong(
        lawdCd,
        dong,
        exclusiveArea,
        dongMonthsBack,
        0.05  // ±5% area tolerance (stricter than default ±10%)
      );
      transactions = dongTransactions;
      dataSource = 'dong';
      confidenceLevel = 'LOW';
    }

    // Step 3: Check if we have sufficient data
    if (transactions.length < 5) {
      console.log(`\n❌ Insufficient data: only ${transactions.length} transactions found`);
      return {
        marketRate: LEGAL_CAP,
        rate25thPercentile: LEGAL_CAP,
        rate75thPercentile: LEGAL_CAP,
        confidenceLevel: 'INSUFFICIENT',
        dataSource: dataSource as 'building' | 'dong' | 'district',
        dataSourceNote: `Insufficient data: only ${transactions.length} transactions found in ${dong} area`,
        contractCount: transactions.length,
        cleanTransactionCount: transactions.length,
        outliersRemoved: 0,
        validPairCount: 0,
        trend: {
          direction: 'STABLE',
          percentage: 0,
          rSquared: 0
        },
        legalRate: LEGAL_CAP,
        transactions
      };
    }

    // Step 4: Remove outliers using IQR method
    // Use tighter bounds (1.0×IQR) for dong/district level data
    const { clean: cleanTransactions, removed: outlierTransactions } = this.removeOutliers(
      transactions,
      dataSource as 'building' | 'dong' | 'district'
    );
    const outliersRemoved = outlierTransactions.length;
    console.log(`\n🔍 Outlier removal: ${transactions.length} → ${cleanTransactions.length} (${outliersRemoved} outliers removed)`);

    // Update confidence based on count
    if (dataSource === 'building') {
      confidenceLevel = cleanTransactions.length >= 10 ? 'HIGH' : 'MEDIUM';
    }

    // Generate data source note
    const getDataSourceNote = (source: string, count: number, cleanCount: number, outliers: number, building: string, dongName: string): string => {
      const outlierNote = outliers > 0 ? ` (${outliers} outliers removed)` : '';
      if (source === 'building') {
        return `Based on ${cleanCount} transactions from "${building}" building${outlierNote}`;
      } else if (source === 'dong') {
        return `Based on ${cleanCount} transactions from ${dongName} area (building-specific data insufficient)${outlierNote}`;
      }
      return `Based on ${cleanCount} transactions from the district${outlierNote}`;
    };

    // Step 5: Calculate implied conversion rates from transaction pairs (using clean transactions)
    // Use time-adjusted method for both building and dong level data
    const ratePairs = this.calculateConversionRatePairsWithTimeAdjustment(cleanTransactions);
    console.log(`\n📈 Calculated ${ratePairs.length} valid rate pairs (time-adjusted)`);

    if (ratePairs.length === 0) {
      // Can't calculate market rate from pairs - use baseline method
      console.log('⚠️ No valid pairs. Using baseline calculation method.');
      const baselineRate = this.calculateBaselineRate(cleanTransactions);
      return {
        marketRate: baselineRate || LEGAL_CAP,
        rate25thPercentile: baselineRate || LEGAL_CAP,
        rate75thPercentile: baselineRate || LEGAL_CAP,
        confidenceLevel: 'LOW',
        dataSource: dataSource as 'building' | 'dong' | 'district',
        dataSourceNote: getDataSourceNote(dataSource, transactions.length, cleanTransactions.length, outliersRemoved, apartmentName, dong) + ' (no valid rate pairs for comparison)',
        contractCount: transactions.length,
        cleanTransactionCount: cleanTransactions.length,
        outliersRemoved,
        validPairCount: 0,
        trend: {
          direction: 'STABLE',
          percentage: 0,
          rSquared: 0
        },
        legalRate: LEGAL_CAP,
        transactions: cleanTransactions
      };
    }

    // Step 6: Calculate time-weighted market rate
    const marketRateStats = this.calculateWeightedMarketRate(ratePairs);

    // Step 7: Calculate trend using linear regression
    const trend = this.calculateTrend(ratePairs);

    console.log('\n✅ Market Rate Calculation Complete:');
    console.log(`   Market Rate: ${marketRateStats.median.toFixed(2)}%`);
    console.log(`   Range: ${marketRateStats.percentile25.toFixed(2)}% - ${marketRateStats.percentile75.toFixed(2)}%`);
    console.log(`   Legal Cap: ${LEGAL_CAP}%`);
    console.log(`   Transactions: ${cleanTransactions.length}/${transactions.length} (${outliersRemoved} outliers removed)`);
    console.log(`   Confidence: ${confidenceLevel}`);
    console.log(`   Trend: ${trend.direction} (${trend.percentage.toFixed(1)}%)`);

    return {
      marketRate: marketRateStats.median,
      rate25thPercentile: marketRateStats.percentile25,
      rate75thPercentile: marketRateStats.percentile75,
      confidenceLevel,
      dataSource: dataSource as 'building' | 'dong' | 'district',
      dataSourceNote: getDataSourceNote(dataSource, transactions.length, cleanTransactions.length, outliersRemoved, apartmentName, dong),
      contractCount: transactions.length,
      cleanTransactionCount: cleanTransactions.length,
      outliersRemoved,
      validPairCount: ratePairs.length,
      trend,
      legalRate: LEGAL_CAP,
      transactions: cleanTransactions
    };
  }

  /**
   * Calculate implied conversion rates from pairs of transactions
   *
   * Formula: rate = ((rent1 - rent2) × 12) / (deposit2 - deposit1) × 100
   *
   * Only valid when:
   * - SAME BUILDING (apartmentName must match)
   * - Different deposit amounts (deposit difference > 5M won)
   * - Both have monthly rent > 0
   * - Resulting rate is within reasonable range (0-15%)
   */
  private calculateConversionRatePairs(transactions: WolseTransaction[]): ConversionRatePair[] {
    const pairs: ConversionRatePair[] = [];
    const now = new Date();

    // Group transactions by building name to avoid cross-building comparisons
    const buildingGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const key = t.apartmentName;
      if (!buildingGroups.has(key)) {
        buildingGroups.set(key, []);
      }
      buildingGroups.get(key)!.push(t);
    }

    const skippedBuildings = [...buildingGroups.values()].filter(txs => txs.length < 2).length;
    console.log(`\n   🏢 Building groups: ${buildingGroups.size} buildings (${skippedBuildings} skipped <2 txs)`);

    // Compare transactions only within the same building
    for (const [buildingName, buildingTransactions] of buildingGroups) {
      // Need at least 2 transactions to form a pair
      if (buildingTransactions.length < 2) continue;

      for (let i = 0; i < buildingTransactions.length; i++) {
        for (let j = i + 1; j < buildingTransactions.length; j++) {
          const t1 = buildingTransactions[i];
          const t2 = buildingTransactions[j];

          // Skip if deposits are too similar (need meaningful difference)
          const depositDiff = Math.abs(t1.deposit - t2.deposit);
          if (depositDiff < 5000000) continue; // Need at least 5M won difference

          // Skip if either has zero rent (pure jeonse)
          if (t1.monthlyRent === 0 || t2.monthlyRent === 0) continue;

          // Calculate implied rate
          // Higher deposit = lower rent, so:
          // If deposit1 < deposit2, then rent1 should be > rent2
          let impliedRate: number;
          if (t1.deposit < t2.deposit) {
            // t1 has lower deposit, should have higher rent
            const rentDiff = t1.monthlyRent - t2.monthlyRent;
            const depositDiffAmount = t2.deposit - t1.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          } else {
            // t2 has lower deposit, should have higher rent
            const rentDiff = t2.monthlyRent - t1.monthlyRent;
            const depositDiffAmount = t1.deposit - t2.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          }

          // Filter out unrealistic rates (outliers)
          if (impliedRate < 0 || impliedRate > 15) continue;

          // Calculate average days ago for weighting
          const date1 = new Date(t1.year, t1.month - 1, t1.day);
          const date2 = new Date(t2.year, t2.month - 1, t2.day);
          const daysAgo1 = (now.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
          const daysAgo2 = (now.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
          const avgDaysAgo = (daysAgo1 + daysAgo2) / 2;

          // Time-based weight: more recent = higher weight
          // weight = 1 / (1 + months_ago × 0.2)
          const monthsAgo = avgDaysAgo / 30;
          const weight = 1 / (1 + monthsAgo * 0.2);

          pairs.push({
            transaction1: t1,
            transaction2: t2,
            impliedRate,
            daysAgo: avgDaysAgo,
            weight
          });
        }
      }
    }

    // Log rate distribution (concise)
    if (pairs.length > 0) {
      const rates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);
      const median = rates[Math.floor(rates.length / 2)];
      console.log(`   📊 Rate pairs: ${pairs.length}, range ${rates[0].toFixed(2)}%~${rates[rates.length-1].toFixed(2)}%, median ${median.toFixed(2)}%`);
    }

    return pairs;
  }

  /**
   * Calculate baseline rate when pair comparison isn't possible
   * Uses assumed jeonse-equivalent calculation
   */
  private calculateBaselineRate(transactions: WolseTransaction[]): number | null {
    // Find the transaction with highest deposit (closest to jeonse)
    const sortedByDeposit = [...transactions].sort((a, b) => b.deposit - a.deposit);
    const highDeposit = sortedByDeposit[0];

    // Find the transaction with lowest deposit (highest rent)
    const lowDeposit = sortedByDeposit[sortedByDeposit.length - 1];

    if (!highDeposit || !lowDeposit) return null;
    if (highDeposit.deposit === lowDeposit.deposit) return null;

    const depositDiff = highDeposit.deposit - lowDeposit.deposit;
    const rentDiff = lowDeposit.monthlyRent - highDeposit.monthlyRent;

    if (depositDiff <= 0 || rentDiff <= 0) return null;

    const rate = (rentDiff * 12) / depositDiff * 100;

    if (rate < 0 || rate > 15) return null;

    return rate;
  }

  /**
   * Calculate time-weighted market rate from pairs
   */
  private calculateWeightedMarketRate(pairs: ConversionRatePair[]): {
    median: number;
    weightedMean: number;
    percentile25: number;
    percentile75: number;
  } {
    if (pairs.length === 0) {
      return { median: LEGAL_CAP, weightedMean: LEGAL_CAP, percentile25: LEGAL_CAP, percentile75: LEGAL_CAP };
    }

    // Sort by implied rate for percentile calculations
    const sortedRates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);

    // Calculate percentiles
    const percentile = (arr: number[], p: number): number => {
      const index = (p / 100) * (arr.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return arr[lower];
      return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
    };

    const median = percentile(sortedRates, 50);
    const percentile25 = percentile(sortedRates, 25);
    const percentile75 = percentile(sortedRates, 75);

    // Calculate weighted mean
    const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);
    const weightedMean = pairs.reduce((sum, p) => sum + p.impliedRate * p.weight, 0) / totalWeight;

    return { median, weightedMean, percentile25, percentile75 };
  }

  /**
   * Calculate trend using linear regression on conversion rates over time
   */
  private calculateTrend(pairs: ConversionRatePair[]): {
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    percentage: number;
    rSquared: number;
  } {
    if (pairs.length < 3) {
      return { direction: 'STABLE', percentage: 0, rSquared: 0 };
    }

    // Sort pairs by average date
    const sortedPairs = [...pairs].sort((a, b) => a.daysAgo - b.daysAgo);

    // Convert to data points (x = days ago inverted for chronological order, y = rate)
    const maxDaysAgo = Math.max(...sortedPairs.map(p => p.daysAgo));
    const dataPoints = sortedPairs.map(p => ({
      x: maxDaysAgo - p.daysAgo, // Chronological order (older = lower x)
      y: p.impliedRate
    }));

    // Linear regression: y = mx + b
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const intercept = (sumY - slope * sumX) / n;
    const ssResidual = dataPoints.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - (ssResidual / ssTotal))) : 0;

    // Calculate percentage change over 6 months
    const firstRate = intercept; // Rate at x=0 (oldest)
    const lastRate = slope * maxDaysAgo + intercept; // Rate at x=maxDaysAgo (newest)
    const percentageChange = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;

    // Determine direction with thresholds based on R-squared
    let threshold = rSquared > 0.5 ? 5 : 10; // Higher R² = more sensitive threshold

    let direction: 'RISING' | 'STABLE' | 'DECLINING';
    if (percentageChange > threshold && rSquared > 0.2) {
      direction = 'RISING';
    } else if (percentageChange < -threshold && rSquared > 0.2) {
      direction = 'DECLINING';
    } else {
      direction = 'STABLE';
    }

    console.log('\n📈 Trend Analysis (Linear Regression):');
    console.log(`   Data points: ${n}`);
    console.log(`   Slope: ${(slope * 30).toFixed(4)}%/month`);
    console.log(`   R-squared: ${(rSquared * 100).toFixed(1)}%`);
    console.log(`   6-month change: ${percentageChange.toFixed(1)}%`);
    console.log(`   Direction: ${direction}`);

    return {
      direction,
      percentage: Math.abs(percentageChange),
      rSquared
    };
  }

  /**
   * Get current legal conversion rate
   */
  static getLegalRate(): number {
    return LEGAL_CAP;
  }

  /**
   * Get BOK base rate
   */
  static getBokRate(): number {
    return CURRENT_BOK_RATE;
  }

  /**
   * Calculate time adjustment factors for a building's transactions
   *
   * Methodology:
   * 1. Calculate reference deposit (median of all transactions)
   * 2. Group transactions by month
   * 3. For each month with >= 3 transactions, estimate rent at reference deposit
   * 4. Apply 3-month moving average smoothing
   * 5. Calculate adjustment factor = latest smoothed rent / each month's smoothed rent
   */
  private calculateTimeAdjustmentFactors(
    transactions: WolseTransaction[]
  ): { trendPoints: MonthlyTrendPoint[]; referenceDeposit: number } {
    if (transactions.length < 3) {
      return { trendPoints: [], referenceDeposit: 0 };
    }

    // Step 1: Calculate reference deposit (median)
    const sortedDeposits = [...transactions].map(t => t.deposit).sort((a, b) => a - b);
    const referenceDeposit = sortedDeposits[Math.floor(sortedDeposits.length / 2)];

    // Step 2: Group by yearMonth
    const monthGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const yearMonth = `${t.year}${t.month.toString().padStart(2, '0')}`;
      if (!monthGroups.has(yearMonth)) {
        monthGroups.set(yearMonth, []);
      }
      monthGroups.get(yearMonth)!.push(t);
    }

    // Step 3: Calculate normalized rent for each month (skip months with < 3 transactions)
    const trendPoints: MonthlyTrendPoint[] = [];
    const sortedMonths = [...monthGroups.keys()].sort();

    for (const yearMonth of sortedMonths) {
      const monthTxs = monthGroups.get(yearMonth)!;

      if (monthTxs.length < 3) {
        // Skip months with insufficient data
        continue;
      }

      // Calculate median deposit and rent for this month
      const deposits = monthTxs.map(t => t.deposit).sort((a, b) => a - b);
      const rents = monthTxs.map(t => t.monthlyRent).sort((a, b) => a - b);
      const medianDeposit = deposits[Math.floor(deposits.length / 2)];
      const medianRent = rents[Math.floor(rents.length / 2)];

      // Estimate rent at reference deposit using linear interpolation
      // Higher deposit = lower rent. Use simple linear model.
      // Calculate slope using all transactions in this month
      let normalizedRent = medianRent;

      if (monthTxs.length >= 2 && medianDeposit !== referenceDeposit) {
        // Linear regression: rent = intercept + slope * deposit
        const n = monthTxs.length;
        const sumX = monthTxs.reduce((s, t) => s + t.deposit, 0);
        const sumY = monthTxs.reduce((s, t) => s + t.monthlyRent, 0);
        const sumXY = monthTxs.reduce((s, t) => s + t.deposit * t.monthlyRent, 0);
        const sumX2 = monthTxs.reduce((s, t) => s + t.deposit * t.deposit, 0);

        const denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) > 1e-10) {
          const slope = (n * sumXY - sumX * sumY) / denominator;
          const intercept = (sumY - slope * sumX) / n;

          // Predict rent at reference deposit
          normalizedRent = intercept + slope * referenceDeposit;

          // Ensure normalized rent is positive and reasonable
          if (normalizedRent <= 0) {
            normalizedRent = medianRent;
          }
        }
      }

      trendPoints.push({
        yearMonth,
        medianDeposit,
        medianRent,
        normalizedRent,
        transactionCount: monthTxs.length
      });
    }

    if (trendPoints.length === 0) {
      return { trendPoints: [], referenceDeposit };
    }

    // Step 4: Apply 3-month moving average smoothing
    for (let i = 0; i < trendPoints.length; i++) {
      const windowStart = Math.max(0, i - 1);
      const windowEnd = Math.min(trendPoints.length - 1, i + 1);

      let sum = 0;
      let count = 0;
      for (let j = windowStart; j <= windowEnd; j++) {
        sum += trendPoints[j].normalizedRent;
        count++;
      }
      trendPoints[i].smoothedRent = sum / count;
    }

    return { trendPoints, referenceDeposit };
  }

  /**
   * Apply time adjustment to transactions based on trend data
   * Adjusts all rents to "today's market equivalent"
   */
  private applyTimeAdjustment(
    transactions: WolseTransaction[],
    trendPoints: MonthlyTrendPoint[]
  ): TimeAdjustedTransaction[] {
    if (trendPoints.length === 0) {
      // No trend data - return transactions with no adjustment
      return transactions.map(t => ({
        ...t,
        adjustedMonthlyRent: t.monthlyRent,
        adjustmentFactor: 1.0
      }));
    }

    // Get latest smoothed rent as reference
    const latestPoint = trendPoints[trendPoints.length - 1];
    const latestSmoothedRent = latestPoint.smoothedRent || latestPoint.normalizedRent;

    // Create a map of adjustment factors by yearMonth
    const adjustmentMap = new Map<string, number>();
    for (const point of trendPoints) {
      const pointRent = point.smoothedRent || point.normalizedRent;
      // adjustment factor = latest / this month
      // If market is rising, older months have lower rents, so factor > 1
      const factor = pointRent > 0 ? latestSmoothedRent / pointRent : 1.0;
      adjustmentMap.set(point.yearMonth, factor);
    }

    // Calculate average factor for months not in trend data
    const avgFactor = trendPoints.length > 0
      ? [...adjustmentMap.values()].reduce((s, f) => s + f, 0) / adjustmentMap.size
      : 1.0;

    // Apply adjustment to all transactions
    return transactions.map(t => {
      const yearMonth = `${t.year}${t.month.toString().padStart(2, '0')}`;
      const factor = adjustmentMap.get(yearMonth) || avgFactor;

      return {
        ...t,
        adjustedMonthlyRent: t.monthlyRent * factor,
        adjustmentFactor: factor
      };
    });
  }

  /**
   * Calculate conversion rate pairs with time adjustment
   * This is the main method that combines building grouping + time adjustment
   */
  private calculateConversionRatePairsWithTimeAdjustment(
    transactions: WolseTransaction[]
  ): ConversionRatePair[] {
    const pairs: ConversionRatePair[] = [];
    const now = new Date();

    // Group transactions by building name
    const buildingGroups = new Map<string, WolseTransaction[]>();
    for (const t of transactions) {
      const key = t.apartmentName;
      if (!buildingGroups.has(key)) {
        buildingGroups.set(key, []);
      }
      buildingGroups.get(key)!.push(t);
    }

    // Track buildings with time adjustment
    const buildingsWithAdjustment: string[] = [];
    const buildingsSkipped: number = [...buildingGroups.values()].filter(txs => txs.length < 2).length;

    // Process each building separately
    for (const [buildingName, buildingTransactions] of buildingGroups) {
      // Need at least 2 transactions to form pairs
      if (buildingTransactions.length < 2) {
        continue;
      }

      // Step 1: Calculate time adjustment factors for this building
      const { trendPoints, referenceDeposit } = this.calculateTimeAdjustmentFactors(buildingTransactions);

      if (trendPoints.length > 0) {
        const factors = trendPoints.map(p => p.smoothedRent ? (trendPoints[trendPoints.length-1].smoothedRent! / p.smoothedRent).toFixed(2) : '1.00');
        buildingsWithAdjustment.push(`${buildingName}(${factors.join('→')})`);
      }

      // Step 2: Apply time adjustment to all transactions in this building
      const adjustedTxs = this.applyTimeAdjustment(buildingTransactions, trendPoints);

      // Step 3: Calculate pairs using adjusted rents
      for (let i = 0; i < adjustedTxs.length; i++) {
        for (let j = i + 1; j < adjustedTxs.length; j++) {
          const t1 = adjustedTxs[i];
          const t2 = adjustedTxs[j];

          // Skip if deposits are too similar (need meaningful difference)
          const depositDiff = Math.abs(t1.deposit - t2.deposit);
          if (depositDiff < 5000000) continue; // Need at least 5M won difference

          // Skip if either has zero rent
          if (t1.monthlyRent === 0 || t2.monthlyRent === 0) continue;

          // Calculate implied rate using TIME-ADJUSTED rents
          let impliedRate: number;
          if (t1.deposit < t2.deposit) {
            // t1 has lower deposit, should have higher rent
            const rentDiff = t1.adjustedMonthlyRent - t2.adjustedMonthlyRent;
            const depositDiffAmount = t2.deposit - t1.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          } else {
            // t2 has lower deposit, should have higher rent
            const rentDiff = t2.adjustedMonthlyRent - t1.adjustedMonthlyRent;
            const depositDiffAmount = t1.deposit - t2.deposit;
            impliedRate = (rentDiff * 12) / depositDiffAmount * 100;
          }

          // Filter out unrealistic rates
          if (impliedRate < 0 || impliedRate > 15) continue;

          // Calculate average days ago for weighting
          const date1 = new Date(t1.year, t1.month - 1, t1.day);
          const date2 = new Date(t2.year, t2.month - 1, t2.day);
          const daysAgo1 = (now.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
          const daysAgo2 = (now.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
          const avgDaysAgo = (daysAgo1 + daysAgo2) / 2;

          // Time-based weight
          const monthsAgo = avgDaysAgo / 30;
          const weight = 1 / (1 + monthsAgo * 0.2);

          pairs.push({
            transaction1: t1,
            transaction2: t2,
            impliedRate,
            daysAgo: avgDaysAgo,
            weight
          });
        }
      }
    }

    // Log summary
    console.log(`\n   🏢 Time-adjusted: ${buildingGroups.size} buildings (${buildingsSkipped} skipped <2 txs)`);
    if (buildingsWithAdjustment.length > 0) {
      console.log(`      Adjusted: ${buildingsWithAdjustment.slice(0, 5).join(', ')}${buildingsWithAdjustment.length > 5 ? ` +${buildingsWithAdjustment.length - 5} more` : ''}`);
    }

    // Log rate distribution (concise)
    if (pairs.length > 0) {
      const rates = pairs.map(p => p.impliedRate).sort((a, b) => a - b);
      const median = rates[Math.floor(rates.length / 2)];
      console.log(`   📊 Rate pairs: ${pairs.length}, range ${rates[0].toFixed(2)}%~${rates[rates.length-1].toFixed(2)}%, median ${median.toFixed(2)}%`);
    }

    return pairs;
  }
}
