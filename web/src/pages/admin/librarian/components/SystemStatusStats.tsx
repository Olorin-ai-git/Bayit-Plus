import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, Zap, Calendar } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
    <GlassCard style={styles.statsCard}>
      <Text style={[styles.sidebarSectionTitle, { textAlign }]}>
        {t('admin.librarian.stats.title', 'System Status')}
      </Text>
      <View style={styles.statsGridCompact}>
        <View style={styles.statBoxCompact}>
          <Bot size={20} color={getHealthColor(status?.system_health || 'unknown')} />
          <Text style={[styles.statBoxValue, { color: getHealthColor(status?.system_health || 'unknown') }]}>
            {status?.system_health ? t(`admin.librarian.health.${status.system_health}`) : '?'}
          </Text>
          <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.systemHealth')}</Text>
        </View>
        <View style={styles.statBoxCompact}>
          <RefreshCw size={20} color={colors.primary} />
          <Text style={[styles.statBoxValue, { color: colors.primary }]}>
            {status?.total_audits_last_30_days || 0}
          </Text>
          <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.totalAudits')}</Text>
        </View>
        <View style={styles.statBoxCompact}>
          <Zap size={20} color={colors.success} />
          <Text style={[styles.statBoxValue, { color: colors.success }]}>
            {status?.total_issues_fixed || 0}
          </Text>
          <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.issuesFixed')}</Text>
        </View>
        <View style={styles.statBoxCompact}>
          <Calendar size={20} color={colors.textMuted} />
          <Text style={styles.statBoxValue}>
            {status?.last_audit_date ? format(new Date(status.last_audit_date), 'MMM d') : '-'}
          </Text>
          <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.lastAudit')}</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    padding: spacing.md,
  },
  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBoxCompact: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
