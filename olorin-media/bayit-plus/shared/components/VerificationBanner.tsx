/**
 * VerificationBanner - Persistent banner for unverified users
 * Shows at the top of the screen to prompt email and phone verification
 * Hidden for admin users (who don't need verification)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { GlassView } from './ui/GlassView';
import { GlassButton } from './ui/GlassButton';
import { VerificationModal } from './VerificationModal';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../theme';

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
      <GlassView intensity="medium" style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.message}>{getVerificationMessage()}</Text>
            <Text style={styles.subtitle}>
              Verification required to watch VOD content and subscribe
            </Text>
          </View>

          <View style={styles.actions}>
            <GlassButton
              title="Verify Now"
              onPress={handleVerify}
              variant="primary"
              size="sm"
              style={styles.verifyButton}
            />
            <Pressable onPress={handleDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissText}>✕</Text>
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

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '40', // 25% opacity
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifyButton: {
    minWidth: 100,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '300',
  },
});
