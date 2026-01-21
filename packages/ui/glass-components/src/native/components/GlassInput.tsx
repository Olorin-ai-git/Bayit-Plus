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
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  Pressable,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing } from '../../theme';
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
    <View className="w-full" style={[{ marginBottom: spacing.md }, containerStyle]} testID={testID}>
      {label && (
        <Text
          className={`text-sm font-medium ${isRTL ? 'text-right' : ''}`}
          style={{ color: colors.textSecondary, marginBottom: spacing.xs }}
        >
          {label}
        </Text>
      )}
      <Animated.View style={scaleTransform}>
        <GlassView
          className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center min-h-[50px] w-full`}
          style={[
            { paddingHorizontal: spacing.md, gap: spacing.sm },
            error && { borderColor: colors.error },
          ]}
          intensity="medium"
          borderColor={error ? colors.error : isFocused ? colors.primary : undefined}
        >
          {icon && <View>{icon}</View>}
          <TextInput
            {...props}
            className={`flex-1 text-base ${isRTL ? 'text-right' : ''}`}
            style={[{ color: colors.text, paddingVertical: spacing.sm }, inputStyle]}
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
            <Pressable onPress={onRightIconPress} style={{ padding: spacing.xs }}>
              {rightIcon}
            </Pressable>
          )}
        </GlassView>
      </Animated.View>
      {error && (
        <Text
          className={`text-xs ${isRTL ? 'text-right' : ''}`}
          style={{ color: colors.error, marginTop: spacing.xs }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export default GlassInput;
