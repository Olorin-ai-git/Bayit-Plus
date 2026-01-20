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
} from 'react-native';
import { GlassView } from './GlassView';
import { useTVFocus } from '../hooks/useTVFocus';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'outline' | 'success' | 'warning' | 'cancel' | 'info';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
  hasTVPreferredFocus?: boolean;
  /** Accessibility label (defaults to title if not provided) */
  accessibilityLabel?: string;
  /** Accessibility hint (e.g., "Saves your changes") */
  accessibilityHint?: string;
}

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
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
  };

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: 'transparent', //rgba(147, 51, 234, 0.8)', // purple-600/80
      borderWidth: 2,
      borderColor: 'rgba(126, 34, 206, 0.6)', // purple-700/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    secondary: {
      backgroundColor: 'rgba(88, 28, 135, 0.6)', // purple-900/60
      borderWidth: 2,
      borderColor: 'rgba(107, 33, 168, 0.7)', // purple-800/70
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    ghost: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)', // white/10
      borderWidth: 2,
      borderColor: 'rgba(126, 34, 206, 0.4)', // purple-700/40
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    danger: {
      backgroundColor: 'rgba(220, 38, 38, 0.8)', // red-600/80
      borderWidth: 2,
      borderColor: 'rgba(185, 28, 28, 0.6)', // red-700/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    destructive: {
      backgroundColor: 'rgba(220, 38, 38, 0.8)', // red-600/80
      borderWidth: 2,
      borderColor: 'rgba(185, 28, 28, 0.6)', // red-700/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: 'rgba(126, 34, 206, 0.6)', // purple-700/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    success: {
      backgroundColor: 'rgba(34, 197, 94, 0.7)', // green-600/70
      borderWidth: 2,
      borderColor: 'rgba(22, 163, 74, 0.6)', // green-700/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.7)', // amber-500/70
      borderWidth: 2,
      borderColor: 'rgba(217, 119, 6, 0.6)', // amber-600/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    cancel: {
      backgroundColor: 'rgba(75, 85, 99, 0.6)', // gray-600/60
      borderWidth: 2,
      borderColor: 'rgba(55, 65, 81, 0.7)', // gray-700/70
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
    info: {
      backgroundColor: 'rgba(59, 130, 246, 0.7)', // blue-500/70
      borderWidth: 2,
      borderColor: 'rgba(37, 99, 235, 0.6)', // blue-600/60
      // @ts-ignore - Web CSS
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    },
  };

  const textColorStyles: Record<ButtonVariant, { color: string }> = {
    primary: { color: '#ffffff' },
    secondary: { color: '#ffffff' },
    ghost: { color: '#ffffff' },
    danger: { color: '#ffffff' },
    destructive: { color: '#ffffff' },
    outline: { color: '#c084fc' }, // purple-400
    success: { color: '#ffffff' },
    warning: { color: '#ffffff' },
    cancel: { color: '#ffffff' },
    info: { color: '#ffffff' },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  const currentTextColor = textColorStyles[variant];

  const isGlassVariant = variant === 'ghost' || variant === 'outline';

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
        <ActivityIndicator
          size="small"
          color="white"
          style={{ marginHorizontal: 8 }}
        />
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
  };

  const a11yProps = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint: accessibilityHint || (loading ? 'Loading' : undefined),
    accessibilityState: {
      disabled: disabled || loading,
    },
    accessible: true,
  };

  if (isGlassVariant) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...a11yProps}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View style={[scaleTransform, focusStyle]}>
          <GlassView intensity="medium" style={[buttonStyle, style]}>
            {buttonContent}
          </GlassView>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...a11yProps}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View style={[buttonStyle, scaleTransform, focusStyle, style]}>
        {buttonContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlassButton;
