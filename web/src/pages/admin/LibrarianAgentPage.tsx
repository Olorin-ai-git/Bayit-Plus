import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Bot, Play, Zap, FileText, Eye, ScrollText, Trash2, Calendar } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import LibrarianScheduleCard from '@/components/admin/LibrarianScheduleCard';
import LibrarianActivityLog from '@/components/admin/LibrarianActivityLog';
import { VoiceLibrarianControl } from '@/components/admin/VoiceLibrarianControl';
import { GlassCard, GlassButton, GlassModal, GlassBadge, GlassTable, GlassTableColumn, GlassLog, LogEntry, GlassDraggableExpander } from '@bayit/shared/ui';
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
  clearAuditReports,
  executeVoiceCommand,
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
  const { isRTL, textAlign } = useDirection();

  // State
  const [config, setConfig] = useState<LibrarianConfig | null>(null);
  const [status, setStatus] = useState<LibrarianStatus | null>(null);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [actions, setActions] = useState<LibrarianAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [clearingReports, setClearingReports] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [last24HoursOnly, setLast24HoursOnly] = useState(false);
  const [cybTitlesOnly, setCybTitlesOnly] = useState(false);
  const [tmdbPostersOnly, setTmdbPostersOnly] = useState(false);
  const [openSubtitlesEnabled, setOpenSubtitlesEnabled] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AuditReportDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [livePanelExpanded, setLivePanelExpanded] = useState(true); // Expanded by default
  const [livePanelReport, setLivePanelReport] = useState<AuditReportDetail | null>(null);
  const [pendingAuditType, setPendingAuditType] = useState<'daily_incremental' | 'ai_agent' | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loadingAuditId, setLoadingAuditId] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [clearReportsModalOpen, setClearReportsModalOpen] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

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
        setErrorMessage(`${errorMessage}\n\n${t('admin.librarian.errors.contactAdmin')}`);
        setErrorModalOpen(true);
      } else {
        // Data loading error - still allow retry
        setErrorMessage(t('admin.librarian.errors.failedToLoad'));
        setErrorModalOpen(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for in-progress audits (real-time log streaming)
  useEffect(() => {
    // Check if there's an in-progress audit in the reports list
    const inProgressAudit = reports.find(r => r.status === 'in_progress');

    if (!inProgressAudit) {
      return; // No polling needed
    }

    logger.info(`[Polling] Found in-progress audit: ${inProgressAudit.audit_id}`);

    // Poll every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const details = await getAuditReportDetails(inProgressAudit.audit_id);

        // Update live panel if it's for this audit
        if (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) {
          setLivePanelReport(details);
        }

        // If detail modal is open and showing this audit, update it
        if (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id) {
          setSelectedReport(details);
        }

        // If audit completed, refresh the list and stop polling
        if (details.status === 'completed' || details.status === 'failed' || details.status === 'partial') {
          logger.info(`[Polling] Audit ${inProgressAudit.audit_id} completed with status: ${details.status}`);
          clearInterval(pollInterval);
          await loadData(); // Refresh the full list
        }
      } catch (error) {
        logger.error('[Polling] Failed to fetch audit details:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount or when reports change
    return () => {
      clearInterval(pollInterval);
    };
  }, [reports, selectedReport, livePanelReport]);

  // Poll for activity log updates when audit is in progress (real-time rolling updates)
  useEffect(() => {
    // Only poll if there's an in-progress audit and config is loaded
    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (!inProgressAudit || !config) {
      return;
    }

    logger.info(`[Activity Polling] Polling for new actions from audit: ${inProgressAudit.audit_id}`);

    // Poll every 3 seconds (slightly different from log polling to stagger requests)
    const activityPollInterval = setInterval(async () => {
      try {
        const latestActions = await getLibrarianActions(
          undefined,
          undefined,
          config.pagination.actions_limit
        );
        setActions(latestActions);
        logger.debug(`[Activity Polling] Refreshed ${latestActions.length} actions`);
      } catch (error) {
        logger.error('[Activity Polling] Failed to fetch actions:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(activityPollInterval);
    };
  }, [reports, config]);

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
      setErrorMessage(t('admin.librarian.errors.configNotLoaded'));
      setErrorModalOpen(true);
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
        last_24_hours_only: last24HoursOnly,
        cyb_titles_only: cybTitlesOnly,
        tmdb_posters_only: tmdbPostersOnly,
        opensubtitles_enabled: openSubtitlesEnabled,
      });

      const successKey = auditType === 'ai_agent' ? 'aiAuditSuccess' : 'dailyAuditSuccess';
      const dryRunText = dryRun ? t('admin.librarian.quickActions.dryRunMode') : '';
      setSuccessMessage(t(`admin.librarian.quickActions.${successKey}`, { dryRun: dryRunText }));
      setSuccessModalOpen(true);

      // Expand live panel and load audit details
      setLivePanelExpanded(true);
      
      // Refresh data after 2 seconds to get the new audit
      setTimeout(async () => {
        await handleRefresh();
        
        // Find the newly created in-progress audit and load it into the live panel
        const updatedReports = await getAuditReports(config.pagination.reports_limit);
        const inProgressAudit = updatedReports.find(r => r.status === 'in_progress');
        
        if (inProgressAudit) {
          try {
            const details = await getAuditReportDetails(inProgressAudit.audit_id);
            setLivePanelReport(details);
          } catch (error) {
            logger.error('Failed to load audit details for live panel:', error);
          }
        }
      }, 2000);
    } catch (error) {
      logger.error('Failed to trigger audit:', error);
      setErrorMessage(t('admin.librarian.errors.failedToTrigger'));
      setErrorModalOpen(true);
    } finally {
      setTriggering(false);
      setPendingAuditType(null);
    }
  };

  // View report details
  const handleViewReport = async (auditId: string) => {
    // Set loading state immediately for inline spinner
    setLoadingAuditId(auditId);

    // Small delay to ensure spinner renders before heavy modal operation
    await new Promise(resolve => setTimeout(resolve, 50));

    // Open modal with loading state
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

  // Rollback action
  const handleRollback = async (actionId: string) => {
    try {
      await rollbackActionAPI(actionId);
      setSuccessMessage(t('admin.librarian.quickActions.rollbackSuccess'));
      setSuccessModalOpen(true);
      await loadData();
    } catch (error) {
      logger.error('Failed to rollback action:', error);
      setErrorMessage(t('admin.librarian.errors.failedToRollback'));
      setErrorModalOpen(true);
    }
  };

  // Convert audit report to log entries
  const generateLogEntriesFromReport = (report: AuditReportDetail): LogEntry[] => {
    const logs: LogEntry[] = [];
    const baseTime = new Date(report.audit_date);

    // Start log
    logs.push({
      id: '1',
      timestamp: baseTime,
      level: 'info',
      message: `${t('admin.librarian.logs.auditStarted')}: ${report.audit_type.replace('_', ' ')}`,
      source: t('admin.librarian.logs.source.librarian'),
    });

    // Issues found
    let logId = 2;
    const issuesTime = new Date(baseTime.getTime() + 1000);

    if (report.broken_streams.length > 0) {
      logs.push({
        id: String(logId++),
        timestamp: issuesTime,
        level: 'warn',
        message: t('admin.librarian.logs.brokenStreamsFound', { count: report.broken_streams.length }),
        source: t('admin.librarian.logs.source.librarian'),
        metadata: { items: report.broken_streams.slice(0, 5) },
      });
    }

    if (report.missing_metadata.length > 0) {
      logs.push({
        id: String(logId++),
        timestamp: new Date(issuesTime.getTime() + 500),
        level: 'warn',
        message: t('admin.librarian.logs.missingMetadataFound', { count: report.missing_metadata.length }),
        source: t('admin.librarian.logs.source.librarian'),
        metadata: { items: report.missing_metadata.slice(0, 5) },
      });
    }

    if (report.misclassifications.length > 0) {
      logs.push({
        id: String(logId++),
        timestamp: new Date(issuesTime.getTime() + 1000),
        level: 'warn',
        message: t('admin.librarian.logs.misclassificationsFound', { count: report.misclassifications.length }),
        source: t('admin.librarian.logs.source.librarian'),
        metadata: { items: report.misclassifications.slice(0, 5) },
      });
    }

    if (report.orphaned_items.length > 0) {
      logs.push({
        id: String(logId++),
        timestamp: new Date(issuesTime.getTime() + 1500),
        level: 'warn',
        message: t('admin.librarian.logs.orphanedItemsFound', { count: report.orphaned_items.length }),
        source: t('admin.librarian.logs.source.librarian'),
        metadata: { items: report.orphaned_items.slice(0, 5) },
      });
    }

    // Fixes applied
    const fixesTime = new Date(baseTime.getTime() + 3000);
    if (report.fixes_applied.length > 0) {
      logs.push({
        id: String(logId++),
        timestamp: fixesTime,
        level: 'success',
        message: t('admin.librarian.logs.fixesApplied', { count: report.fixes_applied.length }),
        source: t('admin.librarian.logs.source.librarian'),
        metadata: { fixes: report.fixes_applied.slice(0, 10) },
      });
    }

    // AI insights
    if (report.ai_insights && report.ai_insights.length > 0) {
      report.ai_insights.forEach((insight, index) => {
        logs.push({
          id: String(logId++),
          timestamp: new Date(fixesTime.getTime() + 1000 + (index * 500)),
          level: 'info',
          message: `${t('admin.librarian.logs.aiInsightPrefix')}: ${insight}`,
          source: t('admin.librarian.logs.source.aiAgent'),
        });
      });
    }

    // Completion
    const completionTime = new Date(baseTime.getTime() + report.execution_time_seconds * 1000);
    logs.push({
      id: String(logId++),
      timestamp: completionTime,
      level: report.status === 'completed' ? 'success' : report.status === 'failed' ? 'error' : 'warn',
      message: t('admin.librarian.logs.auditCompleted', {
        status: report.status,
        duration: report.execution_time_seconds.toFixed(1),
      }),
      source: t('admin.librarian.logs.source.librarian'),
      metadata: {
        total_items: report.summary.total_items,
        healthy_items: report.summary.healthy_items,
        issues_count: report.issues_count,
        fixes_count: report.fixes_count,
      },
    });

    return logs;
  };

  // Handle view logs in live panel
  const handleViewLogsInPanel = async (auditId: string) => {
    setLoadingAuditId(auditId);

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
    }
  };

  // Handle schedule update
  const handleScheduleUpdate = async (newCron: string, newStatus: 'ENABLED' | 'DISABLED') => {
    // Show informative message that Cloud Console is needed for schedule changes
    setErrorMessage(t('admin.librarian.schedules.editNotAvailableMessage'));
    setErrorModalOpen(true);
    throw new Error('Schedule editing requires Cloud Console');
  };

  // Handle clear all audit reports
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

  // Voice command handler
  const handleVoiceCommand = useCallback(async (command: string) => {
    logger.info('[VoiceLibrarian] Executing command:', command);
    setVoiceProcessing(true);
    
    try {
      const response = await executeVoiceCommand(command);
      logger.info('[VoiceLibrarian] Command executed successfully:', response);
      
      // Speak the response if not muted
      if (!isVoiceMuted && response.spoken_response) {
        speak(response.spoken_response);
      }
      
      // Show success message
      setSuccessMessage(response.message);
      setSuccessModalOpen(true);
      
      // If an audit was started, refresh the data
      if (response.audit_id) {
        await loadData();
      }
    } catch (error) {
      logger.error('[VoiceLibrarian] Command failed:', error);
      setErrorMessage(t('admin.librarian.voice.commandFailed'));
      setErrorModalOpen(true);
    } finally {
      setVoiceProcessing(false);
    }
  }, [isVoiceMuted, loadData, t]);

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language based on i18n
    const langMap: Record<string, string> = {
      he: 'he-IL',
      en: 'en-US',
      es: 'es-ES',
    };
    utterance.lang = langMap[t('common.language') as string] || 'en-US';
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [t]);

  const toggleVoiceMute = useCallback(() => {
    setIsVoiceMuted(prev => !prev);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

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
    {
      key: 'audit_id',
      label: t('admin.librarian.reports.columns.actions'),
      render: (value, row) => {
        const isLoading = loadingAuditId === row.audit_id;
        return (
          <View style={styles.actionButtonsRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  icon={<Eye size={18} color={colors.text} />}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleViewReport(row.audit_id);
                  }}
                />
                <GlassButton
                  variant="secondary"
                  size="sm"
                  icon={<ScrollText size={18} color={colors.text} />}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleViewLogsInPanel(row.audit_id);
                  }}
                />
              </>
            )}
          </View>
        );
      },
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
          
          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, last24HoursOnly && styles.checkboxChecked]}
              onPress={() => setLast24HoursOnly(!last24HoursOnly)}
            >
              {last24HoursOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.last24Hours')}</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, cybTitlesOnly && styles.checkboxChecked]}
              onPress={() => setCybTitlesOnly(!cybTitlesOnly)}
            >
              {cybTitlesOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.cybTitlesOnly')}</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, tmdbPostersOnly && styles.checkboxChecked]}
              onPress={() => setTmdbPostersOnly(!tmdbPostersOnly)}
            >
              {tmdbPostersOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.tmdbPostersOnly')}</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, openSubtitlesEnabled && styles.checkboxChecked]}
              onPress={() => setOpenSubtitlesEnabled(!openSubtitlesEnabled)}
            >
              {openSubtitlesEnabled && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.openSubtitlesEnabled')}</Text>
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

      {/* Voice Control */}
      <VoiceLibrarianControl
        onCommand={handleVoiceCommand}
        isProcessing={voiceProcessing}
        isSpeaking={isSpeaking}
        onToggleMute={toggleVoiceMute}
        isMuted={isVoiceMuted}
      />

      {/* Live Audit Log Panel */}
      <GlassDraggableExpander
        title={t('admin.librarian.logs.liveAuditLog')}
        subtitle={livePanelReport ? `${t('admin.librarian.logs.auditType')}: ${livePanelReport.audit_type.replace('_', ' ')}` : undefined}
        icon={
          livePanelReport?.status === 'in_progress' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollText size={20} color={colors.primary} />
          )
        }
        badge={
          livePanelReport ? (
            <GlassBadge
              text={t(`admin.librarian.reports.status.${livePanelReport.status}`)}
              variant={
                livePanelReport.status === 'completed' ? 'success' :
                livePanelReport.status === 'in_progress' ? 'warning' :
                livePanelReport.status === 'failed' ? 'error' : 'info'
              }
            />
          ) : undefined
        }
        defaultExpanded={true}
        onExpandChange={setLivePanelExpanded}
        draggable={true}
        minHeight={500}
        maxHeight={1000}
        style={styles.liveLogPanel}
      >
        {livePanelReport ? (
          <View>
            <View style={styles.livePanelInfo}>
              <Text style={styles.livePanelInfoText}>
                {t('admin.librarian.logs.started')}: {format(new Date(livePanelReport.audit_date), 'HH:mm:ss')}
              </Text>
              {livePanelReport.completed_at && (
                <Text style={styles.livePanelInfoText}>
                  {t('admin.librarian.logs.completed')}: {format(new Date(livePanelReport.completed_at), 'HH:mm:ss')}
                </Text>
              )}
            </View>

            <GlassLog
              logs={[...livePanelReport.execution_logs].reverse()}
              title={t('admin.librarian.logs.executionLog')}
              searchPlaceholder={t('admin.librarian.logs.searchPlaceholder')}
              emptyMessage={t('admin.librarian.logs.noLogs')}
              levelLabels={{
                debug: t('admin.librarian.logs.levels.debug'),
                info: t('admin.librarian.logs.levels.info'),
                warn: t('admin.librarian.logs.levels.warn'),
                error: t('admin.librarian.logs.levels.error'),
                success: t('admin.librarian.logs.levels.success'),
                trace: t('admin.librarian.logs.levels.trace'),
              }}
              showSearch
              showLevelFilter
              showDownload
              autoScroll
              maxHeight={900}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ScrollText size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateText}>
              {t('admin.librarian.logs.noActiveAudit')}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {t('admin.librarian.logs.triggerAuditToSee')}
            </Text>
          </View>
        )}
      </GlassDraggableExpander>

      {/* Schedule Information */}
      <GlassDraggableExpander
        title={t('admin.librarian.schedules.title')}
        subtitle={t('admin.librarian.schedules.subtitle', 'Configure daily and weekly audit schedules')}
        icon={<Calendar size={20} color={colors.primary} />}
        defaultExpanded={false}
        draggable={true}
        minHeight={200}
        maxHeight={500}
        style={{ marginTop: spacing.lg }}
      >
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
            onUpdate={handleScheduleUpdate}
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
            onUpdate={handleScheduleUpdate}
          />
        </View>
      </GlassDraggableExpander>

      {/* Recent Reports */}
      <GlassDraggableExpander
        title={t('admin.librarian.reports.title')}
        subtitle={reports.length > 0 ? t('admin.librarian.reports.totalReports', { count: reports.length }) : undefined}
        icon={<FileText size={20} color={colors.primary} />}
        badge={
          reports.length > 0 ? (
            <GlassButton
              title={t('admin.librarian.reports.clearAll')}
              variant="destructive"
              icon={<Trash2 size={14} color={colors.error} />}
              onPress={handleClearReportsClick}
              loading={clearingReports}
              disabled={clearingReports}
              style={styles.clearButtonCompact}
            />
          ) : undefined
        }
        defaultExpanded={false}
        draggable={true}
        minHeight={200}
        maxHeight={600}
        style={styles.reportsExpanderContainer}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateText}>
              {t('admin.librarian.reports.emptyMessage')}
            </Text>
          </View>
        ) : (
          <GlassTable
            columns={reportColumns}
            data={reports}
            isRTL={isRTL}
            rowKey="audit_id"
          />
        )}
      </GlassDraggableExpander>

      {/* Activity Log */}
      <GlassDraggableExpander
        title={t('admin.librarian.activityLog.title')}
        subtitle={actions.length > 0 ? t('admin.librarian.activityLog.subtitle', `${actions.length} actions recorded`) : undefined}
        icon={<ScrollText size={20} color={colors.primary} />}
        defaultExpanded={false}
        draggable={true}
        minHeight={200}
        maxHeight={600}
        style={{ marginTop: spacing.lg }}
      >
        <LibrarianActivityLog
          actions={actions}
          onRollback={handleRollback}
          config={config}
        />
      </GlassDraggableExpander>

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

      {/* Confirmation Modal for Clear Reports */}
      <GlassModal
        visible={clearReportsModalOpen}
        type="warning"
        title={t('admin.librarian.reports.clearAll')}
        message={t('admin.librarian.reports.confirmClearAll')}
        buttons={[
          {
            text: t('common.cancel'),
            onPress: () => setClearReportsModalOpen(false),
            variant: 'secondary',
          },
          {
            text: t('admin.librarian.reports.clearAll'),
            onPress: handleClearReportsConfirm,
            variant: 'destructive',
          },
        ]}
        dismissable
      />

      {/* Report Detail Modal */}
      <GlassModal
        visible={detailModalVisible}
        title={t('admin.librarian.reports.detailModal.title', {
          id: selectedReport?.audit_id.substring(0, config.ui.id_truncate_length) || '...'
        })}
        onClose={() => setDetailModalVisible(false)}
      >
        {detailModalLoading ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('admin.librarian.loading')}</Text>
          </View>
        ) : selectedReport ? (
          <>
            <View style={styles.modalHeaderActions}>
              <GlassButton
                title={t('admin.librarian.reports.viewLogs')}
                variant="secondary"
                icon={<FileText size={16} color={colors.text} />}
                onPress={() => {
                  setDetailModalVisible(false);
                  handleViewLogsInPanel(selectedReport.audit_id);
                }}
                style={styles.viewLogsButton}
              />
            </View>
            <ScrollView style={[styles.modalContent, { maxHeight: config.ui.modal_max_height }]}>
              {/* Summary Section */}
              <GlassCard style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.summary')}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.status')}</Text>
                    <GlassBadge
                      text={t(`admin.librarian.status.${selectedReport.status}`, selectedReport.status)}
                      variant={
                        selectedReport.status === 'completed' ? 'success' :
                        selectedReport.status === 'failed' ? 'error' : 'warning'
                      }
                    />
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.executionTime')}</Text>
                    <Text style={styles.statValue}>{selectedReport.execution_time_seconds.toFixed(1)}s</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.totalItems')}</Text>
                    <Text style={styles.statValue}>{selectedReport.summary.total_items ?? 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('admin.librarian.reports.detailModal.healthyItems')}</Text>
                    <Text style={styles.statValue}>{selectedReport.summary.healthy_items ?? 0}</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Issues Found Section */}
              <GlassCard style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.issuesFound')}</Text>
                {selectedReport.audit_type === 'ai_agent' ? (
                  // For AI agent audits, show total count from summary
                  <View style={styles.fixesContainer}>
                    <Text style={styles.issueCount}>{selectedReport.summary.issues_found ?? 0}</Text>
                    <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.totalIssues')}</Text>
                    {selectedReport.ai_insights && selectedReport.ai_insights.length > 0 && (
                      <Text style={styles.aiAuditNote}>{t('admin.librarian.reports.detailModal.seeInsightsBelow')}</Text>
                    )}
                  </View>
                ) : (
                  // For rule-based audits, show breakdown
                  <View style={styles.issuesGrid}>
                    <View style={styles.issueItem}>
                      <Text style={styles.issueCount}>{selectedReport.broken_streams?.length ?? 0}</Text>
                      <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.brokenStreams')}</Text>
                    </View>
                    <View style={styles.issueItem}>
                      <Text style={styles.issueCount}>{selectedReport.missing_metadata?.length ?? 0}</Text>
                      <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.missingMetadata')}</Text>
                    </View>
                    <View style={styles.issueItem}>
                      <Text style={styles.issueCount}>{selectedReport.misclassifications?.length ?? 0}</Text>
                      <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.misclassifications')}</Text>
                    </View>
                    <View style={styles.issueItem}>
                      <Text style={styles.issueCount}>{selectedReport.orphaned_items?.length ?? 0}</Text>
                      <Text style={styles.issueLabel}>{t('admin.librarian.reports.detailModal.orphanedItems')}</Text>
                    </View>
                  </View>
                )}
              </GlassCard>

              {/* Fixes Applied Section */}
              <GlassCard style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.fixesApplied')}</Text>
                <View style={styles.fixesContainer}>
                  <Text style={styles.fixesCount}>
                    {selectedReport.audit_type === 'ai_agent'
                      ? (selectedReport.summary.issues_fixed ?? 0)
                      : (selectedReport.fixes_applied?.length ?? 0)}
                  </Text>
                  <Text style={styles.fixesLabel}>
                    {t('admin.librarian.reports.detailModal.totalFixes', {
                      count: selectedReport.audit_type === 'ai_agent'
                        ? (selectedReport.summary.issues_fixed ?? 0)
                        : (selectedReport.fixes_applied?.length ?? 0)
                    })}
                  </Text>
                </View>
              </GlassCard>

              {/* AI Insights Section */}
              {selectedReport.ai_insights && selectedReport.ai_insights.length > 0 && (
                <GlassCard style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('admin.librarian.reports.detailModal.aiInsights')}</Text>
                  {selectedReport.ai_insights.map((insight, index) => (
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


      {/* Error Modal */}
      <GlassModal
        visible={errorModalOpen}
        title={t('common.error')}
        onClose={() => setErrorModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{errorMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="secondary"
            style={styles.modalButton}
          />
        </View>
      </GlassModal>

      {/* Success Modal */}
      <GlassModal
        visible={successModalOpen}
        title={t('common.success')}
        onClose={() => setSuccessModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{successMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setSuccessModalOpen(false)}
            variant="secondary"
            style={styles.modalButton}
          />
        </View>
      </GlassModal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: 0,
  },
  clearButton: {
    minWidth: 120,
  },
  clearButtonCompact: {
    minWidth: 90,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  reportsExpanderContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  modalContent: {
    // maxHeight is now applied inline from config
  },
  modalLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
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
  logViewerContainer: {
    padding: spacing.md,
  },
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
  modalLoadingContainer: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  modalLoadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textMuted,
  },
  modalText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
  liveLogPanel: {
    marginTop: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  livePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    cursor: 'pointer',
  },
  livePanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  livePanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  livePanelSpinner: {
    marginLeft: spacing.sm,
  },
  livePanelBadge: {
    marginLeft: spacing.sm,
  },
  livePanelContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  livePanelInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.text}15`,
  },
  livePanelInfoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    minHeight: 250,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default LibrarianAgentPage;
