import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Toggle } from './Toggle';

interface SettingRowProps {
  icon: any;
  iconColor?: string;
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  isRTL?: boolean;
}

export function SettingRow({
  icon: Icon,
  iconColor = '#6B21A8',
  label,
  description,
  value,
  onToggle,
  disabled,
  isRTL,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled || !onToggle}
      className="flex-row items-center gap-4 py-2"
      style={[disabled && styles.disabled]}
    >
      {isRTL ? (
        <>
          {value !== undefined && onToggle && (
            <Toggle value={value} onToggle={onToggle} disabled={disabled} isRTL={isRTL} />
          )}
          <View className="flex-1">
            <Text className="text-[15px] font-medium text-white text-right">{label}</Text>
            {description && (
              <Text className="text-xs text-white/60 mt-0.5 text-right">{description}</Text>
            )}
          </View>
          <View className="w-10 h-10 rounded-lg justify-center items-center" style={{ backgroundColor: `${iconColor}15` }}>
            <Icon size={20} color={iconColor} />
          </View>
        </>
      ) : (
        <>
          <View className="w-10 h-10 rounded-lg justify-center items-center" style={{ backgroundColor: `${iconColor}15` }}>
            <Icon size={20} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-medium text-white text-left">{label}</Text>
            {description && (
              <Text className="text-xs text-white/60 mt-0.5 text-left">{description}</Text>
            )}
          </View>
          {value !== undefined && onToggle && (
            <Toggle value={value} onToggle={onToggle} disabled={disabled} isRTL={isRTL} />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
