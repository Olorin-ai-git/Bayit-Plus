/**
 * useMonitoredFolders Hook
 * Manages monitored folders CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { MonitoredFolder, FolderFormData } from '../types';
import * as uploadsService from '@/services/uploadsService';
import logger from '@/utils/logger';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useTranslation } from 'react-i18next';

export const useMonitoredFolders = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const [folders, setFolders] = useState<MonitoredFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  /**
   * Fetches monitored folders from API
   */
  const refreshFolders = useCallback(async () => {
    try {
      setError(null);
      const folderList = await uploadsService.getMonitoredFolders();
      setFolders(folderList || []);
    } catch (err) {
      logger.error('Failed to fetch monitored folders', 'useMonitoredFolders', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Adds a new monitored folder
   */
  const addFolder = useCallback(
    async (folderData: FolderFormData): Promise<boolean> => {
      try {
        setActionInProgress(true);
        await uploadsService.addMonitoredFolder(folderData);
        await refreshFolders();

        notifications.showSuccess(t('admin.uploads.monitoredFolders.addSuccess'));
        return true;
      } catch (err) {
        logger.error('Failed to add monitored folder', 'useMonitoredFolders', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.addFolderFailed')
        );
        return false;
      } finally {
        setActionInProgress(false);
      }
    },
    [refreshFolders, notifications, t]
  );

  /**
   * Updates an existing monitored folder
   */
  const updateFolder = useCallback(
    async (folderId: string, folderData: Partial<FolderFormData>): Promise<boolean> => {
      try {
        setActionInProgress(true);
        await uploadsService.updateMonitoredFolder(folderId, folderData);
        await refreshFolders();

        notifications.showSuccess(t('admin.uploads.monitoredFolders.updateSuccess'));
        return true;
      } catch (err) {
        logger.error('Failed to update monitored folder', 'useMonitoredFolders', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.updateFolderFailed')
        );
        return false;
      } finally {
        setActionInProgress(false);
      }
    },
    [refreshFolders, notifications, t]
  );

  /**
   * Deletes a monitored folder
   */
  const deleteFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      try {
        setActionInProgress(true);
        await uploadsService.deleteMonitoredFolder(folderId);
        await refreshFolders();

        notifications.showSuccess(t('admin.uploads.monitoredFolders.deleteSuccess'));
        return true;
      } catch (err) {
        logger.error('Failed to delete monitored folder', 'useMonitoredFolders', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.deleteFolderFailed')
        );
        return false;
      } finally {
        setActionInProgress(false);
      }
    },
    [refreshFolders, notifications, t]
  );

  /**
   * Triggers a manual scan of a folder
   */
  const scanFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      try {
        setActionInProgress(true);
        await uploadsService.triggerUploadScan(folderId);
        await refreshFolders();

        notifications.showSuccess(t('admin.uploads.monitoredFolders.scanTriggered'));
        return true;
      } catch (err) {
        logger.error('Failed to scan folder', 'useMonitoredFolders', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.scanFolderFailed')
        );
        return false;
      } finally {
        setActionInProgress(false);
      }
    },
    [refreshFolders, notifications, t]
  );

  // Initialize: fetch folders on mount
  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  return {
    folders,
    loading,
    error,
    actionInProgress,
    refreshFolders,
    addFolder,
    updateFolder,
    deleteFolder,
    scanFolder,
  };
};
