/**
 * Subscription Page
 *
 * Manage subscription:
 * - Upgrade to Premium (Stripe checkout)
 * - View subscription status
 * - Billing history
 * - Cancel subscription
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassBadge } from '@bayit/glass';
import { useAuthStore } from '../stores/authStore';
import { CONFIG } from '../../config/constants';
import { logger } from '../../lib/logger';

interface SubscriptionPageProps {
  onBack: () => void;
}

/**
 * Subscription Page Component
 */
export function SubscriptionPage({ onBack }: SubscriptionPageProps) {
  const { t } = useTranslation();
  const authStore = useAuthStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingCheckout, setPollingCheckout] = useState(false);

  const { user, isPremium } = authStore;

  /**
   * Handle upgrade to premium (Stripe checkout)
   */
  const handleUpgrade = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      logger.info('Initiating Stripe checkout');

      // Create Stripe checkout session (Chrome Extension-specific endpoint)
      const response = await fetch(
        `${CONFIG.API.BASE_URL}/api/v1/extension/subscriptions/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await import('../../background/auth-manager').then(
              (m) => m.getToken()
            )}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }

      const data = await response.json();
      const checkoutUrl = data.checkout_url;

      logger.info('Stripe checkout URL created', { checkoutUrl });

      // Open Stripe checkout in new tab
      chrome.tabs.create({ url: checkoutUrl });

      // Start polling for subscription status (every 5s)
      setPollingCheckout(true);
      startSubscriptionPolling();
    } catch (error) {
      logger.error('Failed to initiate checkout', { error: String(error) });
      setError(
        t(
          'subscription.errors.checkoutFailed',
          'Failed to start checkout. Please try again.'
        )
      );
      setIsProcessing(false);
    }
  };

  /**
   * Poll subscription status until upgrade detected
   */
  const startSubscriptionPolling = () => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    const interval = setInterval(async () => {
      attempts++;

      try {
        // Refresh user info
        await authStore.refresh();

        // Check if upgraded
        if (authStore.isPremium) {
          clearInterval(interval);
          setPollingCheckout(false);
          setIsProcessing(false);

          logger.info('Subscription upgrade detected');

          // Show success message
          alert(
            t(
              'subscription.upgradeSuccess',
              'Upgrade successful! You now have unlimited dubbing.'
            )
          );
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollingCheckout(false);
          setIsProcessing(false);

          logger.warn('Subscription polling timed out');

          setError(
            t(
              'subscription.errors.pollingTimeout',
              'Please refresh the page to see your updated subscription status.'
            )
          );
        }
      } catch (error) {
        logger.error('Subscription polling error', { error: String(error) });
        // Continue polling despite errors
      }
    }, CONFIG.USAGE_TRACKING.POLL_INTERVAL_MS);
  };

  /**
   * Handle cancel subscription
   */
  const handleCancel = async () => {
    if (
      !confirm(
        t(
          'subscription.confirmCancel',
          'Are you sure you want to cancel your premium subscription? You will lose unlimited dubbing access.'
        )
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      logger.info('Cancelling subscription');

      const response = await fetch(
        `${CONFIG.API.BASE_URL}/api/v1/extension/subscriptions/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await import('../../background/auth-manager').then(
              (m) => m.getToken()
            )}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel subscription');
      }

      logger.info('Subscription cancelled successfully');

      // Refresh user info
      await authStore.refresh();

      alert(
        t(
          'subscription.cancelSuccess',
          'Subscription cancelled. You can continue using premium until the end of your billing period.'
        )
      );

      setIsProcessing(false);
    } catch (error) {
      logger.error('Failed to cancel subscription', { error: String(error) });
      setError(
        t(
          'subscription.errors.cancelFailed',
          'Failed to cancel subscription. Please try again or contact support.'
        )
      );
      setIsProcessing(false);
    }
  };

  /**
   * Open billing portal
   */
  const handleBillingPortal = async () => {
    try {
      setIsProcessing(true);

      logger.info('Opening Stripe billing portal');

      const response = await fetch(
        `${CONFIG.API.BASE_URL}/api/v1/subscriptions/billing-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await import('../../background/auth-manager').then(
              (m) => m.getToken()
            )}`,
          },
          body: JSON.stringify({
            return_url: chrome.runtime.getURL('popup.html'),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to open billing portal');
      }

      const data = await response.json();
      const portalUrl = data.portal_url;

      logger.info('Opening billing portal', { portalUrl });

      // Open billing portal in new tab
      chrome.tabs.create({ url: portalUrl });

      setIsProcessing(false);
    } catch (error) {
      logger.error('Failed to open billing portal', { error: String(error) });
      setError(
        t(
          'subscription.errors.portalFailed',
          'Failed to open billing portal. Please try again.'
        )
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <GlassButton
          variant="ghost"
          onPress={onBack}
          aria-label={t('common.back', 'Back')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </GlassButton>

        <h1 className="text-2xl font-bold text-white">
          {t('subscription.title', 'Subscription')}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Processing State */}
      {pollingCheckout && (
        <div
          className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-blue-200 text-sm">
            {t(
              'subscription.waitingForCheckout',
              'Waiting for checkout completion... Please complete the payment in the opened tab.'
            )}
          </p>
        </div>
      )}

      {/* Current Subscription Status */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {t('subscription.currentPlan', 'Current Plan')}
            </h2>
            <p className="text-white/60 text-sm">
              {user?.email}
            </p>
          </div>

          <GlassBadge
            variant={isPremium ? 'success' : 'default'}
            aria-label={`Subscription: ${user?.subscription_tier || 'free'}`}
          >
            {isPremium
              ? t('subscription.tier.premium', 'Premium')
              : t('subscription.tier.free', 'Free')}
          </GlassBadge>
        </div>

        <div className="space-y-3">
          <FeatureItem
            included={true}
            text={t('subscription.features.basicDubbing', '5 minutes per day')}
          />
          <FeatureItem
            included={isPremium}
            text={t('subscription.features.unlimited', 'Unlimited dubbing')}
          />
          <FeatureItem
            included={isPremium}
            text={t('subscription.features.prioritySupport', 'Priority support')}
          />
          <FeatureItem
            included={isPremium}
            text={t('subscription.features.noWatermark', 'No watermark')}
          />
        </div>
      </GlassCard>

      {/* Free Tier: Upgrade CTA */}
      {!isPremium && (
        <GlassCard className="p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
          <div className="text-center">
            <div className="text-4xl mb-3">⭐</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('subscription.upgradeToPremium', 'Upgrade to Premium')}
            </h2>
            <p className="text-white/80 mb-4">
              {t(
                'subscription.upgradeDescription',
                'Get unlimited dubbing, priority support, and more'
              )}
            </p>

            <div className="text-4xl font-bold text-white mb-6">
              ${CONFIG.QUOTA.PREMIUM_TIER_PRICE_USD}
              <span className="text-lg text-white/60 font-normal">
                {t('subscription.perMonth', '/month')}
              </span>
            </div>

            <GlassButton
              variant="primary"
              onPress={handleUpgrade}
              disabled={isProcessing}
              className="w-full"
              aria-label={t('subscription.upgradeNow', 'Upgrade Now')}
            >
              {isProcessing
                ? t('common.loading', 'Loading...')
                : t('subscription.upgradeNow', 'Upgrade Now')}
            </GlassButton>

            <p className="text-white/50 text-xs mt-3">
              {t(
                'subscription.securePayment',
                'Secure payment powered by Stripe'
              )}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Premium: Manage Subscription */}
      {isPremium && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {t('subscription.manage', 'Manage Subscription')}
          </h2>

          <div className="space-y-3">
            <GlassButton
              variant="secondary"
              onPress={handleBillingPortal}
              disabled={isProcessing}
              className="w-full"
              aria-label={t('subscription.billingPortal', 'View Billing History')}
            >
              {t('subscription.billingPortal', 'View Billing History')}
            </GlassButton>

            <GlassButton
              variant="secondary"
              onPress={handleCancel}
              disabled={isProcessing}
              className="w-full"
              aria-label={t('subscription.cancel', 'Cancel Subscription')}
            >
              {t('subscription.cancel', 'Cancel Subscription')}
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Support */}
      <GlassCard className="p-4">
        <p className="text-white/70 text-sm text-center">
          {t('subscription.needHelp', 'Need help?')}{' '}
          <a
            href="mailto:support@bayit.tv"
            className="text-white hover:text-white/80 underline"
          >
            {t('subscription.contactSupport', 'Contact Support')}
          </a>
        </p>
      </GlassCard>
    </div>
  );
}

/**
 * Feature Item Component
 */
function FeatureItem({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          included ? 'bg-green-500/20' : 'bg-white/10'
        }`}
        aria-hidden="true"
      >
        {included ? (
          <svg
            className="w-3 h-3 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-white/30"
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
        )}
      </div>
      <span
        className={`text-sm ${
          included ? 'text-white' : 'text-white/50 line-through'
        }`}
      >
        {text}
      </span>
    </div>
  );
}
