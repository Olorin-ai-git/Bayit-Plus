import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';

export default function GoogleCallbackPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleGoogleCallback } = useAuthStore();
  const [error, setError] = useState('');

  // Prevent double execution in React StrictMode (OAuth codes are single-use)
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Skip if already processed (StrictMode runs effects twice in dev)
    if (hasProcessedRef.current) {
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(t('googleLogin.cancelledError'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError(t('googleLogin.missingCode'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Mark as processed before making the API call
    hasProcessedRef.current = true;

    handleGoogleCallback(code, state || undefined)
      .then(() => {
        // Wait to ensure localStorage write completes
        // This prevents race condition where HomePage API calls happen before token is saved
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      })
      .catch((err: any) => {
        const errorMessage = err.detail || err.message || t('googleLogin.loginError');
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      });
  }, [searchParams, handleGoogleCallback, navigate, t]);

  return (
    <View className="flex-1 min-h-screen justify-center items-center px-4 relative">
      {/* Decorative blur circles */}
      <View className="absolute w-80 h-80 -top-40 -right-40 rounded-full bg-purple-600 opacity-50 blur-[100px]" />
      <View className="absolute w-64 h-64 bottom-20 -left-32 rounded-full bg-violet-600 opacity-40 blur-[100px]" />

      <GlassCard className="p-6 items-center z-10">
        {error ? (
          <>
            <Text className="text-lg text-red-500 mb-4 text-center">{error}</Text>
            <Text className="text-sm text-white/60">{t('googleLogin.redirecting')}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} className="mb-4" />
            <Text className="text-lg text-white">{t('googleLogin.connecting')}</Text>
          </>
        )}
      </GlassCard>
    </View>
  );
}
