/**
 * GlassToggle Component
 *
 * Glassmorphic toggle switch with optional label and description.
 * Supports RTL layout and accessibility.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '../../theme';

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
      className={`justify-center p-0.5 ${value ? 'items-end' : 'items-start'}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: dimensions.height / 2,
        borderWidth: 1,
        borderColor: value ? colors.primary : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: value ? colors.primary : 'rgba(255, 255, 255, 0.1)',
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View
        className="shadow-md elevation-2"
        style={{
          width: dimensions.knob,
          height: dimensions.knob,
          borderRadius: dimensions.knob / 2,
          backgroundColor: value ? colors.text : 'rgba(255, 255, 255, 0.9)',
        }}
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
      className={`flex-row items-center justify-between py-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''} ${disabled ? 'opacity-50' : ''}`}
      testID={testID}
    >
      <View className="flex-1">
        <Text
          className={`text-[15px] font-medium ${isRTL ? 'text-right' : ''}`}
          style={{ color: disabled ? colors.textMuted : colors.text }}
        >
          {label}
        </Text>
        {description && (
          <Text
            className={`text-[13px] mt-0.5 leading-[18px] ${isRTL ? 'text-right' : ''}`}
            style={{ color: colors.textMuted }}
          >
            {description}
          </Text>
        )}
      </View>
      <Toggle />
    </Pressable>
  );
};

export default GlassToggle;
