import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, ChevronDown, Globe } from 'lucide-react';
import { useAuthStore } from '@bayit/shared-stores';
import { colors } from '@bayit/shared/theme';
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
    <View className="flex-1 min-h-screen bg-black relative overflow-hidden">
      {/* Background gradient effects */}
      <View className="absolute w-[600px] h-[600px] rounded-full bg-purple-600 opacity-8 -top-[200px] -right-[200px] blur-[120px]" />
      <View className="absolute w-[400px] h-[400px] rounded-full bg-purple-400 opacity-6 -bottom-[100px] -left-[100px] blur-[100px]" />
      <View className="absolute w-[300px] h-[300px] rounded-full bg-purple-600 opacity-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[80px]" />

      {/* Language Selector - Top Right */}
      <View className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-6 z-[100]`}>
        <Pressable
          className="flex flex-row items-center gap-2 bg-white/5 py-2 px-4 rounded-lg border border-white/10"
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
        >
          <Globe size={18} color={colors.textSecondary} />
          <Text className="text-gray-400 text-sm">{currentLanguage.flag} {currentLanguageLabel}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>

        {showLanguageMenu && (
          <View className="absolute top-full right-0 mt-2 bg-gray-900/95 rounded-lg border border-white/10 overflow-hidden min-w-[160px] backdrop-blur-xl shadow-2xl">
            {LANGUAGE_CODES.map((lang) => (
              <Pressable
                key={lang.code}
                className={`flex flex-row items-center gap-2 py-2 px-4 ${lang.code === i18n.language ? 'bg-purple-600/30' : ''}`}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text className="text-lg">{lang.flag}</Text>
                <Text className={`text-sm ${lang.code === i18n.language ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
                  {t(`settings.languages.${lang.code}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center p-6">
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <View className="items-center mb-8">
            <AnimatedLogo size="large" />
          </View>
        </Link>

        {/* Login Card */}
        <View className="w-full max-w-[420px] bg-white/[0.03] rounded-2xl border border-white/8 p-8 backdrop-blur-xl shadow-2xl">
          <Text className="text-3xl font-bold text-white text-center mb-2">{t('login.title')}</Text>
          <Text className="text-[15px] text-gray-400 text-center mb-8">
            {t('login.subtitle')}
          </Text>

          {/* Error Message */}
          {error && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-lg p-4 mb-6">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View className={IS_TV_BUILD ? "mb-6" : "mb-6"}>
            <GlassInput
              label={t('login.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
              leftIcon={<Mail size={20} color={colors.textMuted} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          <View className={IS_TV_BUILD ? "mb-6" : "mb-6"}>
            <View className={`flex-row justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Text className={IS_TV_BUILD ? "text-xl font-medium text-gray-300" : "text-sm font-medium text-gray-300"}>
                {t('login.password')}
              </Text>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Text className="text-[13px] font-medium" style={{ color: colors.primary }}>
                  {t('login.forgotPassword')}
                </Text>
              </Link>
            </View>
            <GlassInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.passwordPlaceholder')}
              leftIcon={<Lock size={20} color={colors.textMuted} />}
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
            className={`bg-purple-600 py-4 rounded-lg items-center justify-center mt-3 min-h-[52px] ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : isLoading ? 0.7 : 1,
              // @ts-ignore
              transform: pressed ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.2s ease',
            })}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text className="text-black text-base font-semibold">{t('login.submit')}</Text>
            )}
          </Pressable>

          {/* Divider - hide on TV since Google OAuth doesn't work */}
          {!IS_TV_BUILD && (
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-white/10" />
              <Text className="text-gray-400 px-4 text-sm">{t('login.or')}</Text>
              <View className="flex-1 h-px bg-white/10" />
            </View>
          )}

          {/* Google Sign In Button - hide on TV since OAuth redirects don't work */}
          {!IS_TV_BUILD && (
            <Pressable
              className={`flex-row items-center justify-center gap-3 bg-white/5 border border-white/15 py-4 rounded-lg min-h-[52px] ${isLoading ? 'opacity-70' : ''}`}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                // @ts-ignore
                transform: pressed ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease',
              })}
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
              <Text className="text-white text-base font-medium">
                {t('login.continueWithGoogle')}
              </Text>
            </Pressable>
          )}

          {/* Sign Up Link */}
          <View
            className={`flex-row justify-center items-center ${IS_TV_BUILD ? 'gap-3 mt-10 pt-6' : 'gap-2 mt-6 pt-6'} border-t border-white/8 flex-nowrap ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Text
              className={IS_TV_BUILD ? "text-xl text-gray-300 leading-7" : "text-sm text-gray-300 leading-5"}
            >
              {t('login.noAccount')}
            </Text>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Text
                className={IS_TV_BUILD ? "text-xl font-semibold leading-7" : "text-sm font-semibold leading-5"}
                style={{ color: colors.primary }}
              >
                {t('login.signUp')}
              </Text>
            </Link>
          </View>
        </View>

        {/* Footer */}
        <Text className="text-xs text-gray-400 text-center mt-6 max-w-[320px] leading-[18px]">
          {t('login.termsNotice')}
        </Text>
      </View>
    </View>
  );
}
