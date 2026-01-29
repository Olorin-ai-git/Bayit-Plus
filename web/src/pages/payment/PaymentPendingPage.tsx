/**
 * PaymentPendingPage - Shown to users who need to complete payment
 *
 * This page is displayed when user.payment_pending=true.
 * Users must complete Stripe checkout to access the app.
 *
 * Features:
 * - Displays loading spinner and elapsed time
 * - Generates checkout URL on-demand (not stored)
 * - Shows warning after 60 seconds
 * - Provides logout option
 * - Fully internationalized (i18n)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import logger from '@/utils/logger';

const paymentLogger = logger.scope('PaymentPendingPage');

interface Props {
  checkoutUrl: string | null;
  planId: string | null;
}

export default function PaymentPendingPage({ checkoutUrl, planId }: Props) {
  const { t } = useTranslation('payment');
  const { logout } = useAuthStore();
  const [generating, setGenerating] = useState(false);
  const [pollingTime, setPollingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Count elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setPollingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleGenerateCheckout = async () => {
    setGenerating(true);
    setError(null);

    try {
      paymentLogger.info('Generating checkout URL', { planId });

      const response = await fetch(
        `/api/v1/auth/payment/checkout-url?plan_id=${planId || 'basic'}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();

      paymentLogger.info('Checkout URL generated, redirecting', {
        session_id: data.session_id,
      });

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      paymentLogger.error('Failed to generate checkout URL', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create payment session. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = () => {
    paymentLogger.info('User logged out from payment pending page');
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Glassmorphic Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
          {/* Spinner */}
          <div className="flex justify-center mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            {t('pending.title')}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-300 text-center mb-6">
            {t('pending.description')}
          </p>

          {/* Timer */}
          <p className="text-sm text-gray-400 text-center mb-6">
            {t('pending.timeElapsed', { seconds: pollingTime })}
          </p>

          {/* Warning after 60 seconds */}
          {pollingTime > 60 && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
              <p className="text-yellow-200 text-center text-sm">
                {t('pending.takingLonger')}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-200 text-center text-sm">{error}</p>
            </div>
          )}

          {/* Continue to Payment Button */}
          <button
            onClick={handleGenerateCheckout}
            disabled={generating}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-4"
          >
            {generating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('common.loading')}
              </span>
            ) : (
              t('continueToPayment')
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl border border-white/30 transition-all duration-200"
          >
            {t('common.logout')}
          </button>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center mt-6">
            {t('pending.helpText', {
              defaultValue:
                'Need help? Contact support@bayit.tv or refresh this page if you already completed payment.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
