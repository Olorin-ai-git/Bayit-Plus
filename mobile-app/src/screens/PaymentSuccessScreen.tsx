/**
 * PaymentSuccessScreen - Success screen after completing payment
 *
 * Shown after user successfully completes Stripe checkout on mobile.
 * Automatically navigates to home after 3 seconds.
 *
 * Features:
 * - Auto-redirect countdown (3 seconds)
 * - Manual continue button
 * - Glassmorphic UI with success styling
 * - Fully internationalized (i18n)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '@/utils/logger';

const paymentLogger = logger.scope('PaymentSuccess');

export function PaymentSuccessScreen() {
  const { t } = useTranslation('payment');
  const navigation = useNavigation();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    paymentLogger.info('Payment success screen loaded');

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Navigate to home
          paymentLogger.info('Navigating to home after payment success');
          navigation.navigate('Main');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const handleContinue = () => {
    paymentLogger.info('User manually clicked continue');
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <View style={[StyleSheet.absoluteFill, styles.backgroundGradient]} />

      {/* Glassmorphic Card */}
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successIconBg}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('success.title')}</Text>

        {/* Description */}
        <Text style={styles.description}>{t('success.description')}</Text>

        {/* Countdown */}
        <Text style={styles.countdown}>
          {t('success.redirecting', {
            seconds: countdown,
            defaultValue: `Redirecting in ${countdown} seconds...`,
          })}
        </Text>

        {/* Continue Button */}
        <GlassButton
          variant="primary"
          onPress={handleContinue}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>
            {t('success.continue', { defaultValue: 'Continue to Bayit+' })}
          </Text>
        </GlassButton>
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
    backgroundColor: '#065f46', // Green gradient base
    opacity: 0.3,
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
  iconContainer: {
    marginBottom: spacing.xl,
  },
  successIconBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#22c55e',
    fontWeight: 'bold',
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
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  countdown: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  continueButton: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PaymentSuccessScreen;
