/**
 * GlassInput Component
 *
 * Text input with glassmorphic styling, label, error states, and RTL support.
 * Supports icons, TV focus, and accessibility.
 */

import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  Pressable,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface GlassInputProps extends TextInputProps {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Left icon element */
  icon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Right icon press handler */
  onRightIconPress?: () => void;
  /** Container styles */
  containerStyle?: StyleProp<ViewStyle>;
  /** Input text styles */
  inputStyle?: StyleProp<TextStyle>;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic input component with TV focus support
 */
export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  hasTVPreferredFocus = false,
  isRTL: forceRTL,
  testID,
  ...props
}) => {
  // Use I18nManager for RTL detection, allow override via prop
  const isRTL = forceRTL ?? I18nManager.isRTL;

  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
    onFocus: () => props.onFocus?.(null as unknown as Parameters<NonNullable<TextInputProps['onFocus']>>[0]),
    onBlur: () => props.onBlur?.(null as unknown as Parameters<NonNullable<TextInputProps['onBlur']>>[0]),
  });

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {label && <Text style={[styles.label, isRTL && styles.labelRTL]}>{label}</Text>}
      <Animated.View style={scaleTransform}>
        <GlassView
          style={[
            styles.inputContainer,
            isRTL && styles.inputContainerRTL,
            !error && isFocused ? focusStyle : undefined,
            error && styles.inputContainerError,
          ]}
          intensity="medium"
          borderColor={error ? colors.error : isFocused ? colors.primary : undefined}
        >
          {icon && <View style={styles.icon}>{icon}</View>}
          <TextInput
            {...props}
            style={[
              styles.input,
              icon ? styles.inputWithIcon : undefined,
              isRTL && styles.inputRTL,
              inputStyle,
            ]}
            placeholderTextColor={colors.textMuted}
            onFocus={(e) => {
              handleFocus();
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              handleBlur();
              props.onBlur?.(e);
            }}
            {...({ hasTVPreferredFocus } as object)}
          />
          {rightIcon && (
            <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
              {rightIcon}
            </Pressable>
          )}
        </GlassView>
      </Animated.View>
      {error && <Text style={[styles.error, isRTL && styles.errorRTL]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelRTL: {
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  icon: {},
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputWithIcon: {},
  rightIcon: {
    padding: spacing.xs,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  errorRTL: {
    textAlign: 'right',
  },
});

export default GlassInput;
