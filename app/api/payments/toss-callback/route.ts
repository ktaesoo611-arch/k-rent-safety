/**
 * GET /api/payments/toss-callback
 *
 * Handles Toss payment success callback.
 * Verifies the payment and redirects back to the wolse page.
 */

import { NextRequest, NextResponse } from 'next/server';

const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Toss sends these parameters on success
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const analysisId = searchParams.get('analysisId');

    if (!paymentKey || !orderId || !amount) {
      // Redirect to wolse page with error
      return NextResponse.redirect(
        new URL('/analyze/wolse?error=missing_payment_params', request.url)
      );
    }

    // Verify payment with Toss API
    const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount),
      }),
    });

    const confirmData = await confirmResponse.json();

    if (!confirmResponse.ok) {
      console.error('Toss payment confirmation failed:', confirmData);
      return NextResponse.redirect(
        new URL(`/analyze/wolse?error=payment_failed&message=${encodeURIComponent(confirmData.message || 'Unknown error')}`, request.url)
      );
    }

    console.log('✅ Toss payment confirmed:', {
      paymentKey,
      orderId,
      amount,
      status: confirmData.status
    });

    // Redirect back to wolse page with payment success info
    // The page will need to retrieve the preview result from somewhere and save it
    // For now, redirect to a success page that shows instructions
    const redirectUrl = new URL('/analyze/wolse/payment-success', request.url);
    redirectUrl.searchParams.set('paymentKey', paymentKey);
    redirectUrl.searchParams.set('orderId', orderId);
    redirectUrl.searchParams.set('amount', amount);
    if (analysisId) {
      redirectUrl.searchParams.set('analysisId', analysisId);
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Toss callback error:', error);
    return NextResponse.redirect(
      new URL('/analyze/wolse?error=callback_error', request.url)
    );
  }
}
