/**
 * PasskeyAuthModal Component
 *
 * Modal for authenticating with a passkey to unlock protected content.
 * Supports both direct authentication and QR code flow for cross-device auth.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useDirection } from '../../hooks/useDirection';
import { rtlSpacing } from '../../utils/rtlHelpers';
import {
  passkeyService,
  checkPasskeySupport,
} from '../../services/api/passkeyServices';

interface PasskeyAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showQROption?: boolean;
}

type AuthState = 'idle' | 'authenticating' | 'success' | 'error' | 'qr-waiting';

/**
 * PasskeyAuthModal - Authenticate with passkey to unlock content
 */
export const PasskeyAuthModal: React.FC<PasskeyAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  showQROption = false,
}) => {
  const { t } = useTranslation();
  const { setPasskeySession, hasPasskeyAccess } = useAuthStore();
  const { isRTL, flexDirection, textAlign } = useDirection();

  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check WebAuthn support on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsSupported(checkPasskeySupport());
    } else {
      setIsSupported(Platform.OS === 'ios');
    }
  }, []);

  // Check if already authenticated
  useEffect(() => {
    if (visible && hasPasskeyAccess()) {
      onSuccess();
      onClose();
    }
  }, [visible, hasPasskeyAccess, onSuccess, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAuthState('idle');
      setError(null);
      setQrSessionId(null);
    }
  }, [visible]);

  // Authenticate with passkey
  const handleAuthenticate = async () => {
    setAuthState('authenticating');
    setError(null);
    try {
      const result = await passkeyService.authenticateWithPasskey();
      setPasskeySession(result.session_token, result.expires_at);
      setAuthState('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string; name?: string };
      setAuthState('error');
      if (error.name === 'NotAllowedError') {
        setError(t('passkey.auth.cancelled'));
      } else {
        setError(error.detail || error.message || t('passkey.auth.error'));
      }
    }
  };

  // Start QR code authentication flow
  const handleStartQR = async () => {
    setAuthState('qr-waiting');
    setError(null);
    try {
      const result = await passkeyService.generateQRAuthentication();
      if (result.qr_session_id) {
        setQrSessionId(result.qr_session_id);
        startPollingQRStatus(result.qr_session_id);
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setAuthState('error');
      setError(error.detail || error.message || t('passkey.qr.error'));
    }
  };

  // Poll for QR authentication completion
  const startPollingQRStatus = (sessionId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await passkeyService.checkQRStatus(sessionId);
        if (status.status === 'authenticated' && status.session_token) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setPasskeySession(status.session_token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
          setAuthState('success');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
        } else if (status.status === 'expired') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setAuthState('error');
          setError(t('passkey.qr.expired'));
        }
      } catch (err) {
        // Continue polling on error
      }
    }, 2000);
  };

  const renderContent = () => {
    switch (authState) {
      case 'authenticating':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>{t('passkey.auth.authenticating')}</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stateContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.stateText}>{t('passkey.auth.success')}</Text>
          </View>
        );

      case 'qr-waiting':
        return (
          <View style={styles.stateContainer}>
            {qrSessionId ? (
              <>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrText}>QR</Text>
                </View>
                <Text style={styles.stateText}>{t('passkey.qr.scanWithPhone')}</Text>
                <Text style={styles.helperText}>{t('passkey.qr.instruction')}</Text>
              </>
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>
        );

      case 'error':
        return (
          <View style={styles.stateContainer}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <GlassButton
              onPress={handleAuthenticate}
              style={styles.retryButton}
            >
              {t('common.tryAgain')}
            </GlassButton>
          </View>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.lockIcon}>🔐</Text>
            </View>
            <Text style={styles.title}>{t('passkey.auth.title')}</Text>
            <Text style={styles.description}>{t('passkey.auth.description')}</Text>

            {!isSupported ? (
              <View style={styles.unsupportedContainer}>
                <Text style={styles.unsupportedText}>{t('passkey.unsupported')}</Text>
                {showQROption && (
                  <GlassButton onPress={handleStartQR} style={styles.qrButton}>
                    {t('passkey.qr.useQR')}
                  </GlassButton>
                )}
              </View>
            ) : (
              <>
                <GlassButton
                  onPress={handleAuthenticate}
                  style={styles.authButton}
                  variant="primary"
                >
                  {t('passkey.auth.unlock')}
                </GlassButton>

                {showQROption && (
                  <GlassButton
                    onPress={handleStartQR}
                    variant="secondary"
                    style={styles.qrButton}
                  >
                    {t('passkey.qr.useQR')}
                  </GlassButton>
                )}
              </>
            )}
          </View>
        );
    }
  };

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={authState === 'idle' ? undefined : undefined}
    >
      {renderContent()}
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  lockIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  authButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  qrButton: {
    width: '100%',
  },
  stateContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  stateText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: colors.success,
  },
  errorIcon: {
    fontSize: 48,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '20',
    color: colors.error,
    textAlign: 'center',
    lineHeight: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    minWidth: 150,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  qrText: {
    fontSize: 24,
    color: colors.black,
    fontWeight: '600',
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  unsupportedContainer: {
    alignItems: 'center',
  },
  unsupportedText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default PasskeyAuthModal;
