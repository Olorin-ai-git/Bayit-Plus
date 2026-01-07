import React, { useRef, useState } from 'react';
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
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing, shadows } from '../theme';
import { isTV } from '../utils/platform';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: 14 },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: 16 },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: 18 },
  };

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: colors.background },
    secondary: { bg: colors.secondary, text: colors.text },
    ghost: { bg: 'transparent', text: colors.text },
    danger: { bg: colors.error, text: colors.text },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
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
    isFocused && styles.buttonFocused,
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
        <Animated.View
          style={[
            { transform: [{ scale: scaleAnim }] },
            isFocused && shadows.glow(colors.primary),
          ]}
        >
          <GlassView
            style={buttonStyle}
            intensity="medium"
            borderColor={isFocused ? colors.primary : currentVariant.border}
          >
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
      <Animated.View
        style={[
          buttonStyle,
          { transform: [{ scale: scaleAnim }] },
          isFocused && shadows.glow(currentVariant.bg),
        ]}
      >
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
  buttonFocused: {
    borderWidth: 2,
    borderColor: colors.text,
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
