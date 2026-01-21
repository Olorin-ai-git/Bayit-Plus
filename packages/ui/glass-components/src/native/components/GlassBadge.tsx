/**
 * GlassBadge Component
 *
 * Glassmorphic badge for labels, status indicators, and tags.
 * Supports multiple variants, sizes, and optional dot indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'purple';
export type BadgeSize = 'sm' | 'default' | 'lg';

export interface GlassBadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
  /** Show status dot */
  dot?: boolean;
  /** Dot color variant */
  dotColor?: BadgeVariant;
  /** Icon element */
  icon?: React.ReactNode;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.glass, text: colors.text },
  primary: { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primary },
  success: { bg: 'rgba(16, 185, 129, 0.2)', text: colors.success },
  danger: { bg: 'rgba(239, 68, 68, 0.2)', text: colors.error },
  warning: { bg: 'rgba(245, 158, 11, 0.2)', text: colors.warning },
  purple: { bg: 'rgba(138, 43, 226, 0.2)', text: colors.secondary },
};

const sizeStyles: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number }> = {
  sm: { paddingH: spacing.sm, paddingV: 2, fontSize: 10 },
  default: { paddingH: spacing.md, paddingV: 4, fontSize: 12 },
  lg: { paddingH: spacing.lg, paddingV: 6, fontSize: 14 },
};

const dotColors: Record<BadgeVariant, string> = {
  default: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  danger: colors.error,
  warning: colors.warning,
  purple: colors.secondary,
};

/**
 * Glassmorphic badge component
 */
export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'default',
  dot = false,
  dotColor,
  icon,
  style,
  testID,
}) => {
  const currentVariant = variantStyles[variant] || variantStyles.default;
  const currentSize = sizeStyles[size] || sizeStyles.default;
  const computedDotColor = dotColor || variant;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentVariant.bg,
          paddingHorizontal: currentSize.paddingH,
          paddingVertical: currentSize.paddingV,
        },
        style,
      ]}
      testID={testID}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: dotColors[computedDotColor] }]} />
      )}
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[styles.text, { color: currentVariant.text, fontSize: currentSize.fontSize }]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },
  icon: {
    marginLeft: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
});

export default GlassBadge;
