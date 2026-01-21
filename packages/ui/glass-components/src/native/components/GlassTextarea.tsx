/**
 * GlassTextarea Component
 *
 * Multiline text input with glassmorphic styling.
 * Supports labels, error states, hints, and TV focus.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  TextInputProps,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface GlassTextareaProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Minimum height */
  minHeight?: number;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic textarea component with TV focus support
 */
export const GlassTextarea: React.FC<GlassTextareaProps> = ({
  label,
  error,
  hint,
  minHeight = 100,
  hasTVPreferredFocus = false,
  isRTL: forceRTL,
  testID,
  ...props
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
  });

  return (
    <View className="w-full" testID={testID}>
      {label && <Text className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: colors.textSecondary }}>{label}</Text>}

      <Animated.View style={scaleTransform}>
        <GlassView
          className={`overflow-hidden ${error ? 'border-error' : ''}`}
          intensity="medium"
          borderColor={error ? colors.error : isFocused ? colors.glassBorderFocus : undefined}
          style={!error && isFocused ? focusStyle : undefined}
        >
          <TextInput
            className={`text-base px-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`}
            style={{ color: colors.text, minHeight }}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            textAlignVertical="top"
            {...({ hasTVPreferredFocus } as object)}
            {...props}
          />
        </GlassView>
      </Animated.View>

      {error && <Text className={`text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: colors.error }}>{error}</Text>}
      {hint && !error && <Text className={`text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: colors.textMuted }}>{hint}</Text>}
    </View>
  );
};

export default GlassTextarea;
