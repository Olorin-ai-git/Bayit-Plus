import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface Trend {
  value: number;
  isPositive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string | ReactNode;
  trend?: Trend;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  to?: string;
}

const colorMap = {
  primary: { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primary.DEFAULT },
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

  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colorStyle.bg }]}>
            {typeof icon === 'string' ? (
              <Text style={styles.icon}>{icon}</Text>
            ) : (
              icon
            )}
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colorStyle.text }]}>{value}</Text>

        {trend && (
          <View style={[
            styles.trendBadge,
            trend.isPositive ? styles.trendPositive : styles.trendNegative,
          ]}>
            <Text style={[
              styles.trendText,
              { color: trend.isPositive ? '#22C55E' : '#EF4444' },
            ]}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (to) {
    return (
      <View style={styles.wrapper}>
        <Link to={to} style={{ textDecoration: 'none', flex: 1, display: 'flex' }}>
          {content}
        </Link>
      </View>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexBasis: '23%',
    minWidth: 200,
    maxWidth: 300,
  },
  card: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: colors.textMuted,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    opacity: 0.7,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
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
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
