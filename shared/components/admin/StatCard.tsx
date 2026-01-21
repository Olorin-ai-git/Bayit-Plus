/**
 * StatCard Component
 * Reusable statistics card for admin dashboard
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
  color = colors.primary,
  onPress,
}) => {
  const { isRTL, textAlign, flexDirection } = useDirection();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.header, { flexDirection }]}>
        {icon && (
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: color + '20',
              marginLeft: isRTL ? 0 : spacing.sm,
              marginRight: isRTL ? spacing.sm : 0,
            }
          ]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { textAlign }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { textAlign }]}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color }]}>{value}</Text>

        {trend && (
          <View style={[
            styles.trendContainer,
            { backgroundColor: trend.isPositive ? colors.success + '20' : colors.error + '20' }
          ]}>
            <Text style={[
              styles.trendText,
              { color: trend.isPositive ? colors.success : colors.error }
            ]}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    minWidth: 200,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  trendContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});

export default StatCard;
