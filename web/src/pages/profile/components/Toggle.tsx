import { View, Pressable, StyleSheet } from 'react-native';

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
      className="w-[52px] h-7 rounded-[14px] p-0.5 justify-center"
      style={[
        value ? styles.bgActive : styles.bgInactive,
        disabled && styles.disabled,
      ]}
    >
      <View
        className="w-6 h-6 rounded-xl bg-white"
        style={[value && (isRTL ? styles.thumbStart : styles.thumbEnd)]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bgActive: {
    backgroundColor: '#6B21A8',
  },
  bgInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabled: {
    opacity: 0.5,
  },
  thumbStart: {
    alignSelf: 'flex-start',
  },
  thumbEnd: {
    alignSelf: 'flex-end',
  },
});
