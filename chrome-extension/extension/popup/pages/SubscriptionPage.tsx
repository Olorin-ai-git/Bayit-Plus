/**
 * Subscription Page
 *
 * Manage subscription:
 * - Upgrade to Premium (Stripe checkout)
 * - View subscription status
 * - Billing history
 * - Cancel subscription
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassConfirmDialog } from '@bayit/glass';
import { useAuthStore } from '../stores/authStore';
import { CONFIG } from '../../config/constants';
import { logger } from '../../lib/logger';
import {
  authenticatedFetch,
  SubscriptionHeader,
  ErrorAlert,
  SuccessAlert,
  CheckoutPollingBanner,
  CurrentPlanCard,
  UpgradeCTA,
  ManageSection,
  SupportCard,
} from './subscription';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { user, isPremium } = authStore;

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, CONFIG.USAGE_TRACKING.POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleUpgrade = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      logger.info('Initiating Stripe checkout');
      const response = await authenticatedFetch(
        '/api/v1/extension/subscriptions/checkout',
        { method: 'POST' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }
      const data = await response.json();
      chrome.tabs.create({ url: data.checkout_url });
      setPollingCheckout(true);
      startSubscriptionPolling();
    } catch (err) {
      logger.error('Failed to initiate checkout', { error: String(err) });
      setError(t('subscription.errors.checkoutFailed', 'Failed to start checkout. Please try again.'));
      setIsProcessing(false);
    }
  };

  const startSubscriptionPolling = () => {
    let attempts = 0;
    const maxAttempts = 60;
    const interval = setInterval(async () => {
      attempts++;
      try {
        await authStore.refresh();
        if (authStore.isPremium) {
          clearInterval(interval);
          setPollingCheckout(false);
          setIsProcessing(false);
          logger.info('Subscription upgrade detected');
          setSuccessMessage(t('subscription.upgradeSuccess', 'Upgrade successful! You now have unlimited dubbing.'));
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollingCheckout(false);
          setIsProcessing(false);
          logger.warn('Subscription polling timed out');
          setError(t('subscription.errors.pollingTimeout', 'Please refresh the page to see your updated subscription status.'));
        }
      } catch (err) {
        logger.error('Subscription polling error', { error: String(err) });
      }
    }, CONFIG.USAGE_TRACKING.POLL_INTERVAL_MS);
  };

  const handleCancelConfirmed = async () => {
    setShowCancelConfirm(false);
    try {
      setIsProcessing(true);
      setError(null);
      logger.info('Cancelling subscription');
      const response = await authenticatedFetch('/api/v1/extension/subscriptions/cancel', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel subscription');
      }
      await authStore.refresh();
      setSuccessMessage(t('subscription.cancelSuccess', 'Subscription cancelled. You can continue using premium until the end of your billing period.'));
      setIsProcessing(false);
    } catch (err) {
      logger.error('Failed to cancel subscription', { error: String(err) });
      setError(t('subscription.errors.cancelFailed', 'Failed to cancel subscription. Please try again or contact support.'));
      setIsProcessing(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      setIsProcessing(true);
      logger.info('Opening Stripe billing portal');
      const response = await authenticatedFetch('/api/v1/subscriptions/billing-portal', {
        method: 'POST',
        body: JSON.stringify({ return_url: chrome.runtime.getURL('popup.html') }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to open billing portal');
      }
      const data = await response.json();
      chrome.tabs.create({ url: data.portal_url });
      setIsProcessing(false);
    } catch (err) {
      logger.error('Failed to open billing portal', { error: String(err) });
      setError(t('subscription.errors.portalFailed', 'Failed to open billing portal. Please try again.'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full p-6 space-y-4">
      <SubscriptionHeader onBack={onBack} isPremium={isPremium} t={t} />
      {error && <ErrorAlert error={error} />}
      {pollingCheckout && <CheckoutPollingBanner t={t} />}
      <CurrentPlanCard user={user} isPremium={isPremium} t={t} />
      {!isPremium && <UpgradeCTA onUpgrade={handleUpgrade} isProcessing={isProcessing} t={t} />}
      {isPremium && (
        <ManageSection
          onBillingPortal={handleBillingPortal}
          onCancel={() => setShowCancelConfirm(true)}
          isProcessing={isProcessing}
          t={t}
        />
      )}
      <SupportCard t={t} />
      {successMessage && <SuccessAlert message={successMessage} />}
      <GlassConfirmDialog
        visible={showCancelConfirm}
        title={t('subscription.cancelConfirmTitle', 'Cancel Subscription')}
        message={t('subscription.confirmCancel', 'Are you sure you want to cancel your premium subscription? You will lose unlimited dubbing access.')}
        confirmLabel={t('subscription.cancelConfirm', 'Yes, Cancel')}
        cancelLabel={t('common.back', 'Back')}
        onConfirm={handleCancelConfirmed}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
