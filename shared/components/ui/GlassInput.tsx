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
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './GlassView';
import { colors, spacing } from '@olorin/design-tokens';
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
  disableFocusBorder?: boolean;
  noBorder?: boolean;
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
  disableFocusBorder = false,
  noBorder = false,
  ...props
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: disableFocusBorder ? 'none' : 'input',
    onFocus: () => props.onFocus?.(null as any),
    onBlur: () => props.onBlur?.(null as any),
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isRTL && styles.textRight]}>
          {label}
        </Text>
      )}
      <Animated.View style={scaleTransform}>
        <GlassView
          style={[
            styles.inputContainer,
            isRTL && styles.rowReverse,
            error && styles.errorBorder,
          ]}
          intensity="medium"
          borderColor={error ? colors.error : undefined}
          noBorder={noBorder}
        >
          {icon && <View>{icon}</View>}
          <TextInput
            {...props}
            style={[styles.input, isRTL && styles.textRight, inputStyle]}
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
            <Pressable onPress={onRightIconPress} style={styles.rightIconButton}>
              {rightIcon}
            </Pressable>
          )}
        </GlassView>
      </Animated.View>
      {error && (
        <Text style={[styles.errorText, isRTL && styles.textRight]}>
          {error}
        </Text>
      )}
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
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    width: '100%',
    borderWidth: 0,
    outlineWidth: 0,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
    outlineWidth: 0,
    borderWidth: 0,
  },
  textRight: {
    textAlign: 'right',
  },
  errorBorder: {
    borderColor: colors.error.DEFAULT,
  },
  errorText: {
    fontSize: 12,
    color: colors.error.DEFAULT,
    marginTop: spacing.xs,
  },
  rightIconButton: {
    padding: spacing.xs,
  },
});

export default GlassInput;
