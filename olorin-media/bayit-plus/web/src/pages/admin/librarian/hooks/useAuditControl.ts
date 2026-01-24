import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  triggerAudit,
  pauseAudit,
  resumeAudit,
  cancelAudit,
  interjectAuditMessage,
  getAuditReports,
  getAuditReportDetails,
  LibrarianConfig,
  AuditReport,
  AuditReportDetail,
} from '@/services/librarianService';
import logger from '@/utils/logger';
import { AuditConfigState } from '../types';

interface UseAuditControlProps {
  config: LibrarianConfig | null;
  reports: AuditReport[];
  budgetUsed: number;
  auditConfig: AuditConfigState;
  setLivePanelReport: (report: AuditReportDetail | null) => void;
  setLivePanelExpanded: (expanded: boolean) => void;
  loadData: () => Promise<void>;
  setErrorMessage: (message: string) => void;
  setErrorModalOpen: (open: boolean) => void;
  setSuccessMessage: (message: string) => void;
  setSuccessModalOpen: (open: boolean) => void;
}

export const useAuditControl = ({
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
}: UseAuditControlProps) => {
  const { t } = useTranslation();
  const [triggering, setTriggering] = useState(false);
  const [pausingAudit, setPausingAudit] = useState(false);
  const [resumingAudit, setResumingAudit] = useState(false);
  const [cancellingAudit, setCancellingAudit] = useState(false);
  const [auditPaused, setAuditPaused] = useState(false);
  const [pendingAuditType, setPendingAuditType] = useState<'daily_incremental' | 'ai_agent' | null>(null);

  // Interject state
  const [interjectModalVisible, setInterjectModalVisible] = useState(false);
  const [interjectMessage, setInterjectMessage] = useState('');
  const [interjectingAudit, setInterjectingAudit] = useState(false);

  const executeAudit = useCallback(async (auditType: 'daily_incremental' | 'ai_agent') => {
    if (!config) {
      setErrorMessage(t('admin.librarian.errors.configNotLoaded'));
      setErrorModalOpen(true);
      return;
    }

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

    const monthlyBudgetLimit = config.audit_limits.max_budget_usd * 30;

    if (budgetUsed + auditConfig.budgetLimit > monthlyBudgetLimit) {
      setErrorMessage(
        t('admin.librarian.errors.budgetExceeded',
          `Monthly budget limit exceeded. Used: $${budgetUsed.toFixed(2)}, Requested: $${auditConfig.budgetLimit.toFixed(2)}, Monthly Limit: $${monthlyBudgetLimit.toFixed(2)}`
        )
      );
      setErrorModalOpen(true);
      return;
    }

    setTriggering(true);

    try {
      await triggerAudit({
        audit_type: auditType,
        dry_run: auditConfig.dryRun,
        use_ai_agent: auditType === 'ai_agent',
        max_iterations: config.audit_limits.max_iterations,
        budget_limit_usd: auditConfig.budgetLimit,
        last_24_hours_only: auditConfig.last24HoursOnly,
        // Integrity validation is MANDATORY - always runs first (not user-configurable)
        validate_integrity: true,
        // Capability options (ADDITIVE - all enabled options are combined)
        cyb_titles_only: auditConfig.cybTitlesOnly,
        tmdb_posters_only: auditConfig.tmdbPostersOnly,
        opensubtitles_enabled: auditConfig.openSubtitlesEnabled,
        classify_only: auditConfig.classifyOnly,
        remove_duplicates: auditConfig.purgeDuplicates,
      });

      setLivePanelExpanded(true);

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
            level: auditConfig.dryRun ? 'warn' : 'info',
            message: auditConfig.dryRun
              ? t('admin.librarian.logs.dryRunMode')
              : t('admin.librarian.logs.liveMode'),
          },
          {
            id: '3',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: t('admin.librarian.logs.budgetSet', { budget: auditConfig.budgetLimit.toFixed(2) }),
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

      setTimeout(async () => {
        await loadData();

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
  }, [config, reports, budgetUsed, auditConfig, setLivePanelReport, setLivePanelExpanded, loadData, setErrorMessage, setErrorModalOpen, t]);

  const handlePauseAudit = useCallback(async (auditId: string | undefined) => {
    if (!auditId) return;

    setPausingAudit(true);
    try {
      await pauseAudit(auditId);
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
  }, [t, setSuccessMessage, setSuccessModalOpen, setErrorMessage, setErrorModalOpen]);

  const handleResumeAudit = useCallback(async (auditId: string | undefined) => {
    if (!auditId) return;

    setResumingAudit(true);
    try {
      await resumeAudit(auditId);
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
  }, [t, setSuccessMessage, setSuccessModalOpen, setErrorMessage, setErrorModalOpen]);

  const handleCancelAudit = useCallback(async (auditId: string | undefined) => {
    if (!auditId) return;

    setCancellingAudit(true);
    try {
      await cancelAudit(auditId);
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
  }, [t, setLivePanelReport, setSuccessMessage, setSuccessModalOpen, setErrorMessage, setErrorModalOpen, loadData]);

  const handleInterjectAudit = useCallback(async (auditId: string | undefined, message: string) => {
    if (!auditId || !message.trim()) return;

    setInterjectingAudit(true);
    try {
      await interjectAuditMessage(auditId, message.trim());
      setInterjectMessage('');
      setInterjectModalVisible(false);
      setSuccessMessage(t('admin.librarian.audit.interjectSuccess', 'Message sent successfully'));
      setSuccessModalOpen(true);
    } catch (error: any) {
      logger.error('Failed to interject audit:', error);

      // Show the actual error message from the backend
      const errorMessage = error?.message || t('admin.librarian.errors.failedToInterject', 'Failed to send message');
      setErrorMessage(errorMessage);
      setErrorModalOpen(true);

      // If audit completed, close the modal and refresh
      if (errorMessage.includes('completed') || errorMessage.includes('finished')) {
        setInterjectMessage('');
        setInterjectModalVisible(false);
        // Trigger a data reload to get updated status
        setTimeout(() => {
          loadData();
        }, 500);
      }
    } finally {
      setInterjectingAudit(false);
    }
  }, [t, setSuccessMessage, setSuccessModalOpen, setErrorMessage, setErrorModalOpen, loadData]);

  return {
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
    // Interject
    interjectModalVisible,
    setInterjectModalVisible,
    interjectMessage,
    setInterjectMessage,
    interjectingAudit,
    handleInterjectAudit,
  };
};
