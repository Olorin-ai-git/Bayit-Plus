import React, { useState } from 'react';
import {
  View,
  Text,
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
import { GlassView, GlassButton } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '../theme';
import { isTV, isWeb } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

export const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
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
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Decorations */}
      <View className="absolute w-80 h-80 rounded-full bg-purple-700/30 -top-40 -right-40" pointerEvents="none" />
      <View className="absolute w-64 h-64 rounded-full bg-purple-600/15 bottom-20 -left-32" pointerEvents="none" />

      <ScrollView
        contentContainerClassName="flex-grow justify-center items-center py-12 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View className="items-center mb-8">
          <Image
            source={require('../assets/images/logos/logo.png')}
            className="w-20 h-20"
            resizeMode="contain"
          />
          <Text className="text-4xl font-bold text-purple-500 mt-2">{t('common.appName')}</Text>
        </View>

        {/* Form Card */}
        <GlassView className="w-full max-w-[400px] p-8">
          <Text className="text-2xl font-bold text-white text-center mb-6">{t('register.title')}</Text>

          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-white/60 mb-1" style={{ textAlign }}>{t('register.fullName')}</Text>
            <View
              className={`items-center bg-white/10 rounded-2xl border-2 ${focusedField === 'name' ? 'border-purple-500' : 'border-white/10'} px-4`}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              <Text className="text-lg" style={isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}>👤</Text>
              <TextInput
                className="flex-1 text-base text-white py-4"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
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
          <View className="mb-4">
            <Text className="text-sm font-medium text-white/60 mb-1" style={{ textAlign }}>{t('register.email')}</Text>
            <View
              className={`items-center bg-white/10 rounded-2xl border-2 ${focusedField === 'email' ? 'border-purple-500' : 'border-white/10'} px-4`}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              <Text className="text-lg" style={isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}>✉️</Text>
              <TextInput
                className="flex-1 text-base text-white py-4 text-left"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder={t('placeholder.email', 'your@email.com')}
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
          <View className="mb-4">
            <Text className="text-sm font-medium text-white/60 mb-1" style={{ textAlign }}>{t('register.password')}</Text>
            <View
              className={`items-center bg-white/10 rounded-2xl border-2 ${focusedField === 'password' ? 'border-purple-500' : 'border-white/10'} px-4`}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-1"
              >
                <Text className="text-lg">{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
              <TextInput
                className="flex-1 text-base text-white py-4 text-left"
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
          <View className="mb-4">
            <Text className="text-sm font-medium text-white/60 mb-1" style={{ textAlign }}>{t('register.confirmPassword')}</Text>
            <View
              className={`items-center bg-white/10 rounded-2xl border-2 ${focusedField === 'confirmPassword' ? 'border-purple-500' : 'border-white/10'} px-4`}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              <Text className="text-lg" style={isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}>🔒</Text>
              <TextInput
                className="flex-1 text-base text-white py-4 text-left"
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
            <View className="bg-red-500/20 rounded-xl p-3 mb-4">
              <Text className="text-red-500 text-sm text-center">{formError || error}</Text>
            </View>
          )}

          {/* Terms */}
          <Text className="text-xs text-white/40 text-center mb-4">
            {t('register.termsText')}
          </Text>

          {/* Submit Button */}
          <GlassButton
            title={isLoading ? t('register.registering') : t('register.submit')}
            onPress={handleSubmit}
            variant="primary"
            disabled={isLoading}
            className="mt-2"
          />

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-white/10" />
            <Text className="text-white/40 px-4 text-sm">{t('login.or')}</Text>
            <View className="flex-1 h-px bg-white/10" />
          </View>

          {/* Google Login */}
          {!isTV && (
            <GlassButton
              title={t('register.googleSignup')}
              onPress={handleGoogleLogin}
              variant="secondary"
              disabled={isLoading}
              className="mb-4"
            />
          )}

          {/* Login Link */}
          <View className="justify-center mt-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <Text className="text-white/40 text-sm">{t('register.haveAccount')} </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text className="text-purple-500 text-sm font-medium">{t('register.loginLink')}</Text>
            </TouchableOpacity>
          </View>
        </GlassView>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
