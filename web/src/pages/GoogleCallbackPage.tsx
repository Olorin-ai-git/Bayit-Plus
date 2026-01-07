import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleGoogleCallback } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('ההתחברות עם Google בוטלה');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('קוד אימות חסר');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    handleGoogleCallback(code)
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((err: any) => {
        setError(err.detail || err.message || 'שגיאה בהתחברות עם Google');
        setTimeout(() => navigate('/login'), 3000);
      });
  }, [searchParams, handleGoogleCallback, navigate]);

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      <GlassCard style={styles.card}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>מעביר לדף ההתחברות...</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.loadingText}>מתחבר עם Google...</Text>
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
