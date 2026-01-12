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
          'Configuration Error',
          `${errorMessage}\n\nThe Librarian page cannot load without proper configuration. Please contact your administrator.`,
          [{ text: 'OK' }]
        );
      } else {
        // Data loading error - still allow retry
        Alert.alert('Error', 'Failed to load librarian data. Please try again.');
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
      Alert.alert('Error', 'Configuration not loaded');
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

      Alert.alert(
        'Success',
        `${auditType === 'ai_agent' ? 'AI Agent audit' : 'Daily audit'} triggered successfully. ${
          dryRun ? '(Dry run mode)' : ''
        }`
      );

      // Refresh data after 5 seconds
      setTimeout(() => {
        handleRefresh();
      }, 5000);
    } catch (error) {
      logger.error('Failed to trigger audit:', error);
      Alert.alert('Error', 'Failed to trigger audit. Please try again.');
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
      Alert.alert('Error', 'Failed to load report details.');
    }
  };

  // Rollback action
  const handleRollback = async (actionId: string) => {
    try {
      await rollbackActionAPI(actionId);
      Alert.alert('Success', 'Action rolled back successfully.');
      await loadData();
    } catch (error) {
      logger.error('Failed to rollback action:', error);
      Alert.alert('Error', 'Failed to rollback action.');
    }
  };

  // Report table columns
  const reportColumns: GlassTableColumn<AuditReport>[] = [
    {
      key: 'audit_date',
      label: 'Date',
      render: (value) => (
        <Text style={styles.tableText}>
          {format(new Date(value), 'MMM d, HH:mm')}
        </Text>
      ),
    },
    {
      key: 'audit_type',
      label: 'Type',
      render: (value) => (
        <GlassBadge
          text={value.replace('_', ' ')}
          variant={value === 'ai_agent' ? 'primary' : 'default'}
        />
      ),
    },
    {
      key: 'execution_time_seconds',
      label: 'Duration',
      render: (value) => <Text style={styles.tableText}>{value.toFixed(1)}s</Text>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <GlassBadge
          text={value}
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
      label: 'Issues',
      render: (value) => <Text style={styles.tableText}>{value}</Text>,
    },
    {
      key: 'fixes_count',
      label: 'Fixes',
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
        <Text style={styles.loadingText}>Loading Librarian Agent...</Text>
      </View>
    );
  }

  // Fail fast if configuration failed to load
  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorText}>{configError}</Text>
        <Text style={styles.errorSubtext}>
          The Librarian page cannot load without proper configuration.{'\n'}
          Please contact your administrator.
        </Text>
        <GlassButton
          title="Retry"
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
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.title, { textAlign }]}>
            {isRTL ? 'סוכן הספרן' : 'Librarian Agent'}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            Autonomous AI-powered content library management
          </Text>
        </View>
        <GlassButton
          title="Refresh"
          variant="secondary"
          icon={<RefreshCw size={16} color={colors.text} />}
          onPress={handleRefresh}
          loading={refreshing}
        />
      </View>

      {/* Stats Section */}
      <View style={styles.statsGrid}>
        <StatCard
          title="System Health"
          value={status?.system_health || 'unknown'}
          icon={<Bot size={24} color={getHealthColor(status?.system_health || 'unknown')} />}
          color={status?.system_health === 'excellent' ? 'success' : status?.system_health === 'good' ? 'primary' : status?.system_health === 'fair' ? 'warning' : 'error'}
        />
        <StatCard
          title="Total Audits (30d)"
          value={status?.total_audits_last_30_days.toString() || '0'}
          subtitle="Last 30 days"
          icon={<RefreshCw size={24} color={colors.primary} />}
          color="primary"
        />
        <StatCard
          title="Issues Fixed"
          value={status?.total_issues_fixed.toString() || '0'}
          subtitle="Last 30 days"
          icon={<Zap size={24} color={colors.success} />}
          color="success"
        />
        <StatCard
          title="Last Audit"
          value={
            status?.last_audit_date
              ? format(new Date(status.last_audit_date), 'MMM d')
              : 'Never'
          }
          subtitle={status?.last_audit_status || 'N/A'}
          color="secondary"
        />
      </View>

      {/* Quick Actions */}
      <GlassCard style={styles.actionsCard}>
        <Text style={[styles.sectionTitle, { textAlign }]}>Quick Actions</Text>

        <View style={styles.actionsRow}>
          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, dryRun && styles.checkboxChecked]}
              onPress={() => setDryRun(!dryRun)}
            >
              {dryRun && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>Dry Run (Report Only)</Text>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <GlassButton
            title="Trigger Daily Audit"
            variant="primary"
            icon={<Play size={16} color={colors.background} />}
            onPress={() => handleTriggerAudit('daily_incremental')}
            loading={triggering && pendingAuditType === 'daily_incremental'}
            disabled={triggering}
            style={styles.actionButton}
          />
          <GlassButton
            title="Trigger AI Agent Audit"
            variant="secondary"
            icon={<Bot size={16} color={colors.text} />}
            onPress={() => handleTriggerAudit('ai_agent')}
            loading={triggering && pendingAuditType === 'ai_agent'}
            disabled={triggering}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>AI Agent Budget Limit: ${budgetLimit.toFixed(2)}</Text>
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
        Scheduled Audits
      </Text>
      <View style={styles.schedulesRow}>
        <LibrarianScheduleCard
          title="Daily Audit"
          cron={config.daily_schedule.cron}
          time={config.daily_schedule.time}
          mode={config.daily_schedule.mode}
          cost={config.daily_schedule.cost}
          status={config.daily_schedule.status}
          description={config.daily_schedule.description}
          gcpProjectId={config.gcp_project_id}
        />
        <LibrarianScheduleCard
          title="Weekly AI Audit"
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
        Recent Audit Reports
      </Text>
      <GlassCard style={styles.reportsCard}>
        {reports.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign }]}>No audit reports yet</Text>
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
        Activity Log
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
        title="Trigger AI Agent Audit?"
        message={`This will trigger an autonomous AI agent audit with a budget limit of $${budgetLimit.toFixed(
          2
        )}. The agent will make decisions about what to check and fix. ${
          dryRun ? 'Running in DRY RUN mode (no changes will be made).' : ''
        }`}
        buttons={[
          {
            text: 'Cancel',
            onPress: () => {
              setConfirmModalVisible(false);
              setPendingAuditType(null);
            },
            variant: 'secondary',
          },
          {
            text: 'Confirm',
            onPress: () => pendingAuditType && executeAudit(pendingAuditType),
            variant: 'primary',
          },
        ]}
        dismissable
      />

      {/* Report Detail Modal */}
      <GlassModal
        visible={detailModalVisible}
        title={`Audit Report: ${selectedReport?.audit_id.substring(0, config.ui.id_truncate_length)}...`}
        onClose={() => setDetailModalVisible(false)}
      >
        {selectedReport && (
          <ScrollView style={[styles.modalContent, { maxHeight: config.ui.modal_max_height }]}>
            <DetailSection title="Summary">
              <DetailRow label="Status" value={selectedReport.status} />
              <DetailRow
                label="Execution Time"
                value={`${selectedReport.execution_time_seconds.toFixed(1)}s`}
              />
              <DetailRow
                label="Total Items"
                value={selectedReport.summary.total_items?.toString() || 'N/A'}
              />
              <DetailRow
                label="Healthy Items"
                value={selectedReport.summary.healthy_items?.toString() || 'N/A'}
              />
            </DetailSection>

            <DetailSection title="Issues Found">
              <DetailRow label="Broken Streams" value={selectedReport.broken_streams.length.toString()} />
              <DetailRow label="Missing Metadata" value={selectedReport.missing_metadata.length.toString()} />
              <DetailRow label="Misclassifications" value={selectedReport.misclassifications.length.toString()} />
              <DetailRow label="Orphaned Items" value={selectedReport.orphaned_items.length.toString()} />
            </DetailSection>

            <DetailSection title="Fixes Applied">
              <Text style={styles.detailText}>{selectedReport.fixes_applied.length} total fixes</Text>
            </DetailSection>

            {selectedReport.ai_insights && selectedReport.ai_insights.length > 0 && (
              <DetailSection title="AI Insights">
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
