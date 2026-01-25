/**
 * AuthRequiredBadge Component
 * Badge overlay indicating content requires authentication
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface AuthRequiredBadgeProps {
  /** Show the badge */
  show: boolean;
  /** Tooltip text (optional) */
  tooltip?: string;
}

/**
 * Badge indicating authentication is required
 * Similar to Premium badge but for auth requirement
 */
export const AuthRequiredBadge = memo(function AuthRequiredBadge({
  show,
  tooltip = 'Login required',
}: AuthRequiredBadgeProps) {
  if (!show) {
    return null;
  }

  return (
    <View style={styles.badge} title={tooltip}>
      <Lock size={14} color={colors.text} strokeWidth={2} />
      <Text style={styles.badgeText}>Login</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glassOverlay,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
