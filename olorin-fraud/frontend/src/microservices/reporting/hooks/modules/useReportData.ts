/**
 * Data & Notifications Hooks Module
 * Provides useDataSources and useReportNotifications hooks
 *
 * @module useReportData
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ReportDataSource, ReportNotification } from '../../types/reporting';
import { reportingService } from '../../services/reportingService';

/**
 * Hook for managing data sources
 * Provides data source management with query execution and connection testing
 *
 * @returns Data sources state and operations including:
 *  - dataSources: Array of available data sources
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - loadDataSources: Load all data sources
 *  - queryDataSource: Execute query on specific data source
 *  - testConnection: Test connection to data source
 */
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

/**
 * Hook for managing report notifications
 * Provides notification management with read/unread tracking
 *
 * @returns Notifications state and operations including:
 *  - notifications: Array of report notifications
 *  - loading: Loading state indicator
 *  - error: Error message if any
 *  - unreadCount: Computed count of unread notifications
 *  - loadNotifications: Load all notifications
 *  - markAsRead: Mark notification as read
 *  - deleteNotification: Delete notification
 */
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
