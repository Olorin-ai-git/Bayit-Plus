/**
 * GlassStatCard Component
 *
 * Statistics card with glassmorphic styling.
 * Displays icon, label, value, and optional subtitle.
 */

import React from 'react';
import { View, Text, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing } from '../../theme';
import { GlassView } from './GlassView';

export interface GlassStatCardProps {
  /** Icon element */
  icon: React.ReactNode;
  /** Icon color */
  iconColor?: string;
  /** Icon background color */
  iconBgColor?: string;
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Optional subtitle */
  subtitle?: string;
  /** Press handler */
  onPress?: () => void;
  /** Compact layout */
  compact?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic statistics card component
 */
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
  testID,
}) => {
  const content = (
    <GlassView
      className={compact ? 'flex-row items-center p-4 gap-2 min-h-[80px]' : 'flex-row items-center p-6 gap-4'}
      style={style}
      testID={testID}
    >
      <View className="justify-center items-center">{icon}</View>
      <View className="flex-1 min-w-0">
        <Text
          className={compact ? 'text-[11px] mb-0.5 flex-wrap' : 'text-[13px] mb-0.5'}
          style={{ color: colors.textMuted }}
        >
          {label}
        </Text>
        <Text
          className={compact ? 'text-[18px] font-semibold' : 'text-2xl font-bold'}
          style={{ color: colors.text }}
        >
          {value}
        </Text>
        {subtitle && (
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {subtitle}
          </Text>
        )}
      </View>
    </GlassView>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="opacity-100 active:opacity-80 active:scale-[0.98]"
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

export default GlassStatCard;
