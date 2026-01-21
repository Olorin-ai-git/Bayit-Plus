/**
 * useReports hook - CRUD operations for reports
 */

import { useState, useEffect, useCallback } from 'react';
import { ReportService } from '../services/reportService';
import { Report, ReportCreate, ReportUpdate } from '../types/reports';
import { useToast } from '@shared/components/ui/ToastProvider';

interface UseReportsOptions {
  owner?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseReportsResult {
  reports: Report[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  createReport: (data: ReportCreate) => Promise<Report | null>;
  updateReport: (id: string, data: ReportUpdate) => Promise<Report | null>;
  deleteReport: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useReports(options: UseReportsOptions = {}): UseReportsResult {
  const { owner, status, search, page = 1, limit = 20, autoFetch = true } = options;
  const { showToast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReportService.listReports({
        owner,
        status,
        search,
        page,
        limit,
      });
      setReports(response.reports);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(message);
      showToast('error', 'Error', message);
    } finally {
      setLoading(false);
    }
  }, [owner, status, search, page, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchReports();
    }
  }, [autoFetch, fetchReports]);

  const createReport = useCallback(async (data: ReportCreate): Promise<Report | null> => {
    try {
      const report = await ReportService.createReport(data);
      setReports((prev) => [report, ...prev]);
      setTotal((prev) => prev + 1);
      showToast('success', 'Success', 'Report created');
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create report';
      showToast('error', 'Error', message);
      return null;
    }
  }, []);

  const updateReport = useCallback(async (id: string, data: ReportUpdate): Promise<Report | null> => {
    try {
      const report = await ReportService.updateReport(id, data);
      setReports((prev) => prev.map((r) => (r.id === id ? report : r)));
      showToast('success', 'Success', 'Report updated');
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update report';
      showToast('error', 'Error', message);
      return null;
    }
  }, []);

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      await ReportService.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
      showToast('success', 'Success', 'Report deleted');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete report';
      showToast('error', 'Error', message);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchReports();
  }, [fetchReports]);

  return {
    reports,
    total,
    loading,
    error,
    fetchReports,
    createReport,
    updateReport,
    deleteReport,
    refresh,
  };
}

