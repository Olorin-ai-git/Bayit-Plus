import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, ChevronDown, Globe } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { AnimatedLogo } from '@bayit/shared';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('login.errors.emailRequired', 'Email is required'));
      return;
    }

    if (!password) {
      setError(t('login.errors.passwordRequired', 'Password is required'));
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || t('login.errors.loginFailed', 'Login failed. Please try again.'));
    }
  };

  return (
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
          <Text style={styles.languageButtonText}>{currentLanguage.flag} {currentLanguage.label}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>

        {showLanguageMenu && (
          <View style={styles.languageMenu}>
            {LANGUAGES.map((lang) => (
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
                  {lang.label}
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

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{t('login.title', 'Welcome Back')}</Text>
          <Text style={styles.subtitle}>
            {t('login.subtitle', 'Sign in to continue to Bayit+')}
          </Text>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('login.email', 'Email')}</Text>
            <View style={styles.inputWrapper}>
              <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                <Mail size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder', 'Enter your email')}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={[styles.labelRow, isRTL && styles.labelRowRTL]}>
              <Text style={styles.label}>{t('login.password', 'Password')}</Text>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Text style={styles.forgotLink}>{t('login.forgotPassword', 'Forgot password?')}</Text>
              </Link>
            </View>
            <View style={styles.inputWrapper}>
              <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                <Lock size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, styles.inputWithRightIcon, isRTL && styles.inputRTL]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable
                style={[styles.passwordToggle, isRTL && styles.passwordToggleRTL]}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>{t('login.submit', 'Sign In')}</Text>
            )}
          </Pressable>

          {/* Sign Up Link */}
          <View style={[styles.signUpContainer, isRTL && styles.signUpContainerRTL]}>
            <Text style={styles.signUpText}>
              {t('login.noAccount', "Don't have an account?")}
            </Text>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Text style={styles.signUpLink}>{t('login.signUp', 'Sign Up')}</Text>
            </Link>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {t('login.termsNotice', 'By signing in, you agree to our Terms of Service and Privacy Policy')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelRTL: {
    textAlign: 'right',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  labelRowRTL: {
    flexDirection: 'row-reverse',
  },
  forgotLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: '50%',
    // @ts-ignore - web only
    transform: 'translateY(-50%)',
    zIndex: 1,
  },
  inputIconRTL: {
    left: 'auto',
    right: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingLeft: 48,
    paddingRight: spacing.md,
    fontSize: 16,
    color: colors.text,
    // @ts-ignore - web only
    outlineStyle: 'none',
  },
  inputRTL: {
    paddingLeft: spacing.md,
    paddingRight: 48,
    textAlign: 'right',
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    // @ts-ignore - web only
    transform: 'translateY(-50%)',
    padding: spacing.xs,
  },
  passwordToggleRTL: {
    right: 'auto',
    left: spacing.md,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 52,
    // @ts-ignore - web only
    transition: 'all 0.2s ease',
  },
  loginButtonPressed: {
    opacity: 0.9,
    // @ts-ignore - web only
    transform: 'scale(0.98)',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  signUpContainerRTL: {
    flexDirection: 'row-reverse',
  },
  signUpText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 320,
    lineHeight: 18,
  },
});
