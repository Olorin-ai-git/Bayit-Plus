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
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
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
      <GlassView style={styles.container}>
        {showTitle && (
          <Text style={styles.title}>{t('passkey.manager.title')}</Text>
        )}
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedIcon}>🔐</Text>
          <Text style={styles.unsupportedText}>
            {t('passkey.unsupported')}
          </Text>
        </View>
      </GlassView>
    );
  }

  return (
    <GlassView style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Text style={styles.title}>{t('passkey.manager.title')}</Text>
          <Text style={styles.subtitle}>{t('passkey.manager.subtitle')}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Registered passkeys list */}
          <View style={styles.passkeyList}>
            {passkeys.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔑</Text>
                <Text style={styles.emptyText}>
                  {t('passkey.noPasskeys')}
                </Text>
              </View>
            ) : (
              passkeys.map((passkey) => (
                <View key={passkey.id} style={[styles.passkeyItem, { flexDirection }]}>
                  <View style={[styles.passkeyInfo, rtlSpacing(isRTL, spacing.md)]}>
                    <Text style={styles.passkeyName}>
                      {passkey.device_name || t('passkey.unknownDevice')}
                    </Text>
                    <Text style={styles.passkeyDate}>
                      {t('passkey.created')}: {formatDate(passkey.created_at)}
                    </Text>
                    <Text style={styles.passkeyDate}>
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
            style={styles.registerButton}
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
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            {t('passkey.deleteConfirmText')}
          </Text>
          <View style={[styles.modalButtons, { flexDirection }]}>
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

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  passkeyList: {
    marginBottom: spacing.lg,
  },
  passkeyItem: {
    // flexDirection set dynamically for RTL support
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  passkeyInfo: {
    flex: 1,
    // margin set dynamically via rtlSpacing for RTL support
  },
  passkeyName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  passkeyDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerButton: {
    marginTop: spacing.md,
  },
  unsupportedContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  unsupportedIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  unsupportedText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalContent: {
    padding: spacing.md,
  },
  modalText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalButtons: {
    // flexDirection set dynamically for RTL support
    justifyContent: 'center',
    gap: spacing.md,
  },
});

export default PasskeyManager;
