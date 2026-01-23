import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { colors } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';

interface Trend {
  value: number;
  isPositive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: Trend;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  to?: string;
}

const colorMap = {
  primary: { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primary },
  secondary: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  success: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  warning: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  to,
}: StatCardProps) {
  const colorStyle = colorMap[color];

  // Dynamic trend badge style
  const trendBadgeStyle = [
    styles.trendBadge,
    trend?.isPositive ? styles.trendPositive : styles.trendNegative,
  ];

  const trendTextStyle = {
    color: trend?.isPositive ? '#22C55E' : '#EF4444',
  };

  const content = (
    <GlassCard className="p-4 h-full">
      <View className="flex-row items-start gap-2 mb-2">
        {icon && (
          <View className="w-11 h-11 rounded-lg justify-center items-center" style={{ backgroundColor: colorStyle.bg }}>
            <Text className="text-xl">{icon}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-sm" numberOfLines={1} style={{ color: colors.textMuted }}>{title}</Text>
          {subtitle && <Text className="text-xs opacity-70" numberOfLines={1} style={{ color: colors.textMuted }}>{subtitle}</Text>}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold" style={{ color: colorStyle.text }}>{value}</Text>

        {trend && (
          <View className="px-2 py-1 rounded" style={trendBadgeStyle}>
            <Text className="text-xs font-semibold" style={trendTextStyle}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );

  if (to) {
    return (
      <View className="flex-[1_1_23%] min-w-[200px] max-w-[300px]">
        <Link to={to} style={{ textDecoration: 'none', flex: 1 }}>
          {content}
        </Link>
      </View>
    );
  }

  return <View className="flex-[1_1_23%] min-w-[200px] max-w-[300px]">{content}</View>;
}

const styles = StyleSheet.create({
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trendPositive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  trendNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
});
