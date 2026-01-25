import React, { useState } from 'react';
import {
  Pressable,
  Text,
  Platform,
  ViewStyle,
  StyleProp,
  View,
  StyleSheet,
} from 'react-native';
import { colors } from '@olorin/design-tokens';

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
    small: { px: 4, py: 2.5, fontSize: 18, iconSize: 20, gap: 2 },
    medium: { px: 6, py: 3.5, fontSize: 22, iconSize: 24, gap: 3 },
    large: { px: 8, py: 4.5, fontSize: 26, iconSize: 28, gap: 3 },
  } : {
    small: { px: 3, py: 1.5, fontSize: 12, iconSize: 14, gap: 1 },
    medium: { px: 4, py: 2, fontSize: 14, iconSize: 16, gap: 1.5 },
    large: { px: 6, py: 2.5, fontSize: 16, iconSize: 18, gap: 2 },
  };

  const currentSize = sizeStyles[size];
  const showHighlight = isActive || isHovered || isFocused;

  const pillStyles = [
    styles.pill,
    isActive && styles.pillActive,
    isHovered && !isActive && styles.pillHovered,
    isFocused && styles.pillFocused,
    disabled && styles.pillDisabled,
    {
      paddingHorizontal: currentSize.px * 4,
      paddingVertical: currentSize.py * 4,
    },
    style,
  ];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onHoverIn={() => !disabled && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={pillStyles}
    >
      {/* Icon or Emoji */}
      {(icon || emoji) && (
        <View style={{ marginRight: currentSize.gap * 4 }}>
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
          isActive ? styles.labelActive : styles.labelInactive,
          (isHovered || isFocused) && !isActive && styles.labelHighlighted,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.glassBorderLight,
    backgroundColor: colors.glassLight,
    alignSelf: 'flex-start', // Prevent vertical stretching
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    // @ts-ignore - Web CSS transition
    transition: 'all 0.2s ease',
  },
  pillActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    // @ts-ignore - Web CSS
    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.4)',
  },
  pillHovered: {
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.primary[500],
  },
  pillFocused: {
    borderColor: colors.primary[600],
    borderWidth: 3,
  },
  pillDisabled: {
    opacity: 0.5,
  },

  label: {
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  labelInactive: {
    color: colors.textMuted,
  },
  labelHighlighted: {
    color: colors.primary[500],
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
});

export default GlassCategoryPill;
