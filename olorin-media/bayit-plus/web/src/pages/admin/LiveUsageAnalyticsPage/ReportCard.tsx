import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { UsageReport } from './types';

interface ReportCardProps {
  title: string;
  report: UsageReport | null;
  isRTL: boolean;
}

export default function ReportCard({ title, report, isRTL }: ReportCardProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.reportCard}>
      <View style={[styles.reportHeader, isRTL && styles.reportHeaderRTL]}>
        <Calendar size={20} color={colors.primary} />
        <Text style={[styles.reportTitle, isRTL && styles.textRTL]}>{title}</Text>
      </View>
      <View style={styles.reportStats}>
        <View style={styles.reportStat}>
          <Text style={styles.reportStatLabel}>
            {t('admin.liveQuotas.totalSessions', 'Total Sessions')}
          </Text>
          <Text style={styles.reportStatValue}>{report?.total_sessions || 0}</Text>
        </View>
        <View style={styles.reportStat}>
          <Text style={styles.reportStatLabel}>
            {t('admin.liveQuotas.totalMinutes', 'Total Minutes')}
          </Text>
          <Text style={styles.reportStatValue}>
            {(report?.total_minutes || 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.reportStat}>
          <Text style={styles.reportStatLabel}>
            {t('admin.liveQuotas.totalCost', 'Total Cost')}
          </Text>
          <Text style={styles.reportStatValue}>
            ${(report?.total_cost || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  reportCard: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  reportStats: {
    gap: spacing.md,
  },
  reportStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reportStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
