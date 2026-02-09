import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, ChevronDown, Globe } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';
import { AnimatedLogo } from '@bayit/shared';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { languages } from '@bayit/i18n';
import { authService } from '@/services/api';
import { logger } from '@/utils/logger';

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('forgotPasswordPage.errors.emailRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (err: any) {
      logger.error('Password reset request failed', 'ForgotPasswordPage', err);
      setError(err?.detail || err?.message || t('forgotPasswordPage.errors.requestFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />
      <View style={styles.bgGradient3} />

      {/* Language Selector */}
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
            {languages.map((lang) => (
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

      <View style={styles.mainContent}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <View style={styles.logoContainer}>
            <AnimatedLogo size="large" />
          </View>
        </Link>

        <View style={styles.card}>
          {!isSubmitted ? (
            <>
              <Text style={styles.title}>{t('forgotPasswordPage.title')}</Text>
              <Text style={styles.subtitle}>{t('forgotPasswordPage.subtitle')}</Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <View style={[styles.inputHeader, isRTL && styles.inputHeaderRTL]}>
                  <Text style={styles.inputLabel}>{t('forgotPasswordPage.email')}</Text>
                </View>
                <GlassInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('forgotPasswordPage.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <GlassLoadingSpinner size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('forgotPasswordPage.submit')}</Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Mail size={32} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.successTitle}>{t('forgotPasswordPage.successTitle')}</Text>
              <Text style={styles.successMessage}>
                {t('forgotPasswordPage.successMessage', { email })}
              </Text>
              <Text style={styles.successHint}>{t('forgotPasswordPage.successHint')}</Text>
            </View>
          )}

          {/* Back to Login */}
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <View style={[styles.backToLogin, isRTL && styles.backToLoginRTL]}>
              <ArrowLeft size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.backToLoginText}>{t('forgotPasswordPage.backToLogin')}</Text>
            </View>
          </Link>
        </View>
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
  bgGradient1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    top: -200,
    right: -200,
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
    marginLeft: -150,
    marginTop: -150,
    filter: 'blur(80px)',
  },
  languageSelector: {
    position: 'absolute',
    top: spacing.lg,
    zIndex: 100,
  },
  languageSelectorLTR: { right: spacing.lg },
  languageSelectorRTL: { left: spacing.lg },
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
  languageButtonText: { color: colors.textSecondary, fontSize: 14 },
  languageMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'auto',
    minWidth: 160,
    maxHeight: 320,
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
  languageMenuItemActive: { backgroundColor: 'rgba(147, 51, 234, 0.3)' },
  languageMenuItemFlag: { fontSize: 18 },
  languageMenuItemText: { fontSize: 14, color: colors.textSecondary },
  languageMenuItemTextActive: { color: colors.primary.DEFAULT, fontWeight: '600' },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xl },
  card: {
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
    fontSize: 28,
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
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  inputWrapper: { marginBottom: spacing.lg },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inputHeaderRTL: { flexDirection: 'row-reverse' },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  submitButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  successContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  successHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  backToLoginRTL: { flexDirection: 'row-reverse' },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
});
