import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
    console.log('[GoogleCallback] Page loaded, processing callback...');
    console.log('[GoogleCallback] Search params:', window.location.search);

    // Skip if already processed (StrictMode runs effects twice in dev)
    if (hasProcessedRef.current) {
      console.log('[GoogleCallback] Already processed, skipping...');
      return;
    }

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    console.log('[GoogleCallback] Code:', code ? code.substring(0, 20) + '...' : 'NONE');
    console.log('[GoogleCallback] Error:', errorParam);

    if (errorParam) {
      console.error('[GoogleCallback] User cancelled or error:', errorParam);
      setError(t('googleLogin.cancelledError'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      console.error('[GoogleCallback] No authorization code received');
      setError(t('googleLogin.missingCode'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Mark as processed before making the API call
    hasProcessedRef.current = true;
    console.log('[GoogleCallback] Calling handleGoogleCallback...');

    handleGoogleCallback(code)
      .then(() => {
        console.log('[GoogleCallback] Success - waiting for persist before navigating');
        // Wait a bit for zustand persist middleware to write to localStorage
        // This prevents race condition where HomePage API calls happen before token is saved
        setTimeout(() => {
          console.log('[GoogleCallback] Navigating to home');
          navigate('/', { replace: true });
        }, 100);
      })
      .catch((err: any) => {
        console.error('[GoogleCallback] Error:', err);
        const errorMessage = err.detail || err.message || t('googleLogin.loginError');
        console.error('[GoogleCallback] Error message:', errorMessage);
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      });
  }, [searchParams, handleGoogleCallback, navigate, t]);

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      <GlassCard style={styles.card}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>{t('googleLogin.redirecting')}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.loadingText}>{t('googleLogin.connecting')}</Text>
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
  card: {
    padding: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    color: colors.text,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  redirectText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
