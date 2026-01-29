/**
 * PaymentCancelledPage - Shown when user cancels payment
 *
 * Displayed when user clicks "Cancel" in Stripe Checkout.
 * Provides options to try again or logout.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import logger from '@/utils/logger';

const paymentLogger = logger.scope('PaymentCancelled');

export default function PaymentCancelledPage() {
  const { t } = useTranslation('payment');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTryAgain = async () => {
    setGenerating(true);
    setError(null);

    try {
      paymentLogger.info('User retrying payment after cancellation');

      const response = await fetch(
        `/api/v1/auth/payment/checkout-url?plan_id=${user?.pending_plan_id || 'basic'}`,
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

      paymentLogger.info('New checkout URL generated, redirecting');

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      paymentLogger.error('Failed to regenerate checkout URL', err);
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
    paymentLogger.info('User logged out from payment cancelled page');
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Glassmorphic Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 text-center">
          {/* Warning Icon */}
          <div className="flex justify-center mb-8">
            <div className="bg-red-500/20 rounded-full p-6">
              <svg
                className="w-16 h-16 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('cancelled.title')}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-300 mb-8">
            {t('cancelled.description')}
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Try Again Button */}
          <button
            onClick={handleTryAgain}
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
              t('cancelled.retry')
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
          <p className="text-xs text-gray-500 mt-6">
            {t('cancelled.helpText', {
              defaultValue:
                'Questions? Contact support@bayit.tv for assistance.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
