import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { CheckCircle, XCircle, Smartphone, Tv, Lock } from 'lucide-react';
import { GlassView, GlassButton, GlassInput } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
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

  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

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
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.titleText}>{t('tvLogin.verifying')}</Text>
      <Text style={styles.descriptionText}>
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

      <Text style={styles.titleText}>{t('tvLogin.loginTitle')}</Text>
      <Text style={styles.loginDescription}>
        {t('tvLogin.loginDescription')}
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('login.email')}</Text>
        <GlassInput
          ref={emailRef}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('placeholder.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={() => passwordRef.current?.focus()}
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('login.password')}</Text>
        <GlassInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('placeholder.password')}
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
        style={styles.button}
      />

      <View style={styles.securityNote}>
        <Lock size={16} color={colors.textSecondary} />
        <Text style={styles.securityNoteText}>
          {t('tvLogin.securityNote')}
        </Text>
      </View>
    </View>
  );

  const renderAuthenticating = () => (
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.titleText}>{t('tvLogin.authorizing')}</Text>
      <Text style={styles.descriptionText}>
        {t('tvLogin.authorizingDescription')}
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centeredContainer}>
      <View style={styles.iconWrapper}>
        <CheckCircle size={64} color="#10b981" />
      </View>
      <Text style={styles.titleText}>{t('tvLogin.success')}</Text>
      <Text style={styles.descriptionText}>
        {t('tvLogin.successDescription')}
      </Text>

      <GlassButton
        title={t('tvLogin.goToHome')}
        onPress={() => navigate('/')}
        variant="secondary"
        style={styles.successButton}
      />
    </View>
  );

  const renderError = () => (
    <View style={styles.centeredContainer}>
      <View style={styles.iconWrapper}>
        <XCircle size={64} color={colors.error} />
      </View>
      <Text style={styles.titleText}>{t('tvLogin.error')}</Text>
      <Text style={styles.descriptionText}>{error}</Text>

      <GlassButton
        title={t('tvLogin.tryAgain')}
        onPress={() => navigate('/')}
        variant="secondary"
        style={styles.successButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />

      <View style={styles.contentWrapper}>
        <View style={styles.logoWrapper}>
          <AnimatedLogo size="medium" />
        </View>

        <GlassView intensity="high" style={styles.glassContainer}>
          {pageState === 'verifying' && renderVerifying()}
          {pageState === 'login' && renderLogin()}
          {pageState === 'authenticating' && renderAuthenticating()}
          {pageState === 'success' && renderSuccess()}
          {pageState === 'error' && renderError()}
        </GlassView>

        <Text style={styles.footer}>
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
  backgroundGlow: {
    position: 'absolute',
    top: -96,
    right: -96,
    width: 384,
    height: 384,
    borderRadius: 9999,
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 480,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  logoWrapper: {
    marginBottom: spacing.xl,
  },
  glassContainer: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  centeredContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  titleText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#9333ea',
    marginHorizontal: spacing.md,
  },
  loginDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: fontSize.md,
  },
  button: {
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
  securityNoteText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  iconWrapper: {
    marginBottom: spacing.md,
  },
  successButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
