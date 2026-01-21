import { View, Pressable } from 'react-native';

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
      className={`w-[52px] h-7 rounded-[14px] p-0.5 justify-center ${value ? 'bg-[#6B21A8]' : 'bg-white/10'} ${disabled ? 'opacity-50' : ''}`}
    >
      <View
        className={`w-6 h-6 rounded-xl bg-white ${value ? (isRTL ? 'self-start' : 'self-end') : ''}`}
      />
    </Pressable>
  );
}
