/**
 * useManualUpload Hook
 * Manages browser-based chunked file uploads with per-file progress tracking
 */

import { useState, useCallback } from 'react';
import type { FileUploadProgress, ContentType } from '../types';
import { createInitialStageState } from '../utils/stageHelpers';
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
    setFiles((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          progress,
          stages: {
            ...updated[index].stages,
            browserUpload: progress < 100 ? 'in_progress' : 'completed',
            hashCalculation: progress === 100 ? 'in_progress' : 'pending',
          },
        };
      }
      return updated;
    });
  }, []);

  /**
   * Marks a file as completed
   */
  const markFileComplete = useCallback((index: number, uploadId: string) => {
    setFiles((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          progress: 100,
          uploadId,
          stages: {
            browserUpload: 'completed',
            hashCalculation: 'completed',
            duplicateCheck: 'completed',
            metadataExtraction: 'completed',
            gcsUpload: 'completed',
            databaseInsert: 'completed',
          },
        };
      }
      return updated;
    });
  }, []);

  /**
   * Marks a file as failed
   */
  const markFileFailed = useCallback((index: number, error: string) => {
    setFiles((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          error,
          stages: {
            ...updated[index].stages,
            browserUpload: 'failed',
          },
        };
      }
      return updated;
    });
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
    cancelUpload,
  };
};
