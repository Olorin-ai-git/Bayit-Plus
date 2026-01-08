import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, User, ChevronDown, Globe, Check } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { AnimatedLogo } from '@bayit/shared';
import { useDirection } from '@/hooks/useDirection';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const LANGUAGE_CODES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'es', flag: '🇪🇸' },
];

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const currentLanguage = LANGUAGE_CODES.find(lang => lang.code === i18n.language) || LANGUAGE_CODES[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError(t('register.errors.nameRequired'));
      return;
    }

    if (!email.trim()) {
      setError(t('register.errors.emailRequired'));
      return;
    }

    if (!password) {
      setError(t('register.errors.passwordRequired'));
      return;
    }

    if (password.length < 8) {
      setError(t('register.errors.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.errors.passwordMismatch'));
      return;
    }

    if (!acceptTerms) {
      setError(t('register.errors.acceptTerms'));
      return;
    }

    try {
      await register({ name, email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('register.errors.registrationFailed'));
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('register.errors.googleFailed'));
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Background gradient effects */}
        <View style={styles.backgroundGradient1} />
        <View style={styles.backgroundGradient2} />
        <View style={styles.backgroundGradient3} />

        {/* Language Selector - Top Right */}
        <View style={[styles.languageSelector, isRTL && styles.languageSelectorRTL]}>
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
                    styles.languageOption,
                    lang.code === i18n.language && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageOptionText,
                      lang.code === i18n.language && styles.languageOptionTextActive,
                    ]}
                  >
                    {t(`settings.languages.${lang.code}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <View style={styles.logoContainer}>
              <AnimatedLogo size="large" />
            </View>
          </Link>

          {/* Register Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t('register.title')}</Text>
            <Text style={styles.subtitle}>
              {t('register.subtitle')}
            </Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('register.name')}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <User size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('register.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('register.email')}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Mail size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('register.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('register.password')}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Lock size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithRightIcon, isRTL && styles.inputRTL]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('register.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <Pressable
                  style={[styles.passwordToggle, isRTL && styles.passwordToggleRTL]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  ) : (
                    <Eye size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('register.confirmPassword')}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Lock size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithRightIcon, isRTL && styles.inputRTL]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <Pressable
                  style={[styles.passwordToggle, isRTL && styles.passwordToggleRTL]}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  ) : (
                    <Eye size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Terms Checkbox */}
            <Pressable
              style={[styles.termsRow, isRTL && styles.termsRowRTL]}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Check size={14} color="#000" strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>
                {t('register.acceptTerms')}{' '}
                <Link to="/terms" style={{ textDecoration: 'none' }}>
                  <Text style={styles.termsLink}>{t('register.termsOfService')}</Text>
                </Link>
                {' '}{t('register.and')}{' '}
                <Link to="/privacy" style={{ textDecoration: 'none' }}>
                  <Text style={styles.termsLink}>{t('register.privacyPolicy')}</Text>
                </Link>
              </Text>
            </Pressable>

            {/* Register Button */}
            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.registerButtonPressed,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>{t('register.submit')}</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign Up Button */}
            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.googleButtonPressed,
                isLoading && styles.googleButtonDisabled,
              ]}
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
                {t('register.continueWithGoogle')}
              </Text>
            </Pressable>

            {/* Login Link */}
            <View style={[styles.loginContainer, isRTL && styles.loginContainerRTL]}>
              <Text style={styles.loginText}>
                {t('register.haveAccount')}
              </Text>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Text style={styles.loginLink}>{t('register.signIn')}</Text>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGradient1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: colors.primary,
    opacity: 0.08,
    top: -200,
    right: -200,
    // @ts-ignore - web only
    filter: 'blur(120px)',
  },
  backgroundGradient2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8b5cf6',
    opacity: 0.06,
    bottom: -100,
    left: -100,
    // @ts-ignore - web only
    filter: 'blur(100px)',
  },
  backgroundGradient3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.04,
    top: '50%',
    left: '50%',
    // @ts-ignore - web only
    transform: 'translate(-50%, -50%)',
    filter: 'blur(80px)',
  },
  languageSelector: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  languageSelectorRTL: {
    right: 'auto',
    left: spacing.lg,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
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
    marginTop: spacing.xs,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    minWidth: 160,
    // @ts-ignore - web only
    backdropFilter: 'blur(20px)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  languageOptionFlag: {
    fontSize: 18,
  },
  languageOptionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  languageOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.xl,
    // @ts-ignore - web only
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  label: {
    fontSize: IS_TV_BUILD ? 20 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: IS_TV_BUILD ? spacing.sm : spacing.xs,
  },
  labelRTL: {
    textAlign: 'right',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: IS_TV_BUILD ? spacing.lg : spacing.md,
    top: '50%',
    // @ts-ignore - web only
    transform: 'translateY(-50%)',
    zIndex: 1,
  },
  inputIconRTL: {
    left: 'auto',
    right: IS_TV_BUILD ? spacing.lg : spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: IS_TV_BUILD ? 2 : 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingLeft: IS_TV_BUILD ? 56 : 48,
    paddingRight: IS_TV_BUILD ? spacing.lg : spacing.md,
    fontSize: IS_TV_BUILD ? 22 : 16,
    minHeight: IS_TV_BUILD ? 60 : 48,
    color: colors.text,
    // @ts-ignore - web only
    outlineStyle: 'none',
  },
  inputRTL: {
    paddingLeft: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingRight: IS_TV_BUILD ? 56 : 48,
    textAlign: 'right',
  },
  inputWithRightIcon: {
    paddingRight: IS_TV_BUILD ? 64 : 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: IS_TV_BUILD ? spacing.lg : spacing.md,
    top: '50%',
    // @ts-ignore - web only
    transform: 'translateY(-50%)',
    padding: IS_TV_BUILD ? spacing.sm : spacing.xs,
  },
  passwordToggleRTL: {
    right: 'auto',
    left: IS_TV_BUILD ? spacing.lg : spacing.md,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  termsRowRTL: {
    flexDirection: 'row-reverse',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // @ts-ignore - web only
    transition: 'all 0.2s ease',
  },
  registerButtonPressed: {
    opacity: 0.9,
    // @ts-ignore - web only
    transform: 'scale(0.98)',
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
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
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    // @ts-ignore - web only
    transition: 'all 0.2s ease',
  },
  googleButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore - web only
    transform: 'scale(0.98)',
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  loginContainerRTL: {
    flexDirection: 'row-reverse',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
