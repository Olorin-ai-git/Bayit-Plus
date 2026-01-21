import React, { useRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
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
    <View className="mb-4 w-full" style={containerStyle}>
      {label && <Text className={`text-sm font-medium text-white/70 mb-1 ${isRTL ? 'text-right' : ''}`}>{label}</Text>}
      <Animated.View style={scaleTransform}>
        <GlassView
          className={`flex-row items-center min-h-[50px] px-4 gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}
          intensity="medium"
          borderColor={
            error
              ? colors.error
              : isFocused
              ? colors.primary
              : undefined
          }
          style={[!error && focusStyle, error && { borderColor: colors.error }]}
        >
          {icon && <View>{icon}</View>}
          <TextInput
            {...props}
            className={`flex-1 text-base text-white py-2 ${isRTL ? 'text-right' : ''}`}
            style={inputStyle}
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
            <Pressable onPress={onRightIconPress} className="p-1">
              {rightIcon}
            </Pressable>
          )}
        </GlassView>
      </Animated.View>
      {error && <Text className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>{error}</Text>}
    </View>
  );
};


export default GlassInput;
