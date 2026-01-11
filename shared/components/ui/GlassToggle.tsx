import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export interface GlassToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  isRTL?: boolean;
}

const SIZES = {
  small: { width: 44, height: 24, knob: 20 },
  medium: { width: 52, height: 28, knob: 24 },
};

export const GlassToggle: React.FC<GlassToggleProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  size = 'medium',
  isRTL = false,
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
        },
        value && styles.toggleActive,
        disabled && styles.toggleDisabled,
      ]}
    >
      <View
        style={[
          styles.knob,
          {
            width: dimensions.knob,
            height: dimensions.knob,
            borderRadius: dimensions.knob / 2,
            transform: [{ translateX: value ? dimensions.width - dimensions.knob - 2 : 0 }],
          },
          value && styles.knobActive,
        ]}
      />
    </Pressable>
  );

  if (!label) {
    return <Toggle />;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        isRTL && styles.containerRTL,
        disabled && styles.containerDisabled,
      ]}
    >
      <View style={styles.labelContainer}>
        <Text style={[styles.label, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.description, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  knobActive: {
    backgroundColor: colors.text,
  },
});

export default GlassToggle;
