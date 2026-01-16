import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Bot, Play, Zap, FileText, Eye, ScrollText, Trash2, Calendar, Pause, PlayCircle, XCircle } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import LibrarianScheduleCard from '@/components/admin/LibrarianScheduleCard';
import { VoiceLibrarianControl } from '@/components/admin/VoiceLibrarianControl';
import { GlassCard, GlassButton, GlassModal, GlassBadge, GlassTable, GlassTableColumn, GlassLog, LogEntry, GlassDraggableExpander, GlassResizablePanel } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import {
  getLibrarianConfig,
  getLibrarianStatus,
  getAuditReports,
  getAuditReportDetails,
  triggerAudit,
  clearAuditReports,
  pauseAudit,
  resumeAudit,
  cancelAudit,
  executeVoiceCommand,
  LibrarianConfig,
  LibrarianStatus,
  AuditReport,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [clearingReports, setClearingReports] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [last24HoursOnly, setLast24HoursOnly] = useState(false);
  const [cybTitlesOnly, setCybTitlesOnly] = useState(false);
  const [tmdbPostersOnly, setTmdbPostersOnly] = useState(false);
  const [openSubtitlesEnabled, setOpenSubtitlesEnabled] = useState(false);
  const [classifyOnly, setClassifyOnly] = useState(false);
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
  const [pausingAudit, setPausingAudit] = useState(false);
  const [resumingAudit, setResumingAudit] = useState(false);
  const [cancellingAudit, setCancellingAudit] = useState(false);
  const [auditPaused, setAuditPaused] = useState(false);
  const [connectingToLiveLog, setConnectingToLiveLog] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  // Parse batch progress from logs - OPTIMIZED with useMemo
  const batchProgress = useMemo(() => {
    if (!livePanelReport?.execution_logs) {
      return null;
    }

    const logs = livePanelReport.execution_logs;
    let totalItems = 0;
    let itemsProcessed = 0;
    let currentSkip = 0;
    const batchSize = 100; // Default batch size

    // Parse logs to extract batch information
    logs.forEach(log => {
      const msg = log.message.toLowerCase();

      // Look for total count mentions
      const totalMatch = msg.match(/total[:\s]+(\d+)/i) || msg.match(/"total"[:\s]+(\d+)/i);
      if (totalMatch && parseInt(totalMatch[1]) > totalItems) {
        totalItems = parseInt(totalMatch[1]);
      }

      // Look for skip/batch mentions
      const skipMatch = msg.match(/skip[:\s]+(\d+)/i) || msg.match(/"skip"[:\s]+(\d+)/i);
      if (skipMatch) {
        const skip = parseInt(skipMatch[1]);
        if (skip > currentSkip) {
          currentSkip = skip;
        }
      }

      // Look for count mentions (items in current batch)
      const countMatch = msg.match(/"count"[:\s]+(\d+)/i);
      if (countMatch) {
        // This helps us know items were processed
        itemsProcessed = currentSkip + parseInt(countMatch[1]);
      }
    });

    if (totalItems > 0) {
      const currentBatch = Math.floor(currentSkip / batchSize) + 1;
      const totalBatches = Math.ceil(totalItems / batchSize);
      let percentage = Math.round((itemsProcessed / totalItems) * 100);

      // Cap at 99% while audit is still in progress (100% only when actually complete)
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

  // Load all data
  const loadData = useCallback(async () => {
    try {
      // Fetch config first - FAIL FAST if this fails
      const configData = await getLibrarianConfig();
      setConfig(configData);
      setBudgetLimit(configData.audit_limits.default_budget_usd);
      setConfigError(null);

      // Now load data using config limits
      const [statusData, reportsData] = await Promise.all([
        getLibrarianStatus(),
        getAuditReports(configData.pagination.reports_limit),
      ]);

      setStatus(statusData);
      setReports(reportsData);

      // Calculate budget used from recent audits (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const totalBudgetUsed = reportsData.reduce((sum, report) => {
        const reportDate = new Date(report.audit_date);
        if (reportDate >= thirtyDaysAgo && report.content_results?.total_cost_usd) {
          return sum + report.content_results.total_cost_usd;
        }
        return sum;
      }, 0);
      
      setBudgetUsed(totalBudgetUsed);
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

  // Auto-load running audit into live panel on page load
  useEffect(() => {
    // Only run once when reports are first loaded
    if (reports.length === 0 || livePanelReport) {
      return;
    }

    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (inProgressAudit) {
      logger.info(`[Auto-load] Loading running audit into live panel: ${inProgressAudit.audit_id}`);
      
      // Load audit details directly
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
  }, [reports]);

  // Poll for in-progress audits (real-time log streaming) - OPTIMIZED
  useEffect(() => {
    // Check if there's an in-progress audit in the reports list
    const inProgressAudit = reports.find(r => r.status === 'in_progress');

    if (!inProgressAudit) {
      return; // No polling needed
    }

    // Only poll if the live panel or detail modal is actually viewing this audit
    const shouldPoll = (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) ||
                       (selectedReport && selectedReport.audit_id === inProgressAudit.audit_id);

    if (!shouldPoll) {
      return; // Don't poll if not actively viewing
    }

    logger.info(`[Polling] Found in-progress audit: ${inProgressAudit.audit_id}`);

    // Poll every 5 seconds (reduced from 2s for better performance)
    const pollInterval = setInterval(async () => {
      try {
        const details = await getAuditReportDetails(inProgressAudit.audit_id);
        const logCount = details.execution_logs?.length || 0;

        logger.info(`[Polling] Fetched audit ${inProgressAudit.audit_id} - Status: ${details.status}, Logs: ${logCount}`);

        // Update live panel if it's for this audit
        if (livePanelReport && livePanelReport.audit_id === inProgressAudit.audit_id) {
          setLivePanelReport(details);
          setLastPolledAt(new Date());
          logger.info(`[Polling] Updated live panel - ${logCount} logs`);
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
    }, 5000); // Poll every 5 seconds (optimized from 2s)

    // Cleanup on unmount or when reports change
    return () => {
      clearInterval(pollInterval);
    };
  }, [reports, selectedReport, livePanelReport, loadData]);


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

    // Check if there's already an audit in progress
    const inProgressAudit = reports.find(r => r.status === 'in_progress');
    if (inProgressAudit) {
      setErrorMessage(
        t('admin.librarian.errors.auditAlreadyRunning', 
          'An audit is already running. Please wait for it to complete or cancel it before starting a new one.'
        )
      );
      setErrorModalOpen(true);
      return;
    }

    // Check if budget would be exceeded
    const potentialTotalBudget = budgetUsed + budgetLimit;
    const monthlyBudgetLimit = config.audit_limits.max_budget_usd * 30; // Approximate monthly limit
    
    if (budgetUsed + budgetLimit > monthlyBudgetLimit) {
      setErrorMessage(
        t('admin.librarian.errors.budgetExceeded', 
          `Monthly budget limit exceeded. Used: $${budgetUsed.toFixed(2)}, Requested: $${budgetLimit.toFixed(2)}, Monthly Limit: $${monthlyBudgetLimit.toFixed(2)}`
        )
      );
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
        classify_only: classifyOnly,
      });

      // Expand live panel and show initialization
      setLivePanelExpanded(true);
      
      // Create initialization log entries
      const auditTypeLabel = auditType === 'ai_agent' 
        ? t('admin.librarian.audit.types.aiAgent', 'AI Agent')
        : t('admin.librarian.audit.types.dailyIncremental', 'Daily Incremental');
      
      const initLog: AuditReportDetail = {
        audit_id: 'initializing',
        audit_type: auditType,
        audit_date: new Date().toISOString(),
        status: 'in_progress',
        execution_logs: [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: t('admin.librarian.logs.auditInitializing', { auditType: auditTypeLabel }),
          },
          {
            id: '2',
            timestamp: new Date().toISOString(),
            level: dryRun ? 'warn' : 'info',
            message: dryRun 
              ? t('admin.librarian.logs.dryRunMode')
              : t('admin.librarian.logs.liveMode'),
          },
          {
            id: '3',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: t('admin.librarian.logs.budgetSet', { budget: budgetLimit.toFixed(2) }),
          },
          {
            id: '4',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: t('admin.librarian.logs.connectingToAgent'),
          },
        ],
        summary: null,
        ai_insights: null,
        fixes_applied: [],
        items_checked: 0,
        issues_found: 0,
        completed_at: null,
      };
      
      setLivePanelReport(initLog);
      
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


  // Convert audit report to log entries - OPTIMIZED with useCallback
  const generateLogEntriesFromReport = useCallback((report: AuditReportDetail): LogEntry[] => {
    const logs: LogEntry[] = [];
    const baseTime = new Date(report.audit_date);

    // Start log
    logs.push({
      id: '1',
      timestamp: baseTime,
      level: 'info',
      message: `${t('admin.librarian.logs.auditStarted')}: ${t(`admin.librarian.auditTypes.${report.audit_type}`, report.audit_type.replace('_', ' '))}`,
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
  }, [t]);

  // Handle view logs in live panel
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
      // Delay removing spinner to allow log animation to start
      setTimeout(() => setConnectingToLiveLog(false), 300);
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

  // Handle pause audit
  const handlePauseAudit = async () => {
    if (!livePanelReport?.audit_id) return;
    
    setPausingAudit(true);
    try {
      await pauseAudit(livePanelReport.audit_id);
      setAuditPaused(true);
      setSuccessMessage(t('admin.librarian.audit.pauseSuccess', 'Audit paused successfully'));
      setSuccessModalOpen(true);
    } catch (error) {
      logger.error('Failed to pause audit:', error);
      setErrorMessage(t('admin.librarian.errors.failedToPause', 'Failed to pause audit'));
      setErrorModalOpen(true);
    } finally {
      setPausingAudit(false);
    }
  };

  // Handle resume audit
  const handleResumeAudit = async () => {
    if (!livePanelReport?.audit_id) return;
    
    setResumingAudit(true);
    try {
      await resumeAudit(livePanelReport.audit_id);
      setAuditPaused(false);
      setSuccessMessage(t('admin.librarian.audit.resumeSuccess', 'Audit resumed successfully'));
      setSuccessModalOpen(true);
    } catch (error) {
      logger.error('Failed to resume audit:', error);
      setErrorMessage(t('admin.librarian.errors.failedToResume', 'Failed to resume audit'));
      setErrorModalOpen(true);
    } finally {
      setResumingAudit(false);
    }
  };

  // Handle cancel audit
  const handleCancelAudit = async () => {
    if (!livePanelReport?.audit_id) return;
    
    setCancellingAudit(true);
    try {
      await cancelAudit(livePanelReport.audit_id);
      setLivePanelReport(null);
      setAuditPaused(false);
      setSuccessMessage(t('admin.librarian.audit.cancelSuccess', 'Audit cancelled successfully'));
      setSuccessModalOpen(true);
      await loadData();
    } catch (error) {
      logger.error('Failed to cancel audit:', error);
      setErrorMessage(t('admin.librarian.errors.failedToCancel', 'Failed to cancel audit'));
      setErrorModalOpen(true);
    } finally {
      setCancellingAudit(false);
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

  // Report table columns - OPTIMIZED with useMemo
  const reportColumns: GlassTableColumn<AuditReport>[] = useMemo(() => [
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
  ], [t, loadingAuditId]);

  // Health color - OPTIMIZED with useCallback
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

      {/* Two-Column Layout */}
      <View style={[styles.twoColumnLayout, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* LEFT COLUMN - Main Content */}
        <View style={styles.mainColumn}>
          {/* Quick Actions */}
      <GlassDraggableExpander
        title={t('admin.librarian.quickActions.title')}
        subtitle={t('admin.librarian.quickActions.subtitle', 'Configure and trigger audits')}
        icon={<Zap size={20} color={colors.primary} />}
        defaultExpanded={false}
        draggable={true}
        minHeight={450}
        maxHeight={700}
        style={styles.actionsCard}
      >
        {/* Audit Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.auditMode', 'Audit Mode')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.auditModeHelp', 'Choose what to check')}</Text>
          
          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, dryRun && styles.checkboxChecked]}
              onPress={() => setDryRun(!dryRun)}
            >
              {dryRun && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.dryRun')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.dryRunHelp', 'Report issues without making changes')}</Text>
            </View>
          </View>
        </View>

        {/* Scope Filters Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.scopeFilters', 'Scope Filters')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.scopeFiltersHelp', 'Optional - Leave all unchecked to audit everything')}</Text>
          
          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, last24HoursOnly && styles.checkboxChecked]}
              onPress={() => setLast24HoursOnly(!last24HoursOnly)}
            >
              {last24HoursOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.last24Hours')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.last24HoursHelp', 'Only recently added content')}</Text>
            </View>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, cybTitlesOnly && styles.checkboxChecked]}
              onPress={() => setCybTitlesOnly(!cybTitlesOnly)}
            >
              {cybTitlesOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.cybTitlesOnly')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.cybTitlesOnlyHelp', 'Focus on title cleanup')}</Text>
            </View>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, tmdbPostersOnly && styles.checkboxChecked]}
              onPress={() => setTmdbPostersOnly(!tmdbPostersOnly)}
            >
              {tmdbPostersOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.tmdbPostersOnly')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.tmdbPostersOnlyHelp', 'Focus on posters & metadata')}</Text>
            </View>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, openSubtitlesEnabled && styles.checkboxChecked]}
              onPress={() => setOpenSubtitlesEnabled(!openSubtitlesEnabled)}
            >
              {openSubtitlesEnabled && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.openSubtitlesEnabled', 'Subtitles Only (OpenSubtitles)')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.openSubtitlesEnabledHelp', 'Download subtitles from OpenSubtitles only')}</Text>
            </View>
          </View>

          <View style={styles.checkboxRow}>
            <Pressable
              style={[styles.checkbox, classifyOnly && styles.checkboxChecked]}
              onPress={() => setClassifyOnly(!classifyOnly)}
            >
              {classifyOnly && <View style={styles.checkboxInner} />}
            </Pressable>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>{t('admin.librarian.quickActions.classifyOnly', 'Classify Content')}</Text>
              <Text style={styles.checkboxHelper}>{t('admin.librarian.quickActions.classifyOnlyHelp', 'Verify and fix content categorization')}</Text>
            </View>
          </View>
        </View>

        {/* Audit Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.auditType', 'Audit Type')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.auditTypeHelp', 'Choose between rule-based or AI-powered audit')}</Text>
          
          {/* Daily Audit Card */}
          <View style={styles.auditTypeCard}>
            <View style={styles.auditTypeHeader}>
              <Play size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.auditTypeTitle}>{t('admin.librarian.quickActions.dailyAudit', 'Daily Audit')}</Text>
                <Text style={styles.auditTypeBadge}>{t('admin.librarian.quickActions.dailyBadge', 'Rule-Based • Fast • Free')}</Text>
              </View>
            </View>
            <Text style={styles.auditTypeDescription}>
              {t('admin.librarian.quickActions.dailyDescription', 'Runs predefined checks on content modified in the last 7 days. Fast and predictable, no AI costs.')}
            </Text>
            <GlassButton
              title={t('admin.librarian.quickActions.triggerDaily')}
              variant="primary"
              icon={<Play size={16} color={colors.background} />}
              onPress={() => handleTriggerAudit('daily_incremental')}
              loading={triggering && pendingAuditType === 'daily_incremental'}
              disabled={triggering || reports.some(r => r.status === 'in_progress')}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          {/* AI Agent Card */}
          <View style={styles.auditTypeCard}>
            <View style={styles.auditTypeHeader}>
              <Bot size={20} color={colors.secondary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.auditTypeTitle}>{t('admin.librarian.quickActions.aiAgentAudit', 'AI Agent Audit')}</Text>
                <Text style={[styles.auditTypeBadge, { color: colors.secondary }]}>{t('admin.librarian.quickActions.aiAgentBadge', 'AI-Powered • Intelligent • Uses Budget')}</Text>
              </View>
            </View>
            <Text style={styles.auditTypeDescription}>
              {t('admin.librarian.quickActions.aiAgentDescription', 'Autonomous AI agent (Claude) makes intelligent decisions about what to check and fix. More comprehensive but uses API budget.')}
            </Text>
            <GlassButton
              title={t('admin.librarian.quickActions.triggerAI')}
              variant="secondary"
              icon={<Bot size={16} color={colors.text} />}
              onPress={() => handleTriggerAudit('ai_agent')}
              loading={triggering && pendingAuditType === 'ai_agent'}
              disabled={triggering || reports.some(r => r.status === 'in_progress')}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
        
        {/* Show message if audit is already running */}
        {reports.some(r => r.status === 'in_progress') && !triggering && (
          <View style={styles.auditRunningNotice}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={styles.auditRunningText}>
              {t('admin.librarian.quickActions.auditRunningNotice', 'An audit is currently running. Buttons will be enabled when it completes.')}
            </Text>
          </View>
        )}

        <View style={styles.budgetSection}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>
              {t('admin.librarian.quickActions.budgetPerAudit', 'Budget per Audit:')} ${budgetLimit.toFixed(2)}
            </Text>
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
          
          <View style={styles.budgetUsageRow}>
            <Text style={styles.budgetUsageLabel}>
              {t('admin.librarian.quickActions.monthlyBudgetUsed', 'Monthly Budget (Last 30 days):')}
            </Text>
            <Text style={[
              styles.budgetUsageAmount,
              budgetUsed > (config.audit_limits.max_budget_usd * 20) && styles.budgetUsageWarning
            ]}>
              ${budgetUsed.toFixed(2)} / ${(config.audit_limits.max_budget_usd * 30).toFixed(2)}
            </Text>
          </View>
          
          {budgetUsed + budgetLimit > (config.audit_limits.max_budget_usd * 30) && (
            <View style={styles.budgetWarningBox}>
              <Text style={styles.budgetWarningText}>
                ⚠️ {t('admin.librarian.quickActions.budgetWarning', 'Running this audit would exceed monthly budget limit')}
              </Text>
            </View>
          )}
        </View>
      </GlassDraggableExpander>

          {/* Live Audit Log Panel */}
      <GlassDraggableExpander
        title={t('admin.librarian.logs.liveAuditLog')}
        subtitle={livePanelReport ? `${t('admin.librarian.logs.auditType')}: ${t(`admin.librarian.auditTypes.${livePanelReport.audit_type}`, livePanelReport.audit_type.replace('_', ' '))}` : undefined}
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
        minHeight={700}
        maxHeight={1400}
        style={styles.liveLogPanel}
      >
        {connectingToLiveLog ? (
          <View style={styles.connectingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.connectingText}>
              {t('admin.librarian.logs.connecting', 'Connecting to live audit log...')}
            </Text>
          </View>
        ) : livePanelReport ? (
          <View style={{ flex: 1, minHeight: 0 }}>
            <View style={styles.livePanelInfo}>
              <View style={{ flex: 1 }}>
                <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.livePanelInfoText}>
                    {t('admin.librarian.logs.started')}: {format(new Date(livePanelReport.audit_date), 'HH:mm:ss')}
                  </Text>
                  {livePanelReport.status === 'in_progress' && (
                    <Text style={[styles.livePanelInfoText, { color: colors.warning, marginLeft: spacing.md }]}>
                      ● {t('admin.librarian.status.running', 'Running')}
                    </Text>
                  )}
                </View>
                {livePanelReport.completed_at && (
                  <Text style={[styles.livePanelInfoText, { color: colors.success }]}>
                    {t('admin.librarian.logs.completed')}: {format(new Date(livePanelReport.completed_at), 'HH:mm:ss')}
                  </Text>
                )}
                {livePanelReport.execution_logs && livePanelReport.execution_logs.length > 0 && (() => {
                  const lastLogTime = new Date(livePanelReport.execution_logs[livePanelReport.execution_logs.length - 1].timestamp);
                  const timeSinceLastLog = Math.floor((Date.now() - lastLogTime.getTime()) / 1000); // seconds
                  const isStale = livePanelReport.status === 'in_progress' && timeSinceLastLog > 30;
                  
                  return (
                    <View>
                      <Text style={[
                        styles.livePanelInfoText, 
                        { 
                          fontSize: 12, 
                          color: isStale ? colors.warning : colors.textMuted, 
                          marginTop: spacing.xs 
                        }
                      ]}>
                        {t('admin.librarian.logs.lastLog', 'Last log')}: {format(lastLogTime, 'HH:mm:ss')}
                        {timeSinceLastLog > 5 && ` (${timeSinceLastLog}s ago)`}
                      </Text>
                      {isStale && (
                        <Text style={[styles.livePanelInfoText, { fontSize: 11, color: colors.warning, marginTop: spacing.xs, fontStyle: 'italic' }]}>
                          ⚠ {t('admin.librarian.logs.staleWarning', 'No new logs for {{seconds}}s - job may be processing or stuck', { seconds: timeSinceLastLog })}
                        </Text>
                      )}
                      {lastPolledAt && livePanelReport.status === 'in_progress' && (
                        <Text style={[styles.livePanelInfoText, { fontSize: 10, color: colors.textMuted, marginTop: spacing.xs, opacity: 0.7 }]}>
                          {t('admin.librarian.logs.pollingStatus', 'Polling active • Last checked')}: {format(lastPolledAt, 'HH:mm:ss')}
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </View>
              
              {/* Audit Control Buttons */}
              {livePanelReport.status === 'in_progress' && (
                <View style={[styles.auditControlButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <GlassButton
                    title={t('common.refresh', 'Refresh')}
                    variant="secondary"
                    size="md"
                    icon={<RefreshCw size={16} color={colors.text} />}
                    onPress={handleRefresh}
                    loading={refreshing}
                    disabled={refreshing}
                    style={styles.auditControlButton}
                  />
                  {!auditPaused ? (
                    <GlassButton
                      title={t('admin.librarian.audit.pause', 'Pause')}
                      variant="secondary"
                      size="md"
                      icon={<Pause size={16} color={colors.text} />}
                      onPress={handlePauseAudit}
                      loading={pausingAudit}
                      disabled={pausingAudit || cancellingAudit}
                      style={styles.auditControlButton}
                    />
                  ) : (
                    <GlassButton
                      title={t('admin.librarian.audit.resume', 'Resume')}
                      variant="secondary"
                      size="md"
                      icon={<PlayCircle size={16} color={colors.text} />}
                      onPress={handleResumeAudit}
                      loading={resumingAudit}
                      disabled={resumingAudit || cancellingAudit}
                      style={styles.auditControlButton}
                    />
                  )}
                  <GlassButton
                    title={t('admin.librarian.audit.cancel', 'Cancel')}
                    variant="secondary"
                    size="md"
                    icon={<XCircle size={16} color={colors.error} />}
                    onPress={handleCancelAudit}
                    loading={cancellingAudit}
                    disabled={pausingAudit || resumingAudit || cancellingAudit}
                    style={styles.auditControlButton}
                    textStyle={{ color: colors.error }}
                  />
                </View>
              )}
            </View>

            {/* Batch Progress Bar - Only show for in-progress audits */}
            {livePanelReport.status === 'in_progress' && batchProgress && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.progressLabel}>
                    {batchProgress.percentage >= 99 ? (
                      t('admin.librarian.progress.finishing', 'Finishing up...')
                    ) : (
                      t('admin.librarian.progress.batch', 'Batch {{current}} of {{total}}', {
                        current: batchProgress.currentBatch,
                        total: batchProgress.totalBatches
                      })
                    )}
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {batchProgress.percentage}%
                  </Text>
                </View>
                <Text style={styles.progressSubtext}>
                  {t('admin.librarian.progress.items', '{{processed}} of {{total}} items', {
                    processed: batchProgress.itemsProcessed,
                    total: batchProgress.totalItems
                  })}
                  {batchProgress.percentage >= 99 && (
                    <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                      {' • '}{t('admin.librarian.progress.finalizing', 'Generating report and applying fixes')}
                    </Text>
                  )}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${batchProgress.percentage}%` }]} />
                </View>
              </View>
            )}
            
            {/* Completion Summary - Show when audit is complete */}
            {(livePanelReport.status === 'completed' || livePanelReport.status === 'failed' || livePanelReport.status === 'partial') && (
              <View style={[
                styles.completionBanner,
                { 
                  backgroundColor: livePanelReport.status === 'completed' ? colors.success + '20' : 
                                   livePanelReport.status === 'failed' ? colors.error + '20' : 
                                   colors.warning + '20',
                  borderColor: livePanelReport.status === 'completed' ? colors.success : 
                               livePanelReport.status === 'failed' ? colors.error : 
                               colors.warning,
                }
              ]}>
                <Text style={[
                  styles.completionText,
                  { 
                    color: livePanelReport.status === 'completed' ? colors.success : 
                           livePanelReport.status === 'failed' ? colors.error : 
                           colors.warning,
                  }
                ]}>
                  {livePanelReport.status === 'completed' ? '✓ ' : 
                   livePanelReport.status === 'failed' ? '✗ ' : '⚠ '}
                  {t(`admin.librarian.status.${livePanelReport.status}`)}
                  {livePanelReport.execution_time_seconds && ` • ${livePanelReport.execution_time_seconds.toFixed(1)}s`}
                  {livePanelReport.summary && ` • ${livePanelReport.summary.total_items || 0} items checked`}
                </Text>
              </View>
            )}

            {livePanelExpanded && (
              <View style={{ flex: 1, minHeight: 0 }}>
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
                  maxHeight={1200}
                  animateEntries={false}
                />
              </View>
            )}
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
        </View>

        {/* RIGHT COLUMN - Sidebar */}
        <GlassResizablePanel 
          defaultWidth={420} 
          minWidth={340} 
          maxWidth={600}
          position="right"
          style={styles.sidebarColumn}
        >
          {/* Stats Section */}
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.sidebarSectionTitle, { textAlign }]}>
              {t('admin.librarian.stats.title', 'System Status')}
            </Text>
            <View style={styles.statsGridCompact}>
              <View style={styles.statBoxCompact}>
                <Bot size={20} color={getHealthColor(status?.system_health || 'unknown')} />
                <Text style={[styles.statBoxValue, { color: getHealthColor(status?.system_health || 'unknown') }]}>
                  {status?.system_health ? t(`admin.librarian.health.${status.system_health}`) : '?'}
                </Text>
                <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.systemHealth')}</Text>
              </View>
              <View style={styles.statBoxCompact}>
                <RefreshCw size={20} color={colors.primary} />
                <Text style={[styles.statBoxValue, { color: colors.primary }]}>
                  {status?.total_audits_last_30_days || 0}
                </Text>
                <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.totalAudits')}</Text>
              </View>
              <View style={styles.statBoxCompact}>
                <Zap size={20} color={colors.success} />
                <Text style={[styles.statBoxValue, { color: colors.success }]}>
                  {status?.total_issues_fixed || 0}
                </Text>
                <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.issuesFixed')}</Text>
              </View>
              <View style={styles.statBoxCompact}>
                <Calendar size={20} color={colors.textMuted} />
                <Text style={styles.statBoxValue}>
                  {status?.last_audit_date ? format(new Date(status.last_audit_date), 'MMM d') : '-'}
                </Text>
                <Text style={styles.statBoxLabel}>{t('admin.librarian.stats.lastAudit')}</Text>
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

          {/* Schedule Information */}
          <GlassDraggableExpander
            title={t('admin.librarian.schedules.title')}
            subtitle={t('admin.librarian.schedules.subtitle', 'Automated audit schedules')}
            icon={<Calendar size={18} color={colors.primary} />}
            defaultExpanded={false}
          >
            <View style={styles.schedulesColumn}>
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
            subtitle={`${reports.length} ${t('admin.librarian.reports.reports', 'reports')}`}
            icon={<FileText size={18} color={colors.primary} />}
            defaultExpanded={false}
          >
            <View style={styles.sidebarSection}>
              {reports.length > 0 && (
                <GlassButton
                  title={t('admin.librarian.reports.clearAll')}
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} color={colors.textMuted} />}
                  onPress={handleClearReportsClick}
                  loading={clearingReports}
                  disabled={clearingReports}
                  style={styles.clearButtonSidebar}
                />
              )}
              {reports.length === 0 ? (
                <View style={styles.emptyStateSidebar}>
                  <FileText size={32} color={colors.textMuted} />
                  <Text style={styles.emptyStateTextSidebar}>
                    {t('admin.librarian.reports.emptyMessage')}
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.reportsList} nestedScrollEnabled>
                  {reports.slice(0, 10).map((report) => (
                    <Pressable
                      key={report.audit_id}
                      style={styles.reportItemCompact}
                      onPress={() => handleViewReport(report.audit_id)}
                    >
                      <View style={[styles.reportItemHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportItemDate}>
                            {format(new Date(report.audit_date), 'MMM d, HH:mm')}
                          </Text>
                          <Text style={styles.reportItemType}>
                            {t(`admin.librarian.auditTypes.${report.audit_type}`, report.audit_type.replace('_', ' '))}
                          </Text>
                        </View>
                        <GlassBadge
                          text={t(`admin.librarian.status.${report.status}`, report.status)}
                          variant={
                            report.status === 'completed' ? 'success' :
                            report.status === 'failed' ? 'error' : 'warning'
                          }
                        />
                      </View>
                      <View style={[styles.reportItemMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.reportItemMetaText}>
                          {report.issues_count} {t('admin.librarian.reports.issues', 'issues')}
                        </Text>
                        <Text style={styles.reportItemMetaText}>
                          {report.fixes_count} {t('admin.librarian.reports.fixes', 'fixes')}
                        </Text>
                        <Text style={styles.reportItemMetaText}>
                          {report.execution_time_seconds.toFixed(1)}s
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                  {reports.length > 10 && (
                    <Text style={styles.moreReportsText}>
                      +{reports.length - 10} {t('admin.librarian.reports.more', 'more')}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </GlassDraggableExpander>
        </GlassResizablePanel>
      </View>

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
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
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
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  checkboxHelper: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  auditRunningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    marginBottom: spacing.md,
  },
  auditRunningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  auditTypeCard: {
    padding: spacing.md,
    backgroundColor: colors.glassBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  auditTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  auditTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  auditTypeBadge: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  auditTypeDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  budgetSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: colors.text,
  },
  budgetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  budgetUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  budgetUsageLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  budgetUsageAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  budgetUsageWarning: {
    color: colors.warning,
  },
  budgetWarningBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  budgetWarningText: {
    fontSize: 12,
    color: colors.warning,
    textAlign: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePanelInfoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  auditControlButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  auditControlButton: {
    minWidth: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    minHeight: 300,
    gap: spacing.md,
  },
  connectingText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  completionBanner: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.glassPurpleLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.glassStrong,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    transition: 'width 0.3s ease',
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
  // Two-Column Layout
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
  // Stats Card (Sidebar)
  statsCard: {
    padding: spacing.md,
  },
  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBoxCompact: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Schedules in sidebar
  schedulesColumn: {
    gap: spacing.md,
  },
  // Sidebar section
  sidebarSection: {
    gap: spacing.sm,
  },
  clearButtonSidebar: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  emptyStateSidebar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateTextSidebar: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  reportsList: {
    maxHeight: 400,
  },
  reportItemCompact: {
    padding: spacing.sm,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  reportItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  reportItemDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reportItemType: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  reportItemMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  reportItemMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  moreReportsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
});

export default LibrarianAgentPage;
