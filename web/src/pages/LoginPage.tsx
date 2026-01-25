import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ChevronDown, Globe } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores';
import { colors, spacing } from '@olorin/design-tokens';
import { AnimatedLogo } from '@bayit/shared';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const LANGUAGE_CODES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'es', flag: '🇪🇸' },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, isLoading } = useAuthStore();

  const [email, setEmail] = useState(import.meta.env.VITE_DEV_DEFAULT_EMAIL || '');
  const [password, setPassword] = useState(import.meta.env.VITE_DEV_DEFAULT_PASSWORD || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Get redirect path from query params or location state
  const redirectParam = searchParams.get('redirect');
  const from = redirectParam || (location.state as any)?.from?.pathname || '/';

  const currentLanguage = LANGUAGE_CODES.find(lang => lang.code === i18n.language) || LANGUAGE_CODES[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('login.errors.emailRequired'));
      return;
    }

    if (!password) {
      setError(t('login.errors.passwordRequired'));
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || t('login.errors.loginFailed'));
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      // Don't navigate here - for web, loginWithGoogle() redirects to Google
      // For native apps, the redirect happens via deep linking
      // Navigation happens after Google callback completes
    } catch (err: any) {
      setError(err.message || t('login.errors.googleFailed'));
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient effects */}
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />
      <View style={styles.bgGradient3} />

      {/* Language Selector - Top Right */}
      <View style={[styles.languageSelector, isRTL ? styles.languageSelectorRTL : styles.languageSelectorLTR]}>
        <Pressable
          style={styles.languageButton}
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
        >
          <Globe size={18} color={colors.textSecondary} />
          <Text style={styles.languageButtonText}>{currentLanguage.flag} {currentLanguageLabel}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>

        {showLanguageMenu && (
          <View style={styles.languageMenu}>
            {LANGUAGE_CODES.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageMenuItem,
                  lang.code === i18n.language && styles.languageMenuItemActive
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.languageMenuItemFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageMenuItemText,
                  lang.code === i18n.language && styles.languageMenuItemTextActive
                ]}>
                  {t(`settings.languages.${lang.code}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <View style={styles.logoContainer}>
            <AnimatedLogo size="large" />
          </View>
        </Link>

        {/* Login Card */}
        <View style={styles.loginCard}>
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>
            {t('login.subtitle')}
          </Text>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputHeader, isRTL && styles.inputHeaderRTL]}>
              <Text style={IS_TV_BUILD ? styles.inputLabelTV : styles.inputLabel}>
                {t('login.email')}
              </Text>
            </View>
            <GlassInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputHeader, isRTL && styles.inputHeaderRTL]}>
              <Text style={IS_TV_BUILD ? styles.inputLabelTV : styles.inputLabel}>
                {t('login.password')}
              </Text>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Text style={styles.forgotPasswordLink}>
                  {t('login.forgotPassword')}
                </Text>
              </Link>
            </View>
            <GlassInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.passwordPlaceholder')}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  ) : (
                    <Eye size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  )}
                </Pressable>
              }
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
          </View>

          {/* Login Button */}
          <Pressable
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>{t('login.submit')}</Text>
            )}
          </Pressable>

          {/* Divider - hide on TV since Google OAuth doesn't work */}
          {!IS_TV_BUILD && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Google Sign In Button - hide on TV since OAuth redirects don't work */}
          {!IS_TV_BUILD && (
            <Pressable
              style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg width={20} height={20} viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <Text style={styles.googleButtonText}>
                {t('login.continueWithGoogle')}
              </Text>
            </Pressable>
          )}

          {/* Sign Up Link */}
          <View
            style={[
              styles.signUpContainer,
              IS_TV_BUILD && styles.signUpContainerTV,
              isRTL && styles.signUpContainerRTL
            ]}
          >
            <Text
              style={IS_TV_BUILD ? styles.signUpTextTV : styles.signUpText}
            >
              {t('login.noAccount')}
            </Text>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Text style={IS_TV_BUILD ? styles.signUpLinkTV : styles.signUpLink}>
                {t('login.signUp')}
              </Text>
            </Link>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {t('login.termsNotice')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh',
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
  // Background gradient effects
  bgGradient1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    top: -200,
    right: -200,
    // Use filter instead of blur for React Native Web compatibility
    filter: 'blur(120px)',
  },
  bgGradient2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(192, 132, 252, 0.06)',
    bottom: -100,
    left: -100,
    filter: 'blur(100px)',
  },
  bgGradient3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(147, 51, 234, 0.04)',
    top: '50%',
    left: '50%',
    // Use marginLeft/marginTop for translate
    marginLeft: -150,
    marginTop: -150,
    filter: 'blur(80px)',
  },
  // Language Selector
  languageSelector: {
    position: 'absolute',
    top: spacing.lg,
    zIndex: 100,
  },
  languageSelectorLTR: {
    right: spacing.lg,
  },
  languageSelectorRTL: {
    left: spacing.lg,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  languageMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    minWidth: 160,
    // Use filter instead of backdrop-blur
    filter: 'blur(0)',
    backdropFilter: 'blur(12px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  languageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  languageMenuItemActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
  },
  languageMenuItemFlag: {
    fontSize: 18,
  },
  languageMenuItemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  languageMenuItemTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  // Main Content
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  // Login Card
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.xl * 1.5,
    backdropFilter: 'blur(12px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  // Error Message
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  // Input Wrappers
  inputWrapper: {
    marginBottom: spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inputHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputLabelTV: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  forgotPasswordLink: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
  },
  // Login Button
  loginButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: spacing.md,
    borderRadius: 8,
    minHeight: 52,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  // Sign Up Link
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  signUpContainerTV: {
    gap: spacing.sm * 1.5,
    marginTop: spacing.xl * 1.5,
    paddingTop: spacing.lg,
  },
  signUpContainerRTL: {
    flexDirection: 'row-reverse',
  },
  signUpText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  signUpTextTV: {
    fontSize: 20,
    color: colors.textMuted,
    lineHeight: 28,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.primary.DEFAULT,
  },
  signUpLinkTV: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.primary.DEFAULT,
  },
  // Footer
  footer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 320,
    lineHeight: 18,
  },
});
