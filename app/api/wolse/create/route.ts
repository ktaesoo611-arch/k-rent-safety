/**
 * POST /api/wolse/create
 *
 * Creates a pending wolse analysis record and returns the analysis ID.
 * The actual analysis is performed after payment is completed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create an analysis.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['city', 'district', 'dong', 'apartmentName', 'exclusiveArea', 'deposit', 'monthlyRent'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const {
      city,
      district,
      dong,
      apartmentName,
      exclusiveArea,
      deposit,
      monthlyRent
    } = body;

    // Validate numeric fields
    if (typeof exclusiveArea !== 'number' || exclusiveArea <= 0) {
      return NextResponse.json(
        { error: 'Invalid exclusiveArea: must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof deposit !== 'number' || deposit <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit: must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof monthlyRent !== 'number' || monthlyRent <= 0) {
      return NextResponse.json(
        { error: 'Invalid monthlyRent: must be a positive number' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Create or find property
    const address = `${city} ${district} ${dong} ${apartmentName}`;
    let propertyId = '';

    // Try to find existing property
    const { data: existingProperty } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('address', address)
      .maybeSingle();

    if (existingProperty) {
      propertyId = existingProperty.id;
    } else {
      // Create new property
      const { data: newProperty, error: propError } = await supabaseAdmin
        .from('properties')
        .insert({
          address,
          city,
          district,
          dong,
          building_name: apartmentName,
          exclusive_area: exclusiveArea,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (propError || !newProperty) {
        console.error('Create property error:', propError);
        return NextResponse.json(
          { error: 'Failed to create property record' },
          { status: 500 }
        );
      }

      propertyId = newProperty.id;
    }

    // Create pending analysis record
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analyses')
      .insert({
        type: 'wolse_price',
        property_id: propertyId,
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending'
      })
      .select('id')
      .single();

    if (analysisError || !analysis) {
      console.error('Create analysis error:', analysisError);
      return NextResponse.json(
        { error: 'Failed to create analysis record' },
        { status: 500 }
      );
    }

    console.log(`✅ Created pending wolse analysis: ${analysis.id}`);

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      // Return the input data so client can store it for after payment
      inputData: {
        city,
        district,
        dong,
        apartmentName,
        exclusiveArea,
        deposit,
        monthlyRent
      }
    });

  } catch (error) {
    console.error('Wolse create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
