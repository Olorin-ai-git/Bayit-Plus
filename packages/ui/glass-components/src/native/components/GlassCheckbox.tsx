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
  StyleSheet,
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
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={[styles.row, isRTL && styles.rowRTL]}
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
          style={[
            styles.checkbox,
            isRTL ? styles.checkboxRTL : styles.checkboxLTR,
            checked && styles.checkboxChecked,
            isFocused ? focusStyle : undefined,
            disabled && styles.checkboxDisabled,
            scaleTransform,
          ]}
        >
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>

        {label && (
          <Text
            style={[
              styles.label,
              isRTL ? styles.labelRTL : styles.labelLTR,
              disabled && styles.labelDisabled,
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error && <Text style={[styles.error, isRTL && styles.errorRTL]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  checkbox: {
    width: isTV ? 32 : 24,
    height: isTV ? 32 : 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLTR: {
    marginRight: spacing.sm,
  },
  checkboxRTL: {
    marginLeft: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    fontSize: isTV ? 18 : 14,
    fontWeight: 'bold',
    color: colors.background,
  },
  label: {
    fontSize: isTV ? 18 : 16,
    color: colors.text,
  },
  labelLTR: {
    textAlign: 'left',
  },
  labelRTL: {
    textAlign: 'right',
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  errorRTL: {
    textAlign: 'right',
  },
});

export default GlassCheckbox;
