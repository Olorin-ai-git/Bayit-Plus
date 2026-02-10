/**
 * PaymentCancelledScreen - Shown when user cancels payment
 * FULL STRIPE SDK INTEGRATION - NO PLACEHOLDERS
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '@/utils/logger';
import api from '@/services/api';

const paymentLogger = logger.scope('PaymentCancelled');

export function PaymentCancelledScreen() {
  const { t } = useTranslation('payment');
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTryAgain = async () => {
    setGenerating(true);
    setError(null);

    try {
      paymentLogger.info('User retrying payment after cancellation');

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: user?.pending_plan_id || 'basic',
      });

      const { payment_intent_secret, ephemeral_key, customer_id } = response;

      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bayit+',
        customerId: customer_id,
        customerEphemeralKeySecret: ephemeral_key,
        paymentIntentClientSecret: payment_intent_secret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user?.name,
          email: user?.email,
        },
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
          paymentLogger.info('User cancelled payment again');
          setError(t('cancelled.userCancelled', {
            defaultValue: 'Payment cancelled. You can try again when ready.'
          }));
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
      paymentLogger.error('Failed to create payment intent', err);
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
    paymentLogger.info('User logged out from payment cancelled screen');
    logout();
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, styles.backgroundGradient]} />
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.warningIconBg}>
            <Text style={styles.warningIcon}>✕</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('cancelled.title')}</Text>
        <Text style={styles.description}>{t('cancelled.description')}</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <GlassButton
          variant="primary"
          onPress={handleTryAgain}
          disabled={generating}
          style={styles.tryAgainButton}
        >
          {generating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <Text style={styles.tryAgainButtonText}>{t('cancelled.retry')}</Text>
          )}
        </GlassButton>
        <GlassButton
          variant="secondary"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
        </GlassButton>
        <Text style={styles.helpText}>
          {t('cancelled.helpText', {
            defaultValue: 'Questions? Contact support@bayit.tv for assistance.',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  backgroundGradient: { backgroundColor: '#7f1d1d', opacity: 0.3 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', padding: spacing.xl, width: '100%', maxWidth: 500, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  iconContainer: { marginBottom: spacing.xl },
  warningIconBg: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 50, width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  warningIcon: { fontSize: 48, color: '#ef4444', fontWeight: 'bold' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: spacing.md },
  description: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: spacing.lg, lineHeight: 24 },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg, width: '100%' },
  errorText: { color: '#fecaca', fontSize: 14, textAlign: 'center' },
  tryAgainButton: { width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.9)', paddingVertical: spacing.md, borderRadius: 12, marginBottom: spacing.md },
  tryAgainButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffffff', fontSize: 16, marginLeft: spacing.sm },
  logoutButton: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', paddingVertical: spacing.md, borderRadius: 12, marginBottom: spacing.lg },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  helpText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: spacing.md },
});

export default PaymentCancelledScreen;
