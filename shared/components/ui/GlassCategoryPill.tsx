import React, { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

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
}

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
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // TV builds get larger sizes for 10-foot UI
  const sizeStyles = IS_TV_BUILD ? {
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
  } : {
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

  const currentSize = sizeStyles[size];
  const showHighlight = isActive || isHovered || isFocused;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onHoverIn={() => !disabled && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.pill,
        {
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        isActive && styles.pillActive,
        isHovered && !isActive && styles.pillHovered,
        isFocused && styles.pillFocused,
        disabled && styles.pillDisabled,
        Platform.OS === 'web' && styles.webTransition,
        style,
      ]}
    >
      {/* Icon or Emoji */}
      {(icon || emoji) && (
        <View style={{ marginRight: currentSize.gap }}>
          {icon || (
            <Text style={{ fontSize: currentSize.iconSize }}>{emoji}</Text>
          )}
        </View>
      )}

      {/* Label */}
      <Text
        style={[
          styles.label,
          { fontSize: currentSize.fontSize },
          isActive && styles.labelActive,
          (isHovered || isFocused) && !isActive && styles.labelHighlight,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    // @ts-ignore - Web-specific CSS properties
    ...(Platform.OS === 'web' && {
      height: 'fit-content',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    // @ts-ignore - Web-specific CSS
    ...(Platform.OS === 'web' && {
      boxShadow: `0 0 12px ${colors.primary}40`,
    }),
  },
  pillHovered: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: 'rgba(0, 217, 255, 0.5)',
  },
  pillFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    // @ts-ignore - Web-specific CSS
    ...(Platform.OS === 'web' && {
      boxShadow: `0 0 20px ${colors.primary}80`,
    }),
  },
  pillDisabled: {
    opacity: 0.5,
    // @ts-ignore - Web-specific CSS
    ...(Platform.OS === 'web' && {
      cursor: 'not-allowed',
    }),
  },
  webTransition: {
    // @ts-ignore - Web-specific CSS
    transition: 'all 0.2s ease',
  },
  label: {
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.background,
    fontWeight: '600',
  },
  labelHighlight: {
    color: colors.primary,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});

export default GlassCategoryPill;
