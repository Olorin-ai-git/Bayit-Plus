import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '@bayit/shared/theme';

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isRTL?: boolean;
}

export function Toggle({ value, onToggle, disabled, isRTL }: ToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.toggle, value && styles.toggleActive, disabled && styles.toggleDisabled]}
    >
      <View
        style={[
          styles.toggleKnob,
          value && (isRTL ? styles.toggleKnobActiveRTL : styles.toggleKnobActive),
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
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
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  toggleKnobActiveRTL: {
    alignSelf: 'flex-start',
  },
});
