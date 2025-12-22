'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function WolsePaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processPayment() {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('Missing payment information');
        }

        // Verify payment with backend
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            paymentKey,
            amount: parseInt(amount),
          }),
        });

        if (!verifyResponse.ok) {
          const data = await verifyResponse.json();
          throw new Error(data.message || 'Payment verification failed');
        }

        // Retrieve input data from sessionStorage
        const storedData = sessionStorage.getItem(`wolse_input_${analysisId}`);
        if (!storedData) {
          throw new Error('Session data expired. Please start over.');
        }
        const inputData = JSON.parse(storedData);

        // Now run the wolse analysis
        const analysisResponse = await fetch('/api/wolse/run-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysisId, inputData }),
        });

        if (!analysisResponse.ok) {
          const data = await analysisResponse.json();
          throw new Error(data.error || 'Analysis failed');
        }

        // Clear the stored data
        sessionStorage.removeItem(`wolse_input_${analysisId}`);

        setIsProcessing(false);

        // Redirect to results page after 2 seconds
        setTimeout(() => {
          router.push(`/analyze/wolse/${analysisId}`);
        }, 2000);

      } catch (err: any) {
        console.error('Payment processing error:', err);
        setError(err.message || 'An error occurred');
        setIsProcessing(false);
      }
    }

    processPayment();
  }, [analysisId, searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-amber-100">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Payment Error</h2>
          <p className="text-[#4A5568] mb-6">{error}</p>
          <button
            onClick={() => router.push(`/analyze/wolse/${analysisId}/payment`)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-amber-100">
        {isProcessing ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Processing Payment</h2>
            <p className="text-[#4A5568]">Please wait while we verify your payment and run the analysis...</p>
          </>
        ) : (
          <>
            <div className="text-green-500 text-6xl mb-6 animate-bounce">✓</div>
            <h2 className="text-3xl font-bold text-[#1A202C] mb-3">Payment Complete!</h2>
            <p className="text-[#4A5568] mb-6">
              Your analysis is ready.
              <br />
              Redirecting to results...
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Order Number</p>
              <p className="text-sm font-mono font-semibold text-gray-900">
                {searchParams.get('orderId') || 'N/A'}
              </p>
            </div>

            <Link
              href={`/analyze/wolse/${analysisId}`}
              className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              View Results
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
