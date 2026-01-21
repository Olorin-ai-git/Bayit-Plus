/**
 * GlassCategoryPill Component
 *
 * Category filter pill with glassmorphic styling.
 * Supports active state, icons/emoji, and TV focus.
 */

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  Platform,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, spacing } from '../../theme';

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

export interface GlassCategoryPillProps {
  /** The text label to display */
  label: string;
  /** Whether this pill is currently selected/active */
  isActive?: boolean;
  /** Callback when the pill is pressed */
  onPress?: () => void;
  /** Optional icon element to display before the label */
  icon?: React.ReactNode;
  /** Optional emoji icon as string (alternative to icon prop) */
  emoji?: string;
  /** Custom styles for the pill container */
  style?: StyleProp<ViewStyle>;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether this pill should have TV focus */
  hasTVPreferredFocus?: boolean;
  /** Disable the pill */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

const SIZE_STYLES = isTV
  ? {
      small: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        fontSize: 18,
        iconSize: 18,
        gap: spacing.sm,
      },
      medium: {
        paddingHorizontal: spacing.xl,
        paddingVertical: 14,
        fontSize: 22,
        iconSize: 22,
        gap: spacing.md,
      },
      large: {
        paddingHorizontal: spacing.xl + 8,
        paddingVertical: 18,
        fontSize: 26,
        iconSize: 26,
        gap: spacing.md,
      },
    }
  : {
      small: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        fontSize: 12,
        iconSize: 12,
        gap: spacing.xs,
      },
      medium: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
        fontSize: 14,
        iconSize: 14,
        gap: 6,
      },
      large: {
        paddingHorizontal: spacing.xl,
        paddingVertical: 10,
        fontSize: 16,
        iconSize: 16,
        gap: spacing.sm,
      },
    };

/**
 * Glassmorphic category pill component
 */
export const GlassCategoryPill: React.FC<GlassCategoryPillProps> = ({
  label,
  isActive = false,
  onPress,
  icon,
  emoji,
  style,
  size = 'medium',
  hasTVPreferredFocus = false,
  disabled = false,
  testID,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const currentSize = SIZE_STYLES[size];
  const showHighlight = isActive || isHovered || isFocused;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onHoverIn={() => !disabled && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="flex-row items-center justify-center rounded-3xl border"
      style={[
        {
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          borderColor: isFocused ? colors.primary : colors.glassBorder,
          borderWidth: isFocused ? 3 : 1,
          backgroundColor: isActive ? colors.primary : isHovered && !isActive ? 'rgba(107, 33, 168, 0.3)' : colors.glass,
          opacity: disabled ? 0.5 : 1,
        },
        Platform.OS === 'web' && {
          // @ts-expect-error - Web-specific CSS
          transition: 'all 0.2s ease',
        },
        style,
      ]}
      testID={testID}
      {...({ hasTVPreferredFocus } as object)}
    >
      {/* Icon or Emoji */}
      {(icon || emoji) && (
        <View style={{ marginRight: currentSize.gap }}>
          {icon || <Text style={{ fontSize: currentSize.iconSize }}>{emoji}</Text>}
        </View>
      )}

      {/* Label */}
      <Text
        className="text-center"
        style={{
          fontSize: currentSize.fontSize,
          fontWeight: isActive ? '600' : '500',
          color: isActive ? colors.background : (isHovered || isFocused) && !isActive ? colors.primary : disabled ? colors.textMuted : colors.textSecondary,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default GlassCategoryPill;
