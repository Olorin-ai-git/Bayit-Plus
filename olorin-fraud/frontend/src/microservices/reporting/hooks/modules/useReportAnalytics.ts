/**
 * Analytics & Sharing Hooks Module
 * Provides useReportAnalytics and useReportSharing hooks
 *
 * @module useReportAnalytics
 */

import { useState, useEffect, useCallback } from 'react';
import { ReportAnalytics, ReportShare } from '../../types/reporting';
import { reportingService, ShareReportRequest } from '../../services/reportingService';

/**
 * Hook for managing report analytics
 * Provides analytics data collection and visualization support
 *
 * @param dateRange - Optional date range for analytics filtering
 * @returns Analytics state and operations including:
 *  - analytics: Current analytics data
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - loadAnalytics: Load analytics for specified date range
 */
export const useReportAnalytics = (dateRange?: { start: string; end: string }) => {
  const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (range?: { start: string; end: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.getReportAnalytics(range);
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        setError(response.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(dateRange);
  }, [loadAnalytics, dateRange]);

  return {
    analytics,
    loading,
    error,
    loadAnalytics
  };
};

/**
 * Hook for managing report sharing
 * Provides sharing and permissions management for reports
 *
 * @param reportId - Optional report ID to load shares for
 * @returns Sharing state and operations including:
 *  - shares: Array of report shares
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - shareReport: Share report with specified permissions
 *  - revokeShare: Revoke existing share
 *  - loadShares: Load shares for report
 */
export const useReportSharing = (reportId?: string) => {
  const [shares, setShares] = useState<ReportShare[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadShares = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listReportShares(id);
      if (response.success && response.data) {
        setShares(response.data);
      } else {
        setError(response.error || 'Failed to load shares');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const shareReport = useCallback(async (request: ShareReportRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.shareReport(request);
      if (response.success && response.data) {
        if (reportId) {
          await loadShares(reportId);
        }
        return response.data;
      } else {
        setError(response.error || 'Failed to share report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadShares]);

  const revokeShare = useCallback(async (shareId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.revokeReportShare(shareId);
      if (response.success) {
        if (reportId) {
          await loadShares(reportId);
        }
        return true;
      } else {
        setError(response.error || 'Failed to revoke share');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadShares]);

  useEffect(() => {
    if (reportId) {
      loadShares(reportId);
    }
  }, [reportId, loadShares]);

  return {
    shares,
    loading,
    error,
    shareReport,
    revokeShare,
    loadShares
  };
}
