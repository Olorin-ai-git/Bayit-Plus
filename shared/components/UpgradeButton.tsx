/**
 * UpgradeButton - Smart upgrade/subscribe button
 * Automatically handles verification flow and subscription navigation
 * Only shown to non-admin, non-premium users
 */

import React, { useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassButton } from './ui/GlassButton';
import { VerificationModal } from './VerificationModal';
import { useAuthStore } from '../stores/authStore';

interface UpgradeButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  compact = false,
  fullWidth = false,
  style,
  variant = 'primary',
  size = 'md',
}) => {
  const navigation = useNavigation<any>();
  const { user, isAdminRole, isVerified } = useAuthStore();
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Don't show for admins (they have free premium)
  if (isAdminRole()) {
    return null;
  }

  // Don't show for premium/family users
  if (user?.subscription_tier === 'premium' || user?.subscription_tier === 'family') {
    return null;
  }

  const handlePress = () => {
    // If user is not verified, show verification modal
    if (!isVerified()) {
      setShowVerificationModal(true);
      return;
    }

    // If verified but no subscription, navigate to subscribe page
    navigation.navigate('Subscribe');
  };

  const handleVerificationSuccess = () => {
    setShowVerificationModal(false);
    // After verification, navigate to subscribe page
    navigation.navigate('Subscribe');
  };

  return (
    <>
      <GlassButton
        title={compact ? 'Upgrade' : 'Upgrade to Premium'}
        onPress={handlePress}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        style={style}
      />

      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );
};
