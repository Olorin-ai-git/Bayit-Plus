/**
 * Email Verification Page
 *
 * Handles Beta 500 email verification via token from verification link.
 * Displays success/error states and redirects user appropriately.
 */

import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface VerificationState {
  status: 'verifying' | 'success' | 'error';
  message: string;
  email?: string;
}

export default function EmailVerificationPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerificationState>({
    status: 'verifying',
    message: t('beta.verification.verifying'),
  });

  // Prevent double execution in React StrictMode
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Skip if already processed
    if (hasProcessedRef.current) {
      logger.debug('Skipping - already processed', 'EmailVerificationPage');
      return;
    }

    const token = searchParams.get('token');

    logger.debug('Processing verification', 'EmailVerificationPage', {
      hasToken: !!token,
      tokenPreview: token?.substring(0, 20) + '...',
    });

    if (!token) {
      logger.debug('Missing token parameter', 'EmailVerificationPage');
      setState({
        status: 'error',
        message: t('beta.verification.missingToken'),
      });
      return;
    }

    // Mark as processed before making the API call
    hasProcessedRef.current = true;

    // Verify email with backend
    verifyEmail(token);
  }, [searchParams, t]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/beta/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('beta.verification.failed'));
      }

      logger.debug('Email verified successfully', 'EmailVerificationPage', data);

      setState({
        status: 'success',
        message: data.message || t('beta.verification.success'),
        email: data.email,
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      logger.error('Email verification error', 'EmailVerificationPage', err);

      setState({
        status: 'error',
        message: err.message || t('beta.verification.failed'),
      });
    }
  };

  const handleResendEmail = async () => {
    if (!state.email) {
      navigate('/');
      return;
    }

    try {
      const response = await fetch('/api/v1/beta/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: state.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('beta.verification.resendFailed'));
      }

      logger.debug('Verification email resent', 'EmailVerificationPage');

      setState({
        status: 'success',
        message: t('beta.verification.resendSuccess'),
      });

      // Redirect to home after showing message
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    } catch (err: any) {
      logger.error('Resend verification error', 'EmailVerificationPage', err);

      setState({
        status: 'error',
        message: err.message || t('beta.verification.resendFailed'),
      });
    }
  };

  const renderContent = () => {
    switch (state.status) {
      case 'verifying':
        return (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.text}>{state.message}</Text>
          </>
        );

      case 'success':
        return (
          <>
            <View style={styles.iconSuccess}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <Text style={styles.successText}>{state.message}</Text>
            {state.email && (
              <Text style={styles.emailText}>{state.email}</Text>
            )}
            <Text style={styles.redirectText}>{t('beta.verification.redirecting')}</Text>
          </>
        );

      case 'error':
        return (
          <>
            <View style={styles.iconError}>
              <Text style={styles.iconText}>✕</Text>
            </View>
            <Text style={styles.errorText}>{state.message}</Text>
            {state.email && (
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendEmail}
              >
                <Text style={styles.resendButtonText}>
                  {t('beta.verification.resendEmail')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigate('/')}
            >
              <Text style={styles.backButtonText}>
                {t('beta.verification.backToHome')}
              </Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={styles.blurCircleTop} />
      <View style={styles.blurCircleBottom} />

      <GlassCard style={styles.card}>
        {renderContent()}
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
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    top: -200,
    right: -200,
    filter: 'blur(120px)',
  },
  blurCircleBottom: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(118, 75, 162, 0.06)',
    bottom: -100,
    left: -100,
    filter: 'blur(100px)',
  },
  card: {
    padding: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
    maxWidth: 400,
    width: '100%',
  },
  spinner: {
    marginBottom: spacing.md,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  iconSuccess: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconError: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  successText: {
    fontSize: 18,
    color: colors.success.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: colors.error.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  emailText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  redirectText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.4)',
  },
  resendButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  backButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
