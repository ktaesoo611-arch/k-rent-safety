import { supabaseAdmin } from '../supabase';
import { getDistrictCode } from '../apis/molit';
import { WolseMarketRate, WolseAnalysisResult } from '../types';

const CACHE_EXPIRY_DAYS = 7;

/**
 * Wolse Cache Service
 *
 * Handles caching of market rate calculations to reduce API calls.
 * Cache expires after 7 days (on-demand invalidation).
 */
export class WolseCacheService {
  /**
   * Get cached market rate for an apartment
   * Returns null if not found or expired
   */
  async getCachedMarketRate(
    city: string,
    district: string,
    apartmentName: string,
    exclusiveArea: number
  ): Promise<WolseMarketRate | null> {
    if (!supabaseAdmin) {
      console.log('Supabase admin client not available');
      return null;
    }

    const lawdCd = getDistrictCode(city, district);
    if (!lawdCd) return null;

    // Define area range (±10%)
    const areaMin = exclusiveArea * 0.9;
    const areaMax = exclusiveArea * 1.1;

    try {
      const { data, error } = await supabaseAdmin
        .from('wolse_market_rates')
        .select('*')
        .eq('lawd_cd', lawdCd)
        .eq('apartment_name', apartmentName)
        .gte('area_range_max', areaMin)
        .lte('area_range_min', areaMax)
        .gte('expires_at', new Date().toISOString())
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Cache lookup error:', error);
        return null;
      }

      if (!data) return null;

      // Convert DB row to WolseMarketRate
      return {
        id: data.id,
        lawdCd: data.lawd_cd,
        apartmentName: data.apartment_name,
        areaRangeMin: data.area_range_min,
        areaRangeMax: data.area_range_max,
        marketRate: data.market_rate,
        rate25thPercentile: data.rate_25th_percentile,
        rate75thPercentile: data.rate_75th_percentile,
        confidenceLevel: data.confidence_level as 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT',
        contractCount: data.contract_count,
        trendDirection: data.trend_direction as 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING',
        trendPercentage: data.trend_percentage,
        calculatedAt: data.calculated_at,
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return null;
    }
  }

  /**
   * Save market rate to cache
   */
  async cacheMarketRate(
    city: string,
    district: string,
    apartmentName: string,
    exclusiveArea: number,
    marketRate: {
      marketRate: number;
      rate25thPercentile: number;
      rate75thPercentile: number;
      confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
      contractCount: number;
      trend: {
        direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
        percentage: number;
      };
    }
  ): Promise<void> {
    if (!supabaseAdmin) {
      console.log('Supabase admin client not available - skipping cache');
      return;
    }

    const lawdCd = getDistrictCode(city, district);
    if (!lawdCd) return;

    // Area range ±10%
    const areaRangeMin = Math.floor(exclusiveArea * 0.9);
    const areaRangeMax = Math.ceil(exclusiveArea * 1.1);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    try {
      const { error } = await supabaseAdmin
        .from('wolse_market_rates')
        .upsert({
          lawd_cd: lawdCd,
          apartment_name: apartmentName,
          area_range_min: areaRangeMin,
          area_range_max: areaRangeMax,
          market_rate: marketRate.marketRate,
          rate_25th_percentile: marketRate.rate25thPercentile,
          rate_75th_percentile: marketRate.rate75thPercentile,
          confidence_level: marketRate.confidenceLevel,
          contract_count: marketRate.contractCount,
          trend_direction: marketRate.trend.direction,
          trend_percentage: marketRate.trend.percentage,
          calculated_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'lawd_cd,apartment_name,area_range_min,area_range_max'
        });

      if (error) {
        console.error('Cache save error:', error);
      } else {
        console.log(`✅ Cached market rate for ${apartmentName} (${exclusiveArea}㎡)`);
      }
    } catch (error) {
      console.error('Cache save failed:', error);
    }
  }

  /**
   * Save wolse analysis result to database
   */
  async saveAnalysisResult(
    result: WolseAnalysisResult,
    userId?: string
  ): Promise<string | null> {
    if (!supabaseAdmin) {
      console.log('Supabase admin client not available - skipping save');
      return result.id;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('wolse_analyses')
        .insert({
          id: result.id,
          user_id: userId || null,
          property_id: result.propertyId,
          user_deposit: result.userDeposit,
          user_monthly_rent: result.userMonthlyRent,
          user_implied_rate: result.userImpliedRate,
          market_rate: result.marketRate,
          market_rate_low: result.marketRateRange.low,
          market_rate_high: result.marketRateRange.high,
          legal_rate: result.legalRate,
          confidence_level: result.confidenceLevel,
          contract_count: result.contractCount,
          assessment: result.assessment,
          assessment_details: result.assessmentDetails,
          savings_vs_market: result.savingsPotential.vsMarket,
          savings_vs_legal: result.savingsPotential.vsLegal,
          trend_direction: result.trend.direction,
          trend_percentage: result.trend.percentage,
          trend_advice: result.trend.advice,
          negotiation_options: result.negotiationOptions,
          recent_transactions: result.recentTransactions,
          created_at: result.createdAt,
          expires_at: result.expiresAt
        })
        .select('id')
        .single();

      if (error) {
        console.error('Save analysis error:', error);
        return null;
      }

      console.log(`✅ Saved wolse analysis: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('Save analysis failed:', error);
      return null;
    }
  }

  /**
   * Get analysis result by ID
   */
  async getAnalysisResult(analysisId: string): Promise<WolseAnalysisResult | null> {
    if (!supabaseAdmin) return null;

    try {
      const { data, error } = await supabaseAdmin
        .from('wolse_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        propertyId: data.property_id,
        userId: data.user_id,
        userDeposit: data.user_deposit,
        userMonthlyRent: data.user_monthly_rent,
        userImpliedRate: data.user_implied_rate,
        // New rent comparison fields (with fallback for old data)
        expectedRent: data.expected_rent ?? data.user_monthly_rent,
        rentDifference: data.rent_difference ?? 0,
        rentDifferencePercent: data.rent_difference_percent ?? 0,
        marketRate: data.market_rate,
        marketRateRange: {
          low: data.market_rate_low,
          high: data.market_rate_high
        },
        legalRate: data.legal_rate,
        confidenceLevel: data.confidence_level as 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT',
        contractCount: data.contract_count,
        cleanTransactionCount: data.clean_transaction_count,
        outliersRemoved: data.outliers_removed,
        assessment: data.assessment as 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED',
        assessmentDetails: data.assessment_details,
        savingsPotential: {
          vsMarket: data.savings_vs_market,
          vsLegal: data.savings_vs_legal
        },
        trend: {
          direction: data.trend_direction as 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING',
          percentage: data.trend_percentage,
          advice: data.trend_advice
        },
        negotiationOptions: data.negotiation_options,
        recentTransactions: data.recent_transactions,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('Get analysis failed:', error);
      return null;
    }
  }

  /**
   * Clean up expired cache entries (can be called periodically)
   */
  async cleanupExpiredCache(): Promise<number> {
    if (!supabaseAdmin) return 0;

    try {
      const { data, error } = await supabaseAdmin
        .from('wolse_market_rates')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Cleanup error:', error);
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired cache entries`);
      }
      return count;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const wolseCacheService = new WolseCacheService();
