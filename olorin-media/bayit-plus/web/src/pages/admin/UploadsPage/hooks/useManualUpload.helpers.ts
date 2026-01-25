/**
 * useManualUpload Helper Functions
 * File state update utilities extracted to comply with 200-line limit
 */

import type { FileUploadProgress } from '../types';

/**
 * Updates progress for a specific file
 */
export const updateFileProgress = (
  files: FileUploadProgress[],
  index: number,
  progress: number
): FileUploadProgress[] => {
  const updated = [...files];
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
};

/**
 * Marks a file as completed
 */
export const markFileComplete = (
  files: FileUploadProgress[],
  index: number,
  uploadId: string
): FileUploadProgress[] => {
  const updated = [...files];
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
};

/**
 * Marks a file as failed
 */
export const markFileFailed = (
  files: FileUploadProgress[],
  index: number,
  error: string
): FileUploadProgress[] => {
  const updated = [...files];
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
};
