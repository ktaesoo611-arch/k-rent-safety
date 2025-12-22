'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function WolsePaymentFailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  const getErrorMessage = (code: string | null) => {
    switch (code) {
      case 'PAY_PROCESS_CANCELED':
        return 'Payment was cancelled.';
      case 'PAY_PROCESS_ABORTED':
        return 'An error occurred during payment processing.';
      case 'REJECT_CARD_COMPANY':
        return 'Payment was rejected by the card company.';
      case 'EXCEED_MAX_CARD_INSTALLMENT_PLAN':
        return 'Maximum installment period exceeded.';
      case 'INVALID_REQUEST':
        return 'Invalid payment request.';
      case 'NOT_SUPPORTED_METHOD':
        return 'Payment method not supported.';
      default:
        return errorMessage || 'An error occurred during payment.';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-amber-100">
        <div className="text-red-500 text-6xl mb-6">❌</div>

        <h2 className="text-3xl font-bold text-[#1A202C] mb-3">Payment Failed</h2>

        <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-200">
          <p className="text-red-800 font-medium mb-1">
            {getErrorMessage(errorCode)}
          </p>
          {errorCode && (
            <p className="text-sm text-red-600">
              Error code: {errorCode}
            </p>
          )}
        </div>

        <p className="text-[#4A5568] mb-8">
          Your payment was not processed.
          <br />
          Please try again or use a different payment method.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/analyze/wolse/${analysisId}/payment`)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            Try Again
          </button>

          <Link
            href="/analyze/wolse"
            className="block w-full bg-gray-100 text-[#4A5568] px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Start Over
          </Link>
        </div>
      </div>
    </div>
  );
}
