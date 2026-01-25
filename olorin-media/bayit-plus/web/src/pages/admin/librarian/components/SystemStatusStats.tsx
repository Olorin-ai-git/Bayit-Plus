import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, Zap, Calendar } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { LibrarianStatus } from '@/services/librarianService';
import { format } from 'date-fns';

interface SystemStatusStatsProps {
  status: LibrarianStatus | null;
  textAlign: 'left' | 'right' | 'center';
  getHealthColor: (health: string) => string;
}

export const SystemStatusStats = ({ status, textAlign, getHealthColor }: SystemStatusStatsProps) => {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { textAlign }]}>
        {t('admin.librarian.stats.title', 'System Status')}
      </Text>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Bot size={20} color={getHealthColor(status?.system_health || 'unknown')} />
          <Text style={[styles.statValue, { color: getHealthColor(status?.system_health || 'unknown') }]}>
            {status?.system_health ? t(`admin.librarian.health.${status.system_health}`) : '?'}
          </Text>
          <Text style={styles.statLabel}>{t('admin.librarian.stats.systemHealth')}</Text>
        </View>
        <View style={styles.statBox}>
          <RefreshCw size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.primary.DEFAULT }]}>
            {status?.total_audits_last_30_days || 0}
          </Text>
          <Text style={styles.statLabel}>{t('admin.librarian.stats.totalAudits')}</Text>
        </View>
        <View style={styles.statBox}>
          <Zap size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.success }]}>
            {status?.total_issues_fixed || 0}
          </Text>
          <Text style={styles.statLabel}>{t('admin.librarian.stats.issuesFixed')}</Text>
        </View>
        <View style={styles.statBox}>
          <Calendar size={20} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {status?.last_audit_date ? format(new Date(status.last_audit_date), 'MMM d') : '-'}
          </Text>
          <Text style={styles.statLabel}>{t('admin.librarian.stats.lastAudit')}</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
