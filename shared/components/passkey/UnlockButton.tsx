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
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
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
      className={`flex-row items-center bg-purple-600/20 rounded-lg py-2 px-4 ${isRTL ? 'flex-row-reverse' : ''}`}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text className={`text-base ${isRTL ? 'ml-2' : 'mr-2'}`}>🔐</Text>
      <Text className="text-sm font-medium text-purple-600">{t('passkey.unlock')}</Text>
    </TouchableOpacity>
  );

  const renderInlineButton = () => (
    <TouchableOpacity
      className="w-8 h-8 rounded-full bg-purple-600/20 items-center justify-center"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text className="text-base">🔐</Text>
    </TouchableOpacity>
  );

  const renderDefaultButton = () => (
    <TouchableOpacity
      className={`flex-row items-center bg-purple-600/20 border border-purple-600 rounded-xl p-4 my-4 ${isRTL ? 'flex-row-reverse' : ''}`}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View className={`w-12 h-12 rounded-full bg-purple-600/30 items-center justify-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
        <Text className="text-2xl">🔐</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white mb-1">{t('passkey.unlockContent')}</Text>
        <Text className="text-sm text-white/60">{t('passkey.unlockDescription')}</Text>
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

export default UnlockButton;
