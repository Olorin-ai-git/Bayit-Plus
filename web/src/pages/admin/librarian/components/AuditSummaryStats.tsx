import { View, Text, StyleSheet } from 'react-native';
import { Activity, CheckCircle, Wrench, DollarSign } from 'lucide-react';
import { GlassStatCard } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { AuditReport, LibrarianConfig } from '@/services/librarianService';

interface AuditSummaryStatsProps {
  reports: AuditReport[];
  budgetUsed: number;
  config: LibrarianConfig;
  isRTL: boolean;
}

interface AuditStats {
  totalAudits30Days: number;
  successRate: number;
  totalFixesApplied: number;
  budgetConsumed: number;
  budgetLimit: number;
}

const calculateStats = (reports: AuditReport[], config: LibrarianConfig): AuditStats => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReports = reports.filter(r => new Date(r.audit_date) >= thirtyDaysAgo);
  const completedReports = recentReports.filter(r => r.status === 'completed');

  const totalAudits30Days = recentReports.length;
  const successRate = totalAudits30Days > 0
    ? (completedReports.length / totalAudits30Days) * 100
    : 0;

  const totalFixesApplied = recentReports.reduce((sum, r) => sum + (r.fixes_count || 0), 0);

  const budgetConsumed = recentReports.reduce((sum, r) => {
    return sum + ((r as any).content_results?.total_cost_usd || 0);
  }, 0);

  const budgetLimit = config.audit_limits.max_budget_usd * 30;

  return {
    totalAudits30Days,
    successRate: Math.round(successRate * 10) / 10,
    totalFixesApplied,
    budgetConsumed: Math.round(budgetConsumed * 100) / 100,
    budgetLimit,
  };
};

export const AuditSummaryStats = ({ reports, budgetUsed, config, isRTL }: AuditSummaryStatsProps) => {
  const { t } = useTranslation();
  const stats = calculateStats(reports, config);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('admin.librarian.stats.title', 'Audit Overview (30 Days)')}
      </Text>

      <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <GlassStatCard
          icon={<Activity size={20} color={colors.primary.DEFAULT} />}
          label={t('admin.librarian.stats.totalAudits', 'Total Runs')}
          value={stats.totalAudits30Days}
          compact
          style={styles.statCard}
        />

        <GlassStatCard
          icon={<CheckCircle size={20} color={colors.success.DEFAULT} />}
          label={t('admin.librarian.stats.successRate', 'Success Rate')}
          value={`${stats.successRate}%`}
          compact
          style={styles.statCard}
        />

        <GlassStatCard
          icon={<Wrench size={20} color={colors.warning.DEFAULT} />}
          label={t('admin.librarian.stats.fixesApplied', 'Fixes Applied')}
          value={stats.totalFixesApplied}
          compact
          style={styles.statCard}
        />

        <GlassStatCard
          icon={<DollarSign size={20} color={colors.textMuted} />}
          label={t('admin.librarian.stats.budgetUsed', 'Budget Used')}
          value={`$${stats.budgetConsumed.toFixed(2)}`}
          subtitle={t('admin.librarian.stats.budgetLimit', '/ ${{limit}}', {
            limit: stats.budgetLimit.toFixed(0)
          })}
          compact
          style={styles.statCard}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
  },
});
