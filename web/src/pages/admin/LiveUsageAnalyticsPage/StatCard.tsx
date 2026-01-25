import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';

interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
  isRTL?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  color = colors.primary,
  isRTL = false,
}: StatCardProps) {
  return (
    <GlassCard style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{label}</Text>
        <Text style={[styles.statValue, isRTL && styles.textRTL]}>{value}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
});
