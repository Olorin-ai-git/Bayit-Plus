/**
 * GlassButton Component
 *
 * Glassmorphic button with multiple variants, TV focus support, and accessibility.
 * Provides consistent button styling across platforms.
 */

import React from 'react';
import {
  TouchableOpacity,
  Animated,
  Text,
  View,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { useTVFocus } from '../../hooks/useTVFocus';
import { colors } from '../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'cancel'
  | 'info';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  /** Button text */
  title: string;
  /** Press handler */
  onPress?: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Icon element */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state with spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Additional text styles */
  textStyle?: StyleProp<TextStyle>;
  /** Web className for NativeWind */
  className?: string;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Accessibility label (defaults to title) */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID for testing */
  testID?: string;
}

// Size configuration
const sizeStyles = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
} as const;

// Variant background colors with glassmorphism
const getVariantStyles = (): Record<ButtonVariant, ViewStyle> => ({
  primary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary700 || 'rgba(126, 34, 206, 0.6)',
  },
  secondary: {
    backgroundColor: colors.glassPurpleStrong || 'rgba(88, 28, 135, 0.6)',
    borderWidth: 2,
    borderColor: colors.primary800 || 'rgba(107, 33, 168, 0.7)',
  },
  ghost: {
    backgroundColor: colors.glassLight || 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: colors.glassBorder || 'rgba(126, 34, 206, 0.4)',
  },
  danger: {
    backgroundColor: colors.error || 'rgba(220, 38, 38, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(185, 28, 28, 0.6)',
  },
  destructive: {
    backgroundColor: colors.error || 'rgba(220, 38, 38, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(185, 28, 28, 0.6)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary700 || 'rgba(126, 34, 206, 0.6)',
  },
  success: {
    backgroundColor: colors.success || 'rgba(34, 197, 94, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(22, 163, 74, 0.6)',
  },
  warning: {
    backgroundColor: colors.warning || 'rgba(245, 158, 11, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(217, 119, 6, 0.6)',
  },
  cancel: {
    backgroundColor: 'rgba(75, 85, 99, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(55, 65, 81, 0.7)',
  },
  info: {
    backgroundColor: colors.info || 'rgba(59, 130, 246, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.6)',
  },
});

// Text colors per variant
const getTextColorStyles = (): Record<ButtonVariant, { color: string }> => ({
  primary: { color: colors.text || '#ffffff' },
  secondary: { color: colors.text || '#ffffff' },
  ghost: { color: colors.text || '#ffffff' },
  danger: { color: colors.text || '#ffffff' },
  destructive: { color: colors.text || '#ffffff' },
  outline: { color: colors.primaryLight || '#c084fc' },
  success: { color: colors.text || '#ffffff' },
  warning: { color: colors.text || '#ffffff' },
  cancel: { color: colors.text || '#ffffff' },
  info: { color: colors.text || '#ffffff' },
});

/**
 * Glassmorphic button component with TV focus support
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  className,
  hasTVPreferredFocus = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const currentSize = sizeStyles[size];
  const variantStyles = getVariantStyles();
  const textColorStyles = getTextColorStyles();
  const currentVariant = variantStyles[variant];
  const currentTextColor = textColorStyles[variant];

  const isGlassVariant = variant === 'ghost' || variant === 'outline';

  // Button content with icon and text
  const buttonContent = (
    <View
      style={{
        flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" style={{ marginHorizontal: 8 }} />
      ) : (
        <>
          {icon && <View style={{ marginHorizontal: 4 }}>{icon}</View>}
          <Text
            style={[
              {
                fontSize: currentSize.fontSize,
                color: currentTextColor.color,
                fontWeight: '600',
                textAlign: 'center',
                opacity: disabled ? 0.7 : 1,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  // Base button styles
  const buttonStyle: ViewStyle = {
    paddingVertical: currentSize.paddingVertical,
    paddingHorizontal: currentSize.paddingHorizontal,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
    ...currentVariant,
    // Web-specific backdrop filter
    ...(Platform.OS === 'web' && {
      // @ts-expect-error Web-specific CSS properties
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    }),
  };

  // Accessibility props
  const a11yProps = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint: accessibilityHint || (loading ? 'Loading' : undefined),
    accessibilityState: {
      disabled: disabled || loading,
    },
    accessible: true,
  };

  // Glass variants use GlassView wrapper
  if (isGlassVariant) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled || loading}
        activeOpacity={0.8}
        testID={testID}
        {...a11yProps}
        {...({ hasTVPreferredFocus } as object)}
      >
        <Animated.View style={[scaleTransform, isFocused ? focusStyle : undefined]}>
          <GlassView intensity="medium" style={[buttonStyle, style]}>
            {buttonContent}
          </GlassView>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Standard variants
  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
      {...a11yProps}
      {...({ hasTVPreferredFocus } as object)}
    >
      <Animated.View style={[buttonStyle, scaleTransform, isFocused ? focusStyle : undefined, style]}>
        {buttonContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlassButton;
