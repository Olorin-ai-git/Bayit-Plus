import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassInput, AnimatedLogo } from '@bayit/shared';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading, error } = useAuthStore();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.email || !formData.password) {
      setFormError(t('login.errors.fillAllFields'));
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setFormError(err.message || t('login.errors.loginFailed'));
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      <View style={styles.content}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <View style={styles.logoContainer}>
            <AnimatedLogo size="medium" />
          </View>
        </Link>

        {/* Form Card */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.title}>{t('login.title')}</Text>

          {/* Email */}
          <GlassInput
            label={t('login.email')}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail size={20} color={colors.textMuted} />}
          />

          {/* Password */}
          <GlassInput
            label={t('login.password')}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            onRightIconPress={() => setShowPassword(!showPassword)}
            rightIcon={
              showPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )
            }
          />

          {/* Forgot Password */}
          <View style={[styles.forgotPassword, isRTL && styles.forgotPasswordRTL]}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
            </Link>
          </View>

          {/* Error Message */}
          {(formError || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <GlassButton
            title={isLoading ? t('login.loggingIn') : t('login.submit')}
            variant="primary"
            onPress={handleSubmit}
            disabled={isLoading}
            fullWidth
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login */}
          <GlassButton
            title={t('login.continueWithGoogle')}
            variant="secondary"
            onPress={() => loginWithGoogle()}
            disabled={isLoading}
            fullWidth
            icon={<GoogleIcon />}
          />

          {/* Register Link */}
          <View style={[styles.registerLink, isRTL && styles.registerLinkRTL]}>
            <Text style={styles.registerText}>{t('login.noAccount')} </Text>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Text style={styles.registerLinkText}>{t('login.signUp')}</Text>
            </Link>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20 }}>
      <Text style={{ fontSize: 16 }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 320,
    height: 320,
    top: -160,
    right: -160,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 256,
    height: 256,
    bottom: 80,
    left: -128,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  forgotPasswordRTL: {
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
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
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.textMuted,
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerLinkRTL: {
    flexDirection: 'row-reverse',
  },
  registerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  registerLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
