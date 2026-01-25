/**
 * PasskeyManager Component
 *
 * Allows users to manage their passkeys in Settings:
 * - Register new passkeys
 * - View registered passkeys
 * - Delete passkeys
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useAuthStore } from '../../stores/authStore';
import { useDirection } from '../../hooks/useDirection';
import { rtlSpacing } from '../../utils/rtlHelpers';
import {
  passkeyService,
  PasskeyCredential,
  checkPasskeySupport,
} from '../../services/api/passkeyServices';

interface PasskeyManagerProps {
  onPasskeyRegistered?: () => void;
  showTitle?: boolean;
}

/**
 * PasskeyManager - Manage registered passkeys
 */
export const PasskeyManager: React.FC<PasskeyManagerProps> = ({
  onPasskeyRegistered,
  showTitle = true,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { isRTL, flexDirection } = useDirection();

  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check WebAuthn support on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsSupported(checkPasskeySupport());
    } else {
      // Native platforms have different support
      setIsSupported(Platform.OS === 'ios');
    }
  }, []);

  // Fetch passkeys when authenticated
  const fetchPasskeys = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const credentials = await passkeyService.listPasskeys();
      setPasskeys(credentials);
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setError(error.detail || error.message || t('passkey.fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  // Register a new passkey
  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setError(null);
    try {
      const deviceName = Platform.OS === 'web'
        ? navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser'
        : Platform.OS === 'ios' ? 'iPhone' : 'Android';

      await passkeyService.registerPasskey(deviceName);
      await fetchPasskeys();
      onPasskeyRegistered?.();
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string; name?: string };
      // Handle user cancellation gracefully
      if (error.name === 'NotAllowedError') {
        setError(t('passkey.cancelled'));
      } else {
        setError(error.detail || error.message || t('passkey.registerError'));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Delete a passkey
  const handleDeletePasskey = async (credentialId: string) => {
    setIsDeleting(true);
    try {
      await passkeyService.removePasskey(credentialId);
      setPasskeys(prev => prev.filter(p => p.id !== credentialId));
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setError(error.detail || error.message || t('passkey.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('passkey.never');
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isSupported) {
    return (
      <GlassView className="p-6">
        {showTitle && (
          <Text className="text-xl font-semibold text-white">{t('passkey.manager.title')}</Text>
        )}
        <View className="items-center p-8">
          <Text className="text-5xl mb-4 opacity-50">🔐</Text>
          <Text className="text-base text-white/60 text-center">
            {t('passkey.unsupported')}
          </Text>
        </View>
      </GlassView>
    );
  }

  return (
    <GlassView className="p-6">
      {showTitle && (
        <View className="mb-6">
          <Text className="text-xl font-semibold text-white mb-1">{t('passkey.manager.title')}</Text>
          <Text className="text-sm text-white/60">{t('passkey.manager.subtitle')}</Text>
        </View>
      )}

      {error && (
        <View className="bg-red-500/20 p-4 rounded-lg mb-4">
          <Text className="text-red-500 text-sm">{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View className="p-8 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Registered passkeys list */}
          <View className="mb-6">
            {passkeys.length === 0 ? (
              <View className="items-center p-8">
                <Text className="text-5xl mb-4">🔑</Text>
                <Text className="text-base text-white/60 text-center">
                  {t('passkey.noPasskeys')}
                </Text>
              </View>
            ) : (
              passkeys.map((passkey) => (
                <View key={passkey.id} className={`flex-row items-center justify-between bg-white/5 p-4 rounded-lg mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <View className={`flex-1 ${isRTL ? 'ml-4' : 'mr-4'}`}>
                    <Text className="text-base font-medium text-white mb-1">
                      {passkey.device_name || t('passkey.unknownDevice')}
                    </Text>
                    <Text className="text-xs text-white/60">
                      {t('passkey.created')}: {formatDate(passkey.created_at)}
                    </Text>
                    <Text className="text-xs text-white/60">
                      {t('passkey.lastUsed')}: {formatDate(passkey.last_used_at)}
                    </Text>
                  </View>
                  <GlassButton
                    variant="danger"
                    size="small"
                    onPress={() => setDeleteConfirmId(passkey.id)}
                  >
                    {t('common.delete')}
                  </GlassButton>
                </View>
              ))
            )}
          </View>

          {/* Register new passkey button */}
          <GlassButton
            onPress={handleRegisterPasskey}
            loading={isRegistering}
            disabled={isRegistering}
            className="mt-4"
          >
            {t('passkey.addPasskey')}
          </GlassButton>
        </>
      )}

      {/* Delete confirmation modal */}
      <GlassModal
        visible={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('passkey.deleteConfirmTitle')}
      >
        <View className="p-4">
          <Text className="text-base text-white mb-6 text-center">
            {t('passkey.deleteConfirmText')}
          </Text>
          <View className={`flex-row justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <GlassButton
              variant="secondary"
              onPress={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              variant="danger"
              onPress={() => deleteConfirmId && handleDeletePasskey(deleteConfirmId)}
              loading={isDeleting}
            >
              {t('common.delete')}
            </GlassButton>
          </View>
        </View>
      </GlassModal>
    </GlassView>
  );
};

export default PasskeyManager;
