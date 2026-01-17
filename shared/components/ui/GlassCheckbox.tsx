import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface GlassCheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
}

export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  label,
  checked = false,
  onChange,
  error,
  disabled = false,
  hasTVPreferredFocus = false,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const handlePress = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            focusStyle,
            disabled && styles.checkboxDisabled,
            scaleTransform,
          ]}
        >
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>

        {label && (
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    //width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});

export default GlassCheckbox;
