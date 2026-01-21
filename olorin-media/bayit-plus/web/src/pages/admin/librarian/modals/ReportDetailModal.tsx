import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { GlassModal, GlassButton, GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
        <View style={styles.modalLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
        </View>
      ) : report ? (
        <>
          <View style={styles.modalHeaderActions}>
            <GlassButton
              title={t('admin.librarian.reports.viewLogs')}
              variant="secondary"
              icon={<FileText size={16} color={colors.text} />}
              onPress={() => {
                onClose();
                onViewLogs(report.audit_id);
              }}
              style={styles.viewLogsButton}
            />
          </View>
          <ScrollView style={[styles.modalContent, { maxHeight: config?.ui.modal_max_height || 600 }]}>
            <GlassCard style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.summary')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.status')}</Text>
                  <GlassBadge
                    text={t(`admin.librarian.status.${report.status}`, report.status)}
                    variant={
                      report.status === 'completed' ? 'success' :
                      report.status === 'failed' ? 'error' : 'warning'
                    }
                  />
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.executionTime')}</Text>
                  <Text style={styles.statValue}>{report.execution_time_seconds.toFixed(1)}s</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.totalItems')}</Text>
                  <Text style={styles.statValue}>{report.summary.total_items ?? 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.healthyItems')}</Text>
                  <Text style={styles.statValue}>{report.summary.healthy_items ?? 0}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.issuesFound')}</Text>
              {report.audit_type === 'ai_agent' ? (
                <View style={styles.fixesContainer}>
                  <Text style={styles.issueCount}>{report.summary.issues_found ?? 0}</Text>
                  <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.totalIssues')}</Text>
                  {report.ai_insights && report.ai_insights.length > 0 && (
                    <Text style={styles.aiAuditNote}>{t('admin.librarian.reports.detailModal.seeInsightsBelow')}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.issuesGrid}>
                  <View style={styles.issueItem}>
                    <Text style={styles.issueCount}>{report.broken_streams?.length ?? 0}</Text>
                    <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.brokenStreams')}</Text>
                  </View>
                  <View style={styles.issueItem}>
                    <Text style={styles.issueCount}>{report.missing_metadata?.length ?? 0}</Text>
                    <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.missingMetadata')}</Text>
                  </View>
                  <View style={styles.issueItem}>
                    <Text style={styles.issueCount}>{report.misclassifications?.length ?? 0}</Text>
                    <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.misclassifications')}</Text>
                  </View>
                  <View style={styles.issueItem}>
                    <Text style={styles.issueCount}>{report.orphaned_items?.length ?? 0}</Text>
                    <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.orphanedItems')}</Text>
                  </View>
                </View>
              )}
            </GlassCard>

            <GlassCard style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.fixesApplied')}</Text>
              <View style={styles.fixesContainer}>
                <Text style={styles.fixesCount}>
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
              <GlassCard style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.aiInsights')}</Text>
                {report.ai_insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Text style={styles.insightBullet}>•</Text>
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
  modalLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textMuted,
  },
  modalHeaderActions: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    alignItems: 'flex-end',
  },
  viewLogsButton: {
    alignSelf: 'flex-end',
  },
  modalContent: {},
  modalSection: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  issueItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  issueCount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  issueLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fixesContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  fixesCount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  fixesLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  aiAuditNote: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  insightBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
