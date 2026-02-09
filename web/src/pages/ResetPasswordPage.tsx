import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link, useSearchParams } from 'react-router-dom';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Check, ChevronDown, Globe } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';
import { AnimatedLogo } from '@bayit/shared';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { languages } from '@bayit/i18n';
import { authService } from '@/services/api';
import { logger } from '@/utils/logger';

const PASSWORD_RULES = [
  { key: 'minLength', regex: /^.{8,}$/ },
  { key: 'uppercase', regex: /[A-Z]/ },
  { key: 'lowercase', regex: /[a-z]/ },
  { key: 'digit', regex: /\d/ },
  { key: 'special', regex: /[!@#$%^&*(),.?":{}|<>]/ },
] as const;

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={[reqStyles.row, { opacity: met ? 1 : 0.5 }]}>
      <View style={[reqStyles.icon, met && reqStyles.iconMet]}>
        <Check size={12} color={met ? '#22c55e' : colors.textMuted} strokeWidth={3} />
      </View>
      <Text style={[reqStyles.label, met && reqStyles.labelMet]}>{label}</Text>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconMet: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  label: { fontSize: 13, color: colors.textMuted },
  labelMet: { color: '#86efac' },
});

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const allRulesMet = PASSWORD_RULES.every(rule => rule.regex.test(newPassword));

  const handleSubmit = async () => {
    setError('');

    if (!newPassword) {
      setError(t('resetPasswordPage.errors.passwordRequired'));
      return;
    }

    if (!confirmPassword) {
      setError(t('resetPasswordPage.errors.confirmRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('resetPasswordPage.errors.passwordMismatch'));
      return;
    }

    if (!allRulesMet) {
      setError(t('resetPasswordPage.errors.passwordRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.confirmPasswordReset(token!, newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      logger.error('Password reset confirm failed', 'ResetPasswordPage', err);
      const detail = err?.detail || err?.message || '';
      if (detail.toLowerCase().includes('token') || detail.toLowerCase().includes('expired')) {
        setError(t('resetPasswordPage.errors.invalidToken'));
      } else {
        setError(detail || t('resetPasswordPage.errors.resetFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    // Missing token state
    if (!token) {
      return (
        <View style={styles.centeredContent}>
          <View style={styles.warningIconContainer}>
            <AlertTriangle size={32} color="#f59e0b" />
          </View>
          <Text style={styles.title}>{t('resetPasswordPage.errors.missingToken')}</Text>
          <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
            <Text style={styles.requestNewLink}>{t('resetPasswordPage.requestNewLink')}</Text>
          </Link>
        </View>
      );
    }

    // Success state
    if (isSuccess) {
      return (
        <View style={styles.centeredContent}>
          <View style={styles.successIconContainer}>
            <ShieldCheck size={32} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>{t('resetPasswordPage.successTitle')}</Text>
          <Text style={styles.successMessage}>{t('resetPasswordPage.successMessage')}</Text>
          <Link to="/login" style={{ textDecoration: 'none', width: '100%' }}>
            <View style={styles.signInButton}>
              <Text style={styles.signInButtonText}>{t('resetPasswordPage.signIn')}</Text>
            </View>
          </Link>
        </View>
      );
    }

    // Password form
    return (
      <>
        <Text style={styles.title}>{t('resetPasswordPage.title')}</Text>
        <Text style={styles.subtitle}>{t('resetPasswordPage.subtitle')}</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <View style={[styles.inputHeader, isRTL && styles.inputHeaderRTL]}>
            <Text style={styles.inputLabel}>{t('resetPasswordPage.newPassword')}</Text>
          </View>
          <GlassInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('resetPasswordPage.newPasswordPlaceholder')}
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </Pressable>
            }
            secureTextEntry={!showPassword}
            autoComplete="new-password"
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={[styles.inputHeader, isRTL && styles.inputHeaderRTL]}>
            <Text style={styles.inputLabel}>{t('resetPasswordPage.confirmPassword')}</Text>
          </View>
          <GlassInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('resetPasswordPage.confirmPasswordPlaceholder')}
            rightIcon={
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </Pressable>
            }
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
          />
        </View>

        {/* Password requirements checklist */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>{t('resetPasswordPage.requirements.title')}</Text>
          {PASSWORD_RULES.map((rule) => (
            <PasswordRequirement
              key={rule.key}
              met={rule.regex.test(newPassword)}
              label={t(`resetPasswordPage.requirements.${rule.key}`)}
            />
          ))}
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (isSubmitting || !allRulesMet) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !allRulesMet}
        >
          {isSubmitting ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{t('resetPasswordPage.submit')}</Text>
          )}
        </Pressable>
      </>
    );
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
          {renderContent()}

          {/* Back to Login (shown on form and missing-token views, not success) */}
          {!isSuccess && (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <View style={[styles.backToLogin, isRTL && styles.backToLoginRTL]}>
                <Text style={styles.backToLoginText}>{t('resetPasswordPage.backToLogin')}</Text>
              </View>
            </Link>
          )}
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
  requirementsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  centeredContent: { alignItems: 'center', paddingVertical: spacing.lg },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
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
    marginBottom: spacing.xl,
  },
  requestNewLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginTop: spacing.md,
  },
  signInButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  signInButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
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
