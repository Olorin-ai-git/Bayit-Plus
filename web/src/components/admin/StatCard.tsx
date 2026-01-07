import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
  primary: { bg: 'rgba(0, 217, 255, 0.2)', text: colors.primary },
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
    <GlassCard style={[styles.card, to && styles.cardClickable]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colorStyle.bg }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.value, { color: colorStyle.text }]}>{value}</Text>

        {trend && (
          <View style={[styles.trendBadge, trend.isPositive ? styles.trendPositive : styles.trendNegative]}>
            <Text style={[styles.trendText, trend.isPositive ? styles.trendTextPositive : styles.trendTextNegative]}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );

  if (to) {
    return (
      <View style={styles.wrapper}>
        <Link to={to} style={{ textDecoration: 'none', flex: 1 }}>
          {content}
        </Link>
      </View>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    flexBasis: '23%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 200,
    maxWidth: 300,
  },
  card: {
    padding: spacing.md,
    height: '100%',
  },
  cardClickable: {
    // Hover styles handled by web CSS
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
  trendTextPositive: {
    color: '#22C55E',
  },
  trendTextNegative: {
    color: '#EF4444',
  },
});
