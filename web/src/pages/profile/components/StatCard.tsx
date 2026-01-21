import { View, Text, StyleSheet } from 'react-native';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface StatCardProps {
  icon: any;
  iconColor?: string;
  label: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({
  icon: Icon,
  iconColor = colors.primary,
  label,
  value,
  loading,
}: StatCardProps) {
  return (
    <GlassView style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{loading ? '...' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
