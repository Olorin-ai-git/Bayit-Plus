import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLibrarianConfig,
  getLibrarianStatus,
  getAuditReports,
  getAuditReportDetails,
  LibrarianConfig,
  LibrarianStatus,
  AuditReport,
  AuditReportDetail,
} from '@/services/librarianService';
import logger from '@/utils/logger';

interface UseLibrarianDataReturn {
  config: LibrarianConfig | null;
  status: LibrarianStatus | null;
  reports: AuditReport[];
  loading: boolean;
  refreshing: boolean;
  configError: string | null;
  budgetUsed: number;
  loadData: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  setBudgetUsed: (value: number) => void;
  setReports: (reports: AuditReport[]) => void;
  setErrorMessage: (message: string) => void;
  setErrorModalOpen: (open: boolean) => void;
}

export const useLibrarianData = (): UseLibrarianDataReturn => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LibrarianConfig | null>(null);
  const [status, setStatus] = useState<LibrarianStatus | null>(null);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const configData = await getLibrarianConfig();
      setConfig(configData);
      setConfigError(null);

      const [statusData, reportsData] = await Promise.all([
        getLibrarianStatus(),
        getAuditReports(configData.pagination.reports_limit),
      ]);

      setStatus(statusData);
      setReports(reportsData);

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
      const errorMsg = error instanceof Error ? error.message : 'Failed to load librarian data';

      if (errorMsg.includes('configuration')) {
        setConfigError(errorMsg);
        setErrorMessage(`${errorMsg}\n\n${t('admin.librarian.errors.contactAdmin')}`);
        setErrorModalOpen(true);
      } else {
        setErrorMessage(t('admin.librarian.errors.failedToLoad'));
        setErrorModalOpen(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  return {
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
    setErrorMessage,
    setErrorModalOpen,
  };
};
