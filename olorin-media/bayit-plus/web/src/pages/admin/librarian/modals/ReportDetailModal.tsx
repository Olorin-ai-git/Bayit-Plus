import { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, Info, Archive, XCircle, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';
import { GlassModal, GlassButton, GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { AuditReportDetail, LibrarianConfig, LogEntry, reapplyAuditFixes } from '@/services/librarianService';
import logger from '@/utils/logger';

interface ReportDetailModalProps {
  visible: boolean;
  loading: boolean;
  report: AuditReportDetail | null;
  config: LibrarianConfig | null;
  onClose: () => void;
  onReapplySuccess?: (fixAuditId: string) => void;
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

const getLogLevelColor = (level: LogEntry['level']): string => {
  switch (level) {
    case 'error': return colors.error.DEFAULT;
    case 'warn': return '#fb923c';
    case 'success': return colors.success.DEFAULT;
    case 'info': return colors.info.DEFAULT;
    case 'debug': return colors.textMuted;
    case 'trace': return '#6b7280';
    default: return colors.text;
  }
};

const formatLogTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  } catch {
    return timestamp;
  }
};

export const ReportDetailModal = ({
  visible,
  loading,
  report,
  config,
  onClose,
  onReapplySuccess,
}: ReportDetailModalProps) => {
  const { t } = useTranslation();
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState<string | null>(null);

  const canReapplyFixes = report &&
    ['completed', 'partial', 'failed'].includes(report.status) &&
    (report.summary?.issues_found > 0 || report.summary?.issues_fixed < report.summary?.issues_found);

  const handleReapplyFixes = async () => {
    if (!report) return;

    setReapplying(true);
    setReapplyError(null);

    try {
      const result = await reapplyAuditFixes(report.audit_id, { dry_run: false });
      logger.info('Reapply fixes started', { fixAuditId: result.fix_audit_id });
      onClose();
      if (onReapplySuccess) {
        onReapplySuccess(result.fix_audit_id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reapply fixes';
      setReapplyError(errorMessage);
      logger.error('Failed to reapply fixes', { error: errorMessage });
    } finally {
      setReapplying(false);
    }
  };

  return (
    <GlassModal
      visible={visible}
      size="xl"
      title={t('admin.librarian.reports.detailModal.title', {
        id: report?.audit_id.substring(0, config?.ui.id_truncate_length || 8) || '...'
      })}
      onClose={onClose}
      buttons={[]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
        </View>
      ) : report ? (
        <>
          {/* Compact Action Bar */}
          {canReapplyFixes && (
            <View style={styles.actionBar}>
              <GlassButton
                title={reapplying
                  ? t('admin.librarian.reports.reapplying', 'Reapplying...')
                  : t('admin.librarian.reports.reapplyFixes', 'Reapply Fixes')
                }
                variant="primary"
                size="sm"
                icon={<RefreshCw size={14} color={colors.text} />}
                onPress={handleReapplyFixes}
                disabled={reapplying}
                style={styles.smallButton}
              />
              {reapplyError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={14} color={colors.error.DEFAULT} />
                  <Text style={styles.errorText}>{reapplyError}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.contentContainer}>
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

            {/* 1b. Agent Status Message (shows errors, warnings, or completion summary) */}
            {report.summary?.agent_summary && (
              <GlassCard style={[
                styles.agentMessageCard,
                report.status === 'failed' && styles.agentMessageCardError,
                report.status === 'partial' && styles.agentMessageCardWarning,
                report.status === 'completed' && styles.agentMessageCardSuccess,
              ]}>
                <View style={styles.agentMessageHeader}>
                  {report.status === 'failed' ? (
                    <XCircle size={20} color={colors.error.DEFAULT} />
                  ) : report.status === 'partial' ? (
                    <AlertTriangle size={20} color="#fb923c" />
                  ) : (
                    <CheckCircle2 size={20} color={colors.success.DEFAULT} />
                  )}
                  <Text style={[
                    styles.agentMessageTitle,
                    report.status === 'failed' && styles.agentMessageTitleError,
                    report.status === 'partial' && styles.agentMessageTitleWarning,
                  ]}>
                    {report.status === 'failed'
                      ? t('admin.librarian.reports.detailModal.auditFailed', 'Audit Failed')
                      : report.status === 'partial'
                      ? t('admin.librarian.reports.detailModal.auditIncomplete', 'Audit Incomplete')
                      : t('admin.librarian.reports.detailModal.agentSummary', 'Agent Summary')}
                  </Text>
                </View>
                <Text style={styles.agentMessageText}>
                  {report.summary.agent_summary}
                </Text>
                {report.summary?.error && (
                  <View style={styles.errorDetailBox}>
                    <Text style={styles.errorDetailLabel}>
                      {t('admin.librarian.reports.detailModal.errorDetails', 'Error Details')}:
                    </Text>
                    <Text style={styles.errorDetailText}>
                      {report.summary.error}
                    </Text>
                  </View>
                )}
              </GlassCard>
            )}

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

            {/* 5. Execution Logs Section */}
            {report.execution_logs && report.execution_logs.length > 0 && (
              <GlassCard style={styles.logsCard}>
                <View style={styles.logsHeader}>
                  <Terminal size={18} color={colors.primary.DEFAULT} />
                  <Text style={styles.cardTitle}>
                    {t('admin.librarian.logs.executionLog', 'Execution Log')}
                  </Text>
                  <GlassBadge variant="default" size="sm">
                    {report.execution_logs.length}
                  </GlassBadge>
                </View>
                <View style={styles.logsContainer}>
                  {report.execution_logs.map((log, index) => (
                    <View key={log.id || index} style={styles.logEntry}>
                      <Text style={styles.logTimestamp}>{formatLogTime(log.timestamp)}</Text>
                      <Text style={[styles.logLevel, { color: getLogLevelColor(log.level) }]}>
                        [{log.level.toUpperCase()}]
                      </Text>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      {log.itemName && (
                        <Text style={styles.logItemName}> - {log.itemName}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}
          </View>
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
  contentContainer: {
    gap: spacing.md,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
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

  // Agent Message Card (for errors, warnings, completion summary)
  agentMessageCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  agentMessageCardError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error.DEFAULT,
  },
  agentMessageCardWarning: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: '#fb923c',
  },
  agentMessageCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: colors.success.DEFAULT,
  },
  agentMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  agentMessageTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  agentMessageTitleError: {
    color: colors.error.DEFAULT,
  },
  agentMessageTitleWarning: {
    color: '#fb923c',
  },
  agentMessageText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.text,
  },
  errorDetailBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error.DEFAULT,
  },
  errorDetailLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  errorDetailText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
    color: colors.error.DEFAULT,
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

  // Execution Logs
  logsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  logsContainer: {
    maxHeight: 400,
    overflow: 'scroll',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  logEntry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  logTimestamp: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginRight: spacing.sm,
    minWidth: 70,
  },
  logLevel: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginRight: spacing.sm,
    minWidth: 60,
  },
  logMessage: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text,
    lineHeight: 18,
  },
  logItemName: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.primary.DEFAULT,
    fontStyle: 'italic',
  },
});
