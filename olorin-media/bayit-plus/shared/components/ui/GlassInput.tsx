import React, { useRef, useState } from 'react';
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
  Platform,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  hasTVPreferredFocus?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  hasTVPreferredFocus = false,
  ...props
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
    onFocus: () => props.onFocus?.(null as any),
    onBlur: () => props.onBlur?.(null as any),
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, isRTL && styles.labelRTL]}>{label}</Text>}
      <Animated.View style={scaleTransform}>
        <GlassView
          style={[
            styles.inputContainer,
            isRTL && styles.inputContainerRTL,
            !error && focusStyle,
            error && styles.inputContainerError,
          ]}
          intensity="medium"
          borderColor={
            error
              ? colors.error
              : isFocused
              ? colors.primary
              : undefined
          }
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
            // @ts-ignore - TV-specific prop
            hasTVPreferredFocus={hasTVPreferredFocus}
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
    width: '100%' as any,
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
    width: '100%' as any,
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
