import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Activity, DollarSign, Clock, Play, Bot, FileText, Eye, Minus, Plus } from 'lucide-react';
import { GlassButton, GlassToggle, GlassStatCard, GlassBadge, GlassModal } from '@bayit/shared/ui';
import { GlassLog, GlassTable, GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import {
  getAuditReportDetails,
  clearAuditReports,
  AuditReportDetail,
  AuditReport,
} from '@/services/librarianService';
import logger from '@/utils/logger';
import { format } from 'date-fns';

import { useLibrarianData } from './hooks/useLibrarianData';
import { useAuditControl } from './hooks/useAuditControl';

import { ReportDetailModal } from './modals/ReportDetailModal';

import { BatchProgress, AuditConfigState } from './types';

const LibrarianAgentPage = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  // Audit configuration state - toggles default ON except dryRun
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

  // Error/success modals
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
    setErrorMessage: setDataErrorMessage,
    setErrorModalOpen: setDataErrorModalOpen,
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

  // Auto-load running audit
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

    if (!inProgressAudit) {
      return;
    }

    const shouldPoll = (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) ||
                       (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id);

    if (!shouldPoll) {
      return;
    }

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

    return () => {
      clearInterval(pollInterval);
    };
  }, [reports, selectedReport, livePanelReport, loadData]);

  // Handle audit trigger
  const handleTriggerAudit = (auditType: 'daily_incremental' | 'ai_agent') => {
    setPendingAuditType(auditType);
    if (auditType === 'ai_agent') {
      setConfirmModalVisible(true);
    } else {
      executeAudit(auditType);
    }
  };

  // Handle view report
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

  // Handle clear reports
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

  // Budget adjustment handlers
  const handleBudgetDecrease = () => {
    if (config) {
      setBudgetLimit(Math.max(config.audit_limits.min_budget_usd, budgetLimit - config.audit_limits.budget_step_usd));
    }
  };

  const handleBudgetIncrease = () => {
    if (config) {
      setBudgetLimit(Math.min(config.audit_limits.max_budget_usd, budgetLimit + config.audit_limits.budget_step_usd));
    }
  };

  // Get status display values
  const getStatusValue = () => {
    const inProgress = reports.find(r => r.status === 'in_progress');
    if (inProgress) return t('admin.librarian.status.running', 'Running');
    if (triggering) return t('admin.librarian.status.pending', 'Starting...');
    return t('admin.librarian.status.disabled', 'Idle');
  };

  const getLastRunValue = () => {
    const completed = reports.filter(r => r.status === 'completed' || r.status === 'failed');
    if (completed.length === 0) return t('admin.librarian.audit.status.never', 'Never');
    const lastReport = completed[0];
    return format(new Date(lastReport.audit_date), 'MMM d, HH:mm');
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
      </View>
    );
  }

  // Error state
  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{t('admin.librarian.errors.configError')}</Text>
        <Text style={styles.errorText}>{configError}</Text>
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

  const isAuditRunning = reports.some(r => r.status === 'in_progress');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { textAlign }]}>
            {t('admin.librarian.title')}
          </Text>
        </View>
        <GlassButton
          variant="ghost"
          icon={<RefreshCw size={18} color={colors.text} />}
          onPress={handleRefresh}
          loading={refreshing}
        />
      </View>

      {/* Status Bar - 3 stat cards inline */}
      <View style={[styles.statsRow, { flexDirection }]}>
        <GlassStatCard
          icon={<Activity size={20} color={isAuditRunning ? colors.warning : colors.success} />}
          label={t('admin.librarian.reports.columns.status', 'Status')}
          value={getStatusValue()}
          compact
          style={styles.statCard}
        />
        <GlassStatCard
          icon={<DollarSign size={20} color={colors.primary} />}
          label={t('admin.librarian.quickActions.monthlyBudgetUsed', 'Budget Used')}
          value={`$${budgetUsed.toFixed(2)}`}
          subtitle={`/ $${(config.audit_limits.max_budget_usd * 30).toFixed(0)} monthly`}
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

      {/* Audit Configuration Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.librarian.quickActions.title', 'Audit Configuration')}</Text>

        {/* Toggles Grid - 2 columns */}
        <View style={styles.toggleGrid}>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={last24HoursOnly}
              onValueChange={setLast24HoursOnly}
              label={t('admin.librarian.quickActions.last24Hours', 'Last 24 Hours Only')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={cybTitlesOnly}
              onValueChange={setCybTitlesOnly}
              label={t('admin.librarian.quickActions.cybTitlesOnly', 'CYB Titles Only')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={tmdbPostersOnly}
              onValueChange={setTmdbPostersOnly}
              label={t('admin.librarian.quickActions.tmdbPostersOnly', 'TMDB Posters Only')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={openSubtitlesEnabled}
              onValueChange={setOpenSubtitlesEnabled}
              label={t('admin.librarian.quickActions.openSubtitlesEnabled', 'OpenSubtitles')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={classifyOnly}
              onValueChange={setClassifyOnly}
              label={t('admin.librarian.quickActions.classifyOnly', 'Classify Content')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={purgeDuplicates}
              onValueChange={setPurgeDuplicates}
              label={t('admin.librarian.quickActions.purgeDuplicates', 'Purge Duplicates')}
              size="small"
              isRTL={isRTL}
            />
          </View>
          <View style={styles.toggleItem}>
            <GlassToggle
              value={dryRun}
              onValueChange={setDryRun}
              label={t('admin.librarian.quickActions.dryRun', 'Dry Run')}
              size="small"
              isRTL={isRTL}
            />
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={[styles.actionsRow, { flexDirection }]}>
          <GlassButton
            title={t('admin.librarian.quickActions.dailyAudit', 'Daily Audit')}
            variant="primary"
            icon={<Play size={16} color={colors.background} />}
            onPress={() => handleTriggerAudit('daily_incremental')}
            loading={triggering && pendingAuditType === 'daily_incremental'}
            disabled={triggering || isAuditRunning}
          />
          <GlassButton
            title={t('admin.librarian.quickActions.aiAgentAudit', 'AI Agent Audit')}
            variant="secondary"
            icon={<Bot size={16} color={colors.text} />}
            onPress={() => handleTriggerAudit('ai_agent')}
            loading={triggering && pendingAuditType === 'ai_agent'}
            disabled={triggering || isAuditRunning}
          />

          {/* Budget Control */}
          <View style={[styles.budgetControl, { flexDirection, marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 }]}>
            <Text style={[styles.budgetLabel, { textAlign }]}>
              {t('admin.librarian.quickActions.budgetPerAudit', 'Budget:')} ${budgetLimit.toFixed(2)}
            </Text>
            <View style={[styles.budgetButtons, { flexDirection }]}>
              <Pressable
                style={styles.budgetButton}
                onPress={handleBudgetDecrease}
              >
                <Minus size={14} color={colors.text} />
              </Pressable>
              <Pressable
                style={styles.budgetButton}
                onPress={handleBudgetIncrease}
              >
                <Plus size={14} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Running notice */}
        {isAuditRunning && !triggering && (
          <View style={[styles.runningNotice, { flexDirection }]}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={[styles.runningNoticeText, { textAlign }]}>
              {t('admin.librarian.quickActions.auditRunningNotice', 'An audit is currently running')}
            </Text>
          </View>
        )}
      </View>

      {/* Live Audit Log */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.librarian.logs.liveAuditLog', 'Live Audit Log')}</Text>

        {connectingToLiveLog ? (
          <View style={styles.connectingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.connectingText, { textAlign }]}>
              {t('admin.librarian.logs.connecting', 'Connecting...')}
            </Text>
          </View>
        ) : livePanelReport ? (
          <View>
            {/* Progress bar if running */}
            {livePanelReport.status === 'in_progress' && batchProgress && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.progressFill, { width: `${batchProgress.percentage}%` }]} />
                </View>
                <Text style={[styles.progressText, { textAlign }]}>
                  {batchProgress.percentage}% - {batchProgress.itemsProcessed}/{batchProgress.totalItems} {t('admin.librarian.logs.items', 'items')}
                </Text>
              </View>
            )}

            <GlassLog
              logs={[...livePanelReport.execution_logs].reverse()}
              title=""
              searchPlaceholder={t('admin.librarian.logs.searchPlaceholder', 'Search logs...')}
              emptyMessage={t('admin.librarian.logs.noLogs', 'No logs yet')}
              levelLabels={{
                debug: t('admin.librarian.logs.levels.debug', 'DEBUG'),
                info: t('admin.librarian.logs.levels.info', 'INFO'),
                warn: t('admin.librarian.logs.levels.warn', 'WARN'),
                error: t('admin.librarian.logs.levels.error', 'ERROR'),
                success: t('admin.librarian.logs.levels.success', 'SUCCESS'),
                trace: t('admin.librarian.logs.levels.trace', 'TRACE'),
              }}
              showSearch
              showLevelFilter
              showDownload
              showClear
              autoScroll
              maxHeight={400}
              animateEntries={false}
              onClear={() => setLivePanelReport(null)}
            />

            {/* Audit controls if running */}
            {livePanelReport.status === 'in_progress' && (
              <View style={[styles.auditControlsRow, { flexDirection, justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
                {auditPaused ? (
                  <GlassButton
                    title={t('admin.librarian.audit.resume', 'Resume')}
                    variant="primary"
                    onPress={() => handleResumeAudit(livePanelReport.audit_id)}
                    loading={resumingAudit}
                    disabled={resumingAudit}
                    size="sm"
                  />
                ) : (
                  <GlassButton
                    title={t('admin.librarian.audit.pause', 'Pause')}
                    variant="secondary"
                    onPress={() => handlePauseAudit(livePanelReport.audit_id)}
                    loading={pausingAudit}
                    disabled={pausingAudit}
                    size="sm"
                  />
                )}
                <GlassButton
                  title={t('admin.librarian.audit.cancel', 'Cancel')}
                  variant="ghost"
                  onPress={() => handleCancelAudit(livePanelReport.audit_id)}
                  loading={cancellingAudit}
                  disabled={cancellingAudit}
                  size="sm"
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyLogState}>
            <Text style={[styles.emptyLogText, { textAlign }]}>
              {t('admin.librarian.logs.triggerAuditToSee', 'No active audit. Trigger an audit to see live logs.')}
            </Text>
          </View>
        )}
      </View>

      {/* Recent Reports - Collapsible */}
      <GlassDraggableExpander
        title={t('admin.librarian.reports.title', 'Recent Reports')}
        subtitle={t('admin.librarian.reports.totalReports', '{{count}} report(s)', { count: reports.length })}
        icon={<FileText size={18} color={colors.primary} />}
        defaultExpanded={false}
        draggable={false}
        minHeight={300}
        maxHeight={500}
        headerActions={
          reports.length > 0 ? (
            <GlassButton
              title={t('admin.librarian.reports.clearAll', 'Clear All')}
              variant="ghost"
              size="sm"
              onPress={() => setClearReportsModalOpen(true)}
              loading={clearingReports}
              disabled={clearingReports}
            />
          ) : undefined
        }
        style={styles.section}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyReportsState}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={[styles.emptyReportsText, { textAlign }]}>
              {t('admin.librarian.reports.emptyMessage', 'No audit reports yet')}
            </Text>
          </View>
        ) : (
          <GlassTable
            columns={[
              {
                key: 'audit_date',
                label: t('admin.librarian.reports.columns.date', 'Date'),
                render: (value) => (
                  <Text style={styles.cellText}>
                    {format(new Date(value), 'MMM d, yyyy HH:mm')}
                  </Text>
                ),
              },
              {
                key: 'audit_type',
                label: t('admin.librarian.reports.columns.type', 'Type'),
                render: (value) => (
                  <Text style={styles.cellText}>
                    {t(`admin.librarian.auditTypes.${value}`, value)}
                  </Text>
                ),
              },
              {
                key: 'status',
                label: t('admin.librarian.reports.columns.status', 'Status'),
                render: (value) => (
                  <GlassBadge
                    variant={
                      value === 'completed' ? 'success' :
                      value === 'failed' ? 'danger' :
                      value === 'in_progress' ? 'warning' : 'default'
                    }
                    size="sm"
                  >
                    {t(`admin.librarian.status.${value}`, value)}
                  </GlassBadge>
                ),
              },
              {
                key: 'actions',
                label: '',
                width: 80,
                render: (_, row: AuditReport) => (
                  <GlassButton
                    title=""
                    variant="ghost"
                    size="sm"
                    icon={<Eye size={16} color={colors.primary} />}
                    onPress={() => handleViewReport(row.audit_id)}
                    loading={loadingAuditId === row.audit_id}
                  />
                ),
              },
            ]}
            data={reports.slice(0, 10)}
            emptyMessage={t('admin.librarian.reports.emptyMessage', 'No reports')}
            isRTL={isRTL}
          />
        )}
      </GlassDraggableExpander>

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
          {
            text: t('admin.librarian.modal.cancel'),
            style: 'cancel',
          },
          {
            text: t('admin.librarian.modal.confirm'),
            style: 'default',
            onPress: () => pendingAuditType && executeAudit(pendingAuditType),
          },
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
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('admin.librarian.reports.clearAll'),
            style: 'destructive',
            onPress: handleClearReportsConfirm,
          },
        ]}
        dismissable
      />

      <ReportDetailModal
        visible={detailModalVisible}
        loading={detailModalLoading}
        report={selectedReport}
        config={config}
        onClose={() => setDetailModalVisible(false)}
        onViewLogs={(auditId) => {
          setDetailModalVisible(false);
          // Load audit into live panel
          getAuditReportDetails(auditId).then(details => {
            setLivePanelReport(details);
          });
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
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleItem: {
    width: 'calc(50% - 16px)',
    minWidth: 220,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    flexWrap: 'wrap',
  },
  budgetControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  budgetButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  budgetButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    marginTop: spacing.md,
  },
  runningNoticeText: {
    fontSize: 13,
    color: colors.warning,
  },
  connectingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
    gap: spacing.md,
  },
  connectingText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  auditControlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyLogState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 150,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.md,
  },
  emptyLogText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyReportsState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyReportsText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
});

export default LibrarianAgentPage;
