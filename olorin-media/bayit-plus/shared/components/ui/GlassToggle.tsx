import React from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
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
      className={`p-0.5 justify-center border ${value ? '' : 'border-white/10'} ${value ? '' : 'bg-white/10'} ${disabled ? 'opacity-50' : ''}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: dimensions.height / 2,
        alignItems: value ? 'flex-end' : 'flex-start',
        ...(value ? { backgroundColor: colors.primary, borderColor: colors.primary } : {})
      }}
    >
      <View
        className="bg-white/90 shadow-sm"
        style={{
          width: dimensions.knob,
          height: dimensions.knob,
          borderRadius: dimensions.knob / 2,
          backgroundColor: value ? colors.text : 'rgba(255, 255, 255, 0.9)',
          elevation: 2,
        }}
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
      className={`flex-row items-center justify-between py-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1">
        <Text className={`text-[15px] font-medium ${isRTL ? 'text-right' : ''}`} style={{ color: disabled ? colors.textMuted : colors.text }}>
          {label}
        </Text>
        {description && (
          <Text className={`text-[13px] mt-0.5 leading-[18px] ${isRTL ? 'text-right' : ''}`} style={{ color: colors.textMuted }}>
            {description}
          </Text>
        )}
      </View>
      <Toggle />
    </Pressable>
  );
};

export default GlassToggle;
