import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassView } from './GlassView';

export interface GlassStatCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
  compact?: boolean;
  style?: any;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({
  icon,
  iconColor = colors.primary,
  iconBgColor,
  label,
  value,
  subtitle,
  onPress,
  compact = false,
  style,
}) => {
  const bgColor = iconBgColor || `${iconColor}20`;

  const content = (
    <GlassView className={compact ? "flex-row items-center p-4 gap-2 min-h-[80px]" : "flex-row items-center p-6 gap-4"} style={style}>
      <View className="justify-center items-center">
        {icon}
      </View>
      <View className="flex-1 min-w-0">
        <Text className={compact ? "text-[11px] text-gray-400 mb-0.5 flex-wrap" : "text-[13px] text-gray-400 mb-0.5"} style={{ color: colors.textMuted }}>
          {label}
        </Text>
        <Text className={compact ? "text-lg font-semibold text-white" : "text-2xl font-bold text-white"} style={{ color: colors.text }}>
          {value}
        </Text>
        {subtitle && <Text className="text-xs text-gray-400 mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>}
      </View>
    </GlassView>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-80 active:scale-[0.98]">
        {content}
      </Pressable>
    );
  }

  return content;
};

export default GlassStatCard;
