<<<<<<< HEAD
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Report,
  ReportConfig,
  ReportTemplate,
  ReportGeneration,
  ReportAnalytics,
  ReportScheduler,
  ReportShare,
  ReportComment,
  ReportVersion,
  ReportNotification,
  ReportPreview,
  ReportExportOptions,
  ReportDataSource,
  ReportStatus
} from '../types/reporting';
import {
  reportingService,
  ReportingApiResponse,
  CreateReportRequest,
  UpdateReportRequest,
  GenerateReportRequest,
  ReportListOptions,
  ShareReportRequest
} from '../services/reportingService';

// Hook for managing a single report
export const useReport = (reportId?: string) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<ReportGeneration[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<ReportGeneration | null>(null);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.getReport(id);
      if (response.success && response.data) {
        setReport(response.data);
        // Load generations for this report
        const generationsResponse = await reportingService.listReportGenerations(id);
        if (generationsResponse.success && generationsResponse.data) {
          setGenerations(generationsResponse.data);
          // Set the most recent generation as active
          const sortedGenerations = generationsResponse.data.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          if (sortedGenerations.length > 0) {
            setActiveGeneration(sortedGenerations[0]);
          }
        }
      } else {
        setError(response.error || 'Failed to load report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReport = useCallback(async (updates: Partial<Report>) => {
    if (!report) return false;

    setLoading(true);
    setError(null);

    try {
      const updateRequest: UpdateReportRequest = {
        id: report.id,
        ...updates
      };

      const response = await reportingService.updateReport(updateRequest);
      if (response.success) {
        setReport(prev => prev ? { ...prev, ...updates } : null);
        return true;
      } else {
        setError(response.error || 'Failed to update report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [report]);

  const generateReport = useCallback(async (formats?: string[], schedule?: boolean) => {
    if (!report) return null;

    setLoading(true);
    setError(null);

    try {
      const request: GenerateReportRequest = {
        reportId: report.id,
        format: formats,
        schedule
      };

      const response = await reportingService.generateReport(request);
      if (response.success && response.data) {
        // Refresh generations list
        await loadReport(report.id);
        return response.data.generationId;
      } else {
        setError(response.error || 'Failed to generate report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [report, loadReport]);

  const deleteReport = useCallback(async () => {
    if (!report) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.deleteReport(report.id);
      if (response.success) {
        setReport(null);
        setGenerations([]);
        setActiveGeneration(null);
        return true;
      } else {
        setError(response.error || 'Failed to delete report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId, loadReport]);

  return {
    report,
    loading,
    error,
    generations,
    activeGeneration,
    setActiveGeneration,
    loadReport,
    updateReport,
    generateReport,
    deleteReport
  };
};

// Hook for managing reports list
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
        await loadReports(); // Refresh the list
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
        await loadReports(); // Refresh the list
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
        await loadReports(); // Refresh the list
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

// Hook for managing report templates
export const useReportTemplates = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      } else {
        setError(response.error || 'Failed to load templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.createTemplate(template);
      if (response.success && response.data) {
        await loadTemplates(); // Refresh the list
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create template');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createTemplate
  };
};

// Hook for managing report generation
export const useReportGeneration = (generationId?: string) => {
  const [generation, setGeneration] = useState<ReportGeneration | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<(() => void) | null>(null);

  const loadGeneration = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.getReportGeneration(id);
      if (response.success && response.data) {
        setGeneration(response.data);
      } else {
        setError(response.error || 'Failed to load generation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelGeneration = useCallback(async () => {
    if (!generation) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.cancelReportGeneration(generation.id);
      if (response.success) {
        await loadGeneration(generation.id);
        return true;
      } else {
        setError(response.error || 'Failed to cancel generation');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [generation, loadGeneration]);

  const downloadGeneration = useCallback(async () => {
    if (!generation) return null;

    try {
      const response = await reportingService.downloadReportGeneration(generation.id);
      if (response.success && response.data) {
        return response.data.url;
      } else {
        setError(response.error || 'Failed to get download URL');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    }
  }, [generation]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (generationId) {
      loadGeneration(generationId);

      // Subscribe to WebSocket updates
      const cleanup = reportingService.subscribeToGenerationUpdates(
        generationId,
        (updatedGeneration) => {
          setGeneration(updatedGeneration);
        }
      );

      wsRef.current = cleanup;

      return () => {
        if (wsRef.current) {
          wsRef.current();
        }
      };
    }
  }, [generationId, loadGeneration]);

  return {
    generation,
    loading,
    error,
    loadGeneration,
    cancelGeneration,
    downloadGeneration
  };
};

// Hook for managing report analytics
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

// Hook for managing report sharing
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
          await loadShares(reportId); // Refresh the list
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
          await loadShares(reportId); // Refresh the list
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
};

// Hook for managing report comments
export const useReportComments = (reportId?: string) => {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listReportComments(id);
      if (response.success && response.data) {
        setComments(response.data);
      } else {
        setError(response.error || 'Failed to load comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addComment = useCallback(async (comment: Omit<ReportComment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.addReportComment(comment);
      if (response.success && response.data) {
        if (reportId) {
          await loadComments(reportId); // Refresh the list
        }
        return response.data.id;
      } else {
        setError(response.error || 'Failed to add comment');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadComments]);

  const resolveComment = useCallback(async (commentId: string, resolved: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.resolveReportComment(commentId, resolved);
      if (response.success) {
        if (reportId) {
          await loadComments(reportId); // Refresh the list
        }
        return true;
      } else {
        setError(response.error || 'Failed to resolve comment');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [reportId, loadComments]);

  useEffect(() => {
    if (reportId) {
      loadComments(reportId);
    }
  }, [reportId, loadComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    resolveComment,
    loadComments
  };
};

// Hook for report preview
export const useReportPreview = () => {
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(async (config: ReportConfig) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.previewReport(config);
      if (response.success && response.data) {
        setPreview(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to generate preview');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    error,
    generatePreview,
    clearPreview
  };
};

// Hook for managing data sources
export const useDataSources = () => {
  const [dataSources, setDataSources] = useState<ReportDataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listDataSources();
      if (response.success && response.data) {
        setDataSources(response.data);
      } else {
        setError(response.error || 'Failed to load data sources');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const queryDataSource = useCallback(async (id: string, query: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.queryDataSource(id, query);
      if (response.success) {
        return response.data || [];
      } else {
        setError(response.error || 'Failed to query data source');
        return [];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.testDataSourceConnection(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to test connection');
        return { connected: false, message: 'Connection test failed' };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return { connected: false, message: 'Connection test failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  return {
    dataSources,
    loading,
    error,
    loadDataSources,
    queryDataSource,
    testConnection
  };
};

// Hook for managing notifications
export const useReportNotifications = () => {
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reportingService.listReportNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setError(response.error || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await reportingService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, sent: true } : n)
        );
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await reportingService.deleteNotification(notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.sent).length;
  }, [notifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    loadNotifications,
    markAsRead,
    deleteNotification
  };
};

// Hook for real-time report updates
export const useReportUpdates = (reportId: string) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    try {
      const cleanup = reportingService.subscribeToReportUpdates(
        reportId,
        (data) => {
          setLastUpdate(data);
          setError(null);
        }
      );

      cleanupRef.current = cleanup;
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnected(false);
    }
  }, [reportId]);

  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [connect]);

  return {
    connected,
    lastUpdate,
    error,
    connect,
    disconnect
  };
};
=======
/**
 * Reporting Hooks - Legacy Export
 *
 * This file maintains backwards compatibility by re-exporting from the modular implementation.
 * All hooks have been refactored into focused modules under ./modules/
 *
 * @deprecated Import directly from './modules' for better tree-shaking and clarity
 * @see ./modules/index.ts for the primary export point
 */

// Re-export all hooks from the modular implementation
export {
  // Core Report Hooks
  useReport,
  useReports,

  // Template & Generation Hooks
  useReportTemplates,
  useReportGeneration,

  // Analytics & Sharing Hooks
  useReportAnalytics,
  useReportSharing,

  // Comments & Preview Hooks
  useReportComments,
  useReportPreview,

  // Data & Notifications Hooks
  useDataSources,
  useReportNotifications,

  // Real-time Updates Hook
  useReportUpdates
} from './modules';

// Re-export types for convenience
export type {
  Report,
  ReportTemplate,
  ReportGeneration,
  ReportAnalytics,
  ReportShare,
  ReportComment,
  ReportPreview,
  ReportDataSource,
  ReportNotification,
  ReportConfig
} from '../types/reporting';
>>>>>>> 001-modify-analyzer-method
