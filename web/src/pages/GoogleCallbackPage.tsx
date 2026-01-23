import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={styles.blurCircleTop} />
      <View style={styles.blurCircleBottom} />

      <GlassCard style={styles.card}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>{t('googleLogin.redirecting')}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.connectingText}>{t('googleLogin.connecting')}</Text>
          </>
        )}
      </GlassCard>
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
  blurCircleTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    top: -160,
    right: -160,
    borderRadius: 160,
    backgroundColor: '#9333ea',
    opacity: 0.5,
    // Note: blur effect requires platform-specific implementation
    // Web: filter: 'blur(100px)', React Native: shadow workaround
  },
  blurCircleBottom: {
    position: 'absolute',
    width: 256,
    height: 256,
    bottom: 80,
    left: -128,
    borderRadius: 128,
    backgroundColor: '#7c3aed',
    opacity: 0.4,
    // Note: blur effect requires platform-specific implementation
  },
  card: {
    padding: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  redirectText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  spinner: {
    marginBottom: spacing.md,
  },
  connectingText: {
    fontSize: 18,
    color: colors.text,
  },
});
