import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassButton } from '../components';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '../theme';
import { isTV, isWeb } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';

export const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError('');
    clearError();

    if (!formData.name || !formData.email || !formData.password) {
      setFormError(t('register.errors.fillAllFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError(t('register.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setFormError(t('register.errors.passwordTooShort'));
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigation.navigate('Home');
    } catch (err: any) {
      setFormError(err.message || t('register.errors.registrationFailed'));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigation.navigate('Home');
    } catch (err: any) {
      setFormError(err.message || t('register.errors.googleFailed'));
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Decorations */}
      <View style={styles.blurCirclePrimary} pointerEvents="none" />
      <View style={styles.blurCirclePurple} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>{t('common.appName')}</Text>
        </View>

        {/* Form Card */}
        <GlassView style={styles.formCard}>
          <Text style={styles.title}>{t('register.title')}</Text>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { textAlign }]}>{t('register.fullName')}</Text>
            <View
              style={[
                styles.inputContainer,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                focusedField === 'name' && styles.inputContainerFocused,
              ]}
            >
              <Text style={[styles.inputIcon, isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }]}>👤</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t('register.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { textAlign }]}>{t('register.email')}</Text>
            <View
              style={[
                styles.inputContainer,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                focusedField === 'email' && styles.inputContainerFocused,
              ]}
            >
              <Text style={[styles.inputIcon, isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }]}>✉️</Text>
              <TextInput
                style={[styles.input, styles.inputLtr]}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { textAlign }]}>{t('register.password')}</Text>
            <View
              style={[
                styles.inputContainer,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                focusedField === 'password' && styles.inputContainerFocused,
              ]}
            >
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Text style={styles.inputIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.inputLtr]}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder={t('register.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { textAlign }]}>{t('register.confirmPassword')}</Text>
            <View
              style={[
                styles.inputContainer,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                focusedField === 'confirmPassword' && styles.inputContainerFocused,
              ]}
            >
              <Text style={[styles.inputIcon, isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }]}>🔒</Text>
              <TextInput
                style={[styles.input, styles.inputLtr]}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder={t('register.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Error Message */}
          {(formError || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          {/* Terms */}
          <Text style={styles.termsText}>
            {t('register.termsText')}
          </Text>

          {/* Submit Button */}
          <GlassButton
            title={isLoading ? t('register.registering') : t('register.submit')}
            onPress={handleSubmit}
            variant="primary"
            disabled={isLoading}
            style={styles.submitButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login */}
          {!isTV && (
            <GlassButton
              title={t('register.googleSignup')}
              onPress={handleGoogleLogin}
              variant="secondary"
              disabled={isLoading}
              style={styles.googleButton}
            />
          )}

          {/* Login Link */}
          <View style={[styles.loginLinkContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.loginLinkText}>{t('register.haveAccount')} </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>{t('register.loginLink')}</Text>
            </TouchableOpacity>
          </View>
        </GlassView>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  blurCirclePrimary: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    top: -160,
    right: -160,
  },
  blurCirclePurple: {
    position: 'absolute',
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    bottom: 80,
    left: -128,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  inputIcon: {
    fontSize: 18,
  },
  passwordToggle: {
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputLtr: {
    textAlign: 'left',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
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
    marginBottom: spacing.md,
  },
  loginLinkContainer: {
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loginLinkText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RegisterScreen;
