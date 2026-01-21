import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'purple';
type BadgeSize = 'sm' | 'default' | 'lg';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: BadgeVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'default',
  dot = false,
  dotColor,
  icon,
  style,
}) => {
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

  const currentVariant = variantStyles[variant] || variantStyles.default;
  const currentSize = sizeStyles[size] || sizeStyles.default;
  const computedDotColor = dotColor || variant;

  return (
    <View
      className="flex-row items-center rounded-full border border-white/20"
      style={[
        {
          backgroundColor: currentVariant.bg,
          paddingHorizontal: currentSize.paddingH,
          paddingVertical: currentSize.paddingV,
        },
        style,
      ]}
    >
      {dot && (
        <View
          className="w-1.5 h-1.5 rounded-full ml-1"
          style={{ backgroundColor: dotColors[computedDotColor] }}
        />
      )}
      {icon && <View className="ml-1">{icon}</View>}
      <Text
        className="font-semibold"
        style={{ color: currentVariant.text, fontSize: currentSize.fontSize }}
      >
        {children}
      </Text>
    </View>
  );
};

export default GlassBadge;
