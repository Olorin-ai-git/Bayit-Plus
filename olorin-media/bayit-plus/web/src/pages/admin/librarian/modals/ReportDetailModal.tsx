import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { GlassModal, GlassButton, GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { AuditReportDetail, LibrarianConfig } from '@/services/librarianService';

interface ReportDetailModalProps {
  visible: boolean;
  loading: boolean;
  report: AuditReportDetail | null;
  config: LibrarianConfig | null;
  onClose: () => void;
  onViewLogs: (auditId: string) => void;
}

export const ReportDetailModal = ({
  visible,
  loading,
  report,
  config,
  onClose,
  onViewLogs,
}: ReportDetailModalProps) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible={visible}
      title={t('admin.librarian.reports.detailModal.title', {
        id: report?.audit_id.substring(0, config?.ui.id_truncate_length || 8) || '...'
      })}
      onClose={onClose}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
        </View>
      ) : report ? (
        <>
          <View style={styles.actionBar}>
            <GlassButton
              title={t('admin.librarian.reports.viewLogs')}
              variant="secondary"
              icon={<FileText size={16} color={colors.text} />}
              onPress={() => {
                onClose();
                onViewLogs(report.audit_id);
              }}
              style={styles.actionButton}
            />
          </View>
          <ScrollView style={{ maxHeight: config?.ui.modal_max_height || 600 }}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('admin.librarian.reports.detailModal.summary')}</Text>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>{t('admin.librarian.reports.detailModal.status')}</Text>
                  <GlassBadge
                    text={t(`admin.librarian.status.${report.status}`, report.status)}
                    variant={
                      report.status === 'completed' ? 'success' :
                      report.status === 'failed' ? 'error' : 'warning'
                    }
                  />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>{t('admin.librarian.reports.detailModal.executionTime')}</Text>
                  <Text style={styles.statValue}>{report.execution_time_seconds.toFixed(1)}s</Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>{t('admin.librarian.reports.detailModal.totalItems')}</Text>
                  <Text style={styles.statValue}>{report.summary.total_items ?? 0}</Text>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>{t('admin.librarian.reports.detailModal.healthyItems')}</Text>
                  <Text style={styles.statValue}>{report.summary.healthy_items ?? 0}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('admin.librarian.reports.detailModal.issuesFound')}</Text>
              {report.audit_type === 'ai_agent' ? (
                <View style={styles.centeredBox}>
                  <Text style={styles.metricLarge}>{report.summary.issues_found ?? 0}</Text>
                  <Text style={styles.metricLabel}>{t('admin.librarian.reports.detailModal.totalIssues')}</Text>
                  {report.ai_insights && report.ai_insights.length > 0 && (
                    <Text style={styles.insightHint}>{t('admin.librarian.reports.detailModal.seeInsightsBelow')}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.gridContainer}>
                  <View style={styles.gridItem}>
                    <Text style={styles.metricLarge}>{report.broken_streams?.length ?? 0}</Text>
                    <Text style={styles.metricLabel}>{t('admin.librarian.reports.detailModal.brokenStreams')}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.metricLarge}>{report.missing_metadata?.length ?? 0}</Text>
                    <Text style={styles.metricLabel}>{t('admin.librarian.reports.detailModal.missingMetadata')}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.metricLarge}>{report.misclassifications?.length ?? 0}</Text>
                    <Text style={styles.metricLabel}>{t('admin.librarian.reports.detailModal.misclassifications')}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.metricLarge}>{report.orphaned_items?.length ?? 0}</Text>
                    <Text style={styles.metricLabel}>{t('admin.librarian.reports.detailModal.orphanedItems')}</Text>
                  </View>
                </View>
              )}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('admin.librarian.reports.detailModal.fixesApplied')}</Text>
              <View style={styles.centeredBox}>
                <Text style={styles.fixesValue}>
                  {report.audit_type === 'ai_agent'
                    ? (report.summary.issues_fixed ?? 0)
                    : (report.fixes_applied?.length ?? 0)}
                </Text>
                <Text style={styles.fixesLabel}>
                  {t('admin.librarian.reports.detailModal.totalFixes', {
                    count: report.audit_type === 'ai_agent'
                      ? (report.summary.issues_fixed ?? 0)
                      : (report.fixes_applied?.length ?? 0)
                  })}
                </Text>
              </View>
            </GlassCard>

            {report.ai_insights && report.ai_insights.length > 0 && (
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>{t('admin.librarian.reports.detailModal.aiInsights')}</Text>
                {report.ai_insights.map((insight, index) => (
                  <View key={index} style={styles.insightRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </GlassCard>
            )}
          </ScrollView>
        </>
      ) : null}
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  actionBar: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    alignItems: 'flex-end',
  },
  actionButton: {
    alignSelf: 'flex-end',
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  rowItem: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  centeredBox: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  metricLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.primary,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors.textMuted,
  },
  insightHint: {
    fontSize: 13,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fixesValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.success,
  },
  fixesLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  bulletPoint: {
    fontSize: fontSize.base,
    marginTop: 2,
    marginRight: spacing.xs,
    color: colors.primary,
  },
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.text,
  },
});
