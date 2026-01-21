/**
 * GlassFAB Component
 *
 * Floating Action Button with glassmorphic design.
 * Optimized for TV focus states and webapp hover/click.
 */

import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  Animated,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, borderRadius, spacing } from '../../theme';

export type FABSize = 'sm' | 'md' | 'lg';
export type FABVariant = 'primary' | 'secondary' | 'gradient';

export interface GlassFABProps {
  /** Icon element */
  icon: React.ReactNode;
  /** Optional label text */
  label?: string;
  /** Press handler */
  onPress?: () => void;
  /** Size preset */
  size?: FABSize;
  /** Visual variant */
  variant?: FABVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Additional label styles */
  labelStyle?: StyleProp<TextStyle>;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

// Size configurations
const getSizeStyles = (
  size: FABSize,
  hasLabel: boolean
): {
  minHeight: number;
  paddingVertical: number;
  paddingHorizontal: number;
  iconSize: number;
  fontSize: number;
  borderRadius: number;
} => {
  const styles = {
    sm: {
      minHeight: isTV ? 48 : 40,
      paddingVertical: spacing.sm,
      paddingHorizontal: hasLabel ? spacing.md : spacing.sm,
      iconSize: isTV ? 20 : 16,
      fontSize: isTV ? 16 : 14,
      borderRadius: hasLabel ? borderRadius.full : 20,
    },
    md: {
      minHeight: isTV ? 64 : 56,
      paddingVertical: spacing.md,
      paddingHorizontal: hasLabel ? spacing.lg : spacing.md,
      iconSize: isTV ? 24 : 20,
      fontSize: isTV ? 18 : 16,
      borderRadius: hasLabel ? borderRadius.full : 28,
    },
    lg: {
      minHeight: isTV ? 80 : 64,
      paddingVertical: spacing.lg,
      paddingHorizontal: hasLabel ? spacing.xl : spacing.lg,
      iconSize: isTV ? 32 : 24,
      fontSize: isTV ? 22 : 18,
      borderRadius: hasLabel ? borderRadius.full : 32,
    },
  };
  return styles[size];
};

// Variant colors
const variantColors: Record<FABVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primary, text: '#000000' },
  secondary: { bg: colors.secondary, text: '#ffffff' },
  gradient: { bg: 'transparent', text: colors.text },
};

/**
 * Glassmorphic Floating Action Button
 */
export const GlassFAB: React.FC<GlassFABProps> = ({
  icon,
  label,
  onPress,
  size = 'md',
  variant = 'primary',
  disabled = false,
  loading = false,
  isRTL = false,
  style,
  labelStyle,
  hasTVPreferredFocus = false,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const currentSize = getSizeStyles(size, !!label);
  const currentVariant = variantColors[variant];

  const fabStyle: ViewStyle = {
    minHeight: currentSize.minHeight,
    paddingVertical: currentSize.paddingVertical,
    paddingHorizontal: currentSize.paddingHorizontal,
    borderRadius: currentSize.borderRadius,
    minWidth: label ? undefined : currentSize.minHeight,
    backgroundColor: variant === 'gradient' ? 'transparent' : currentVariant.bg,
  };

  const content = (
    <View
      className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-center`}
      style={{ gap: spacing.sm }}
    >
      <View
        className="justify-center items-center"
        style={{
          width: currentSize.iconSize,
          height: currentSize.iconSize,
        }}
      >
        {icon}
      </View>
      {label && (
        <Text
          className={`font-bold tracking-wide ${isRTL ? 'text-right' : ''}`}
          style={[
            { color: currentVariant.text, fontSize: currentSize.fontSize },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );

  const renderButton = () => {
    if (variant === 'gradient') {
      return (
        <View
          className={`flex-row items-center justify-center overflow-hidden bg-[rgba(15,15,25,0.4)] border ${
            isFocused || isHovered
              ? 'border-2 bg-[rgba(15,15,25,0.6)]'
              : 'border-white/15'
          } ${disabled ? 'opacity-50' : ''}`}
          style={[
            fabStyle,
            (isFocused || isHovered) && { borderColor: colors.primary },
            style,
          ]}
        >
          <LinearGradient
            colors={['rgba(107, 33, 168, 0.3)', 'rgba(0, 153, 204, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0 opacity-80"
          />
          <View className="flex-row items-center justify-center z-[1]">{content}</View>
        </View>
      );
    }

    return (
      <View
        className={`flex-row items-center justify-center overflow-hidden ${
          isFocused || isHovered ? 'border-2' : ''
        } ${disabled ? 'opacity-50' : ''}`}
        style={[
          fabStyle,
          (isFocused || isHovered) && {
            borderColor: colors.primary,
            backgroundColor: 'rgba(15, 15, 25, 0.6)',
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      testID={testID}
      {...({ hasTVPreferredFocus } as object)}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          }
        : {})}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {renderButton()}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlassFAB;
