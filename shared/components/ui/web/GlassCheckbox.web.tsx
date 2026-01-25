/**
 * GlassCheckbox - Web-specific implementation
 *
 * Uses direct CSS styling for proper web rendering instead of React Native styles
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

export interface GlassCheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  testID?: string;
}

export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  label,
  checked = false,
  onChange,
  onCheckedChange,
  error,
  disabled = false,
  testID,
}) => {
  const handlePress = () => {
    if (!disabled) {
      const newValue = !checked;
      onChange?.(newValue);
      onCheckedChange?.(newValue);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <button
        type="button"
        onClick={handlePress}
        disabled={disabled}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
        aria-checked={checked}
        aria-disabled={disabled}
        role="checkbox"
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: borderRadius.sm,
            border: `2px solid ${checked ? colors.primary.DEFAULT : 'rgba(255, 255, 255, 0.2)'}`,
            backgroundColor: checked ? colors.primary.DEFAULT : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: label ? spacing.sm : 0,
            transition: 'all 0.2s ease',
          }}
        >
          {checked && <Check size={16} color="#fff" strokeWidth={3} />}
        </div>

        {label && (
          <span
            style={{
              fontSize: 16,
              color: disabled ? colors.textMuted : colors.text,
            }}
          >
            {label}
          </span>
        )}
      </button>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No specific container styles needed
  },
  errorText: {
    fontSize: 12,
    color: colors.error.DEFAULT,
    marginTop: spacing.xs,
  },
});

export default GlassCheckbox;
