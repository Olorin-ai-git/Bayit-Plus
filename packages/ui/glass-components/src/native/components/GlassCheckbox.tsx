/**
 * GlassCheckbox Component
 *
 * Glassmorphic checkbox with optional label.
 * Supports RTL layout, TV focus, and accessibility.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  I18nManager,
} from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface GlassCheckboxProps {
  /** Checkbox label */
  label?: string;
  /** Checked state */
  checked?: boolean;
  /** Change handler */
  onChange?: (checked: boolean) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

/**
 * Glassmorphic checkbox component with TV focus support
 */
export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  label,
  checked = false,
  onChange,
  error,
  disabled = false,
  hasTVPreferredFocus = false,
  isRTL: forceRTL,
  testID,
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const handlePress = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  return (
    <View testID={testID}>
      <TouchableOpacity
        className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        {...({ hasTVPreferredFocus } as object)}
      >
        <Animated.View
          className={`items-center justify-center rounded-sm border-2 ${
            isRTL ? 'ml-2' : 'mr-2'
          } ${checked ? 'border-transparent' : ''} ${disabled ? 'opacity-50' : ''}`}
          style={[
            {
              width: isTV ? 32 : 24,
              height: isTV ? 32 : 24,
              borderRadius: borderRadius.sm,
              borderColor: checked ? colors.primary : colors.glassBorder,
              backgroundColor: checked ? colors.primary : colors.glassLight,
            },
            isFocused ? focusStyle : undefined,
            scaleTransform,
          ]}
        >
          {checked && (
            <Text
              className="font-bold"
              style={{
                fontSize: isTV ? 18 : 14,
                color: colors.background,
              }}
            >
              ✓
            </Text>
          )}
        </Animated.View>

        {label && (
          <Text
            className={`${isRTL ? 'text-right' : 'text-left'} ${disabled ? '' : ''}`}
            style={{
              fontSize: isTV ? 18 : 16,
              color: disabled ? colors.textMuted : colors.text,
            }}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text
          className={`text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
          style={{ color: colors.error, marginTop: spacing.xs }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export default GlassCheckbox;
