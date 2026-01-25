import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle, AlertTriangle, Info, Archive } from 'lucide-react';
import { GlassModal, GlassButton, GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { AuditReportDetail, LibrarianConfig } from '@/services/librarianService';

interface ReportDetailModalProps {
  visible: boolean;
  loading: boolean;
  report: AuditReportDetail | null;
  config: LibrarianConfig | null;
  onClose: () => void;
  onViewLogs: (auditId: string) => void;
}

// Utility Functions
type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'purple' | 'info';

const formatExecutionTime = (seconds: number | undefined): string => {
  if (seconds === undefined || seconds === null) return '—';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-US').format(value);
};

const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'in_progress': return 'warning';
    case 'partial': return 'info';
    default: return 'default';
  }
};

const hasInsights = (insights: string[] | null | undefined): boolean => {
  return Array.isArray(insights) && insights.length > 0;
};

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
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
        </View>
      ) : report ? (
        <>
          {/* Action Bar */}
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
            {/* 1. Status Header Card */}
            <GlassCard style={styles.statusHeaderCard}>
              <GlassBadge
                variant={getStatusVariant(report.status)}
                size="lg"
                dot
                style={styles.statusBadge}
              >
                {t(`admin.librarian.status.${report.status}`, report.status)}
              </GlassBadge>
              <View style={styles.heroMetricContainer}>
                <Text style={styles.heroMetricValue}>
                  {formatExecutionTime(report.execution_time_seconds)}
                </Text>
                <Text style={styles.heroMetricLabel}>
                  {t('admin.librarian.reports.detailModal.executionTime')}
                </Text>
              </View>
              {report.completed_at && (
                <Text style={styles.timestampText}>
                  {formatDateTime(report.completed_at)}
                </Text>
              )}
            </GlassCard>

            {/* 2. Metrics Summary Card */}
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>
                {t('admin.librarian.reports.detailModal.summary')}
              </Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>
                    {formatNumber(report.summary.total_items)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('admin.librarian.reports.detailModal.totalItems')}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>
                    {formatNumber(report.summary.healthy_items)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('admin.librarian.reports.detailModal.healthyItems')}
                  </Text>
                </View>
                <View style={[styles.metricBox, styles.metricBoxIssues]}>
                  <Text style={[styles.metricValue, styles.metricValueIssues]}>
                    {formatNumber(report.summary.issues_found)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('admin.librarian.reports.detailModal.issuesFound')}
                  </Text>
                </View>
                <View style={[styles.metricBox, styles.metricBoxFixes]}>
                  <Text style={[styles.metricValue, styles.metricValueFixes]}>
                    {formatNumber(report.summary.issues_fixed)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('admin.librarian.reports.detailModal.fixesApplied')}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* 3. Issues Breakdown Card (only for daily_incremental) */}
            {report.audit_type === 'daily_incremental' && (
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t('admin.librarian.reports.detailModal.issuesBreakdown')}
                </Text>
                <View style={styles.issuesGrid}>
                  <View style={styles.issueTypeBox}>
                    <AlertCircle size={24} color={colors.error.DEFAULT} />
                    <Text style={[styles.issueTypeValue, styles.issueTypeValueError]}>
                      {formatNumber(report.broken_streams?.length)}
                    </Text>
                    <Text style={styles.issueTypeLabel}>
                      {t('admin.librarian.reports.detailModal.brokenStreams')}
                    </Text>
                  </View>
                  <View style={styles.issueTypeBox}>
                    <AlertTriangle size={24} color="#fb923c" />
                    <Text style={[styles.issueTypeValue, styles.issueTypeValueWarning]}>
                      {formatNumber(report.missing_metadata?.length)}
                    </Text>
                    <Text style={styles.issueTypeLabel}>
                      {t('admin.librarian.reports.detailModal.missingMetadata')}
                    </Text>
                  </View>
                  <View style={styles.issueTypeBox}>
                    <Info size={24} color={colors.info.DEFAULT} />
                    <Text style={[styles.issueTypeValue, styles.issueTypeValueInfo]}>
                      {formatNumber(report.misclassifications?.length)}
                    </Text>
                    <Text style={styles.issueTypeLabel}>
                      {t('admin.librarian.reports.detailModal.misclassifications')}
                    </Text>
                  </View>
                  <View style={styles.issueTypeBox}>
                    <Archive size={24} color={colors.textMuted} />
                    <Text style={styles.issueTypeValue}>
                      {formatNumber(report.orphaned_items?.length)}
                    </Text>
                    <Text style={styles.issueTypeLabel}>
                      {t('admin.librarian.reports.detailModal.orphanedItems')}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* 4. AI Insights Card */}
            {hasInsights(report.ai_insights) && (
              <GlassCard style={styles.insightsCard}>
                <View style={styles.insightsHeader}>
                  <Text style={styles.cardTitle}>
                    {t('admin.librarian.reports.detailModal.aiInsights')}
                  </Text>
                  <GlassBadge variant="purple" size="sm">
                    {report.ai_insights!.length}
                  </GlassBadge>
                </View>
                {report.ai_insights!.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
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

  // Status Header Card
  statusHeaderCard: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  statusBadge: {
    marginBottom: spacing.md,
  },
  heroMetricContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heroMetricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
    lineHeight: 44,
  },
  heroMetricLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  timestampText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 100,
    justifyContent: 'center',
  },
  metricBoxIssues: {
    borderColor: 'rgba(251, 146, 60, 0.5)',
  },
  metricBoxFixes: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  metricValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricValueIssues: {
    color: '#fb923c',
  },
  metricValueFixes: {
    color: colors.success.DEFAULT,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors.textMuted,
  },

  // Issues Breakdown Grid
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  issueTypeBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 120,
    justifyContent: 'center',
  },
  issueTypeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  issueTypeValueError: {
    color: colors.error.DEFAULT,
  },
  issueTypeValueWarning: {
    color: '#fb923c',
  },
  issueTypeValueInfo: {
    color: colors.info.DEFAULT,
  },
  issueTypeLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors.textMuted,
  },

  // AI Insights Card
  insightsCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(88, 28, 135, 0.15)',
    borderColor: colors.primary.DEFAULT,
    borderWidth: 1,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: fontSize.base,
    marginTop: 2,
    marginRight: spacing.sm,
    color: colors.primary.DEFAULT,
    fontWeight: 'bold',
  },
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.text,
  },
});
