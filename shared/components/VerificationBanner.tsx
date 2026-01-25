/**
 * VerificationBanner - Persistent banner for unverified users
 * Shows at the top of the screen to prompt email and phone verification
 * Hidden for admin users (who don't need verification)
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { GlassView } from './ui/GlassView';
import { GlassButton } from './ui/GlassButton';
import { VerificationModal } from './VerificationModal';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface VerificationBannerProps {
  onDismiss?: () => void;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  onDismiss,
}) => {
  const { user, isAdminRole, isVerified, needsVerification } = useAuthStore();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show for admins
  if (isAdminRole()) {
    return null;
  }

  // Don't show if already verified
  if (isVerified()) {
    return null;
  }

  // Don't show if not logged in
  if (!user) {
    return null;
  }

  // Don't show if user dismissed
  if (isDismissed) {
    return null;
  }

  // Don't show if user doesn't need verification (shouldn't happen, but safety check)
  if (!needsVerification()) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleVerify = () => {
    setShowVerificationModal(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerificationModal(false);
    setIsDismissed(true);
  };

  // Determine verification status message
  const getVerificationMessage = () => {
    const emailVerified = (user as any).email_verified === true;
    const phoneVerified = (user as any).phone_verified === true;

    if (!emailVerified && !phoneVerified) {
      return '⚠️ Verify your email and phone to unlock all features';
    }
    if (!emailVerified) {
      return '⚠️ Verify your email to continue';
    }
    if (!phoneVerified) {
      return '⚠️ Verify your phone to unlock all features';
    }
    return '⚠️ Complete verification to unlock all features';
  };

  return (
    <>
      <GlassView intensity="medium" className="w-full py-4 px-6 border-b border-purple-600/25">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-white leading-5">{getVerificationMessage()}</Text>
            <Text className="text-sm text-white/60 leading-4">
              Verification required to watch VOD content and subscribe
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <GlassButton
              title="Verify Now"
              onPress={handleVerify}
              variant="primary"
              size="sm"
              className="min-w-[100px]"
            />
            <Pressable onPress={handleDismiss} className="w-7 h-7 rounded-full bg-black/40 items-center justify-center">
              <Text className="text-lg text-white/60 font-light">✕</Text>
            </Pressable>
          </View>
        </View>
      </GlassView>

      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );
};
