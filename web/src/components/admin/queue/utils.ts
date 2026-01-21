/**
 * Queue Utility Functions
 * Formatting and helper functions for queue display
 */

import { QueueJob } from './types';
import { colors } from '@bayit/shared/theme';

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
};

export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

export const formatETA = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

export const isDuplicate = (job: QueueJob): boolean => {
  if (!job.error_message) return false;
  const lowerMsg = job.error_message.toLowerCase();
  return lowerMsg.includes('duplicate') ||
         lowerMsg.includes('already in library') ||
         lowerMsg.includes('already exists');
};

export const getStatusColor = (status: string, job?: QueueJob): string => {
  if (job && (status === 'failed' || status === 'cancelled') && isDuplicate(job)) {
    return colors.info || colors.primary;
  }

  switch (status) {
    case 'completed':
      return colors.success;
    case 'failed':
    case 'cancelled':
      return colors.error;
    case 'uploading':
    case 'processing':
      return colors.primary;
    case 'queued':
      return colors.warning;
    default:
      return colors.textMuted;
  }
};

export const getStageDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    hash_calculation: 'Calculating file hash for duplicate detection',
    metadata_extraction: 'Extracting title, year, and metadata from filename',
    gcs_upload: 'Uploading file to Google Cloud Storage',
    database_insert: 'Saving content entry to database',
    imdb_lookup: 'Fetching enhanced movie/series details from TMDB',
    subtitle_extraction: 'Extracting embedded subtitles from video file',
  };
  return descriptions[key] || key;
};

export const getEstimatedTime = (key: string, size?: number): string => {
  const fileSizeGB = size ? size / (1024 * 1024 * 1024) : 2;
  const estimates: Record<string, string> = {
    hash_calculation: '30s - 2m',
    metadata_extraction: '5s - 10s',
    gcs_upload: size ? `${Math.ceil(fileSizeGB * 3)}m` : '5m - 30m',
    database_insert: '1s - 2s',
    imdb_lookup: '2s - 5s',
    subtitle_extraction: '10s - 1m',
  };
  return estimates[key] || 'Unknown';
};
