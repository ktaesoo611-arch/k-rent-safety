'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';
const PAYMENT_AMOUNT = 0; // Free during beta period

export default function WolsePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);

  // Initialize payment widget
  useEffect(() => {
    async function initializePayment() {
      try {
        setIsLoading(true);

        // Create payment order
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId,
            amount: PAYMENT_AMOUNT,
            orderName: '월세 시세 분석 서비스',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment order');
        }

        const data = await response.json();
        setOrderData(data.payment);

        // Load Toss Payments Widget SDK
        // Customer key must be 2-50 chars, use shortened ID
        const shortId = analysisId.replace(/-/g, '').substring(0, 32);
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, `w_${shortId}`);
        setPaymentWidget(widget);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing payment:', err);
        setError(`Payment initialization failed: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [analysisId]);

  // Render payment widget when showPaymentWidget becomes true
  useEffect(() => {
    if (showPaymentWidget && paymentWidget) {
      async function renderWidget() {
        try {
          await paymentWidget.renderPaymentMethods('#payment-method', { value: 9900 });
          await paymentWidget.renderAgreement('#agreement');
        } catch (err: any) {
          console.error('Failed to render payment widget:', err);
          setError(`Failed to render payment widget: ${err.message}`);
        }
      }
      renderWidget();
    }
  }, [showPaymentWidget, paymentWidget]);

  const handlePayment = async (amount: number = PAYMENT_AMOUNT) => {
    if (!orderData) return;

    try {
      // If payment amount is 0 (free beta), mark as approved and run analysis
      if (amount === 0) {
        setIsLoading(true);

        // Retrieve input data from sessionStorage
        const storedData = sessionStorage.getItem(`wolse_input_${analysisId}`);
        if (!storedData) {
          throw new Error('Session data expired. Please start over.');
        }
        const inputData = JSON.parse(storedData);

        const response = await fetch('/api/wolse/skip-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysisId, inputData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process free beta');
        }

        const data = await response.json();
        console.log('Skip-payment response:', data);
        console.log('data.result:', data.result);
        console.log('data.result.expectedRent:', data.result?.expectedRent);

        // Clear the input data
        sessionStorage.removeItem(`wolse_input_${analysisId}`);

        // Store the analysis result for immediate display
        if (data.result) {
          console.log('Storing result in sessionStorage');
          sessionStorage.setItem(`wolse_result_${analysisId}`, JSON.stringify(data.result));
        } else {
          console.log('WARNING: data.result is undefined!');
        }

        // Redirect to results page
        router.push(`/analyze/wolse/${analysisId}`);
        return;
      }

      // Show the payment widget UI
      setShowPaymentWidget(true);
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
      setIsLoading(false);
    }
  };

  const handlePaymentWidgetSubmit = async () => {
    try {
      if (!paymentWidget || !orderData) {
        throw new Error('Payment widget not ready');
      }

      await paymentWidget.requestPayment({
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/analyze/wolse/${analysisId}/payment/success`,
        failUrl: `${window.location.origin}/analyze/wolse/${analysisId}/payment/fail`,
        customerEmail: orderData.customerEmail || undefined,
        customerName: orderData.customerName || undefined,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        </div>

        <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
          <div className="container mx-auto px-6 py-4 max-w-7xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-center p-8 min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Payment Error</h2>
            <p className="text-[#4A5568] mb-6">{error}</p>
            <button
              onClick={() => router.push('/analyze/wolse')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-2xl">
        <div className="mb-8">
          <Link href="/analyze/wolse" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Wolse Price Check</span>
            <span className="text-amber-400">|</span>
            <span>Step 2 of 2</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Complete Payment
          </h1>
          <p className="text-xl text-[#4A5568]">
            Pay for Wolse Price Analysis service
          </p>
        </div>

        {/* Payment Info Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 mb-6 border border-amber-100">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-amber-100">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A202C]">Wolse Price Analysis</h2>
              <p className="text-[#718096]">Market rate comparison & negotiation scripts</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#4A5568] font-medium">Amount</span>
            <div className="text-right">
              <span className="text-3xl font-bold text-amber-600">
                {PAYMENT_AMOUNT === 0 ? 'Free' : `₩${Number(PAYMENT_AMOUNT).toLocaleString()}`}
              </span>
              {PAYMENT_AMOUNT === 0 && (
                <p className="text-sm text-amber-600 font-medium">Beta Period</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Button */}
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-12 text-center border border-amber-100">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#4A5568] font-medium">Processing...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-8 border border-amber-100">
            {!showPaymentWidget ? (
              <>
                <div className="space-y-4 mb-8">
                  <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-semibold text-[#1A202C] mb-1">Test Payment Integration</p>
                        <p className="text-sm text-[#4A5568]">Click to see Toss checkout integration</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <p className="font-semibold text-[#1A202C] mb-1">Beta Free Trial</p>
                        <p className="text-sm text-[#4A5568]">Use the service without payment during beta period</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handlePayment(9900)}
                    className="w-full bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">💳</span>
                    <span>Test Payment (₩9,900)</span>
                  </button>

                  <button
                    onClick={() => handlePayment(0)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all duration-200 hover:-translate-y-1 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">🎉</span>
                    <span>Continue Free (Beta)</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A202C] mb-3">Payment Method</h3>
                    <div id="payment-method" className="min-h-[200px] border border-amber-100 rounded-2xl overflow-hidden"></div>
                  </div>
                  <div id="agreement"></div>
                  <button
                    onClick={handlePaymentWidgetSubmit}
                    className="w-full bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Pay ₩9,900
                  </button>
                  <button
                    onClick={() => setShowPaymentWidget(false)}
                    className="w-full bg-gray-100 text-[#4A5568] text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Options
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-br from-amber-900 to-orange-950 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-100 mb-2 text-lg">What You'll Get</h3>
              <ul className="text-sm text-amber-50/90 space-y-2">
                <li>Market conversion rate analysis from real transaction data</li>
                <li>Comparison with legal rate limits</li>
                <li>Ready-to-use negotiation scripts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
