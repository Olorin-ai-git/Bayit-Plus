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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
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
          <View className="items-center p-8">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-lg text-white mt-4 text-center">{t('passkey.auth.authenticating')}</Text>
          </View>
        );

      case 'success':
        return (
          <View className="items-center p-8">
            <Text className="text-5xl text-green-500">✓</Text>
            <Text className="text-lg text-white mt-4 text-center">{t('passkey.auth.success')}</Text>
          </View>
        );

      case 'qr-waiting':
        return (
          <View className="items-center p-8">
            {qrSessionId ? (
              <>
                <View className="w-[200px] h-[200px] bg-white rounded-xl items-center justify-center mb-6">
                  <Text className="text-2xl text-black font-semibold">QR</Text>
                </View>
                <Text className="text-lg text-white text-center">{t('passkey.qr.scanWithPhone')}</Text>
                <Text className="text-sm text-white/60 text-center mt-2">{t('passkey.qr.instruction')}</Text>
              </>
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>
        );

      case 'error':
        return (
          <View className="items-center p-8">
            <Text className="text-5xl w-16 h-16 rounded-full bg-red-500/20 text-red-500 text-center leading-[64px] mb-4">!</Text>
            <Text className="text-base text-red-500 text-center mb-6">{error}</Text>
            <GlassButton
              onPress={handleAuthenticate}
              className="min-w-[150px]"
            >
              {t('common.tryAgain')}
            </GlassButton>
          </View>
        );

      default:
        return (
          <View className="items-center p-6">
            <View className="w-20 h-20 rounded-full bg-purple-600/20 items-center justify-center mb-6">
              <Text className="text-[40px]">🔐</Text>
            </View>
            <Text className="text-xl font-semibold text-white mb-2 text-center">{t('passkey.auth.title')}</Text>
            <Text className="text-base text-white/60 text-center mb-8 leading-[22px]">{t('passkey.auth.description')}</Text>

            {!isSupported ? (
              <View className="items-center">
                <Text className="text-base text-white/60 text-center mb-6">{t('passkey.unsupported')}</Text>
                {showQROption && (
                  <GlassButton onPress={handleStartQR} className="w-full">
                    {t('passkey.qr.useQR')}
                  </GlassButton>
                )}
              </View>
            ) : (
              <>
                <GlassButton
                  onPress={handleAuthenticate}
                  className="w-full mb-4"
                  variant="primary"
                >
                  {t('passkey.auth.unlock')}
                </GlassButton>

                {showQROption && (
                  <GlassButton
                    onPress={handleStartQR}
                    variant="secondary"
                    className="w-full"
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

export default PasskeyAuthModal;
