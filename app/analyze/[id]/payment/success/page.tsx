'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<'report' | 'upload'>('report');

  useEffect(() => {
    async function verifyPayment() {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        // If paymentKey is missing but we have orderId, this might be from the preview flow
        // Just mark the analysis as paid and redirect
        if (!paymentKey || !amount) {
          console.log('Payment parameters incomplete, marking as free beta and redirecting');

          // Mark as free beta (payment was attempted but not completed)
          try {
            await fetch('/api/payments/skip-dev', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ analysisId })
            });
          } catch (skipErr) {
            console.warn('Skip-dev error (ignored):', skipErr);
          }

          // Check if analysis is completed and redirect appropriately
          let redirectTo: 'report' | 'upload' = 'upload';
          try {
            const statusResponse = await fetch(`/api/analysis/status/${analysisId}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.status === 'completed') {
                redirectTo = 'report';
              }
            }
          } catch (statusErr) {
            console.warn('Status check error (ignored):', statusErr);
          }

          setRedirectTarget(redirectTo);
          setIsVerifying(false);
          setTimeout(() => {
            router.push(`/analyze/${analysisId}/${redirectTo}`);
          }, 2500);
          return;
        }

        // Verify payment with backend
        const response = await fetch('/api/payments/verify', {
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '결제 검증에 실패했습니다');
        }

        // Check if analysis is already completed (new flow - came from preview)
        const statusResponse = await fetch(`/api/analysis/status/${analysisId}`);
        const statusData = await statusResponse.json();

        const target: 'report' | 'upload' = statusData.status === 'completed' ? 'report' : 'upload';
        setRedirectTarget(target);
        setIsVerifying(false);

        // Redirect based on analysis status
        setTimeout(() => {
          router.push(`/analyze/${analysisId}/${target}`);
        }, 2500);

      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.message || '결제 검증 중 오류가 발생했습니다');
        setIsVerifying(false);
      }
    }

    verifyPayment();
  }, [analysisId, searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 검증 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/analyze/${analysisId}`)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {isVerifying ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 확인 중</h2>
            <p className="text-gray-600">결제를 검증하고 있습니다. 잠시만 기다려주세요...</p>
          </>
        ) : (
          <>
            {/* Success Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 left-0 right-0 mx-auto w-20 h-20 bg-green-200 rounded-full -z-10 animate-ping opacity-20"></div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {redirectTarget === 'report' ? 'Report Unlocked!' : 'Payment Complete!'}
            </h2>
            <p className="text-gray-500 mb-1">
              {redirectTarget === 'report' ? '리포트가 잠금 해제되었습니다' : '결제가 완료되었습니다'}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 my-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              {redirectTarget === 'report'
                ? 'Redirecting to your full report...'
                : 'Redirecting to document upload...'}
            </p>

            {/* Order Number Display */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Order Number | 주문번호</p>
              <p className="text-xs font-mono font-medium text-gray-700 break-all">
                {searchParams.get('orderId') || 'N/A'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Save for refund requests | 환불 요청 시 필요
              </p>
            </div>

            {/* Context-aware message */}
            {redirectTarget === 'report' && (
              <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">Your full safety report is ready!</p>
                </div>
              </div>
            )}

            {redirectTarget === 'upload' && (
              <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium">Next: Upload your document</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
