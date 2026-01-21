/**
 * Reports List Hook Module
 * Provides useReports hook for list operations
 *
 * @module useReportsList
 */

import { useState, useEffect, useCallback } from 'react';
import { Report } from '../../types/reporting';
import {
  reportingService,
  CreateReportRequest,
  ReportListOptions
} from '../../services/reportingService';

/**
 * Hook for managing reports list
 * Provides list operations, pagination, search, and bulk actions for reports
 *
 * @param options - List options including pagination and filters
 * @returns Reports list state and operations including:
 *  - reports: Array of reports
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - total: Total count of reports
 *  - page: Current page number
 *  - limit: Items per page
 *  - setPage: Update current page
 *  - setLimit: Update items per page
 *  - loadReports: Load reports with options
 *  - createReport: Create new report
 *  - duplicateReport: Duplicate existing report
 *  - bulkDeleteReports: Delete multiple reports
 *  - searchReports: Search reports by query
 */
export const useReports = (options: ReportListOptions = {}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(options.page || 1);
  const [limit, setLimit] = useState<number>(options.limit || 20);

  const loadReports = useCallback(async (loadOptions: ReportListOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listReports({
        ...options,
        ...loadOptions,
        page,
        limit
      });

      if (response.success && response.data) {
        setReports(response.data.reports);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to load reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [options, page, limit]);

  const createReport = useCallback(async (request: CreateReportRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.createReport(request);
      if (response.success && response.data) {
        await loadReports();
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadReports]);

  const duplicateReport = useCallback(async (reportId: string, name: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.duplicateReport(reportId, name);
      if (response.success && response.data) {
        await loadReports();
        return response.data.id;
      } else {
        setError(response.error || 'Failed to duplicate report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadReports]);

  const bulkDeleteReports = useCallback(async (reportIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.bulkDeleteReports(reportIds);
      if (response.success) {
        await loadReports();
        return response.data;
      } else {
        setError(response.error || 'Failed to delete reports');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadReports]);

  const searchReports = useCallback(async (query: string, filters?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.searchReports(query, filters);
      if (response.success && response.data) {
        setReports(response.data);
        setTotal(response.data.length);
      } else {
        setError(response.error || 'Failed to search reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return {
    reports,
    loading,
    error,
    total,
    page,
    limit,
    setPage,
    setLimit,
    loadReports,
    createReport,
    duplicateReport,
    bulkDeleteReports,
    searchReports
  };
};
