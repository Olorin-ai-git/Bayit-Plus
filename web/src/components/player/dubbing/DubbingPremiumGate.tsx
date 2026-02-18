/**
 * Dubbing Premium Gate
 * Overlay shown when a user attempts to access a premium dubbing feature
 * without an active subscription. Presents a focused upgrade CTA.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

interface DubbingPremiumGateProps {
  featureName: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export const DubbingPremiumGate: React.FC<DubbingPremiumGateProps> = ({
  featureName,
  onUpgrade,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Lock size={32} color={colors.gold} />
        </View>

        <Text style={styles.title}>
          {t('dubbing.premiumGate.title', 'Premium Feature')}
        </Text>

        <Text style={styles.featureName}>{featureName}</Text>

        <Text style={styles.description}>
          {t(
            'dubbing.premiumGate.description',
            'Upgrade to Bayit+ Premium to unlock this feature and enjoy unlimited access to all dubbing capabilities.'
          )}
        </Text>

        <Pressable
          onPress={onUpgrade}
          style={({ pressed }) => [
            styles.upgradeButton,
            pressed && styles.upgradeButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('dubbing.premiumGate.upgrade', 'Upgrade to Premium')}
        >
          <Text style={styles.upgradeButtonText}>
            {t('dubbing.premiumGate.upgrade', 'Upgrade to Premium')}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('dubbing.premiumGate.maybeLater', 'Maybe Later')}
        >
          <Text style={styles.dismissText}>
            {t('dubbing.premiumGate.maybeLater', 'Maybe Later')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassOverlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glassMedium,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  featureName: {
    ...typography.subtitle,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  upgradeButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  upgradeButtonText: {
    ...typography.label,
    color: colors.white,
    fontWeight: '700',
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  dismissButtonPressed: {
    opacity: 0.6,
  },
  dismissText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});

export default DubbingPremiumGate;
