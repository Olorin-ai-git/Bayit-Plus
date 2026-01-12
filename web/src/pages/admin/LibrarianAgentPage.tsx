import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Bot, Play, Zap } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import LibrarianScheduleCard from '@/components/admin/LibrarianScheduleCard';
import LibrarianActivityLog from '@/components/admin/LibrarianActivityLog';
import { GlassCard, GlassButton, GlassModal, GlassBadge, GlassTable, GlassTableColumn } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import {
  getLibrarianConfig,
  getLibrarianStatus,
  getAuditReports,
  getLibrarianActions,
  getAuditReportDetails,
  triggerAudit,
  rollbackAction as rollbackActionAPI,
  LibrarianConfig,
  LibrarianStatus,
  AuditReport,
  LibrarianAction,
  AuditReportDetail,
} from '@/services/librarianService';
import logger from '@/utils/logger';
import { format } from 'date-fns';

const LibrarianAgentPage = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  // State
  const [config, setConfig] = useState<LibrarianConfig | null>(null);
  const [status, setStatus] = useState<LibrarianStatus | null>(null);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [actions, setActions] = useState<LibrarianAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [selectedReport, setSelectedReport] = useState<AuditReportDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingAuditType, setPendingAuditType] = useState<'daily_incremental' | 'ai_agent' | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      // Fetch config first - FAIL FAST if this fails
      const configData = await getLibrarianConfig();
      setConfig(configData);
      setBudgetLimit(configData.audit_limits.default_budget_usd);
      setConfigError(null);

      // Now load data using config limits
      const [statusData, reportsData, actionsData] = await Promise.all([
        getLibrarianStatus(),
        getAuditReports(configData.pagination.reports_limit),
        getLibrarianActions(undefined, undefined, configData.pagination.actions_limit),
      ]);

      setStatus(statusData);
      setReports(reportsData);
      setActions(actionsData);
    } catch (error) {
      logger.error('Failed to load librarian data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load librarian data';

      if (errorMessage.includes('configuration')) {
        // Configuration error - fail fast, don't allow page to load
        setConfigError(errorMessage);
        Alert.alert(
          t('admin.librarian.errors.configError'),
          `${errorMessage}\n\n${t('admin.librarian.errors.contactAdmin')}`,
          [{ text: t('common.ok') }]
        );
      } else {
        // Data loading error - still allow retry
        Alert.alert(t('common.error'), t('admin.librarian.errors.failedToLoad'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Trigger audit handler
  const handleTriggerAudit = (auditType: 'daily_incremental' | 'ai_agent') => {
    setPendingAuditType(auditType);
    if (auditType === 'ai_agent') {
      setConfirmModalVisible(true);
    } else {
      executeAudit(auditType);
    }
  };

  const executeAudit = async (auditType: 'daily_incremental' | 'ai_agent') => {
    if (!config) {
      Alert.alert(t('common.error'), t('admin.librarian.errors.configNotLoaded'));
      return;
    }

    setTriggering(true);
    setConfirmModalVisible(false);

    try {
      await triggerAudit({
        audit_type: auditType,
        dry_run: dryRun,
        use_ai_agent: auditType === 'ai_agent',
        max_iterations: config.audit_limits.max_iterations,
        budget_limit_usd: budgetLimit,
      });

      const successKey = auditType === 'ai_agent' ? 'aiAuditSuccess' : 'dailyAuditSuccess';
      const dryRunText = dryRun ? t('admin.librarian.quickActions.dryRunMode') : '';
      Alert.alert(
        t('common.success'),
        t(`admin.librarian.quickActions.${successKey}`, { dryRun: dryRunText })
      );

      // Refresh data after 5 seconds
      setTimeout(() => {
        handleRefresh();
      }, 5000);
    } catch (error) {
      logger.error('Failed to trigger audit:', error);
      Alert.alert(t('common.error'), t('admin.librarian.errors.failedToTrigger'));
    } finally {
      setTriggering(false);
      setPendingAuditType(null);
    }
  };

  // View report details
  const handleViewReport = async (auditId: string) => {
    try {
      const details = await getAuditReportDetails(auditId);
      setSelectedReport(details);
      setDetailModalVisible(true);
    } catch (error) {
      logger.error('Failed to load report details:', error);
      Alert.alert(t('common.error'), t('admin.librarian.errors.failedToLoadDetails'));
    }
  };

  // Rollback action
  const handleRollback = async (actionId: string) => {
    try {
      await rollbackActionAPI(actionId);
      Alert.alert(t('common.success'), t('admin.librarian.quickActions.rollbackSuccess'));
      await loadData();
    } catch (error) {
      logger.error('Failed to rollback action:', error);
      Alert.alert(t('common.error'), t('admin.librarian.errors.failedToRollback'));
    }
  };

  // Report table columns
  const reportColumns: GlassTableColumn<AuditReport>[] = [
    {
      key: 'audit_date',
      label: t('admin.librarian.reports.columns.date'),
      render: (value) => (
        <Text style={styles.tableText}>
          {format(new Date(value), 'MMM d, HH:mm')}
        </Text>
      ),
    },
    {
      key: 'audit_type',
      label: t('admin.librarian.reports.columns.type'),
      render: (value) => (
        <GlassBadge
          text={t(`admin.librarian.auditTypes.${value}`, value.replace('_', ' '))}
          variant={value === 'ai_agent' ? 'primary' : 'default'}
        />
      ),
    },
    {
      key: 'execution_time_seconds',
      label: t('admin.librarian.reports.columns.duration'),
      render: (value) => <Text style={styles.tableText}>{value.toFixed(1)}s</Text>,
    },
    {
      key: 'status',
      label: t('admin.librarian.reports.columns.status'),
      render: (value) => (
        <GlassBadge
          text={t(`admin.librarian.status.${value}`, value)}
          variant={
            value === 'completed' ? 'success' :
            value === 'failed' ? 'error' :
            'warning'
          }
        />
      ),
    },
    {
      key: 'issues_count',
      label: t('admin.librarian.reports.columns.issues'),
      render: (value) => <Text style={styles.tableText}>{value}</Text>,
    },
    {
      key: 'fixes_count',
      label: t('admin.librarian.reports.columns.fixes'),
      render: (value) => <Text style={styles.tableText}>{value}</Text>,
    },
  ];

  // Health color
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return colors.success;
      case 'good':
        return '#10B981';
      case 'fair':
        return colors.warning;
      case 'poor':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
      </View>
    );
  }

  // Fail fast if configuration failed to load
  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{t('admin.librarian.errors.configError')}</Text>
        <Text style={styles.errorText}>{configError}</Text>
        <Text style={styles.errorSubtext}>
          {t('admin.librarian.errors.contactAdmin')}
        </Text>
        <GlassButton
          title={t('admin.librarian.modal.retry')}
          variant="primary"
          onPress={loadData}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    );
  }

  // Don't render until config is loaded
  if (!config) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('admin.librarian.loadingConfig')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.title, { textAlign }]}>
            {t('admin.librarian.title')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.librarian.subtitle')}
          </Text>
        </View>
        <GlassButton
          title={t('admin.librarian.refresh')}
          variant="secondary"
          icon={<RefreshCw size={16} color={colors.text} />}
          onPress={handleRefresh}
          loading={refreshing}
        />
      </View>

      {/* Stats Section */}
      <View style={styles.statsGrid}>
        <StatCard
          title={t('admin.librarian.stats.systemHealth')}
          value={status?.system_health ? t(`admin.librarian.health.${status.system_health}`) : t('admin.librarian.stats.unknown')}
          icon={<Bot size={24} color={getHealthColor(status?.system_health || 'unknown')} />}
          color={status?.system_health === 'excellent' ? 'success' : status?.system_health === 'good' ? 'primary' : status?.system_health === 'fair' ? 'warning' : 'error'}
        />
        <StatCard
          title={t('admin.librarian.stats.totalAudits')}
          value={status?.total_audits_last_30_days.toString() || '0'}
          subtitle={t('admin.librarian.stats.last30Days')}
          icon={<RefreshCw size={24} color={colors.primary} />}
          color="primary"
        />
        <StatCard
          title={t('admin.librarian.stats.issuesFixed')}
          value={status?.total_issues_fixed.toString() || '0'}
          subtitle={t('admin.librarian.stats.last30Days')}
          icon={<Zap size={24} color={colors.success} />}
          color="success"
        />
        <StatCard
          title={t('admin.librarian.stats.lastAudit')}
          value={
            status?.last_audit_date
              ? format(new Date(status.last_audit_date), 'MMM d')
              : t('admin.librarian.stats.never')
          }
          subtitle={status?.last_audit_status || 'N/A'}
          color="secondary"
        />
      </View>

      {/* Quick Actions */}
      <GlassCard style={styles.actionsCard}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.librarian.quickActions.title')}</Text>

        <View style={styles.actionsRow}>
          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, dryRun && styles.checkboxChecked]}
              onPress={() => setDryRun(!dryRun)}
            >
              {dryRun && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.dryRun')}</Text>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <GlassButton
            title={t('admin.librarian.quickActions.triggerDaily')}
            variant="primary"
            icon={<Play size={16} color={colors.background} />}
            onPress={() => handleTriggerAudit('daily_incremental')}
            loading={triggering && pendingAuditType === 'daily_incremental'}
            disabled={triggering}
            style={styles.actionButton}
          />
          <GlassButton
            title={t('admin.librarian.quickActions.triggerAI')}
            variant="secondary"
            icon={<Bot size={16} color={colors.text} />}
            onPress={() => handleTriggerAudit('ai_agent')}
            loading={triggering && pendingAuditType === 'ai_agent'}
            disabled={triggering}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>{t('admin.librarian.quickActions.budgetLabel', { budget: budgetLimit.toFixed(2) })}</Text>
          {/* Slider would go here - using simple buttons for now */}
          <View style={styles.budgetButtons}>
            <Pressable
              style={styles.budgetButton}
              onPress={() => setBudgetLimit(Math.max(config.audit_limits.min_budget_usd, budgetLimit - config.audit_limits.budget_step_usd))}
            >
              <Text style={styles.budgetButtonText}>-</Text>
            </Pressable>
            <Pressable
              style={styles.budgetButton}
              onPress={() => setBudgetLimit(Math.min(config.audit_limits.max_budget_usd, budgetLimit + config.audit_limits.budget_step_usd))}
            >
              <Text style={styles.budgetButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </GlassCard>

      {/* Schedule Information */}
      <Text style={[styles.sectionTitle, { textAlign, marginTop: spacing.lg }]}>
        {t('admin.librarian.schedules.title')}
      </Text>
      <View style={styles.schedulesRow}>
        <LibrarianScheduleCard
          title={t('admin.librarian.schedules.dailyTitle')}
          cron={config.daily_schedule.cron}
          time={config.daily_schedule.time}
          mode={config.daily_schedule.mode}
          cost={config.daily_schedule.cost}
          status={config.daily_schedule.status}
          description={config.daily_schedule.description}
          gcpProjectId={config.gcp_project_id}
        />
        <LibrarianScheduleCard
          title={t('admin.librarian.schedules.weeklyTitle')}
          cron={config.weekly_schedule.cron}
          time={config.weekly_schedule.time}
          mode={config.weekly_schedule.mode}
          cost={config.weekly_schedule.cost}
          status={config.weekly_schedule.status}
          description={config.weekly_schedule.description}
          gcpProjectId={config.gcp_project_id}
        />
      </View>

      {/* Recent Reports */}
      <Text style={[styles.sectionTitle, { textAlign, marginTop: spacing.lg }]}>
        {t('admin.librarian.reports.title')}
      </Text>
      <GlassCard style={styles.reportsCard}>
        {reports.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign }]}>{t('admin.librarian.reports.emptyMessage')}</Text>
        ) : (
          <GlassTable
            columns={reportColumns}
            data={reports}
            onRowPress={(report) => handleViewReport(report.audit_id)}
            isRTL={isRTL}
            rowKey="audit_id"
          />
        )}
      </GlassCard>

      {/* Activity Log */}
      <Text style={[styles.sectionTitle, { textAlign, marginTop: spacing.lg }]}>
        {t('admin.librarian.activityLog.title')}
      </Text>
      <LibrarianActivityLog
        actions={actions}
        onRollback={handleRollback}
        config={config}
      />

      {/* Confirmation Modal for AI Agent */}
      <GlassModal
        visible={confirmModalVisible}
        type="warning"
        title={t('admin.librarian.modal.confirmAI.title')}
        message={t('admin.librarian.modal.confirmAI.message', {
          budget: budgetLimit.toFixed(2),
          dryRun: dryRun ? t('admin.librarian.modal.confirmAI.dryRunNote') : ''
        })}
        buttons={[
          {
            text: t('admin.librarian.modal.cancel'),
            onPress: () => {
              setConfirmModalVisible(false);
              setPendingAuditType(null);
            },
            variant: 'secondary',
          },
          {
            text: t('admin.librarian.modal.confirm'),
            onPress: () => pendingAuditType && executeAudit(pendingAuditType),
            variant: 'primary',
          },
        ]}
        dismissable
      />

      {/* Report Detail Modal */}
      <GlassModal
        visible={detailModalVisible}
        title={t('admin.librarian.reports.detailModal.title', {
          id: selectedReport?.audit_id.substring(0, config.ui.id_truncate_length) || ''
        })}
        onClose={() => setDetailModalVisible(false)}
      >
        {selectedReport && (
          <ScrollView style={[styles.modalContent, { maxHeight: config.ui.modal_max_height }]}>
            <DetailSection title={t('admin.librarian.reports.detailModal.summary')}>
              <DetailRow
                label={t('admin.librarian.reports.detailModal.status')}
                value={t(`admin.librarian.status.${selectedReport.status}`, selectedReport.status)}
              />
              <DetailRow
                label={t('admin.librarian.reports.detailModal.executionTime')}
                value={`${selectedReport.execution_time_seconds.toFixed(1)}s`}
              />
              <DetailRow
                label={t('admin.librarian.reports.detailModal.totalItems')}
                value={selectedReport.summary.total_items?.toString() || 'N/A'}
              />
              <DetailRow
                label={t('admin.librarian.reports.detailModal.healthyItems')}
                value={selectedReport.summary.healthy_items?.toString() || 'N/A'}
              />
            </DetailSection>

            <DetailSection title={t('admin.librarian.reports.detailModal.issuesFound')}>
              <DetailRow label={t('admin.librarian.reports.detailModal.brokenStreams')} value={selectedReport.broken_streams.length.toString()} />
              <DetailRow label={t('admin.librarian.reports.detailModal.missingMetadata')} value={selectedReport.missing_metadata.length.toString()} />
              <DetailRow label={t('admin.librarian.reports.detailModal.misclassifications')} value={selectedReport.misclassifications.length.toString()} />
              <DetailRow label={t('admin.librarian.reports.detailModal.orphanedItems')} value={selectedReport.orphaned_items.length.toString()} />
            </DetailSection>

            <DetailSection title={t('admin.librarian.reports.detailModal.fixesApplied')}>
              <Text style={styles.detailText}>{t('admin.librarian.reports.detailModal.totalFixes', { count: selectedReport.fixes_applied.length })}</Text>
            </DetailSection>

            {selectedReport.ai_insights && selectedReport.ai_insights.length > 0 && (
              <DetailSection title={t('admin.librarian.reports.detailModal.aiInsights')}>
                {selectedReport.ai_insights.map((insight, index) => (
                  <Text key={index} style={styles.detailText}>
                    • {insight}
                  </Text>
                ))}
              </DetailSection>
            )}
          </ScrollView>
        )}
      </GlassModal>
    </ScrollView>
  );
};

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.detailSection}>
    <Text style={styles.detailSectionTitle}>{title}</Text>
    {children}
  </View>
);

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textMuted,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsRow: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
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
  schedulesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  reportsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  tableText: {
    fontSize: 14,
    color: colors.text,
  },
  modalContent: {
    // maxHeight is now applied inline from config
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});

export default LibrarianAgentPage;
