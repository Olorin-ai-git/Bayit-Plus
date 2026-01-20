/**
 * GlassToggle Component
 *
 * Glassmorphic toggle switch with optional label and description.
 * Supports RTL layout and accessibility.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '../../theme';

export interface GlassToggleProps {
  /** Toggle state */
  value: boolean;
  /** State change handler */
  onValueChange: (value: boolean) => void;
  /** Toggle label */
  label?: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size preset */
  size?: 'small' | 'medium';
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

const SIZES = {
  small: { width: 44, height: 24, knob: 20 },
  medium: { width: 52, height: 28, knob: 24 },
} as const;

/**
 * Glassmorphic toggle component
 */
export const GlassToggle: React.FC<GlassToggleProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  size = 'medium',
  isRTL = false,
  testID,
}) => {
  const dimensions = SIZES[size];

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const Toggle = () => (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.toggle,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.height / 2,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
        },
        value && styles.toggleActive,
        disabled && styles.toggleDisabled,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View
        style={[
          styles.knob,
          {
            width: dimensions.knob,
            height: dimensions.knob,
            borderRadius: dimensions.knob / 2,
          },
          value && styles.knobActive,
        ]}
      />
    </Pressable>
  );

  if (!label) {
    return (
      <View testID={testID}>
        <Toggle />
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, isRTL && styles.containerRTL, disabled && styles.containerDisabled]}
      testID={testID}
    >
      <View style={styles.labelContainer}>
        <Text style={[styles.label, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.description, isRTL && styles.textRTL, disabled && styles.textDisabled]}
          >
            {description}
          </Text>
        )}
      </View>
      <Toggle />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  textDisabled: {
    color: colors.textMuted,
  },
  toggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  knob: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 2,
  },
  knobActive: {
    backgroundColor: colors.text,
  },
});

export default GlassToggle;
