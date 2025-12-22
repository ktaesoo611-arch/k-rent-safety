import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the analysis belongs to the user
    // Check new schema first (analyses table), then fall back to old schema (analysis_results)
    let analysis: { id: string; user_id: string } | null = null;
    let useNewSchema = false;

    // Try new schema first
    const { data: newAnalysis, error: newAnalysisError } = await supabaseAdmin
      .from('analyses')
      .select('id, user_id')
      .eq('id', analysisId)
      .single();

    if (newAnalysis) {
      analysis = newAnalysis;
      useNewSchema = true;
    } else {
      // Fall back to old schema
      const { data: oldAnalysis, error: oldAnalysisError } = await supabaseAdmin
        .from('analysis_results')
        .select('id, user_id')
        .eq('id', analysisId)
        .single();

      if (oldAnalysis) {
        analysis = oldAnalysis;
      }
    }

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    if (analysis.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - analysis does not belong to user' },
        { status: 403 }
      );
    }

    // Update the appropriate table to mark payment as approved (free beta)
    if (useNewSchema) {
      // Update new schema (analyses table)
      const { error: updateError } = await supabaseAdmin
        .from('analyses')
        .update({
          payment_status: 'approved',
          payment_key: 'free-beta',
          payment_amount: 0,
        })
        .eq('id', analysisId);

      if (updateError) {
        console.error('Error updating analysis (new schema):', updateError);
        return NextResponse.json(
          { error: 'Failed to update analysis' },
          { status: 500 }
        );
      }
    } else {
      // Update old schema (analysis_results table)
      const { error: updateError } = await supabaseAdmin
        .from('analysis_results')
        .update({
          payment_status: 'approved',
          payment_key: 'free-beta',
          payment_amount: 0,
        })
        .eq('id', analysisId);

      if (updateError) {
        console.error('Error updating analysis (old schema):', updateError);
        return NextResponse.json(
          { error: 'Failed to update analysis' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment approved for free beta',
    });

  } catch (error) {
    console.error('Error in skip-dev payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
