import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  Platform,
  TextInputProps,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface GlassTextareaProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  minHeight?: number;
  hasTVPreferredFocus?: boolean;
}

export const GlassTextarea: React.FC<GlassTextareaProps> = ({
  label,
  error,
  hint,
  minHeight = 100,
  hasTVPreferredFocus = false,
  ...props
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
  });

  return (
    <View className="w-full">
      {label && <Text className="text-sm font-medium mb-2 text-right" style={{ color: colors.textSecondary }}>{label}</Text>}

      <Animated.View style={scaleTransform}>
        <GlassView
          className="overflow-hidden"
          intensity="medium"
          borderColor={
            error
              ? colors.error
              : isFocused
                ? colors.glassBorderFocus
                : undefined
          }
        >
          <TextInput
            className="text-base px-4 py-4 text-right"
            style={[{ minHeight, color: colors.text }, !error && focusStyle]}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            textAlignVertical="top"
            // @ts-ignore - TV-specific prop
            hasTVPreferredFocus={hasTVPreferredFocus}
            {...props}
          />
        </GlassView>
      </Animated.View>

      {error && <Text className="text-xs mt-1 text-right" style={{ color: colors.error }}>{error}</Text>}
      {hint && !error && <Text className="text-xs mt-1 text-right" style={{ color: colors.textMuted }}>{hint}</Text>}
    </View>
  );
};

export default GlassTextarea;
