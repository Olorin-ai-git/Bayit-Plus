import { View, Text, StyleSheet } from 'react-native';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface StatCardProps {
  icon: any;
  iconColor?: string;
  label: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({
  icon: Icon,
  iconColor = '#6B21A8',
  label,
  value,
  loading,
}: StatCardProps) {
  return (
    <GlassView style={styles.container} intensity="medium">
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.value}>{loading ? '...' : value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
