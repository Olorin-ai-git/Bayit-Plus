import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface UsageRowProps {
  label: string;
  current: number;
  limit: number;
  accumulated?: number;
  isRTL: boolean;
}

export default function UsageRow({ label, current, limit, accumulated, isRTL }: UsageRowProps) {
  const totalAvailable = limit + (accumulated || 0);
  const percentage = totalAvailable > 0 ? (current / totalAvailable) * 100 : 0;
  const isWarning = percentage >= 80;
  const isError = percentage >= 95;

  return (
    <View style={[styles.usageRow, isRTL && styles.usageRowRTL]}>
      <Text style={[styles.usageLabel, isRTL && styles.textRTL]}>{label}</Text>
      <View style={[styles.usageValues, isRTL && styles.usageValuesRTL]}>
        <Text
          style={[
            styles.usageText,
            isWarning && styles.usageWarning,
            isError && styles.usageError,
          ]}
        >
          {current.toFixed(1)} / {totalAvailable.toFixed(0)} min
        </Text>
        {accumulated && accumulated > 0 && (
          <Text style={styles.rolloverText}>(+{accumulated.toFixed(0)} saved)</Text>
        )}
        <View
          style={[
            styles.usageBar,
            { width: `${Math.min(percentage, 100)}%` },
            isWarning && styles.usageBarWarning,
            isError && styles.usageBarError,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  usageRowRTL: {
    flexDirection: 'row-reverse',
  },
  usageLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
  usageValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    position: 'relative',
  },
  usageValuesRTL: {
    flexDirection: 'row-reverse',
  },
  usageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  usageWarning: {
    color: '#f59e0b',
  },
  usageError: {
    color: colors.error.DEFAULT,
  },
  rolloverText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  usageBar: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    height: 3,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  usageBarWarning: {
    backgroundColor: '#f59e0b',
  },
  usageBarError: {
    backgroundColor: colors.error.DEFAULT,
  },
});
