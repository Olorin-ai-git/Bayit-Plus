/**
 * TypeScript interfaces for Admin Uploads Page
 * Defines all types used across components and hooks
 */

import type { QueueJob, QueueStats } from '@/components/admin/GlassQueue';

// ========================================
// UPLOAD TYPES
// ========================================

export type ContentType = 'movie' | 'series' | 'podcast' | 'audiobook';

export type UploadStage =
  | 'browser_upload'
  | 'hash_calculation'
  | 'duplicate_check'
  | 'metadata_extraction'
  | 'gcs_upload'
  | 'database_insert';

export type UploadStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface UploadStageState {
  browserUpload: UploadStageStatus;
  hashCalculation: UploadStageStatus;
  duplicateCheck: UploadStageStatus;
  metadataExtraction: UploadStageStatus;
  gcsUpload: UploadStageStatus;
  databaseInsert: UploadStageStatus;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  stages: UploadStageState;
  error?: string;
  uploadId?: string;
}

// ========================================
// MONITORED FOLDER TYPES
// ========================================

export interface MonitoredFolder {
  _id: string;
  name: string;
  path: string;
  content_type: ContentType;
  enabled: boolean;
  auto_upload: boolean;
  last_scan?: string;
  files_in_folder?: number;
  files_processed?: number;
  created_at: string;
  updated_at: string;
}

export interface FolderFormData {
  name: string;
  path: string;
  content_type: ContentType;
  enabled: boolean;
  auto_upload: boolean;
}

// ========================================
// QUEUE TYPES (re-export from GlassQueue)
// ========================================

export type { QueueJob, QueueStats };

export interface QueueState {
  stats: QueueStats;
  activeJob: QueueJob | null;
  queuedJobs: QueueJob[];
  recentCompleted: QueueJob[];
  queuePaused: boolean;
  pauseReason: string | null;
}

// ========================================
// DRY RUN TYPES
// ========================================

export type DryRunReason = 'new_file' | 'duplicate_hash' | 'duplicate_filename' | 'duplicate_in_queue' | 'validation_failed';

export interface DryRunDuplicateInfo {
  content_id: string;
  title: string;
  stream_url: string;
  created_at: string;
}

export interface DryRunFileInfo {
  hash?: string;
  size: number;
  filename: string;
}

export interface DryRunResult {
  would_upload: boolean;
  reason: DryRunReason;
  file_info: DryRunFileInfo;
  duplicate_info?: DryRunDuplicateInfo;
  validation_errors?: string[];
  estimated_stages?: UploadStage[];
}

export interface DryRunResponse {
  results: DryRunResult[];
  summary: {
    total: number;
    will_upload: number;
    duplicates: number;
    errors: number;
  };
}
