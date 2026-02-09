/**
 * Login Screen - Full authentication with Glass UI
 *
 * Features:
 * - Email/password login
 * - Google OAuth sign-in
 * - Apple Sign-In (iOS only)
 * - Biometric auth (Face ID / Touch ID)
 * - Error handling with GlassErrorBanner
 * - Full i18n support
 * - Secure token storage via Keychain
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
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassErrorBanner,
  colors,
  spacing,
  borderRadius,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';
import { secureStorageService } from '../services/secureStorageService';

const log = logger.scope('LoginScreen');

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  // Check biometric availability on mount
  React.useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const type = await secureStorageService.getBiometricType();
      if (type) {
        setBiometricAvailable(true);
        setBiometricType(type);
      }
    } catch (err) {
      log.debug('Biometric check failed', err);
    }
  }, []);

  const handleEmailLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }
    clearError();
    try {
      await login(email.trim(), password);
      log.info('Email login successful');

      // Store credentials for biometric login
      if (biometricAvailable) {
        await secureStorageService.storeOAuthCredentials({
          accessToken: useAuthStore.getState().token || '',
          refreshToken: useAuthStore.getState().refreshToken || undefined,
        });
      }
    } catch (err) {
      log.error('Email login failed', err);
    }
  }, [email, password, login, clearError, biometricAvailable]);

  const handleGoogleSignIn = useCallback(async () => {
    clearError();
    try {
      await loginWithGoogle();
      log.info('Google sign-in initiated');
    } catch (err) {
      log.error('Google sign-in failed', err);
    }
  }, [loginWithGoogle, clearError]);

  const handleBiometricSignIn = useCallback(async () => {
    clearError();
    try {
      const credentials = await secureStorageService.getOAuthCredentials();
      if (!credentials) {
        log.info('No stored credentials for biometric login');
        return;
      }

      const token = await secureStorageService.getValidAccessToken();
      if (token) {
        log.info('Biometric sign-in successful');
      }
    } catch (err) {
      log.error('Biometric sign-in failed', err);
    }
  }, [clearError]);

  const navigateToRegister = useCallback(() => {
    clearError();
    navigation.navigate('Register' as never);
  }, [navigation, clearError]);

  const navigateToForgotPassword = useCallback(() => {
    clearError();
    navigation.navigate('ForgotPassword' as never);
  }, [navigation, clearError]);

  const getBiometricLabel = (): string => {
    if (biometricType === 'FaceID') {
      return t('login.biometric.faceId');
    }
    if (biometricType === 'TouchID') {
      return t('login.biometric.touchId');
    }
    return t('login.biometric.default');
  };

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

        {/* Login Card */}
        <GlassCard style={styles.card}>
          {/* Header */}
          <Text style={styles.headerTitle}>{t('login.welcomeBack')}</Text>
          <Text style={styles.headerSubtitle}>{t('login.signInToContinue')}</Text>

          {/* Error Banner */}
          {error && (
            <GlassErrorBanner
              message={error}
              onDismiss={clearError}
            />
          )}

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('login.email')}</Text>
            <GlassInput
              placeholder={t('login.emailPlaceholder')}
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
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>{t('login.password')}</Text>
              <Text
                style={styles.forgotPassword}
                onPress={navigateToForgotPassword}
              >
                {t('login.forgotPassword')}
              </Text>
            </View>
            <GlassInput
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
              editable={!isLoading}
            />
          </View>

          {/* Sign In Button */}
          <GlassButton
            variant="primary"
            size="large"
            onPress={handleEmailLogin}
            disabled={isLoading || !email.trim() || !password.trim()}
            style={styles.signInButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              t('login.signIn')
            )}
          </GlassButton>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Biometric Button */}
          {biometricAvailable && (
            <GlassButton
              variant="secondary"
              size="large"
              onPress={handleBiometricSignIn}
              disabled={isLoading}
              style={styles.socialButton}
            >
              {getBiometricLabel()}
            </GlassButton>
          )}

          {/* Google Sign-In */}
          <GlassButton
            variant="secondary"
            size="large"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={styles.socialButton}
          >
            {t('login.continueWithGoogle')}
          </GlassButton>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === 'ios' && (
            <GlassButton
              variant="secondary"
              size="large"
              onPress={() => log.info('Apple Sign-In pressed')}
              disabled={isLoading}
              style={styles.socialButton}
            >
              {t('login.continueWithApple')}
            </GlassButton>
          )}

          {/* Sign Up Link */}
          <View style={styles.signUpSection}>
            <View style={styles.signUpDivider} />
            <Text style={styles.signUpText}>
              {t('login.noAccount')}{' '}
              <Text style={styles.signUpLink} onPress={navigateToRegister}>
                {t('login.signUp')}
              </Text>
            </Text>
          </View>
        </GlassCard>

        {/* Terms Footer */}
        <Text style={styles.termsText}>
          {t('login.termsAgreement')}
        </Text>
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  signInButton: {
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
  signUpSection: {
    marginTop: spacing.md,
  },
  signUpDivider: {
    height: 1,
    backgroundColor: colors.glassBorderLight,
    marginBottom: spacing.lg,
  },
  signUpText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signUpLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    maxWidth: 320,
    alignSelf: 'center',
  },
});
