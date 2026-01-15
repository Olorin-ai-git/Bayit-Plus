import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { CheckCircle, XCircle, Smartphone, Tv, Lock } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { devicePairingService } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { AnimatedLogo } from '@bayit/shared';

type PageState = 'verifying' | 'login' | 'authenticating' | 'success' | 'error';

export default function TVLoginPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('verifying');
  const [email, setEmail] = useState(import.meta.env.VITE_DEV_DEFAULT_EMAIL || '');
  const [password, setPassword] = useState(import.meta.env.VITE_DEV_DEFAULT_PASSWORD || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, user, token: authToken, login } = useAuthStore();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Verify session on load
  useEffect(() => {
    if (!sessionId || !token) {
      setPageState('error');
      setError(t('tvLogin.invalidQR'));
      return;
    }

    verifySession();
  }, [sessionId, token]);

  const verifySession = async () => {
    try {
      const response = await devicePairingService.verifySession(sessionId!, token!);

      if (!response.valid) {
        setPageState('error');
        setError(t('tvLogin.sessionInvalid'));
        return;
      }

      // Register companion device
      const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'web';
      const browser = navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/i)?.[0] || 'Unknown';

      await devicePairingService.connectCompanion(sessionId!, deviceType, browser);

      setPageState('login');
    } catch (err: any) {
      setPageState('error');
      setError(err.detail || t('tvLogin.verificationFailed'));
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('tvLogin.fillAllFields'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPageState('authenticating');

    try {
      // Complete authentication via device pairing
      const response = await devicePairingService.completeAuth(sessionId!, email, password);

      // Also login locally on this device
      await login(email, password);

      setPageState('success');
    } catch (err: any) {
      setPageState('login');
      setError(err.detail || t('tvLogin.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExistingAccount = async () => {
    if (!isAuthenticated || !authToken) {
      setError(t('tvLogin.notLoggedIn'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPageState('authenticating');

    try {
      // Need to re-authenticate with credentials to complete pairing
      // For now, show the login form
      setPageState('login');
      setError(t('tvLogin.enterCredentials'));
    } catch (err: any) {
      setPageState('login');
      setError(err.detail || t('tvLogin.authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderVerifying = () => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.stateTitle}>{t('tvLogin.verifying')}</Text>
      <Text style={styles.stateDescription}>
        {t('tvLogin.verifyingDescription')}
      </Text>
    </View>
  );

  const renderLogin = () => (
    <View style={styles.loginContainer}>
      <View style={styles.iconRow}>
        <Smartphone size={32} color={colors.primary} />
        <View style={styles.iconConnector} />
        <Tv size={32} color={colors.primary} />
      </View>

      <Text style={styles.loginTitle}>{t('tvLogin.loginTitle')}</Text>
      <Text style={styles.loginDescription}>
        {t('tvLogin.loginDescription')}
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('login.email')}</Text>
        <TextInput
          ref={emailRef}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('placeholder.email')}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={() => passwordRef.current?.focus()}
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('login.password')}</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('placeholder.password')}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />
      </View>

      <GlassButton
        title={isLoading ? t('tvLogin.authorizing') : t('tvLogin.authorizeTV')}
        onPress={handleLogin}
        variant="primary"
        disabled={isLoading}
        style={styles.loginButton}
      />

      <View style={styles.securityNote}>
        <Lock size={16} color={colors.textSecondary} />
        <Text style={styles.securityText}>
          {t('tvLogin.securityNote')}
        </Text>
      </View>
    </View>
  );

  const renderAuthenticating = () => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.stateTitle}>{t('tvLogin.authorizing')}</Text>
      <Text style={styles.stateDescription}>
        {t('tvLogin.authorizingDescription')}
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.stateContainer}>
      <View style={styles.successIcon}>
        <CheckCircle size={64} color="#10b981" />
      </View>
      <Text style={styles.stateTitle}>{t('tvLogin.success')}</Text>
      <Text style={styles.stateDescription}>
        {t('tvLogin.successDescription')}
      </Text>

      <GlassButton
        title={t('tvLogin.goToHome')}
        onPress={() => navigate('/')}
        variant="secondary"
        style={styles.homeButton}
      />
    </View>
  );

  const renderError = () => (
    <View style={styles.stateContainer}>
      <View style={styles.errorIcon}>
        <XCircle size={64} color={colors.error} />
      </View>
      <Text style={styles.stateTitle}>{t('tvLogin.error')}</Text>
      <Text style={styles.stateDescription}>{error}</Text>

      <GlassButton
        title={t('tvLogin.tryAgain')}
        onPress={() => navigate('/')}
        variant="secondary"
        style={styles.homeButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <AnimatedLogo size="medium" />
        </View>

        <GlassView intensity="high" style={styles.card}>
          {pageState === 'verifying' && renderVerifying()}
          {pageState === 'login' && renderLogin()}
          {pageState === 'authenticating' && renderAuthenticating()}
          {pageState === 'success' && renderSuccess()}
          {pageState === 'error' && renderError()}
        </GlassView>

        <Text style={styles.footerText}>
          {t('tvLogin.footer')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100vh' as any,
  },
  backgroundGradient: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    maxWidth: 480,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  errorIcon: {
    marginBottom: spacing.md,
  },
  homeButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  loginContainer: {
    alignItems: 'stretch',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconConnector: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  loginDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
