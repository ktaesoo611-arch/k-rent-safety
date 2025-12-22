import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// For scripts: load dotenv if .env.local exists
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // dotenv not available or .env.local doesn't exist
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (only available on server)
export const supabaseAdmin = typeof window === 'undefined'
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null as any; // Not available on client side

// Analysis type enum
export type AnalysisTypeEnum = 'jeonse_safety' | 'wolse_price' | 'wolse_safety';

// Database types (auto-generated from Supabase)
export type Database = {
  public: {
    Tables: {
      // Base analyses table (Option C schema)
      analyses: {
        Row: {
          id: string;
          user_id: string | null;
          property_id: string;
          type: AnalysisTypeEnum;
          status: string;
          payment_amount: number | null;
          payment_status: string | null;
          payment_key: string | null;
          created_at: string;
          completed_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          property_id: string;
          type: AnalysisTypeEnum;
          status?: string;
          payment_amount?: number | null;
          payment_status?: string | null;
          payment_key?: string | null;
          created_at?: string;
          completed_at?: string | null;
          expires_at?: string | null;
        };
      };
      // Jeonse safety extension table
      jeonse_safety_data: {
        Row: {
          analysis_id: string;
          proposed_jeonse: number;
          safety_score: number | null;
          risk_level: string | null;
          deunggibu_data: any | null;
          valuation_data: any | null;
          risks: any | null;
          recommendations: any | null;
          ltv_ratio: number | null;
          ltv_score: number | null;
          debt_score: number | null;
          legal_score: number | null;
          market_score: number | null;
          building_score: number | null;
        };
        Insert: {
          analysis_id: string;
          proposed_jeonse: number;
          safety_score?: number | null;
          risk_level?: string | null;
          deunggibu_data?: any | null;
          valuation_data?: any | null;
          risks?: any | null;
          recommendations?: any | null;
          ltv_ratio?: number | null;
          ltv_score?: number | null;
          debt_score?: number | null;
          legal_score?: number | null;
          market_score?: number | null;
          building_score?: number | null;
        };
      };
      // Wolse price extension table
      wolse_price_data: {
        Row: {
          analysis_id: string;
          user_deposit: number;
          user_monthly_rent: number;
          user_implied_rate: number;
          market_rate: number;
          market_rate_low: number;
          market_rate_high: number;
          legal_rate: number;
          confidence_level: string;
          contract_count: number;
          assessment: string;
          assessment_details: string;
          savings_vs_market: number;
          savings_vs_legal: number;
          trend_direction: string;
          trend_percentage: number;
          trend_advice: string | null;
          negotiation_options: any | null;
          recent_transactions: any | null;
        };
        Insert: {
          analysis_id: string;
          user_deposit: number;
          user_monthly_rent: number;
          user_implied_rate: number;
          market_rate: number;
          market_rate_low: number;
          market_rate_high: number;
          legal_rate: number;
          confidence_level: string;
          contract_count: number;
          assessment: string;
          assessment_details: string;
          savings_vs_market?: number;
          savings_vs_legal?: number;
          trend_direction?: string;
          trend_percentage?: number;
          trend_advice?: string | null;
          negotiation_options?: any | null;
          recent_transactions?: any | null;
        };
      };
      // Wolse safety extension table (future)
      wolse_safety_data: {
        Row: {
          analysis_id: string;
          deposit: number;
          monthly_rent: number;
          safety_score: number | null;
          risk_level: string | null;
          deunggibu_data: any | null;
          valuation_data: any | null;
          risks: any | null;
          recommendations: any | null;
          ltv_ratio: number | null;
          deposit_safety_ratio: number | null;
        };
        Insert: {
          analysis_id: string;
          deposit: number;
          monthly_rent: number;
          safety_score?: number | null;
          risk_level?: string | null;
          deunggibu_data?: any | null;
          valuation_data?: any | null;
          risks?: any | null;
          recommendations?: any | null;
          ltv_ratio?: number | null;
          deposit_safety_ratio?: number | null;
        };
      };
      properties: {
        Row: {
          id: string;
          address: string;
          city: string;
          district: string;
          dong: string;
          building_number: string | null;
          floor: number | null;
          unit: string | null;
          building_name: string | null;
          building_year: number | null;
          exclusive_area: number | null;
          total_floors: number | null;
          estimated_value_low: number | null;
          estimated_value_mid: number | null;
          estimated_value_high: number | null;
          last_analyzed: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          city: string;
          district: string;
          dong: string;
          building_number?: string | null;
          floor?: number | null;
          unit?: string | null;
          building_name?: string | null;
          building_year?: number | null;
          exclusive_area?: number | null;
          total_floors?: number | null;
          estimated_value_low?: number | null;
          estimated_value_mid?: number | null;
          estimated_value_high?: number | null;
          last_analyzed?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          city?: string;
          district?: string;
          dong?: string;
          building_number?: string | null;
          floor?: number | null;
          unit?: string | null;
          building_name?: string | null;
          building_year?: number | null;
          exclusive_area?: number | null;
          total_floors?: number | null;
          estimated_value_low?: number | null;
          estimated_value_mid?: number | null;
          estimated_value_high?: number | null;
          last_analyzed?: string;
          created_at?: string;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          user_id: string | null;
          property_id: string;
          proposed_jeonse: number;
          safety_score: number | null;
          risk_level: string | null;
          deunggibu_data: any | null;
          risks: any | null;
          status: string;
          payment_amount: number | null;
          payment_status: string | null;
          payment_key: string | null;
          created_at: string;
          completed_at: string | null;
        };
      };
      // Wolse market rate cache table
      wolse_market_rates: {
        Row: {
          id: string;
          lawd_cd: string;
          apartment_name: string;
          area_range_min: number;
          area_range_max: number;
          market_rate: number;
          rate_25th_percentile: number;
          rate_75th_percentile: number;
          confidence_level: string;
          contract_count: number;
          trend_direction: string;
          trend_percentage: number;
          calculated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          lawd_cd: string;
          apartment_name: string;
          area_range_min: number;
          area_range_max: number;
          market_rate: number;
          rate_25th_percentile: number;
          rate_75th_percentile: number;
          confidence_level: string;
          contract_count: number;
          trend_direction: string;
          trend_percentage: number;
          calculated_at?: string;
          expires_at: string;
        };
      };
      // Wolse analysis results table
      wolse_analyses: {
        Row: {
          id: string;
          user_id: string | null;
          property_id: string;
          user_deposit: number;
          user_monthly_rent: number;
          user_implied_rate: number;
          market_rate: number;
          market_rate_low: number;
          market_rate_high: number;
          legal_rate: number;
          confidence_level: string;
          contract_count: number;
          assessment: string;
          assessment_details: string;
          savings_vs_market: number;
          savings_vs_legal: number;
          trend_direction: string;
          trend_percentage: number;
          trend_advice: string;
          negotiation_options: any;
          recent_transactions: any;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          property_id: string;
          user_deposit: number;
          user_monthly_rent: number;
          user_implied_rate: number;
          market_rate: number;
          market_rate_low: number;
          market_rate_high: number;
          legal_rate: number;
          confidence_level: string;
          contract_count: number;
          assessment: string;
          assessment_details: string;
          savings_vs_market: number;
          savings_vs_legal: number;
          trend_direction: string;
          trend_percentage: number;
          trend_advice: string;
          negotiation_options: any;
          recent_transactions: any;
          created_at?: string;
          expires_at: string;
        };
      };
    };
  };
};
