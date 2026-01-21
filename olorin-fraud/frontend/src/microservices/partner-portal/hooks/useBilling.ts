/**
 * Billing Hook
 *
 * Provides billing plans, subscriptions, and invoices.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useCallback, useEffect } from 'react';
import { useBillingStore } from '../stores/billingStore';
import { useB2BAuthStore } from '../stores/authStore';
import { CreateSubscriptionRequest, CancelSubscriptionRequest } from '../types';

export function useBilling() {
  const {
    plans,
    subscription,
    invoices,
    isLoading,
    error,
    fetchPlans,
    fetchSubscription,
    createSubscription,
    cancelSubscription,
    fetchInvoices,
    getInvoicePdf,
    clearError,
  } = useBillingStore();

  const { isAuthenticated } = useB2BAuthStore();

  useEffect(() => {
    if (isAuthenticated && plans.length === 0) {
      fetchPlans().catch(console.error);
    }
  }, [isAuthenticated, plans.length, fetchPlans]);

  useEffect(() => {
    if (isAuthenticated && !subscription) {
      fetchSubscription().catch(console.error);
    }
  }, [isAuthenticated, subscription, fetchSubscription]);

  const handleCreateSubscription = useCallback(
    async (data: CreateSubscriptionRequest) => {
      await createSubscription(data);
    },
    [createSubscription]
  );

  const handleCancelSubscription = useCallback(
    async (data?: CancelSubscriptionRequest) => {
      await cancelSubscription(data);
    },
    [cancelSubscription]
  );

  const handleDownloadInvoice = useCallback(
    async (invoiceId: string) => {
      const url = await getInvoicePdf(invoiceId);
      window.open(url, '_blank');
    },
    [getInvoicePdf]
  );

  const currentPlan = subscription?.plan;
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active' || isTrialing;
  const isPastDue = subscription?.status === 'past_due';

  return {
    plans,
    subscription,
    invoices,
    isLoading,
    error,
    currentPlan,
    isTrialing,
    isActive,
    isPastDue,
    fetchPlans,
    fetchSubscription,
    fetchInvoices,
    createSubscription: handleCreateSubscription,
    cancelSubscription: handleCancelSubscription,
    downloadInvoice: handleDownloadInvoice,
    clearError,
  };
}
