/**
 * StatCard Component
 * Reusable statistics card for admin dashboard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { colors, spacing } from '@olorin/design-tokens';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = colors.primary.DEFAULT,
  onPress,
}) => {
  const { isRTL, textAlign, flexDirection } = useDirection();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      className="bg-white/5 rounded-lg border border-white/10 p-4 min-w-[200px]"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="items-start mb-4" style={{ flexDirection }}>
        {icon && (
          <View
            className="justify-center items-center rounded-md"
            style={[
              {
                width: 44,
                height: 44,
                backgroundColor: color + '20',
                marginLeft: isRTL ? 0 : spacing.sm,
                marginRight: isRTL ? spacing.sm : 0,
              }
            ]}
          >
            <Text style={{ fontSize: 22 }}>{icon}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-gray-400 mb-1 text-sm" style={{ textAlign }}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-gray-500 text-xs" style={{ textAlign }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-3xl font-bold" style={{ color }}>
          {value}
        </Text>

        {trend && (
          <View
            className="px-2 py-1 rounded"
            style={{ backgroundColor: trend.isPositive ? '#10b98120' : '#ef444420' }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: trend.isPositive ? '#10b981' : '#ef4444' }}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </Container>
  );
};

export default StatCard;
