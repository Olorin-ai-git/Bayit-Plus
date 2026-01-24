/**
 * Toggle Component
 * Reusable toggle switch for settings
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '@bayit/shared/theme';
import { ToggleProps } from '../types';

export function Toggle({ value, onToggle, disabled }: ToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.toggle,
        value ? styles.toggleActive : styles.toggleInactive,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.toggleThumb} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 9999,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#9333EA',
    justifyContent: 'flex-end',
  },
  toggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
  },
});
