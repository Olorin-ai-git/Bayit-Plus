/**
 * UnlockButton Component
 *
 * A button that triggers passkey authentication to unlock protected content.
 * Displays different states based on passkey session validity.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useDirection } from '../../hooks/useDirection';
import { rtlSpacing } from '../../utils/rtlHelpers';
import { PasskeyAuthModal } from './PasskeyAuthModal';

interface UnlockButtonProps {
  onUnlock?: () => void;
  variant?: 'default' | 'compact' | 'inline';
  showQROption?: boolean;
}

/**
 * UnlockButton - Trigger passkey authentication
 */
export const UnlockButton: React.FC<UnlockButtonProps> = ({
  onUnlock,
  variant = 'default',
  showQROption = Platform.OS !== 'web',
}) => {
  const { t } = useTranslation();
  const { hasPasskeyAccess, isAuthenticated } = useAuthStore();
  const { isRTL, flexDirection } = useDirection();

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Don't show if user isn't logged in
  if (!isAuthenticated) {
    return null;
  }

  // Don't show if already unlocked
  if (hasPasskeyAccess()) {
    return null;
  }

  const handlePress = () => {
    setShowAuthModal(true);
  };

  const handleSuccess = () => {
    setShowAuthModal(false);
    onUnlock?.();
  };

  const renderCompactButton = () => (
    <TouchableOpacity
      style={[styles.compactButton, { flexDirection }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.compactIcon, rtlSpacing(isRTL, spacing.sm)]}>🔐</Text>
      <Text style={styles.compactText}>{t('passkey.unlock')}</Text>
    </TouchableOpacity>
  );

  const renderInlineButton = () => (
    <TouchableOpacity
      style={styles.inlineButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.inlineIcon}>🔐</Text>
    </TouchableOpacity>
  );

  const renderDefaultButton = () => (
    <TouchableOpacity
      style={[styles.defaultButton, { flexDirection }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, rtlSpacing(isRTL, spacing.md)]}>
        <Text style={styles.icon}>🔐</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('passkey.unlockContent')}</Text>
        <Text style={styles.subtitle}>{t('passkey.unlockDescription')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {variant === 'compact' && renderCompactButton()}
      {variant === 'inline' && renderInlineButton()}
      {variant === 'default' && renderDefaultButton()}

      <PasskeyAuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleSuccess}
        showQROption={showQROption}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Default button styles
  defaultButton: {
    // flexDirection set dynamically for RTL support
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    // margin set dynamically via rtlSpacing for RTL support
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Compact button styles
  compactButton: {
    // flexDirection set dynamically for RTL support
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  compactIcon: {
    fontSize: 16,
    // margin set dynamically via rtlSpacing for RTL support
  },
  compactText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },

  // Inline button styles
  inlineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineIcon: {
    fontSize: 16,
  },
});

export default UnlockButton;
