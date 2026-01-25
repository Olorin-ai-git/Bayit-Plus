/**
 * GlassFAB - Floating Action Button with Glassmorphic Design
 * Primary action button for creating new items (flows, content, etc.)
 * Optimized for TV focus states and webapp hover/click
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
} from 'react-native';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@olorin/design-tokens';
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
    gradient: { bg: 'transparent', text: colors.text },
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
    <View style={[
      styles.contentContainer,
      isRTL && styles.contentContainerRTL
    ]}>
      <View style={[
        styles.iconContainer,
        { width: currentSize.iconSize, height: currentSize.iconSize }
      ]}>
        {icon}
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            isRTL && styles.labelRTL,
            { color: currentVariant.text, fontSize: currentSize.fontSize, letterSpacing: 0.3 },
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
        <View style={[
          styles.buttonBase,
          styles.gradientButton,
          (isFocused || isHovered) && styles.focusedBorder,
          disabled && styles.disabled,
          fabStyle,
          style
        ]}>
          <LinearGradient
            colors={['rgba(107, 33, 168, 0.3)', 'rgba(0, 153, 204, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientOverlay}
          />
          <View style={styles.contentWrapper}>
            {content}
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.buttonBase,
        (isFocused || isHovered) && styles.focusedBorder,
        disabled && styles.disabled,
        fabStyle,
        style
      ]}>
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
      // @ts-ignore - Web hover events
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        {renderButton()}
      </Animated.View>
    </TouchableOpacity>
  );
};


// Styles using StyleSheet.create() - React Native Web compatible
const styles = {
  // Content container
  contentContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
  },
  contentContainerRTL: {
    flexDirection: 'row-reverse' as const,
  },

  // Icon container
  iconContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // Label text
  label: {
    fontWeight: '700' as const,
  },
  labelRTL: {
    textAlign: 'right' as const,
  },

  // Button base
  buttonBase: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },

  // Gradient variant
  gradientButton: {
    backgroundColor: 'rgba(15, 15, 25, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore - Web-specific property
    backdropFilter: 'blur(20px)',
    // @ts-ignore - Web-specific property
    WebkitBackdropFilter: 'blur(20px)',
  },

  // Gradient overlay
  gradientOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },

  // Content wrapper (for z-index)
  contentWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },

  // Focus/hover state
  focusedBorder: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(15, 15, 25, 0.6)',
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
};

export default GlassFAB;
