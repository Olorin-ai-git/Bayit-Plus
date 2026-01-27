import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Activity, DollarSign, Clock } from 'lucide-react';
import { GlassButton, GlassStatCard, GlassModal, GlassTextarea, GlassPageHeader } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { ADMIN_PAGE_CONFIG } from '../../../../../shared/utils/adminConstants';
import {
  getAuditReportDetails,
  clearAuditReports,
  AuditReportDetail,
} from '@/services/librarianService';
import logger from '@/utils/logger';
import { format } from 'date-fns';

import { useLibrarianData } from './hooks/useLibrarianData';
import { useAuditControl } from './hooks/useAuditControl';
import { ReportDetailModal } from './modals/ReportDetailModal';
import { AuditSummaryStats } from './components/AuditSummaryStats';
import { AuditConfiguration } from './components/AuditConfiguration';
import { LiveAuditLog } from './components/LiveAuditLog';
import { RecentReports } from './components/RecentReports';
import { BatchProgress, AuditConfigState } from './types';

const LibrarianAgentPage = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  // Audit configuration state
  const [dryRun, setDryRun] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [last24HoursOnly, setLast24HoursOnly] = useState(true);
  const [cybTitlesOnly, setCybTitlesOnly] = useState(true);
  const [tmdbPostersOnly, setTmdbPostersOnly] = useState(true);
  const [openSubtitlesEnabled, setOpenSubtitlesEnabled] = useState(true);
  const [classifyOnly, setClassifyOnly] = useState(true);
  const [purgeDuplicates, setPurgeDuplicates] = useState(true);

  // Live panel state
  const [livePanelReport, setLivePanelReport] = useState<AuditReportDetail | null>(null);
  const [connectingToLiveLog, setConnectingToLiveLog] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  // Report detail modal state
  const [selectedReport, setSelectedReport] = useState<AuditReportDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [loadingAuditId, setLoadingAuditId] = useState<string | null>(null);

  // Modal states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [clearReportsModalOpen, setClearReportsModalOpen] = useState(false);
  const [clearingReports, setClearingReports] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Data hook
  const {
    config,
    status,
    reports,
    loading,
    refreshing,
    configError,
    budgetUsed,
    loadData,
    handleRefresh,
    setBudgetUsed,
    setReports,
  } = useLibrarianData();

  // Initialize budget from config
  useEffect(() => {
    if (config) {
      setBudgetLimit(config.audit_limits.default_budget_usd);
    }
  }, [config]);

  const auditConfig: AuditConfigState = {
    dryRun,
    budgetLimit,
    budgetUsed,
    last24HoursOnly,
    cybTitlesOnly,
    tmdbPostersOnly,
    openSubtitlesEnabled,
    classifyOnly,
    purgeDuplicates,
  };

  // Audit control hook
  const {
    triggering,
    pausingAudit,
    resumingAudit,
    cancellingAudit,
    auditPaused,
    pendingAuditType,
    setPendingAuditType,
    executeAudit,
    handlePauseAudit,
    handleResumeAudit,
    handleCancelAudit,
    interjectModalVisible,
    setInterjectModalVisible,
    interjectMessage,
    setInterjectMessage,
    interjectingAudit,
    handleInterjectAudit,
  } = useAuditControl({
    config,
    reports,
    budgetUsed,
    auditConfig,
    setLivePanelReport,
    setLivePanelExpanded: () => {},
    loadData,
    setErrorMessage,
    setErrorModalOpen,
    setSuccessMessage,
    setSuccessModalOpen,
  });

  // Batch progress calculation
  const batchProgress = useMemo((): BatchProgress | null => {
    if (!livePanelReport?.execution_logs) return null;

    const logs = livePanelReport.execution_logs;
    let totalItems = 0;
    let itemsProcessed = 0;
    let currentSkip = 0;
    const batchSize = 100;

    logs.forEach(log => {
      const msg = log.message.toLowerCase();
      const totalMatch = msg.match(/total[:\s]+(\d+)/i) || msg.match(/"total"[:\s]+(\d+)/i);
      if (totalMatch && parseInt(totalMatch[1]) > totalItems) {
        totalItems = parseInt(totalMatch[1]);
      }

      const skipMatch = msg.match(/skip[:\s]+(\d+)/i) || msg.match(/"skip"[:\s]+(\d+)/i);
      if (skipMatch) {
        const skip = parseInt(skipMatch[1]);
        if (skip > currentSkip) currentSkip = skip;
      }

      const countMatch = msg.match(/"count"[:\s]+(\d+)/i);
      if (countMatch) {
        itemsProcessed = currentSkip + parseInt(countMatch[1]);
      }
    });

    if (totalItems > 0) {
      const currentBatch = Math.floor(currentSkip / batchSize) + 1;
      const totalBatches = Math.ceil(totalItems / batchSize);
      let percentage = Math.round((itemsProcessed / totalItems) * 100);

      if (livePanelReport.status === 'in_progress' && percentage >= 100) {
        percentage = 99;
      } else {
        percentage = Math.min(100, percentage);
      }

      return { currentBatch, totalBatches, itemsProcessed: itemsProcessed || currentSkip, totalItems, percentage };
    }
    return null;
  }, [livePanelReport?.execution_logs, livePanelReport?.status]);

  // Auto-load running audit
  useEffect(() => {
    if (reports.length === 0 || livePanelReport) return;

    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (inProgressAudit) {
      const loadRunningAudit = async () => {
        try {
          setConnectingToLiveLog(true);
          const details = await getAuditReportDetails(inProgressAudit.audit_id);
          setLivePanelReport(details);
        } catch (error) {
          logger.error('Failed to auto-load running audit:', error);
        } finally {
          setTimeout(() => setConnectingToLiveLog(false), 300);
        }
      };
      loadRunningAudit();
    }
  }, [reports, livePanelReport]);

  // Poll for audit updates
  useEffect(() => {
    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (!inProgressAudit) return;

    const shouldPoll = (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) ||
                       (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id);
    if (!shouldPoll) return;

    const pollInterval = setInterval(async () => {
      try {
        const details = await getAuditReportDetails(inProgressAudit.audit_id);

        if (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) {
          setLivePanelReport(details);
          setLastPolledAt(new Date());
        }

        if (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id) {
          setSelectedReport(details);
        }

        if (details.status === 'completed' || details.status === 'failed' || details.status === 'partial') {
          clearInterval(pollInterval);
          await loadData();
        }
      } catch (error) {
        logger.error('[Polling] Failed to fetch audit details:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [reports, selectedReport, livePanelReport, loadData]);

  const handleTriggerAudit = (auditType: 'daily_incremental' | 'ai_agent') => {
    setPendingAuditType(auditType);
    if (auditType === 'ai_agent') {
      setConfirmModalVisible(true);
    } else {
      executeAudit(auditType);
    }
  };

  const handleViewReport = async (auditId: string) => {
    setLoadingAuditId(auditId);
    await new Promise(resolve => setTimeout(resolve, 50));

    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setSelectedReport(null);

    try {
      const details = await getAuditReportDetails(auditId);
      setSelectedReport(details);
    } catch (error) {
      logger.error('Failed to load report details:', error);
      setErrorMessage(t('admin.librarian.errors.failedToLoadDetails'));
      setErrorModalOpen(true);
      setDetailModalVisible(false);
    } finally {
      setDetailModalLoading(false);
      setLoadingAuditId(null);
    }
  };

  const handleClearReportsConfirm = async () => {
    setClearReportsModalOpen(false);
    setClearingReports(true);

    try {
      await clearAuditReports();
      setReports([]);
      setSuccessMessage(t('admin.librarian.reports.clearedSuccessfully'));
      setSuccessModalOpen(true);
      logger.info('Cleared all audit reports');
    } catch (error) {
      logger.error('Failed to clear audit reports:', error);
      setErrorMessage(t('admin.librarian.errors.failedToClearReports'));
      setErrorModalOpen(true);
    } finally {
      setClearingReports(false);
    }
  };

  const getStatusValue = () => {
    const inProgress = reports.find(r => r.status === 'in_progress');
    if (inProgress) return t('admin.librarian.status.running', 'Running');
    if (triggering) return t('admin.librarian.status.pending', 'Starting...');
    return t('admin.librarian.status.disabled', 'Idle');
  };

  const getLastRunValue = () => {
    const completed = reports.filter(r => r.status === 'completed' || r.status === 'failed');
    if (completed.length === 0) return t('admin.librarian.audit.status.never', 'Never');
    return format(new Date(completed[0].audit_date), 'MMM d, HH:mm');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('admin.librarian.loading')}</Text>
      </View>
    );
  }

  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorTitle, { textAlign, color: colors.error.DEFAULT }]}>{t('admin.librarian.errors.configError')}</Text>
        <Text style={[styles.errorMessage, { textAlign, color: colors.text }]}>{configError}</Text>
        <GlassButton title={t('admin.librarian.modal.retry')} variant="primary" onPress={loadData} style={styles.errorRetryButton} />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('admin.librarian.loadingConfig')}</Text>
      </View>
    );
  }

  const isAuditRunning = reports.some(r => r.status === 'in_progress');
  const pageConfig = ADMIN_PAGE_CONFIG.librarian;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <GlassPageHeader
        title={t('admin.titles.librarian')}
        subtitle={t('admin.librarian.subtitle')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
        action={
          <GlassButton
            variant="ghost"
            icon={<RefreshCw size={18} color="white" />}
            onPress={handleRefresh}
            disabled={refreshing}
          />
        }
      />

      {/* Status Bar */}
      <View style={[styles.statusBar, { flexDirection }]}>
        <GlassStatCard
          icon={<Activity size={20} color={isAuditRunning ? colors.warning.DEFAULT : colors.success.DEFAULT} />}
          label={t('admin.librarian.reports.columns.status', 'Status')}
          value={getStatusValue()}
          compact
          style={styles.statCard}
        />
        <GlassStatCard
          icon={<DollarSign size={20} color={colors.primary.DEFAULT} />}
          label={t('admin.librarian.quickActions.monthlyBudgetUsed', 'Budget Used')}
          value={`$${budgetUsed.toFixed(2)}`}
          subtitle={t('admin.librarian.quickActions.monthlyBudgetLimit', '/ ${{limit}} monthly', { limit: (config.audit_limits.max_budget_usd * 30).toFixed(0) })}
          compact
          style={styles.statCard}
        />
        <GlassStatCard
          icon={<Clock size={20} color={colors.textMuted} />}
          label={t('admin.librarian.logs.lastLog', 'Last Run')}
          value={getLastRunValue()}
          compact
          style={styles.statCard}
        />
      </View>

      {/* NEW: Audit Summary Statistics */}
      <AuditSummaryStats reports={reports} budgetUsed={budgetUsed} config={config} isRTL={isRTL} />

      {/* Audit Configuration */}
      <AuditConfiguration
        dryRun={dryRun}
        setDryRun={setDryRun}
        budgetLimit={budgetLimit}
        setBudgetLimit={setBudgetLimit}
        last24HoursOnly={last24HoursOnly}
        setLast24HoursOnly={setLast24HoursOnly}
        cybTitlesOnly={cybTitlesOnly}
        setCybTitlesOnly={setCybTitlesOnly}
        tmdbPostersOnly={tmdbPostersOnly}
        setTmdbPostersOnly={setTmdbPostersOnly}
        openSubtitlesEnabled={openSubtitlesEnabled}
        setOpenSubtitlesEnabled={setOpenSubtitlesEnabled}
        classifyOnly={classifyOnly}
        setClassifyOnly={setClassifyOnly}
        purgeDuplicates={purgeDuplicates}
        setPurgeDuplicates={setPurgeDuplicates}
        triggering={triggering}
        isAuditRunning={isAuditRunning}
        pendingAuditType={pendingAuditType}
        auditPaused={auditPaused}
        pausingAudit={pausingAudit}
        resumingAudit={resumingAudit}
        cancellingAudit={cancellingAudit}
        livePanelReport={livePanelReport}
        config={config}
        onTriggerAudit={handleTriggerAudit}
        onPauseAudit={handlePauseAudit}
        onResumeAudit={handleResumeAudit}
        onCancelAudit={handleCancelAudit}
        isRTL={isRTL}
      />

      {/* Live Audit Log - Enhanced with empty state */}
      <LiveAuditLog
        livePanelReport={livePanelReport}
        connectingToLiveLog={connectingToLiveLog}
        batchProgress={batchProgress}
        auditPaused={auditPaused}
        pausingAudit={pausingAudit}
        resumingAudit={resumingAudit}
        cancellingAudit={cancellingAudit}
        interjectingAudit={interjectingAudit}
        onPauseAudit={handlePauseAudit}
        onResumeAudit={handleResumeAudit}
        onCancelAudit={handleCancelAudit}
        onInterject={handleInterjectAudit}
        onClear={() => setLivePanelReport(null)}
        onTriggerDaily={() => handleTriggerAudit('daily_incremental')}
        onTriggerAI={() => handleTriggerAudit('ai_agent')}
        reports={reports}
        triggering={triggering}
        isAuditRunning={isAuditRunning}
        lastPolledAt={lastPolledAt}
        isRTL={isRTL}
        setInterjectModalVisible={setInterjectModalVisible}
      />

      {/* Recent Reports - Enhanced table */}
      <RecentReports
        reports={reports}
        clearingReports={clearingReports}
        loadingAuditId={loadingAuditId}
        onViewReport={handleViewReport}
        onClearReports={() => setClearReportsModalOpen(true)}
        isRTL={isRTL}
      />

      {/* Modals */}
      <GlassModal
        visible={confirmModalVisible}
        type="warning"
        title={t('admin.librarian.modal.confirmAI.title')}
        message={t('admin.librarian.modal.confirmAI.message', {
          budget: budgetLimit.toFixed(2),
          dryRun: dryRun ? t('admin.librarian.modal.confirmAI.dryRunNote') : ''
        })}
        onClose={() => {
          setConfirmModalVisible(false);
          setPendingAuditType(null);
        }}
        buttons={[
          { text: t('admin.librarian.modal.cancel'), style: 'cancel' },
          { text: t('admin.librarian.modal.confirm'), style: 'default', onPress: () => pendingAuditType && executeAudit(pendingAuditType) },
        ]}
        dismissable
      />

      <GlassModal
        visible={clearReportsModalOpen}
        type="warning"
        title={t('admin.librarian.reports.clearAll')}
        message={t('admin.librarian.reports.confirmClearAll')}
        onClose={() => setClearReportsModalOpen(false)}
        buttons={[
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('admin.librarian.reports.clearAll'), style: 'destructive', onPress: handleClearReportsConfirm },
        ]}
        dismissable
      />

      <ReportDetailModal
        visible={detailModalVisible}
        loading={detailModalLoading}
        report={selectedReport}
        config={config}
        onClose={() => setDetailModalVisible(false)}
        onReapplySuccess={async (fixAuditId) => {
          // Show success message and load the fix audit in live panel
          setSuccessMessage(t('admin.librarian.audit.reapplyStarted', 'Fix reapplication started. Check the live panel for progress.'));
          setSuccessModalOpen(true);
          // Load fix audit details immediately to show in live panel
          try {
            const details = await getAuditReportDetails(fixAuditId);
            setLivePanelReport(details);
          } catch (error) {
            logger.error('Failed to load fix audit details:', error);
          }
          // Refresh reports list after a delay
          setTimeout(() => loadData(), 2000);
        }}
      />

      <GlassModal
        visible={errorModalOpen}
        type="error"
        title={t('common.error')}
        message={errorMessage}
        onClose={() => setErrorModalOpen(false)}
        buttons={[{ text: t('common.ok'), style: 'default' }]}
        dismissable
      />

      <GlassModal
        visible={successModalOpen}
        type="success"
        title={t('common.success')}
        message={successMessage}
        onClose={() => setSuccessModalOpen(false)}
        buttons={[{ text: t('common.ok'), style: 'default' }]}
        dismissable
      />

      <GlassModal
        visible={interjectModalVisible}
        type="info"
        title={t('admin.librarian.audit.interjectTitle', 'Send Message to AI Agent')}
        onClose={() => {
          setInterjectModalVisible(false);
          setInterjectMessage('');
        }}
        buttons={[
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('admin.librarian.audit.sendInterject', 'Send'),
            style: 'default',
            onPress: () => handleInterjectAudit(livePanelReport?.audit_id, interjectMessage),
            disabled: !interjectMessage.trim() || interjectingAudit,
          },
        ]}
        dismissable
      >
        <View style={styles.interjectModalContent}>
          <Text style={[styles.interjectHintText, { textAlign, color: colors.textMuted }]}>
            {t('admin.librarian.audit.interjectHint')}
          </Text>
          <GlassTextarea
            value={interjectMessage}
            onChangeText={setInterjectMessage}
            placeholder={t('admin.librarian.audit.interjectPlaceholder')}
            rows={4}
            maxLength={1000}
          />
        </View>
      </GlassModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.base },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorTitle: { fontSize: fontSize['2xl'], fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' },
  errorMessage: { fontSize: fontSize.base, textAlign: 'center' },
  errorRetryButton: { marginTop: spacing.lg },
  statusBar: { gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1 },
  interjectModalContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
  interjectHintText: { fontSize: 13, lineHeight: 18 },
});

export default LibrarianAgentPage;
