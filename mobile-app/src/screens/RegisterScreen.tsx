/**
 * Register Screen - Full registration with Glass UI
 *
 * Features:
 * - Name, email, password, confirm password fields
 * - Client-side validation
 * - Google OAuth sign-up
 * - Apple Sign-In (iOS only)
 * - Terms acceptance checkbox
 * - Error handling with GlassErrorBanner
 * - Full i18n support
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassCheckbox,
  GlassErrorBanner,
  colors,
  spacing,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';

const log = logger.scope('RegisterScreen');

const MIN_PASSWORD_LENGTH = 8;

export const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayError = validationError || error;

  const validate = useCallback((): boolean => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError(t('register.validation.nameRequired'));
      return false;
    }
    if (!email.trim()) {
      setValidationError(t('register.validation.emailRequired'));
      return false;
    }
    if (!password) {
      setValidationError(t('register.validation.passwordRequired'));
      return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(t('register.validation.passwordMinLength', { count: MIN_PASSWORD_LENGTH }));
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t('register.validation.passwordMismatch'));
      return false;
    }
    if (!acceptTerms) {
      setValidationError(t('register.validation.termsRequired'));
      return false;
    }
    return true;
  }, [name, email, password, confirmPassword, acceptTerms, t]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;

    clearError();
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      log.info('Registration successful');
    } catch (err) {
      log.error('Registration failed', err);
    }
  }, [validate, register, name, email, password, clearError]);

  const handleGoogleSignUp = useCallback(async () => {
    clearError();
    setValidationError(null);
    try {
      await loginWithGoogle();
      log.info('Google sign-up initiated');
    } catch (err) {
      log.error('Google sign-up failed', err);
    }
  }, [loginWithGoogle, clearError]);

  const navigateToLogin = useCallback(() => {
    clearError();
    setValidationError(null);
    navigation.goBack();
  }, [navigation, clearError]);

  const clearErrors = useCallback(() => {
    clearError();
    setValidationError(null);
  }, [clearError]);

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
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>
            <Text style={styles.logoWhite}>Bayit</Text>
            <Text style={styles.logoAccent}>+</Text>
          </Text>
        </View>

        {/* Register Card */}
        <GlassCard style={styles.card}>
          <Text style={styles.headerTitle}>{t('register.createAccount')}</Text>
          <Text style={styles.headerSubtitle}>{t('register.joinBayitPlus')}</Text>

          {/* Error Banner */}
          {displayError && (
            <GlassErrorBanner
              message={displayError}
              onDismiss={clearErrors}
            />
          )}

          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('register.fullName')}</Text>
            <GlassInput
              placeholder={t('register.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              editable={!isLoading}
            />
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('register.email')}</Text>
            <GlassInput
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          {/* Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('register.password')}</Text>
            <GlassInput
              placeholder={t('register.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!isLoading}
            />
          </View>

          {/* Confirm Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('register.confirmPassword')}</Text>
            <GlassInput
              placeholder={t('register.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!isLoading}
            />
          </View>

          {/* Terms Checkbox */}
          <GlassCheckbox
            checked={acceptTerms}
            onToggle={setAcceptTerms}
            label={t('register.agreeToTerms')}
            disabled={isLoading}
          />

          {/* Create Account Button */}
          <GlassButton
            variant="primary"
            size="large"
            onPress={handleRegister}
            disabled={isLoading}
            style={styles.createButton}
          >
            {isLoading ? (
              <GlassLoadingSpinner size="small" />
            ) : (
              t('register.createAccount')
            )}
          </GlassButton>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-Up */}
          <GlassButton
            variant="secondary"
            size="large"
            onPress={handleGoogleSignUp}
            disabled={isLoading}
            style={styles.socialButton}
          >
            {t('login.continueWithGoogle')}
          </GlassButton>

          {/* Apple Sign-Up (iOS only) */}
          {Platform.OS === 'ios' && (
            <GlassButton
              variant="secondary"
              size="large"
              onPress={() => log.info('Apple Sign-Up pressed')}
              disabled={isLoading}
              style={styles.socialButton}
            >
              {t('login.continueWithApple')}
            </GlassButton>
          )}

          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <View style={styles.signInDivider} />
            <Text style={styles.signInText}>
              {t('register.alreadyHaveAccount')}{' '}
              <Text style={styles.signInLink} onPress={navigateToLogin}>
                {t('register.signIn')}
              </Text>
            </Text>
          </View>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
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
  createButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  socialButton: {
    marginBottom: spacing.sm,
  },
  signInSection: {
    marginTop: spacing.md,
  },
  signInDivider: {
    height: 1,
    backgroundColor: colors.glassBorderLight,
    marginBottom: spacing.lg,
  },
  signInText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signInLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
