import React, { useState } from 'react';
import {
  Pressable,
  Text,
  Platform,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';

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
    small: { px: 4, py: 2.5, fontSize: 18, iconSize: 18, gap: 2 },
    medium: { px: 6, py: 3.5, fontSize: 22, iconSize: 22, gap: 3 },
    large: { px: 8, py: 4.5, fontSize: 26, iconSize: 26, gap: 3 },
  } : {
    small: { px: 3, py: 1.5, fontSize: 12, iconSize: 12, gap: 1 },
    medium: { px: 4, py: 2, fontSize: 14, iconSize: 14, gap: 1.5 },
    large: { px: 6, py: 2.5, fontSize: 16, iconSize: 16, gap: 2 },
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
      className={`flex-row items-center justify-center rounded-2xl border border-white/10 bg-black/20 backdrop-blur-lg
        ${isActive ? 'bg-purple-600 border-purple-600' : ''}
        ${isHovered && !isActive ? 'bg-purple-600/30 border-purple-500/50' : ''}
        ${isFocused ? 'border-purple-600 border-[3px]' : ''}
        ${disabled ? 'opacity-50' : ''}
        ${Platform.OS === 'web' ? 'transition-all duration-200' : ''}`}
      style={[
        {
          paddingHorizontal: currentSize.px * 4,
          paddingVertical: currentSize.py * 4,
        },
        style,
      ]}
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
        className={`font-medium text-center
          ${isActive ? 'text-black font-semibold' : 'text-gray-400'}
          ${(isHovered || isFocused) && !isActive ? 'text-purple-500' : ''}
          ${disabled ? 'text-gray-600' : ''}`}
        style={{ fontSize: currentSize.fontSize }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default GlassCategoryPill;
