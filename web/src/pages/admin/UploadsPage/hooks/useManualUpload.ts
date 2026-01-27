/**
 * useManualUpload Hook
 * Manages browser-based chunked file uploads with per-file progress tracking
 *
 * REFACTORED (2026-01-25): Extracted helper functions to useManualUpload.helpers.ts
 * to comply with 200-line file size limit.
 */

import { useState, useCallback } from 'react';
import type { FileUploadProgress, ContentType } from '../types';
import type { FolderEntry } from '../types/folderTypes';
import { createInitialStageState } from '../utils/stageHelpers';
import { updateFileProgress as updateProgress, markFileComplete as markComplete, markFileFailed as markFailed } from './useManualUpload.helpers';
import * as uploadsService from '@/services/uploadsService';
import logger from '@/utils/logger';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useTranslation } from 'react-i18next';

export const useManualUpload = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const [files, setFiles] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    successful: number;
    failed: number;
  } | null>(null);

  /**
   * Adds files to the upload queue
   */
  const selectFiles = useCallback((newFiles: File[]) => {
    const fileProgresses: FileUploadProgress[] = newFiles.map((file) => ({
      file,
      progress: 0,
      stages: createInitialStageState(),
    }));

    setFiles((prev) => [...prev, ...fileProgresses]);
  }, []);

  /**
   * Removes a file from the queue
   */
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Clears all files from the queue
   */
  const clearFiles = useCallback(() => {
    setFiles([]);
    setUploadResult(null);
  }, []);

  /**
   * Updates progress for a specific file
   */
  const updateFileProgress = useCallback((index: number, progress: number) => {
    setFiles((prev) => updateProgress(prev, index, progress));
  }, []);

  /**
   * Marks a file as completed
   */
  const markFileComplete = useCallback((index: number, uploadId: string) => {
    setFiles((prev) => markComplete(prev, index, uploadId));
  }, []);

  /**
   * Marks a file as failed
   */
  const markFileFailed = useCallback((index: number, error: string) => {
    setFiles((prev) => markFailed(prev, index, error));
  }, []);

  /**
   * Uploads all files in the queue
   */
  const uploadFiles = useCallback(
    async (contentType: ContentType): Promise<boolean> => {
      if (files.length === 0) {
        notifications.showWarning(t('admin.uploads.manualUpload.noFilesSelected'));
        return false;
      }

      setIsUploading(true);
      setUploadResult(null);

      try {
        const filesToUpload = files.map((fp) => fp.file);

        const result = await uploadsService.uploadBrowserFiles(
          filesToUpload,
          contentType,
          (fileIndex, progress) => {
            updateFileProgress(fileIndex, progress);
          },
          (fileIndex, job) => {
            markFileComplete(fileIndex, job.job_id);
          }
        );

        // Mark failed files
        result.failed.forEach((failure) => {
          const index = filesToUpload.findIndex((f) => f === failure.file);
          if (index !== -1) {
            markFileFailed(index, failure.error);
          }
        });

        setUploadResult({
          successful: result.successful.length,
          failed: result.failed.length,
        });

        // Show notification
        if (result.successful.length > 0) {
          notifications.showSuccess(
            t('admin.uploads.manualUpload.uploadSuccess', {
              count: result.successful.length,
            })
          );
        }

        if (result.failed.length > 0) {
          notifications.showError(
            t('admin.uploads.manualUpload.uploadFailed', {
              count: result.failed.length,
            })
          );
        }

        return result.failed.length === 0;
      } catch (err) {
        logger.error('Failed to upload files', 'useManualUpload', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.uploadFailed')
        );
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [files, updateFileProgress, markFileComplete, markFileFailed, notifications, t]
  );

  /**
   * Uploads files from a folder with relative paths preserved
   */
  const uploadFolderFiles = useCallback(
    async (folderEntries: FolderEntry[], contentType: ContentType): Promise<boolean> => {
      if (folderEntries.length === 0) {
        notifications.showWarning(t('admin.uploads.manualUpload.noFilesSelected'));
        return false;
      }

      setIsUploading(true);
      setUploadResult(null);

      try {
        const result = await uploadsService.uploadFolderFiles(
          folderEntries.map((e) => ({ file: e.file, relativePath: e.relativePath })),
          contentType,
          (fileIndex, progress) => {
            updateFileProgress(fileIndex, progress);
          },
          (fileIndex, job) => {
            markFileComplete(fileIndex, job.job_id);
          }
        );

        setUploadResult({
          successful: result.successful.length,
          failed: result.failed.length,
        });

        if (result.successful.length > 0) {
          notifications.showSuccess(
            t('admin.uploads.manualUpload.uploadSuccess', { count: result.successful.length })
          );
        }

        if (result.failed.length > 0) {
          notifications.showError(
            t('admin.uploads.manualUpload.uploadFailed', { count: result.failed.length })
          );
        }

        return result.failed.length === 0;
      } catch (err) {
        logger.error('Failed to upload folder files', 'useManualUpload', err);
        notifications.showError(
          err instanceof Error ? err.message : t('admin.uploads.errors.uploadFailed')
        );
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [updateFileProgress, markFileComplete, notifications, t]
  );

  /**
   * Cancels an active upload (if implemented in future)
   */
  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    notifications.showInfo(t('admin.uploads.manualUpload.uploadCancelled'));
  }, [notifications, t]);

  return {
    files,
    isUploading,
    uploadResult,
    selectFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    uploadFolderFiles,
    cancelUpload,
  };
};
