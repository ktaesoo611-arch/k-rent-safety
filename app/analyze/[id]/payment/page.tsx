'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';
const PAYMENT_AMOUNT = 0; // Free during beta period - Updated 2025-12-02
const DEV_MODE = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  // Version: 2025-12-02-v2 - Force cache bust

  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);

  // Initialize payment widget
  useEffect(() => {
    async function initializePayment() {
      try {
        setIsLoading(true);

        console.log('Starting payment initialization...');
        console.log('TOSS_CLIENT_KEY:', TOSS_CLIENT_KEY ? 'Present' : 'Missing');

        // Create payment order
        console.log('Creating payment order for analysis:', analysisId);
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId,
            amount: PAYMENT_AMOUNT,
            orderName: '전세 안전 검사 서비스',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Payment order creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create payment order');
        }

        const data = await response.json();
        console.log('Payment order created:', data);
        setOrderData(data.payment);

        // Load Toss Payments SDK (for Payment Window, not Widget)
        console.log('Loading Toss Payments SDK...');
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        console.log('Toss Payments SDK loaded');
        console.log('Available methods:', Object.keys(tossPayments));
        console.log('TossPayments object:', tossPayments);

        setPaymentWidget(tossPayments);

        console.log('Payment initialization complete');
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing payment:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          stack: err.stack,
        });
        setError(`Payment initialization failed: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [analysisId]);

  const handlePayment = async (amount: number = PAYMENT_AMOUNT) => {
    console.log('=== handlePayment called ===');
    console.log('Payment amount:', amount);
    console.log('orderData:', orderData);

    if (!orderData) {
      console.log('No orderData, returning early');
      return;
    }

    try {
      // If payment amount is 0 (free beta), mark as approved and redirect to upload
      if (amount === 0) {
        console.log('Free beta detected - marking payment as approved');
        setIsLoading(true);

        const response = await fetch('/api/payments/skip-dev', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process free beta');
        }

        console.log('Payment marked as approved, redirecting to upload');
        router.push(`/analyze/${analysisId}/upload`);
        return;
      }

      console.log('Proceeding to Toss Payments with amount:', amount);

      if (!paymentWidget) {
        throw new Error('Payment widget not initialized');
      }

      // Use Toss Payments SDK requestPayment method
      await paymentWidget.requestPayment({
        method: 'CARD', // 카드 결제
        amount: {
          currency: 'KRW',
          value: amount,
        },
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/analyze/${analysisId}/payment/success`,
        failUrl: `${window.location.origin}/analyze/${analysisId}/payment/fail`,
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment request failed.');
    }
  };

  const handleSkipPayment = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/payments/skip-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip payment');
      }

      // Redirect to analysis page to continue with upload
      router.push(`/analyze/${analysisId}`);
    } catch (err: any) {
      console.error('Skip payment failed:', err);
      setError(err.message || 'Failed to skip payment');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/analyze/${analysisId}`)}
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="inline-block px-4 py-2 bg-emerald-100 rounded-full text-sm font-semibold mb-4 text-emerald-700">
            Step 2 of 4
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment
          </h1>
          <p className="text-gray-600">
            Complete payment for Jeonse Safety Analysis service
          </p>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <span className="text-gray-600">Service</span>
            <span className="font-semibold text-gray-900">Jeonse Safety Analysis</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount</span>
            <span className="text-2xl font-bold text-blue-600">
              ₩{Number(PAYMENT_AMOUNT).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Button */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pay Now</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">💳 Test Payment Integration:</span> For Toss Payments Review
                </p>
                <p className="text-xs text-gray-600">
                  Click "Test Payment" to see Toss Payments checkout integration
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">🎉 Beta Free Trial:</span> No payment required
                </p>
                <p className="text-xs text-gray-600">
                  Click "Continue Free" to use the service without payment during beta
                </p>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="space-y-3">
              {/* Test Payment Button - For Toss Demo */}
              <button
                onClick={() => handlePayment(14900)}
                className="w-full bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>💳</span>
                <span>Test Payment (₩14,900)</span>
              </button>

              {/* Free Beta Button */}
              <button
                onClick={() => handlePayment(0)}
                className="w-full bg-emerald-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>🎉</span>
                <span>Continue Free (Beta)</span>
              </button>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="mt-6 bg-emerald-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <span className="text-emerald-600 mr-2">ℹ️</span>
            Important Information
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• After payment, you can upload your property register document for analysis</li>
            <li>• Multiple payment methods supported: cards, bank transfer, and mobile payments</li>
            <li>• All payments are securely processed through Toss Payments</li>
            <li>• For payment inquiries, please contact customer support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
