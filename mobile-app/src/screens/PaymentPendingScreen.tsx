/**
 * PaymentPendingScreen - Shown to users who need to complete payment
 *
 * This screen is displayed when user.payment_pending=true on mobile.
 * Users must complete Stripe checkout to access the app.
 *
 * Features:
 * - Displays loading spinner and elapsed time
 * - Generates checkout URL on-demand (not stored)
 * - Shows warning after 60 seconds
 * - Provides logout option
 * - Fully internationalized (i18n)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '@/utils/logger';
import api from '@/services/api';

const paymentLogger = logger.scope('PaymentPendingScreen');

interface PaymentPendingScreenProps {
  route?: {
    params?: {
      checkoutUrl?: string | null;
      planId?: string | null;
    };
  };
}

export function PaymentPendingScreen({ route }: PaymentPendingScreenProps) {
  const { t } = useTranslation('payment');
  const { logout } = useAuthStore();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [generating, setGenerating] = useState(false);
  const [pollingTime, setPollingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkoutUrl = route?.params?.checkoutUrl || null;
  const planId = route?.params?.planId || null;

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
      paymentLogger.info('Generating checkout', { planId });

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: planId || 'basic',
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
        paymentLogger.error('Failed to initialize payment sheet', initError);
        setError(initError.message);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          paymentLogger.info('User cancelled payment');
          navigation.navigate('PaymentCancelled');
        } else {
          paymentLogger.error('Payment failed', presentError);
          setError(presentError.message);
        }
      } else {
        // Payment successful!
        paymentLogger.info('Payment completed successfully');
        navigation.navigate('PaymentSuccess');
      }
    } catch (err) {
      paymentLogger.error('Failed to generate checkout', err);
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
    paymentLogger.info('User logged out from payment pending screen');
    logout();
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <View style={[StyleSheet.absoluteFill, styles.backgroundGradient]} />

      {/* Glassmorphic Card */}
      <View style={styles.card}>
        {/* Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('pending.title')}</Text>

        {/* Description */}
        <Text style={styles.description}>{t('pending.description')}</Text>

        {/* Timer */}
        <Text style={styles.timer}>
          {t('pending.timeElapsed', { seconds: pollingTime })}
        </Text>

        {/* Warning after 60 seconds */}
        {pollingTime > 60 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>{t('pending.takingLonger')}</Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Continue to Payment Button */}
        <GlassButton
          variant="primary"
          onPress={handleGenerateCheckout}
          disabled={generating}
          style={styles.continueButton}
        >
          {generating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <Text style={styles.continueButtonText}>
              {t('continueToPayment')}
            </Text>
          )}
        </GlassButton>

        {/* Logout Button */}
        <GlassButton
          variant="secondary"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
        </GlassButton>

        {/* Help Text */}
        <Text style={styles.helpText}>
          {t('pending.helpText', {
            defaultValue:
              'Need help? Contact support@bayit.tv or refresh if you already completed payment.',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backgroundGradient: {
    backgroundColor: '#1e293b', // Gray gradient base
    opacity: 0.5,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  spinnerContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  timer: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  warningContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  warningText: {
    color: '#fde68a',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  logoutButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default PaymentPendingScreen;
