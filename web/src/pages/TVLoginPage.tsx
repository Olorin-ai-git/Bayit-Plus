import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { CheckCircle, XCircle, Smartphone, Tv, Lock } from 'lucide-react';
import { GlassView, GlassButton, GlassInput } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { devicePairingService } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { AnimatedLogo } from '@bayit/shared';

type PageState = 'verifying' | 'login' | 'authenticating' | 'success' | 'error';

export default function TVLoginPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('verifying');
  const [email, setEmail] = useState(import.meta.env.VITE_DEV_DEFAULT_EMAIL || '');
  const [password, setPassword] = useState(import.meta.env.VITE_DEV_DEFAULT_PASSWORD || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, user, token: authToken, login } = useAuthStore();

  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  // Verify session on load
  useEffect(() => {
    if (!sessionId || !token) {
      setPageState('error');
      setError(t('tvLogin.invalidQR'));
      return;
    }

    verifySession();
  }, [sessionId, token]);

  const verifySession = async () => {
    try {
      const response = await devicePairingService.verifySession(sessionId!, token!);

      if (!response.valid) {
        setPageState('error');
        setError(t('tvLogin.sessionInvalid'));
        return;
      }

      // Register companion device
      const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'web';
      const browser = navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/i)?.[0] || 'Unknown';

      await devicePairingService.connectCompanion(sessionId!, deviceType, browser);

      setPageState('login');
    } catch (err: any) {
      setPageState('error');
      setError(err.detail || t('tvLogin.verificationFailed'));
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('tvLogin.fillAllFields'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPageState('authenticating');

    try {
      // Complete authentication via device pairing
      const response = await devicePairingService.completeAuth(sessionId!, email, password);

      // Also login locally on this device
      await login(email, password);

      setPageState('success');
    } catch (err: any) {
      setPageState('login');
      setError(err.detail || t('tvLogin.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExistingAccount = async () => {
    if (!isAuthenticated || !authToken) {
      setError(t('tvLogin.notLoggedIn'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPageState('authenticating');

    try {
      // Need to re-authenticate with credentials to complete pairing
      // For now, show the login form
      setPageState('login');
      setError(t('tvLogin.enterCredentials'));
    } catch (err: any) {
      setPageState('login');
      setError(err.detail || t('tvLogin.authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderVerifying = () => (
    <View className="items-center py-8">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="text-2xl font-bold text-white mt-6 mb-2 text-center">{t('tvLogin.verifying')}</Text>
      <Text className="text-base text-gray-400 text-center leading-6">
        {t('tvLogin.verifyingDescription')}
      </Text>
    </View>
  );

  const renderLogin = () => (
    <View className="items-stretch">
      <View className="flex-row items-center justify-center mb-6">
        <Smartphone size={32} color={colors.primary} />
        <View className="w-10 h-0.5 bg-purple-600 mx-4" />
        <Tv size={32} color={colors.primary} />
      </View>

      <Text className="text-2xl font-bold text-white text-center mb-2">{t('tvLogin.loginTitle')}</Text>
      <Text className="text-base text-gray-400 text-center mb-6">
        {t('tvLogin.loginDescription')}
      </Text>

      {error && (
        <View className="bg-red-500/10 p-4 rounded-lg mb-4">
          <Text className="text-red-500 text-sm text-center">{error}</Text>
        </View>
      )}

      <View className="mb-4">
        <Text className="text-sm text-gray-400 mb-2">{t('login.email')}</Text>
        <GlassInput
          ref={emailRef}
          className="text-base"
          value={email}
          onChangeText={setEmail}
          placeholder={t('placeholder.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={() => passwordRef.current?.focus()}
          returnKeyType="next"
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm text-gray-400 mb-2">{t('login.password')}</Text>
        <GlassInput
          ref={passwordRef}
          className="text-base"
          value={password}
          onChangeText={setPassword}
          placeholder={t('placeholder.password')}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />
      </View>

      <GlassButton
        title={isLoading ? t('tvLogin.authorizing') : t('tvLogin.authorizeTV')}
        onPress={handleLogin}
        variant="primary"
        disabled={isLoading}
        className="mt-4"
      />

      <View className="flex-row items-start gap-2 mt-6 pt-4 border-t border-white/10">
        <Lock size={16} color={colors.textSecondary} />
        <Text className="flex-1 text-xs text-gray-400 leading-[18px]">
          {t('tvLogin.securityNote')}
        </Text>
      </View>
    </View>
  );

  const renderAuthenticating = () => (
    <View className="items-center py-8">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="text-2xl font-bold text-white mt-6 mb-2 text-center">{t('tvLogin.authorizing')}</Text>
      <Text className="text-base text-gray-400 text-center leading-6">
        {t('tvLogin.authorizingDescription')}
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View className="items-center py-8">
      <View className="mb-4">
        <CheckCircle size={64} color="#10b981" />
      </View>
      <Text className="text-2xl font-bold text-white mt-6 mb-2 text-center">{t('tvLogin.success')}</Text>
      <Text className="text-base text-gray-400 text-center leading-6">
        {t('tvLogin.successDescription')}
      </Text>

      <GlassButton
        title={t('tvLogin.goToHome')}
        onPress={() => navigate('/')}
        variant="secondary"
        className="mt-8 px-8"
      />
    </View>
  );

  const renderError = () => (
    <View className="items-center py-8">
      <View className="mb-4">
        <XCircle size={64} color={colors.error} />
      </View>
      <Text className="text-2xl font-bold text-white mt-6 mb-2 text-center">{t('tvLogin.error')}</Text>
      <Text className="text-base text-gray-400 text-center leading-6">{error}</Text>

      <GlassButton
        title={t('tvLogin.tryAgain')}
        onPress={() => navigate('/')}
        variant="secondary"
        className="mt-8 px-8"
      />
    </View>
  );

  return (
    <View className="flex-1 bg-black min-h-screen">
      <View className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-700/30" />

      <View className="flex-1 items-center justify-center px-8 max-w-[480px] mx-auto w-full">
        <View className="mb-8">
          <AnimatedLogo size="medium" />
        </View>

        <GlassView intensity="high" className="w-full p-8 rounded-3xl">
          {pageState === 'verifying' && renderVerifying()}
          {pageState === 'login' && renderLogin()}
          {pageState === 'authenticating' && renderAuthenticating()}
          {pageState === 'success' && renderSuccess()}
          {pageState === 'error' && renderError()}
        </GlassView>

        <Text className="text-xs text-gray-500 text-center mt-8">
          {t('tvLogin.footer')}
        </Text>
      </View>
    </View>
  );
}
