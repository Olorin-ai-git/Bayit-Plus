import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, User, ChevronDown, Globe, Check } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 relative overflow-hidden" style={{ minHeight: '100vh', backgroundColor: colors.background }}>
        {/* Background gradient effects */}
        <View className="absolute w-[600px] h-[600px] rounded-full opacity-[0.08] -top-[200px] -right-[200px]" style={{ backgroundColor: colors.primary, filter: 'blur(120px)' }} />
        <View className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06] -bottom-[100px] -left-[100px]" style={{ backgroundColor: '#8b5cf6', filter: 'blur(100px)' }} />
        <View className="absolute w-[300px] h-[300px] rounded-full opacity-[0.04] top-1/2 left-1/2" style={{ backgroundColor: colors.primary, transform: 'translate(-50%, -50%)', filter: 'blur(80px)' }} />

        {/* Language Selector - Top Right */}
        <View className={`absolute top-6 z-[100] ${isRTL ? 'left-6' : 'right-6'}`}>
          <Pressable
            className="flex-row items-center gap-1 bg-white/5 py-2 px-4 rounded-lg border border-white/10"
            onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          >
            <Globe size={18} color={colors.textSecondary} />
            <Text className="text-sm" style={{ color: colors.textSecondary }}>{currentLanguage.flag} {currentLanguageLabel}</Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </Pressable>

          {showLanguageMenu && (
            <View className="absolute top-full right-0 mt-1 rounded-lg border border-white/10 overflow-hidden min-w-[160px]" style={{ backgroundColor: 'rgba(20, 20, 30, 0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' }}>
              {LANGUAGE_CODES.map((lang) => (
                <Pressable
                  key={lang.code}
                  className={`flex-row items-center gap-2 py-2 px-4 ${lang.code === i18n.language ? 'bg-[#6b21a8]/30' : ''}`}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text className="text-lg">{lang.flag}</Text>
                  <Text className={`text-sm ${lang.code === i18n.language ? 'font-semibold' : ''}`} style={{ color: lang.code === i18n.language ? colors.primary : colors.textSecondary }}>
                    {t(`settings.languages.${lang.code}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View className="flex-1 justify-center items-center p-6 py-12">
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <View className="items-center mb-8">
              <AnimatedLogo size="large" />
            </View>
          </Link>

          {/* Register Card */}
          <View className="w-full max-w-[420px] bg-white/[0.03] rounded-2xl border border-white/[0.08] p-8" style={{ backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
            <Text className="text-[28px] font-bold text-center mb-1" style={{ color: colors.text }}>{t('register.title')}</Text>
            <Text className="text-[15px] text-center mb-8" style={{ color: colors.textSecondary }}>
              {t('register.subtitle')}
            </Text>

            {/* Error Message */}
            {error && (
              <View className="bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-md p-4 mb-6">
                <Text className="text-[#ef4444] text-sm text-center">{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View className={IS_TV_BUILD ? "mb-8" : "mb-4"}>
              <GlassInput
                label={t('register.name')}
                value={name}
                onChangeText={setName}
                placeholder={t('register.namePlaceholder')}
                leftIcon={<User size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            {/* Email Input */}
            <View className={IS_TV_BUILD ? "mb-8" : "mb-4"}>
              <GlassInput
                label={t('register.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('register.emailPlaceholder')}
                leftIcon={<Mail size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View className={IS_TV_BUILD ? "mb-8" : "mb-4"}>
              <GlassInput
                label={t('register.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('register.passwordPlaceholder')}
                leftIcon={<Lock size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />}
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
                autoComplete="new-password"
              />
            </View>

            {/* Confirm Password Input */}
            <View className={IS_TV_BUILD ? "mb-8" : "mb-4"}>
              <GlassInput
                label={t('register.confirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('register.confirmPasswordPlaceholder')}
                leftIcon={<Lock size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />}
                rightIcon={
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                    ) : (
                      <Eye size={IS_TV_BUILD ? 28 : 20} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
            </View>

            {/* Terms Checkbox */}
            <Pressable
              className={`flex-row items-start gap-2 mb-6 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <View className={`w-[22px] h-[22px] rounded border-2 bg-white/5 items-center justify-center mt-0.5 ${acceptTerms ? '' : ''}`} style={{ borderColor: acceptTerms ? colors.primary : 'rgba(255, 255, 255, 0.3)', backgroundColor: acceptTerms ? colors.primary : 'rgba(255, 255, 255, 0.05)' }}>
                {acceptTerms && <Check size={14} color="#000" strokeWidth={3} />}
              </View>
              <Text className="flex-1 text-[13px] leading-5" style={{ color: colors.textSecondary }}>
                {t('register.acceptTerms')}{' '}
                <Link to="/terms" style={{ textDecoration: 'none' }}>
                  <Text className="font-medium" style={{ color: colors.primary }}>{t('register.termsOfService')}</Text>
                </Link>
                {' '}{t('register.and')}{' '}
                <Link to="/privacy" style={{ textDecoration: 'none' }}>
                  <Text className="font-medium" style={{ color: colors.primary }}>{t('register.privacyPolicy')}</Text>
                </Link>
              </Text>
            </Pressable>

            {/* Register Button */}
            <Pressable
              className={`py-4 rounded-lg items-center justify-center min-h-[52px] ${isLoading ? 'opacity-70' : ''}`}
              style={({ pressed }) => [
                { backgroundColor: colors.primary, transition: 'all 0.2s ease' },
                pressed && { opacity: 0.9, transform: 'scale(0.98)' }
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text className="text-base font-semibold" style={{ color: '#000' }}>{t('register.submit')}</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-white/10" />
              <Text className="px-4 text-sm" style={{ color: colors.textMuted }}>{t('login.or')}</Text>
              <View className="flex-1 h-px bg-white/10" />
            </View>

            {/* Google Sign Up Button */}
            <Pressable
              className={`flex-row items-center justify-center gap-2 bg-white/5 border border-white/15 py-4 rounded-lg min-h-[52px] ${isLoading ? 'opacity-70' : ''}`}
              style={({ pressed }) => [
                { transition: 'all 0.2s ease' },
                pressed && { backgroundColor: 'rgba(255, 255, 255, 0.1)', transform: 'scale(0.98)' }
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
              <Text className="text-base font-medium" style={{ color: colors.text }}>
                {t('register.continueWithGoogle')}
              </Text>
            </Pressable>

            {/* Login Link */}
            <View className={`flex-row justify-center items-center gap-1 mt-8 pt-6 border-t border-white/[0.08] ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                {t('register.haveAccount')}
              </Text>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>{t('register.signIn')}</Text>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
