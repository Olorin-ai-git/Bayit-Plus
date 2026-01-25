import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';
import logger from '@/utils/logger';

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
      logger.debug('Skipping - already processed', 'GoogleCallbackPage');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    logger.debug('Processing callback', 'GoogleCallbackPage', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!errorParam,
      codePreview: code?.substring(0, 20) + '...',
    });

    if (errorParam) {
      logger.debug('Error from Google', 'GoogleCallbackPage', errorParam);
      setError(t('googleLogin.cancelledError'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      logger.debug('Missing code parameter', 'GoogleCallbackPage');
      setError(t('googleLogin.missingCode'));
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Mark as processed before making the API call
    hasProcessedRef.current = true;
    logger.debug('Calling handleGoogleCallback', 'GoogleCallbackPage');

    handleGoogleCallback(code, state || undefined)
      .then((response) => {
        logger.debug('Success! Navigating to home', 'GoogleCallbackPage', response);
        // Wait to ensure localStorage write completes
        // This prevents race condition where HomePage API calls happen before token is saved
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      })
      .catch((err: any) => {
        logger.error('Google callback error', 'GoogleCallbackPage', err);
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
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blurCircleTop: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    top: -200,
    right: -200,
    filter: 'blur(120px)',
  },
  blurCircleBottom: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(192, 132, 252, 0.06)',
    bottom: -100,
    left: -100,
    filter: 'blur(100px)',
  },
  card: {
    padding: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    fontSize: 18,
    color: colors.error.DEFAULT,
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
