'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || '';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentKey: string) => void;
  onFreeBeta: () => void;
  amount: number;
  orderName: string;
  analysisId: string;
  isBetaPeriod?: boolean;
  previewResult?: any;
  inputData?: any;
}

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  onFreeBeta,
  amount,
  orderName,
  analysisId,
  isBetaPeriod = true,
  previewResult,
  inputData
}: PaymentModalProps) {
  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  // Initialize payment widget
  useEffect(() => {
    if (!isOpen || !TOSS_CLIENT_KEY) return;

    async function initWidget() {
      try {
        const shortId = analysisId.replace(/-/g, '').substring(0, 32);
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, `w_${shortId}`);
        setPaymentWidget(widget);
      } catch (err) {
        console.error('Failed to load payment widget:', err);
        setError('Failed to initialize payment');
      }
    }

    initWidget();
  }, [isOpen, analysisId]);

  // Render payment methods when showPaymentMethods is true
  useEffect(() => {
    if (showPaymentMethods && paymentWidget) {
      async function renderWidget() {
        try {
          await paymentWidget.renderPaymentMethods('#payment-method-modal', { value: amount });
          await paymentWidget.renderAgreement('#agreement-modal');
        } catch (err: any) {
          console.error('Failed to render payment widget:', err);
          setError(`Failed to render payment: ${err.message}`);
        }
      }
      renderWidget();
    }
  }, [showPaymentMethods, paymentWidget, amount]);

  const handlePayment = useCallback(async () => {
    if (!paymentWidget) return;

    try {
      setIsLoading(true);
      const orderId = `wolse_${analysisId}_${Date.now()}`;

      // Store preview data in sessionStorage before redirecting to Toss
      // This allows us to save the analysis after payment success
      if (previewResult && inputData) {
        sessionStorage.setItem('wolse_pending_payment', JSON.stringify({
          previewResult,
          inputData,
          orderId,
          amount
        }));
      }

      await paymentWidget.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}/api/payments/toss-callback?analysisId=${analysisId}`,
        failUrl: `${window.location.origin}/analyze/wolse?error=payment_failed`,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      setError(err.message || 'Payment failed');
      setIsLoading(false);
    }
  }, [paymentWidget, analysisId, orderName, previewResult, inputData, amount]);

  const handleFreeBeta = useCallback(() => {
    setIsLoading(true);
    onFreeBeta();
  }, [onFreeBeta]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 border-b border-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🔓</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A202C]">Unlock Full Report</h2>
              <p className="text-[#718096]">{orderName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {!showPaymentMethods ? (
            <>
              {/* What's included */}
              <div className="mb-6">
                <h3 className="font-semibold text-[#1A202C] mb-3">What you'll get:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[#4A5568]">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Exact expected rent at your deposit level
                  </li>
                  <li className="flex items-center gap-2 text-[#4A5568]">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Market rate percentage and range
                  </li>
                  <li className="flex items-center gap-2 text-[#4A5568]">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Yearly savings calculation
                  </li>
                  <li className="flex items-center gap-2 text-[#4A5568]">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    3 ready-to-use negotiation scripts (Korean)
                  </li>
                  <li className="flex items-center gap-2 text-[#4A5568]">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Recent transaction history
                  </li>
                </ul>
              </div>

              {/* Price */}
              <div className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-[#4A5568] font-medium">Total</span>
                  <div className="text-right">
                    {isBetaPeriod ? (
                      <>
                        <span className="text-2xl font-bold text-amber-600">Free</span>
                        <p className="text-sm text-amber-600">Beta Period</p>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-amber-600">₩{amount.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                {isBetaPeriod ? (
                  <button
                    onClick={handleFreeBeta}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-amber-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Unlocking...
                      </span>
                    ) : (
                      'Unlock Free (Beta)'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPaymentMethods(true)}
                    disabled={isLoading || !paymentWidget}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-amber-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pay ₩{amount.toLocaleString()}
                  </button>
                )}

                {isBetaPeriod && (
                  <button
                    onClick={() => setShowPaymentMethods(true)}
                    disabled={!paymentWidget}
                    className="w-full bg-white border-2 border-amber-200 text-[#4A5568] font-medium py-3 rounded-2xl hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    Or pay ₩{amount.toLocaleString()} to support us
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Payment widget */}
              <div className="space-y-4">
                <div id="payment-method-modal" className="min-h-[200px]"></div>
                <div id="agreement-modal"></div>

                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : `Pay ₩${amount.toLocaleString()}`}
                </button>

                <button
                  onClick={() => setShowPaymentMethods(false)}
                  className="w-full text-[#718096] text-sm py-2 hover:text-[#4A5568] transition-colors"
                >
                  ← Back to options
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-100 bg-amber-50/50 rounded-b-3xl">
          <p className="text-xs text-[#718096] text-center">
            Secure payment powered by Toss Payments
          </p>
        </div>
      </div>
    </div>
  );
}
