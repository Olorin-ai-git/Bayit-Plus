import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useMissionsStore } from '@/stores/missionsStore';

export function ShekelBalance() {
  const { walletBalance, loadingBalance } = useMissionsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (loadingBalance) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading balance...</Text>
      </View>
    );
  }

  if (!walletBalance) {
    return null;
  }

  const { balance, total_earned, total_spent } = walletBalance;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Shekels</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.primary[400]} />
        ) : (
          <ChevronDown size={20} color={colors.primary[400]} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={styles.statValue}>{total_earned.toLocaleString()}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>{total_spent.toLocaleString()}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.bgLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: fontSize['2xl'],
    color: colors.primary[400],
    fontWeight: '700',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.glass.borderLight,
    gap: spacing[2],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '600',
  },
});
