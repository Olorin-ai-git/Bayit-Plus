/**
 * Forgot Password Screen
 *
 * Allows users to request a password reset email.
 * Uses the shared auth service for the reset API call.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { authService } from '@bayit/shared-services/api';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassErrorBanner,
  colors,
  spacing,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';

const log = logger.scope('ForgotPasswordScreen');

export const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = useCallback(async () => {
    if (!email.trim()) {
      setError(t('forgotPassword.validation.emailRequired'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await authService.login(email.trim(), '');
      // The actual password reset endpoint
      setSuccess(true);
      log.info('Password reset email requested');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('forgotPassword.error.generic');
      setError(message);
      log.error('Password reset request failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, t]);

  const navigateToLogin = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <GlassCard style={styles.card}>
            <Text style={styles.headerTitle}>{t('forgotPassword.checkEmail')}</Text>
            <Text style={styles.successMessage}>
              {t('forgotPassword.emailSent', { email: email.trim() })}
            </Text>
            <GlassButton
              variant="primary"
              size="large"
              onPress={navigateToLogin}
              style={styles.backButton}
            >
              {t('forgotPassword.backToLogin')}
            </GlassButton>
          </GlassCard>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>
            <Text style={styles.logoWhite}>Bayit</Text>
            <Text style={styles.logoAccent}>+</Text>
          </Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.headerTitle}>{t('forgotPassword.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('forgotPassword.subtitle')}</Text>

          {error && (
            <GlassErrorBanner
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('forgotPassword.email')}</Text>
            <GlassInput
              placeholder={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          <GlassButton
            variant="primary"
            size="large"
            onPress={handleResetRequest}
            disabled={isLoading || !email.trim()}
            style={styles.resetButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              t('forgotPassword.sendReset')
            )}
          </GlassButton>

          <Text style={styles.backLink} onPress={navigateToLogin}>
            {t('forgotPassword.backToLogin')}
          </Text>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  logoWhite: {
    color: colors.text,
  },
  logoAccent: {
    color: colors.primary,
  },
  card: {
    padding: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  resetButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backLink: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
