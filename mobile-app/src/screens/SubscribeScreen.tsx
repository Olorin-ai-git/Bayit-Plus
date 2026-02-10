/**
 * SubscribeScreen - Subscription plan selection screen for mobile
 *
 * Allows users to view and select subscription plans (Basic, Premium, Family).
 * Generates Stripe checkout URL and initiates payment flow.
 *
 * Features:
 * - Plan selection (Basic, Premium, Family)
 * - Monthly/Yearly billing toggle
 * - Plan comparison
 * - Stripe checkout integration
 * - Loading states and error handling
 * - Fully internationalized (i18n)
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '@/utils/logger';
import api from '@/services/api';

const subscribeLogger = logger.scope('SubscribeScreen');

const PLANS_CONFIG = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      'Live TV channels',
      'VOD library',
      'Radio stations',
      'Single device',
      'SD quality',
    ],
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    features: [
      'Everything in Basic',
      'Podcasts & Audiobooks',
      '2 devices simultaneously',
      'HD quality',
      'Offline downloads',
    ],
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    features: [
      'Everything in Premium',
      '6 family profiles',
      '4 devices simultaneously',
      '4K quality',
      'Parental controls',
    ],
    popular: false,
  },
];

export function SubscribeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isAuthenticated } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      subscribeLogger.info('Creating checkout session', { plan: selectedPlan, billing: billingPeriod });

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: selectedPlan,
      });

      const { payment_intent_secret, ephemeral_key, customer_id } = response;

      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bayit+',
        customerId: customer_id,
        customerEphemeralKeySecret: ephemeral_key,
        paymentIntentClientSecret: payment_intent_secret,
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        subscribeLogger.error('Failed to initialize payment sheet', initError);
        setError(initError.message);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          subscribeLogger.info('User cancelled checkout');
          navigation.navigate('PaymentCancelled');
        } else {
          subscribeLogger.error('Payment failed', presentError);
          setError(presentError.message);
        }
      } else {
        // Payment successful!
        subscribeLogger.info('Payment completed successfully');
        navigation.navigate('PaymentSuccess');
      }
    } catch (err) {
      subscribeLogger.error('Failed to create checkout', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create payment session. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, billingPeriod, navigation, initPaymentSheet, presentPaymentSheet]);

  const getPrice = (plan: typeof PLANS_CONFIG[0]) => {
    const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const period = billingPeriod === 'monthly' ? '/month' : '/year';
    return `$${price}${period}`;
  };

  const getSavings = (plan: typeof PLANS_CONFIG[0]) => {
    if (billingPeriod === 'yearly') {
      const monthlyCost = plan.monthlyPrice * 12;
      const yearlyCost = plan.yearlyPrice;
      const savings = ((monthlyCost - yearlyCost) / monthlyCost * 100).toFixed(0);
      return `Save ${savings}%`;
    }
    return null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscribe.title')}</Text>
        <Text style={styles.subtitle}>{t('subscribe.subtitle')}</Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'monthly' && styles.billingOptionActive,
          ]}
          onPress={() => setBillingPeriod('monthly')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'monthly' && styles.billingOptionTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'yearly' && styles.billingOptionActive,
          ]}
          onPress={() => setBillingPeriod('yearly')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'yearly' && styles.billingOptionTextActive,
            ]}
          >
            Yearly
          </Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>Save 17%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Plan Cards */}
      <View style={styles.planCards}>
        {PLANS_CONFIG.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const savings = getSavings(plan);

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                plan.popular && styles.planCardPopular,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>{getPrice(plan)}</Text>
                {savings && <Text style={styles.planSavings}>{savings}</Text>}
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.checkmark}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIndicatorText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* CTA Button */}
      <GlassButton
        variant="primary"
        onPress={handleSubscribe}
        disabled={loading}
        style={styles.ctaButton}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ffffff" size="small" />
            <Text style={styles.loadingText}>{t('subscribe.processing')}</Text>
          </View>
        ) : (
          <Text style={styles.ctaButtonText}>{t('subscribe.startTrial')}</Text>
        )}
      </GlassButton>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>{t('subscribe.noCharge')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.xl,
  },
  billingOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingOptionActive: {
    backgroundColor: colors.primary,
  },
  billingOptionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  billingOptionTextActive: {
    color: '#ffffff',
  },
  savingsBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  savingsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planCards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  planCardPopular: {
    borderColor: '#a855f7',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#a855f7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginRight: spacing.sm,
  },
  planSavings: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  featuresContainer: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    color: colors.primary,
    fontSize: 18,
    marginRight: spacing.sm,
    fontWeight: 'bold',
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
  },
  selectedIndicator: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});

export default SubscribeScreen;
