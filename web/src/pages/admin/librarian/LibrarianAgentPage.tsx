import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { GlassButton, GlassResizablePanel } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import {
  getAuditReportDetails,
  clearAuditReports,
  AuditReportDetail,
} from '@/services/librarianService';
import { VoiceLibrarianControl } from '@/components/admin/VoiceLibrarianControl';
import logger from '@/utils/logger';

import { useLibrarianData } from './hooks/useLibrarianData';
import { useAuditControl } from './hooks/useAuditControl';
import { useVoiceLibrarian } from './hooks/useVoiceLibrarian';

import { AuditControlsPanel } from './components/AuditControlsPanel';
import { LiveAuditLogPanel } from './components/LiveAuditLogPanel';
import { SystemStatusStats } from './components/SystemStatusStats';
import { ScheduleInformation } from './components/ScheduleInformation';
import { RecentReportsList } from './components/RecentReportsList';
import { KidsContentDashboard } from './components/KidsContentDashboard';

import { AuditConfirmationModal } from './modals/AuditConfirmationModal';
import { ClearReportsModal } from './modals/ClearReportsModal';
import { ReportDetailModal } from './modals/ReportDetailModal';
import { ErrorModal } from './modals/ErrorModal';
import { SuccessModal } from './modals/SuccessModal';

import { BatchProgress, AuditConfigState } from './types';

const LibrarianAgentPage = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const [dryRun, setDryRun] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [last24HoursOnly, setLast24HoursOnly] = useState(false);
  const [cybTitlesOnly, setCybTitlesOnly] = useState(false);
  const [tmdbPostersOnly, setTmdbPostersOnly] = useState(false);
  const [openSubtitlesEnabled, setOpenSubtitlesEnabled] = useState(false);
  const [classifyOnly, setClassifyOnly] = useState(false);

  const [livePanelExpanded, setLivePanelExpanded] = useState(true);
  const [livePanelReport, setLivePanelReport] = useState<AuditReportDetail | null>(null);
  const [connectingToLiveLog, setConnectingToLiveLog] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  const [selectedReport, setSelectedReport] = useState<AuditReportDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [loadingAuditId, setLoadingAuditId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [clearReportsModalOpen, setClearReportsModalOpen] = useState(false);
  const [clearingReports, setClearingReports] = useState(false);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    setErrorMessage: setDataErrorMessage,
    setErrorModalOpen: setDataErrorModalOpen,
  } = useLibrarianData();

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
  };

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
  } = useAuditControl({
    config,
    reports,
    budgetUsed,
    auditConfig,
    setLivePanelReport,
    setLivePanelExpanded,
    loadData,
    setErrorMessage,
    setErrorModalOpen,
    setSuccessMessage,
    setSuccessModalOpen,
  });

  const {
    voiceProcessing,
    isSpeaking,
    isVoiceMuted,
    handleVoiceCommand,
    toggleVoiceMute,
  } = useVoiceLibrarian({
    loadData,
    setSuccessMessage,
    setSuccessModalOpen,
    setErrorMessage,
    setErrorModalOpen,
  });

  const batchProgress = useMemo((): BatchProgress | null => {
    if (!livePanelReport?.execution_logs) {
      return null;
    }

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
        if (skip > currentSkip) {
          currentSkip = skip;
        }
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

      return {
        currentBatch,
        totalBatches,
        itemsProcessed: itemsProcessed || currentSkip,
        totalItems,
        percentage,
      };
    }

    return null;
  }, [livePanelReport?.execution_logs, livePanelReport?.status]);

  useEffect(() => {
    if (reports.length === 0 || livePanelReport) {
      return;
    }

    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (inProgressAudit) {
      logger.info(`[Auto-load] Loading running audit into live panel: ${inProgressAudit.audit_id}`);

      const loadRunningAudit = async () => {
        try {
          setConnectingToLiveLog(true);
          const details = await getAuditReportDetails(inProgressAudit.audit_id);
          setLivePanelReport(details);
          setLivePanelExpanded(true);
        } catch (error) {
          logger.error('Failed to auto-load running audit:', error);
        } finally {
          setTimeout(() => setConnectingToLiveLog(false), 300);
        }
      };

      loadRunningAudit();
    }
  }, [reports, livePanelReport]);

  useEffect(() => {
    const inProgressAudit = reports.find(r => r.status === 'in_progress');

    if (!inProgressAudit) {
      return;
    }

    const shouldPoll = (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) ||
                       (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id);

    if (!shouldPoll) {
      return;
    }

    logger.info(`[Polling] Found in-progress audit: ${inProgressAudit.audit_id}`);

    const pollInterval = setInterval(async () => {
      try {
        const details = await getAuditReportDetails(inProgressAudit.audit_id);
        const logCount = details.execution_logs?.length || 0;

        logger.info(`[Polling] Fetched audit ${inProgressAudit.audit_id} - Status: ${details.status}, Logs: ${logCount}`);

        if (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) {
          setLivePanelReport(details);
          setLastPolledAt(new Date());
          logger.info(`[Polling] Updated live panel - ${logCount} logs`);
        }

        if (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id) {
          setSelectedReport(details);
        }

        if (details.status === 'completed' || details.status === 'failed' || details.status === 'partial') {
          logger.info(`[Polling] Audit ${inProgressAudit.audit_id} completed with status: ${details.status}`);
          clearInterval(pollInterval);
          await loadData();
        }
      } catch (error) {
        logger.error('[Polling] Failed to fetch audit details:', error);
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
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

  const handleViewLogsInPanel = async (auditId: string) => {
    setLoadingAuditId(auditId);
    setConnectingToLiveLog(true);

    try {
      const details = await getAuditReportDetails(auditId);
      setLivePanelReport(details);
      setLivePanelExpanded(true);
    } catch (error) {
      logger.error('Failed to load report details for live panel:', error);
      setErrorMessage(t('admin.librarian.errors.failedToLoadDetails'));
      setErrorModalOpen(true);
    } finally {
      setLoadingAuditId(null);
      setTimeout(() => setConnectingToLiveLog(false), 300);
    }
  };

  const handleScheduleUpdate = async (newCron: string, newStatus: 'ENABLED' | 'DISABLED') => {
    setErrorMessage(t('admin.librarian.schedules.editNotAvailableMessage'));
    setErrorModalOpen(true);
    throw new Error('Schedule editing requires Cloud Console');
  };

  const handleClearReportsClick = () => {
    setClearReportsModalOpen(true);
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

  const getHealthColor = useCallback((health: string) => {
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
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
      </View>
    );
  }

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
      <View style={styles.header}>
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

      <View style={[styles.twoColumnLayout, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.mainColumn}>
          <AuditControlsPanel
            config={config}
            reports={reports}
            auditConfig={auditConfig}
            triggering={triggering}
            pendingAuditType={pendingAuditType}
            onDryRunChange={setDryRun}
            onLast24HoursChange={setLast24HoursOnly}
            onCybTitlesChange={setCybTitlesOnly}
            onTmdbPostersChange={setTmdbPostersOnly}
            onOpenSubtitlesChange={setOpenSubtitlesEnabled}
            onClassifyChange={setClassifyOnly}
            onBudgetChange={setBudgetLimit}
            onTriggerAudit={handleTriggerAudit}
          />

          <LiveAuditLogPanel
            report={livePanelReport}
            expanded={livePanelExpanded}
            connectingToLog={connectingToLiveLog}
            refreshing={refreshing}
            pausingAudit={pausingAudit}
            resumingAudit={resumingAudit}
            cancellingAudit={cancellingAudit}
            auditPaused={auditPaused}
            batchProgress={batchProgress}
            lastPolledAt={lastPolledAt}
            isRTL={isRTL}
            onExpandChange={setLivePanelExpanded}
            onRefresh={handleRefresh}
            onPause={() => handlePauseAudit(livePanelReport?.audit_id)}
            onResume={() => handleResumeAudit(livePanelReport?.audit_id)}
            onCancel={() => handleCancelAudit(livePanelReport?.audit_id)}
          />
        </View>

        <GlassResizablePanel
          defaultWidth={420}
          minWidth={340}
          maxWidth={600}
          position="right"
          style={styles.sidebarColumn}
        >
          <SystemStatusStats
            status={status}
            textAlign={textAlign}
            getHealthColor={getHealthColor}
          />

          <VoiceLibrarianControl
            onCommand={handleVoiceCommand}
            isProcessing={voiceProcessing}
            isSpeaking={isSpeaking}
            onToggleMute={toggleVoiceMute}
            isMuted={isVoiceMuted}
          />

          <KidsContentDashboard
            status={status}
            triggering={triggering}
            reports={reports}
            onTriggerAudit={handleTriggerAudit}
          />

          <ScheduleInformation
            config={config}
            onUpdate={handleScheduleUpdate}
          />

          <RecentReportsList
            reports={reports}
            clearingReports={clearingReports}
            isRTL={isRTL}
            onViewReport={handleViewReport}
            onClearReports={handleClearReportsClick}
          />
        </GlassResizablePanel>
      </View>

      <AuditConfirmationModal
        visible={confirmModalVisible}
        budgetLimit={budgetLimit}
        dryRun={dryRun}
        onClose={() => {
          setConfirmModalVisible(false);
          setPendingAuditType(null);
        }}
        onConfirm={() => pendingAuditType && executeAudit(pendingAuditType)}
      />

      <ClearReportsModal
        visible={clearReportsModalOpen}
        onClose={() => setClearReportsModalOpen(false)}
        onConfirm={handleClearReportsConfirm}
      />

      <ReportDetailModal
        visible={detailModalVisible}
        loading={detailModalLoading}
        report={selectedReport}
        config={config}
        onClose={() => setDetailModalVisible(false)}
        onViewLogs={handleViewLogsInPanel}
      />

      <ErrorModal
        visible={errorModalOpen}
        message={errorMessage}
        onClose={() => setErrorModalOpen(false)}
      />

      <SuccessModal
        visible={successModalOpen}
        message={successMessage}
        onClose={() => setSuccessModalOpen(false)}
      />
    </ScrollView>
  );
};

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
    flexDirection: 'row',
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
  twoColumnLayout: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  sidebarColumn: {
    gap: spacing.md,
    paddingLeft: spacing.md,
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
});

export default LibrarianAgentPage;
