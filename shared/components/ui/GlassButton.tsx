import React from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
import { useTVFocus } from '../hooks/useTVFocus';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'outline';
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
  hasTVPreferredFocus?: boolean;
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
  hasTVPreferredFocus = false,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: 14 },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: 16 },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: 18 },
  };

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: '#ffffff' },  // Purple with white text
    secondary: { bg: colors.secondary, text: '#ffffff' },  // Deep purple with white text
    ghost: { bg: 'transparent', text: colors.text },  // Transparent with white text
    danger: { bg: colors.error, text: '#ffffff' },  // Red with white text
    destructive: { bg: colors.error, text: '#ffffff' },  // Red with white text
    outline: { bg: 'transparent', text: colors.primary, border: colors.glassBorder },  // Purple border
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  const isGlassVariant = variant === 'ghost' || variant === 'outline';

  const buttonContent = (
    <View style={[styles.content, iconPosition === 'right' && styles.contentReverse]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.text}
          style={styles.loader}
        />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={[
              styles.text,
              { color: currentVariant.text, fontSize: currentSize.fontSize },
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const buttonStyle = [
    styles.button,
    {
      paddingVertical: currentSize.paddingVertical,
      paddingHorizontal: currentSize.paddingHorizontal,
    },
    !isGlassVariant && { backgroundColor: currentVariant.bg },
    currentVariant.border && { borderWidth: 2, borderColor: currentVariant.border },
    focusStyle,
    disabled && styles.buttonDisabled,
    fullWidth && styles.fullWidth,
    style,
  ];

  if (isGlassVariant) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled || loading}
        activeOpacity={0.8}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View style={[scaleTransform]}>
          <GlassView style={buttonStyle} intensity="medium">
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
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View style={[buttonStyle, scaleTransform]}>
        {buttonContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentReverse: {
    flexDirection: 'row-reverse',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textDisabled: {
    opacity: 0.7,
  },
  icon: {
    marginHorizontal: spacing.xs,
  },
  loader: {
    marginHorizontal: spacing.sm,
  },
});

export default GlassButton;
