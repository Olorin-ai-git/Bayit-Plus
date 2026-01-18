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
      style={[styles.toggle, value && styles.toggleActive, disabled && styles.toggleDisabled]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundLighter,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  toggleKnobActive: {},
});
