/**
 * GlassFAB - Floating Action Button with Glassmorphic Design
 * Primary action button for creating new items (flows, content, etc.)
 * Optimized for TV focus states and webapp hover/click
 */

import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '../theme';
import { isTV } from '../utils/platform';

type FABSize = 'sm' | 'md' | 'lg';
type FABVariant = 'primary' | 'secondary' | 'gradient';

interface GlassFABProps {
  /** Icon to display (usually a React element like <Plus />) */
  icon: React.ReactNode;
  /** Optional label text shown next to icon */
  label?: string;
  /** Press handler */
  onPress?: () => void;
  /** Size variant */
  size?: FABSize;
  /** Color variant */
  variant?: FABVariant;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether to show loading state */
  loading?: boolean;
  /** RTL layout - places icon after label */
  isRTL?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom label style */
  labelStyle?: StyleProp<TextStyle>;
  /** TV focus hint */
  hasTVPreferredFocus?: boolean;
}

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
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
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
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Size configurations
  const sizeStyles: Record<FABSize, {
    minHeight: number;
    paddingVertical: number;
    paddingHorizontal: number;
    iconSize: number;
    fontSize: number;
    borderRadius: number;
  }> = {
    sm: {
      minHeight: isTV ? 48 : 40,
      paddingVertical: spacing.sm,
      paddingHorizontal: label ? spacing.md : spacing.sm,
      iconSize: isTV ? 20 : 16,
      fontSize: isTV ? 16 : 14,
      borderRadius: label ? borderRadius.full : 20,
    },
    md: {
      minHeight: isTV ? 64 : 56,
      paddingVertical: spacing.md,
      paddingHorizontal: label ? spacing.lg : spacing.md,
      iconSize: isTV ? 24 : 20,
      fontSize: isTV ? 18 : 16,
      borderRadius: label ? borderRadius.full : 28,
    },
    lg: {
      minHeight: isTV ? 80 : 64,
      paddingVertical: spacing.lg,
      paddingHorizontal: label ? spacing.xl : spacing.lg,
      iconSize: isTV ? 32 : 24,
      fontSize: isTV ? 22 : 18,
      borderRadius: label ? borderRadius.full : 32,
    },
  };

  // Variant colors
  const variantColors: Record<FABVariant, { bg: string; text: string }> = {
    primary: { bg: colors.primary, text: '#000000' },
    secondary: { bg: colors.secondary, text: '#ffffff' },
    gradient: { bg: 'transparent', text: '#000000' },
  };

  const currentSize = sizeStyles[size];
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
    <View style={[styles.content, isRTL && styles.contentRTL]}>
      <View style={{ width: currentSize.iconSize, height: currentSize.iconSize, justifyContent: 'center', alignItems: 'center' }}>
        {icon}
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            { color: currentVariant.text, fontSize: currentSize.fontSize },
            isRTL && styles.labelRTL,
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
        <LinearGradient
          colors={['#00D9FF', '#0099CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fab, fabStyle, isFocused && styles.fabFocused, disabled && styles.fabDisabled, style]}
        >
          {content}
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.fab, fabStyle, isFocused && styles.fabFocused, disabled && styles.fabDisabled, style]}>
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
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnim }],
          },
          isFocused && shadows.glow(colors.primary),
          styles.shadowContainer,
        ]}
      >
        {renderButton()}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    // @ts-ignore - Web shadow
    boxShadow: '0 8px 24px rgba(0, 217, 255, 0.4)',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabFocused: {
    borderWidth: 3,
    borderColor: colors.primary,
    // @ts-ignore - Web shadow
    boxShadow: '0 0 30px rgba(0, 217, 255, 0.8)',
  },
  fabDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelRTL: {
    textAlign: 'right',
  },
});

export default GlassFAB;
