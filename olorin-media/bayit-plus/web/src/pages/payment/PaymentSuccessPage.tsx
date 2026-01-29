/**
 * PaymentSuccessPage - Success page after completing payment
 *
 * Shown after user successfully completes Stripe checkout.
 * Automatically redirects to home after 3 seconds.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';

const paymentLogger = logger.scope('PaymentSuccess');

export default function PaymentSuccessPage() {
  const { t } = useTranslation('payment');
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    paymentLogger.info('Payment success page loaded');

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to home
          paymentLogger.info('Redirecting to home after payment success');
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleContinue = () => {
    paymentLogger.info('User manually clicked continue');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Glassmorphic Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="bg-green-500/20 rounded-full p-6">
              <svg
                className="w-16 h-16 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('success.title')}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-300 mb-8">
            {t('success.description')}
          </p>

          {/* Countdown */}
          <p className="text-sm text-gray-400 mb-8">
            {t('success.redirecting', {
              seconds: countdown,
              defaultValue: `Redirecting in ${countdown} seconds...`,
            })}
          </p>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            {t('success.continue', { defaultValue: 'Continue to Bayit+' })}
          </button>
        </div>
      </div>
    </div>
  );
}
