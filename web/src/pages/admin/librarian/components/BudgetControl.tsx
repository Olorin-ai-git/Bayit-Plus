import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { LibrarianConfig } from '@/services/librarianService';

interface BudgetControlProps {
  budgetLimit: number;
  budgetUsed: number;
  config: LibrarianConfig;
  onBudgetChange: (value: number) => void;
}

export const BudgetControl = ({ budgetLimit, budgetUsed, config, onBudgetChange }: BudgetControlProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.budgetSection}>
      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>
          {t('admin.librarian.quickActions.budgetPerAudit', 'Budget per Audit:')} ${budgetLimit.toFixed(2)}
        </Text>
        <View style={styles.budgetButtons}>
          <Pressable
            style={styles.budgetButton}
            onPress={() => onBudgetChange(Math.max(config.audit_limits.min_budget_usd, budgetLimit - config.audit_limits.budget_step_usd))}
          >
            <Text style={styles.budgetButtonText}>-</Text>
          </Pressable>
          <Pressable
            style={styles.budgetButton}
            onPress={() => onBudgetChange(Math.min(config.audit_limits.max_budget_usd, budgetLimit + config.audit_limits.budget_step_usd))}
          >
            <Text style={styles.budgetButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.budgetUsageRow}>
        <Text style={styles.budgetUsageLabel}>
          {t('admin.librarian.quickActions.monthlyBudgetUsed', 'Monthly Budget (Last 30 days):')}
        </Text>
        <Text style={[
          styles.budgetUsageAmount,
          budgetUsed > (config.audit_limits.max_budget_usd * 20) && styles.budgetUsageWarning
        ]}>
          ${budgetUsed.toFixed(2)} / ${(config.audit_limits.max_budget_usd * 30).toFixed(2)}
        </Text>
      </View>

      {budgetUsed + budgetLimit > (config.audit_limits.max_budget_usd * 30) && (
        <View style={styles.budgetWarningBox}>
          <Text style={styles.budgetWarningText}>
            ⚠️ {t('admin.librarian.quickActions.budgetWarning', 'Running this audit would exceed monthly budget limit')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  budgetSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: colors.text,
  },
  budgetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  budgetButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  budgetUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  budgetUsageLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  budgetUsageAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  budgetUsageWarning: {
    color: colors.warning,
  },
  budgetWarningBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  budgetWarningText: {
    fontSize: 12,
    color: colors.warning,
    textAlign: 'center',
  },
});
