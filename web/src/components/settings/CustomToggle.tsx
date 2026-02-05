/**
 * CustomToggle Component
 * Custom Pressable-based toggle switch (replacement for native Switch)
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors } from '@olorin/design-tokens';

interface CustomToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function CustomToggle({ enabled, onToggle }: CustomToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.customToggle,
        enabled && styles.customToggleActive,
      ]}
    >
      <View
        style={[
          styles.customToggleThumb,
          enabled && styles.customToggleThumbActive,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  customToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray[700],
    justifyContent: 'center',
    padding: 2,
  },
  customToggleActive: {
    backgroundColor: colors.success.DEFAULT,
  },
  customToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    transform: [{ translateX: 0 }],
  },
  customToggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});
