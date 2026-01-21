/**
 * Billing Page
 *
 * Subscription management, plans, and invoice history.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBillingStore } from '../stores/billingStore';
import { toast } from '../stores/uiStore';
import { PageHeader, LoadingSpinner, EmptyState, ConfirmDialog } from '../components/common';
import type { BillingPeriod } from '../types';

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    plans,
    subscription,
    invoices,
    isLoading,
    fetchPlans,
    fetchSubscription,
    fetchInvoices,
    updateSubscription,
    cancelSubscription,
    downloadInvoicePdf,
  } = useBillingStore();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
    fetchInvoices();
  }, [fetchPlans, fetchSubscription, fetchInvoices]);

  const handleChangePlan = async (planId: string) => {
    setIsProcessing(true);
    try {
      await updateSubscription(planId, billingPeriod);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      await cancelSubscription();
      toast.success(t('common.success'));
      setShowCancelDialog(false);
    } catch {
      toast.error(t('errors.serverError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const url = await downloadInvoicePdf(invoiceId);
      window.open(url, '_blank');
    } catch {
      toast.error(t('errors.serverError'));
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'open':
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'void':
      case 'uncollectible':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-white/20 text-white';
    }
  };

  if (isLoading && !plans.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('billing.title')}
        description={subscription ? `${t('billing.currentPlan')}: ${subscription.plan.name}` : undefined}
      />

      {/* Current Subscription */}
      {subscription && (
        <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{subscription.plan.name}</h2>
              <p className="text-sm text-white/60">
                {formatCurrency(
                  billingPeriod === 'monthly' ? subscription.plan.monthlyPrice : subscription.plan.annualPrice,
                  subscription.plan.currency
                )}
                {billingPeriod === 'monthly' ? t('billing.perMonth') : t('billing.perYear')}
              </p>
              <p className="text-xs text-white/40 mt-1">
                Current period ends: {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={subscription.cancelAtPeriodEnd}
                className="
                  px-4 py-2 rounded-xl
                  bg-red-500/10 border border-red-500/30 text-red-400
                  text-sm font-medium
                  hover:bg-red-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {subscription.cancelAtPeriodEnd ? t('billing.cancellationPending') : t('billing.cancelPlan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-colors
              ${billingPeriod === 'monthly' ? 'bg-partner-primary text-white' : 'text-white/60 hover:text-white'}
            `}
          >
            {t('billing.monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-colors
              ${billingPeriod === 'annual' ? 'bg-partner-primary text-white' : 'text-white/60 hover:text-white'}
            `}
          >
            {t('billing.annual')} <span className="text-green-400 ml-1">-20%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`
              relative rounded-2xl border bg-glass-card backdrop-blur-xl p-6
              ${plan.isPopular ? 'border-partner-primary' : 'border-white/10'}
            `}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-partner-primary text-white text-xs font-medium">
                  {t('billing.popular')}
                </span>
              </div>
            )}

            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-white/60 mt-1">{plan.description}</p>

            <div className="mt-4">
              <span className="text-3xl font-bold text-white">
                {formatCurrency(
                  billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice,
                  plan.currency
                )}
              </span>
              <span className="text-white/60">
                {billingPeriod === 'monthly' ? t('billing.perMonth') : t('billing.perYear')}
              </span>
            </div>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-partner-primary">✓</span>
                {formatNumber(plan.requestsPerMonth)} requests/month
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-partner-primary">✓</span>
                {plan.teamMembersLimit} team members
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-partner-primary">✓</span>
                {plan.apiKeysLimit} API keys
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-partner-primary">✓</span>
                {plan.supportLevel} support
              </li>
            </ul>

            <button
              onClick={() => handleChangePlan(plan.id)}
              disabled={isProcessing || subscription?.planId === plan.id}
              className={`
                w-full mt-6 py-3 rounded-xl font-medium text-sm transition-colors
                ${
                  subscription?.planId === plan.id
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : plan.isPopular
                    ? 'bg-partner-primary text-white hover:bg-partner-primary/90'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              {subscription?.planId === plan.id
                ? 'Current Plan'
                : plan.tier === 'enterprise'
                ? t('billing.contactSales')
                : t('billing.changePlan')}
            </button>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">{t('billing.invoices')}</h2>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('billing.invoiceId')}
                  </th>
                  <th className="text-left rtl:text-right py-3 px-4 text-sm font-medium text-white/60">
                    {t('billing.date')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('billing.amount')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-white/60">
                    {t('billing.status')}
                  </th>
                  <th className="text-right rtl:text-left py-3 px-4 text-sm font-medium text-white/60">
                    {t('billing.download')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-white font-mono">
                      {invoice.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-white/80">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right rtl:text-left">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {t(`billing.${invoice.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right rtl:text-left">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-partner-primary hover:text-partner-primary/80 text-sm transition-colors"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t('common.noData')}
            description={t('billing.noInvoices')}
          />
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelSubscription}
        title={t('billing.cancelSubscriptionTitle')}
        message={t('billing.cancelSubscriptionMessage')}
        confirmLabel={t('billing.cancelPlan')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  );
};

export default BillingPage;
